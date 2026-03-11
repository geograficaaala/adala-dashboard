import os
import json
from pathlib import Path

import pandas as pd
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

def get_service():
    creds_info = json.loads(os.environ["GOOGLE_CREDS_JSON"])
    creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)

def read_range(service, spreadsheet_id: str, range_name: str):
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=range_name)
        .execute()
    )
    return result.get("values", [])

def save_csv(rows, output_path: str):
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        pd.DataFrame().to_csv(output_path, index=False)
        return
    header = rows[0]
    data = rows[1:] if len(rows) > 1 else []
    df = pd.DataFrame(data, columns=header)
    df.to_csv(output_path, index=False)

def main():
    service = get_service()

    sheet_id_cdm = os.environ["SHEET_ID_CDM_ATITLAN"]
    sheet_id_materiales = os.environ["SHEET_ID_MATERIALES_ATITLAN"]

   rows_cdm = read_range(service, sheet_id_cdm, "EXPORT_GITHUB!A1:ZZ1000")
rows_materiales = read_range(service, sheet_id_materiales, "EXPORT_COMPRAS!A1:ZZ3000")

    save_csv(rows_cdm, "data_raw/atitlan_recicla/cdm_raw.csv")
    save_csv(rows_materiales, "data_raw/atitlan_recicla/materiales_raw.csv")

    print("Lectura completada.")
    print(f"CDM filas: {max(len(rows_cdm) - 1, 0)}")
    print(f"Materiales filas: {max(len(rows_materiales) - 1, 0)}")

if __name__ == "__main__":
    main()
