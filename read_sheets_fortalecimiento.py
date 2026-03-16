import json
import os
import re
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Iterable

import pandas as pd
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
OUTPUT_DIR = Path("data_raw/fortalecimiento_municipal")

SECTION_CONFIG = {
    "encabezado_raw": {
        "sheet": "01_Encabezado",
        "range": "A4:C10",
        "type": "table",
        "drop_blank_rows": True,
        "blank_ignore_columns": [],
        "date_columns": [],
    },
    "modulos_raw": {
        "sheet": "02_Modulos",
        "range": "A4:C9",
        "type": "table",
        "drop_blank_rows": True,
        "blank_ignore_columns": [],
        "date_columns": [],
    },
    "capacitaciones_raw": {
        "sheet": "03_Capacitaciones",
        "range": "A4:AM44",
        "type": "table",
        "drop_blank_rows": True,
        "blank_ignore_columns": ["No.", "Subtotal categorías", "Validación subtotal", "Estado fila"],
        "date_columns": ["Fecha *"],
    },
    "asistencias_raw": {
        "sheet": "04_Asistencias",
        "range": "A4:R44",
        "type": "table",
        "drop_blank_rows": True,
        "blank_ignore_columns": ["No.", "Nueva asistencia (auto)", "Estado fila"],
        "date_columns": ["Fecha *"],
    },
    "estudios_raw": {
        "sheet": "05_Estudios",
        "range": "A4:P34",
        "type": "table",
        "drop_blank_rows": True,
        "blank_ignore_columns": ["No.", "Nuevo estudio finalizado (auto)", "Estado fila"],
        "date_columns": ["Fecha *"],
    },
    "pirds_raw": {
        "sheet": "06_PIRDES",
        "range": "A4:O34",
        "type": "table",
        "drop_blank_rows": True,
        "blank_ignore_columns": [
            "No.",
            "Subtotal téc.+oper.",
            "Validación participantes",
            "PIRDES implementado (auto)",
            "Estado fila",
        ],
        "date_columns": ["Fecha *"],
    },
    "reuniones_raw": {
        "sheet": "07_Reuniones",
        "range": "A4:AA34",
        "type": "table",
        "drop_blank_rows": True,
        "blank_ignore_columns": ["No.", "Estado fila"],
        "date_columns": ["Fecha *"],
    },
    "resumen_raw": {
        "sheet": "08_Resumen",
        "range": "A4:D32",
        "type": "table",
        "drop_blank_rows": True,
        "blank_ignore_columns": [],
        "date_columns": [],
    },
}


def get_service():
    creds_info = json.loads(os.environ["GOOGLE_CREDS_JSON"])
    creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def read_range(service, spreadsheet_id: str, range_name: str) -> list[list[Any]]:
    result = (
        service.spreadsheets()
        .values()
        .get(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueRenderOption="UNFORMATTED_VALUE",
            dateTimeRenderOption="SERIAL_NUMBER",
        )
        .execute()
    )
    return result.get("values", [])


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("·", " ").replace("°", " ")
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text.lower()


def google_serial_to_iso(value: Any) -> Any:
    if isinstance(value, (int, float)) and not pd.isna(value):
        # Google Sheets serial dates use 1899-12-30 as day 0.
        base_date = datetime(1899, 12, 30)
        converted = base_date + timedelta(days=float(value))
        return converted.date().isoformat()
    return value


