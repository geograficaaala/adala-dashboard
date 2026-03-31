import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
PROGRAM_SLUG = "reforestacion"
RAW_DIR = Path(f"data_raw/{PROGRAM_SLUG}")
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Configuración basada en el archivo Reforestando_pipeline_listo.xlsx.
# La idea es leer tanto las hojas operativas como las hojas derivadas que
# después servirán al transform y a futuros gráficos/KPIs.
TAB_CONFIG: Dict[str, Dict[str, Any]] = {
    "_listas_raw.csv": {
        "range": "_listas!A1:H40",
        "mode": "first_row_header",
    },
    "01_encabezado_raw.csv": {
        "range": "01_Encabezado!A4:F40",
        "mode": "fixed_header",
        "header": ["campo_1", "campo_2", "campo_3", "campo_4", "campo_5", "campo_6"],
    },
    "02_componentes_raw.csv": {
        "range": "02_Componentes!A4:G40",
        "mode": "first_row_header",
    },
    "03_monitoreos_raw.csv": {
        "range": "03_Monitoreos!A3:R1200",
        "mode": "first_row_header",
    },
    "04_siembras_raw.csv": {
        "range": "04_Siembras!A3:M1200",
        "mode": "first_row_header",
    },
    "05_sig_cartografia_raw.csv": {
        "range": "05_SIG_Cartografia!A3:J1200",
        "mode": "first_row_header",
    },
    "06_vivero_raw.csv": {
        "range": "06_Vivero!A3:L200",
        "mode": "first_row_header",
    },
    "07_otras_actividades_raw.csv": {
        "range": "07_Otras_actividades!A3:G300",
        "mode": "first_row_header",
    },
    "08_resumen_raw.csv": {
        "range": "08_Resumen!A4:H40",
        "mode": "first_row_header",
    },
    "08a_cierre_mensual_indicadores_raw.csv": {
        "range": "08A_Cierre_Mensual_Indicadores!A4:AQ40",
        "mode": "first_row_header",
    },
    "09_catalogos_raw.csv": {
        "range": "09_Catalogos!A5:D120",
        "mode": "first_row_header",
    },
    "10_kpi_graficos_raw.csv": {
        "range": "10_KPI_Graficos!A4:U300",
        "mode": "first_row_header",
    },
}


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Falta la variable de entorno requerida: {name}")
    return value


def get_service():
    creds_json = require_env("GOOGLE_CREDS_JSON")
    try:
        creds_info = json.loads(creds_json)
    except json.JSONDecodeError as exc:
        raise RuntimeError("GOOGLE_CREDS_JSON no contiene JSON válido.") from exc

    creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds, cache_discovery=False)


def read_range(service, spreadsheet_id: str, range_name: str) -> List[List[Any]]:
    try:
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
    except HttpError as exc:
        raise RuntimeError(
            f"Error leyendo el rango '{range_name}' del spreadsheet '{spreadsheet_id}': {exc}"
        ) from exc

    return result.get("values", [])


def normalize_headers(raw_headers: List[Any]) -> List[str]:
    seen: Dict[str, int] = {}
    headers: List[str] = []

    for i, value in enumerate(raw_headers, start=1):
        name = str(value).strip() if value is not None else ""
        if not name:
            name = f"col_{i}"

        count = seen.get(name, 0) + 1
        seen[name] = count
        headers.append(name if count == 1 else f"{name}__{count}")

    return headers


def pad_or_trim_row(row: List[Any], width: int) -> List[str]:
    normalized = ["" if value is None else str(value) for value in row]

    if len(normalized) < width:
        normalized += [""] * (width - len(normalized))
    elif len(normalized) > width:
        normalized = normalized[:width]

    return normalized


def save_rows(rows: List[List[Any]], output_path: Path, mode: str, fixed_header=None) -> int:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not rows:
        pd.DataFrame().to_csv(output_path, index=False)
        return 0

    if mode == "fixed_header":
        headers = fixed_header or [f"col_{i}" for i in range(1, len(rows[0]) + 1)]
        data = rows
    elif mode == "fixed_header_auto":
        max_cols = max(len(r) for r in rows)
        headers = [f"col_{i}" for i in range(1, max_cols + 1)]
        data = rows
    elif mode == "first_row_header":
        headers = normalize_headers(rows[0])
        data = rows[1:]
    else:
        raise ValueError(f"Modo no soportado: {mode}")

    max_cols = max(len(headers), max((len(r) for r in data), default=0))
    if len(headers) < max_cols:
        headers = headers + [f"col_{i}" for i in range(len(headers) + 1, max_cols + 1)]

    normalized_rows = [pad_or_trim_row(row, max_cols) for row in data]
    df = pd.DataFrame(normalized_rows, columns=headers)
    df.to_csv(output_path, index=False)
    return len(df)


def build_manifest(spreadsheet_id: str) -> Dict[str, Any]:
    return {
        "program": PROGRAM_SLUG,
        "spreadsheet_id": spreadsheet_id,
        "files": [],
    }


def main():
    spreadsheet_id = require_env("SHEET_ID_REFORESTACION")
    service = get_service()
    manifest = build_manifest(spreadsheet_id)

    print(f"Leyendo Google Sheet del programa '{PROGRAM_SLUG}'...")
    print(f"Destino raw: {RAW_DIR}")

    for filename, cfg in TAB_CONFIG.items():
        rows = read_range(service, spreadsheet_id, cfg["range"])
        output_path = RAW_DIR / filename

        row_count = save_rows(
            rows,
            output_path,
            mode=cfg["mode"],
            fixed_header=cfg.get("header"),
        )

        manifest["files"].append(
            {
                "filename": filename,
                "range": cfg["range"],
                "mode": cfg["mode"],
                "rows_saved": row_count,
            }
        )

        print(f"{filename}: {row_count} filas guardadas")

    manifest_path = RAW_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Manifest guardado en: {manifest_path}")
    print("Lectura de Google Sheets completada.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
