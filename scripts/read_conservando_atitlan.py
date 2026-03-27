import json
import os
from pathlib import Path

import pandas as pd
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
RAW_DIR = Path("data_raw/conservando_atitlan")
RAW_DIR.mkdir(parents=True, exist_ok=True)

TAB_CONFIG = {
    "01_encabezado_raw.csv": {
        "range": "01_Encabezado!A4:C40",
        "mode": "fixed_header",
        "header": ["campo", "valor", "nota"],
    },
    "02_modulos_raw.csv": {
        "range": "02_Modulos!A4:C40",
        "mode": "fixed_header",
        "header": ["modulo", "activo_este_mes", "nota"],
    },
    "03_recoleccion_raw.csv": {
        "range": "03_Recoleccion!A5:I1200",
        "mode": "first_row_header",
    },
    "03a_clientes_recurrentes_raw.csv": {
        "range": "03A_Clientes_Recurrentes!A5:L1200",
        "mode": "first_row_header",
    },
    "04_produccion_raw.csv": {
        "range": "04_Produccion!A5:H1200",
        "mode": "first_row_header",
    },
    "05_ventas_raw.csv": {
        "range": "05_Ventas!A5:Q1200",
        "mode": "first_row_header",
    },
    "06_publicaciones_raw.csv": {
        "range": "06_Publicaciones!A5:H1200",
        "mode": "first_row_header",
    },
    "07_pruebas_liquido_raw.csv": {
        "range": "07_Pruebas_Liquido!A5:H1200",
        "mode": "first_row_header",
    },
    "08_resumen_raw.csv": {
        "range": "08_Resumen!A7:H40",
        "mode": "first_row_header",
    },
    "09_clientes_recurrentes_catalogo_raw.csv": {
        "range": "09_Clientes_Recurrentes!A5:I1200",
        "mode": "first_row_header",
    },
    "99_listas_y_precios_raw.csv": {
        "range": "99_Listas_y_Precios!A1:Z120",
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
    spreadsheet_id = os.environ["SHEET_ID_CONSERVANDO_ATITLAN"]

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
