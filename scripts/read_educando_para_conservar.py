import json
import os
from pathlib import Path

import pandas as pd
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

RAW_DIR = Path("data_raw/educando_para_conservar")
RAW_DIR.mkdir(parents=True, exist_ok=True)

TAB_CONFIG = {
    "01_encabezado_raw.csv": {
        "range": "01_Encabezado!A1:F40",
        "mode": "fixed_header",
        "header": ["campo_1", "campo_2", "campo_3", "campo_4", "campo_5", "campo_6"],
    },
    "02_modulos_activos_raw.csv": {
        "range": "02_Modulos_Activos!A1:F40",
        "mode": "fixed_header",
        "header": ["campo_1", "campo_2", "campo_3", "campo_4", "campo_5", "campo_6"],
    },
    "03_cobertura_pedagogica_raw.csv": {
        "range": "03_Cobertura_Pedagogica!A1:Z1200",
        "mode": "first_row_header",
    },
    "04_actividades_campo_raw.csv": {
        "range": "04_Actividades_Campo!A1:Z1200",
        "mode": "first_row_header",
    },
    "05_diplomado_juvenil_raw.csv": {
        "range": "05_Diplomado_Juvenil!A1:Z1200",
        "mode": "first_row_header",
    },
    "06_coordinacion_raw.csv": {
        "range": "06_Coordinacion!A1:Z1200",
        "mode": "first_row_header",
    },
    "07_insumos_informe_raw.csv": {
        "range": "07_Insumos_Informe!A1:Z1200",
        "mode": "first_row_header",
    },
    "08a_cierre_mensual_indicadores_raw.csv": {
        "range": "08A_Cierre_Mensual_Indicadores!A5:AH40",
        "mode": "first_row_header",
    },
    "09_dashboard_helper_raw.csv": {
        "range": "09_Dashboard_Helper!A5:O40",
        "mode": "first_row_header",
    },
    "99_listas_y_metas_raw.csv": {
        "range": "99_Listas_y_Metas!A1:AI80",
        "mode": "fixed_header_auto",
    },
}


def get_service():
    creds_info = json.loads(os.environ["GOOGLE_CREDS_JSON"])
    creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def read_range(service, spreadsheet_id: str, range_name: str):
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


def normalize_headers(raw_headers):
    seen = {}
    headers = []

    for i, value in enumerate(raw_headers, start=1):
        name = str(value).strip() if value is not None else ""
        if not name:
            name = f"col_{i}"

        count = seen.get(name, 0) + 1
        seen[name] = count

        headers.append(name if count == 1 else f"{name}__{count}")

    return headers


def save_rows(rows, output_path: Path, mode: str, fixed_header=None):
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

    normalized = []
    for row in data:
        row = ["" if v is None else str(v) for v in row]

        if len(row) < max_cols:
            row += [""] * (max_cols - len(row))
        elif len(row) > max_cols:
            row = row[:max_cols]

        normalized.append(row)

    df = pd.DataFrame(normalized, columns=headers)
    df.to_csv(output_path, index=False)
    return len(df)


def main():
    service = get_service()
    spreadsheet_id = os.environ["SHEET_ID_EDUCANDO_PARA_CONSERVAR"]

    manifest = {
        "spreadsheet_id": spreadsheet_id,
        "files": [],
    }

    for filename, cfg in TAB_CONFIG.items():
        rows = read_range(service, spreadsheet_id, cfg["range"])
        output = RAW_DIR / filename

        count = save_rows(
            rows,
            output,
            mode=cfg["mode"],
            fixed_header=cfg.get("header"),
        )

        manifest["files"].append(
            {
                "filename": filename,
                "range": cfg["range"],
                "rows_saved": count,
            }
        )

        print(f"{filename}: {count} filas guardadas")

    (RAW_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("Lectura de Google Sheets completada.")


if __name__ == "__main__":
    main()