def clean_cell(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def rows_to_dataframe(rows: list[list[Any]]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame()

    header = [str(clean_cell(cell)).strip() for cell in rows[0]]
    data = rows[1:] if len(rows) > 1 else []

    max_cols = max(len(header), max((len(row) for row in data), default=0))
    if len(header) < max_cols:
        header += [f"col_{i + 1}" for i in range(len(header), max_cols)]

    normalized_rows = []
    for row in data:
        row = [clean_cell(v) for v in row]
        if len(row) < max_cols:
            row += [""] * (max_cols - len(row))
        elif len(row) > max_cols:
            row = row[:max_cols]
        normalized_rows.append(row)

    return pd.DataFrame(normalized_rows, columns=header)


def drop_blank_rows(df: pd.DataFrame, blank_ignore_columns: Iterable[str]) -> pd.DataFrame:
    if df.empty:
        return df

    ignored = set(blank_ignore_columns)
    review_columns = [col for col in df.columns if col not in ignored]
    if not review_columns:
        return df

    mask = df[review_columns].apply(
        lambda row: any(str(value).strip() != "" for value in row), axis=1
    )
    return df[mask].reset_index(drop=True)


def convert_date_columns(df: pd.DataFrame, date_columns: Iterable[str]) -> pd.DataFrame:
    for col in date_columns:
        if col in df.columns:
            df[col] = df[col].apply(google_serial_to_iso)
    return df


def flatten_encabezado(encabezado_raw: pd.DataFrame) -> pd.DataFrame:
    if encabezado_raw.empty:
        return pd.DataFrame()

    mapping = {}
    for _, row in encabezado_raw.iterrows():
        field_name = str(row.iloc[0]).strip()
        if not field_name:
            continue
        key = normalize_text(field_name.replace("*", ""))
        mapping[key] = row.iloc[1]

    return pd.DataFrame([mapping])


def extract_context(encabezado_flat: pd.DataFrame) -> dict[str, Any]:
    if encabezado_flat.empty:
        return {}

    row = encabezado_flat.iloc[0].to_dict()
    preferred_order = [
        "programa_id",
        "programa",
        "anio_reportado",
        "mes_reportado",
        "estado_del_reporte",
        "periodo_clave",
        "observaciones_generales_del_mes",
    ]
    return {key: row.get(key, "") for key in preferred_order}


def prepend_context(df: pd.DataFrame, context: dict[str, Any]) -> pd.DataFrame:
    if df.empty or not context:
        return df

    context_df = pd.DataFrame([context] * len(df))
    return pd.concat([context_df, df.reset_index(drop=True)], axis=1)


def save_dataframe(df: pd.DataFrame, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)


def save_manifest(output_dir: Path, spreadsheet_id: str, sheet_title: str, context: dict[str, Any], outputs: list[str]) -> None:
    manifest = {
        "spreadsheet_id": spreadsheet_id,
        "spreadsheet_title": sheet_title,
        "read_at_utc": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "context": context,
        "outputs": outputs,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def get_spreadsheet_title(service, spreadsheet_id: str) -> str:
    result = service.spreadsheets().get(spreadsheetId=spreadsheet_id, fields="properties.title").execute()
    return result.get("properties", {}).get("title", "")


def main() -> None:
    spreadsheet_id = os.environ["SHEET_ID_FORTALECIMIENTO_MUNICIPAL"]
    service = get_service()
    sheet_title = get_spreadsheet_title(service, spreadsheet_id)

    extracted_frames: dict[str, pd.DataFrame] = {}
    written_outputs: list[str] = []

    for output_name, cfg in SECTION_CONFIG.items():
        rows = read_range(service, spreadsheet_id, f"{cfg['sheet']}!{cfg['range'].split('!')[-1]}")
        df = rows_to_dataframe(rows)
        df = convert_date_columns(df, cfg["date_columns"])
        if cfg.get("drop_blank_rows"):
            df = drop_blank_rows(df, cfg.get("blank_ignore_columns", []))
        extracted_frames[output_name] = df

    encabezado_flat = flatten_encabezado(extracted_frames["encabezado_raw"])
    context = extract_context(encabezado_flat)

    # Save header outputs first.
    save_dataframe(extracted_frames["encabezado_raw"], OUTPUT_DIR / "encabezado_raw.csv")
    written_outputs.append("encabezado_raw.csv")

    save_dataframe(encabezado_flat, OUTPUT_DIR / "encabezado.csv")
    written_outputs.append("encabezado.csv")

    # Save the remaining outputs with report context prepended.
    for output_name, df in extracted_frames.items():
        if output_name == "encabezado_raw":
            continue
        enriched_df = prepend_context(df, context)
        filename = f"{output_name}.csv"
        save_dataframe(enriched_df, OUTPUT_DIR / filename)
        written_outputs.append(filename)

    save_manifest(OUTPUT_DIR, spreadsheet_id, sheet_title, context, written_outputs)

    print("Lectura completada para Fortalecimiento Municipal.")
    print(f"Spreadsheet: {sheet_title or spreadsheet_id}")
    for output_name, df in extracted_frames.items():
        print(f"- {output_name}: {len(df)} filas")


if __name__ == "__main__":
    main()
