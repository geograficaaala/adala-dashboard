#!/usr/bin/env python3
"""Lee el export nombrado de Kobo para Educando para Conservar.

Variables de entorno esperadas:
- KOBO_EPC_TOKEN
- KOBO_EPC_ASSET_UID
- KOBO_EPC_EXPORT_NAME
Opcionales:
- KOBO_EPC_BASE_URL
- KOBO_BASE_URL

Salida:
- data_raw/educando_para_conservar/kobo_mensual_raw.xlsx
- data_raw/educando_para_conservar/kobo_export_meta.json
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data_raw" / "educando_para_conservar"
OUT_XLSX = OUT_DIR / "kobo_mensual_raw.xlsx"
OUT_META = OUT_DIR / "kobo_export_meta.json"
DEFAULT_BASE_URL = "https://kf.kobotoolbox.org"


def getenv_required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Falta la variable de entorno requerida: {name}")
    return value


def http_get(url: str, *, headers: dict[str, str], timeout: int = 120, tries: int = 5) -> bytes:
    delay = 2
    last_error: Exception | None = None

    for attempt in range(1, tries + 1):
        request = Request(url, headers=headers, method="GET")
        try:
            with urlopen(request, timeout=timeout) as response:
                return response.read()
        except HTTPError as exc:
            last_error = exc
            if exc.code in {429, 500, 502, 503, 504} and attempt < tries:
                time.sleep(delay)
                delay *= 2
                continue
            body = None
            try:
                body = exc.read().decode("utf-8", errors="ignore")
            except Exception:
                pass
            raise RuntimeError(
                f"Error HTTP no recuperable al consultar {url}: {exc.code}. {body}"
            ) from exc
        except URLError as exc:
            last_error = exc
            if attempt < tries:
                time.sleep(delay)
                delay *= 2
                continue
            raise RuntimeError(f"Error de red al consultar {url}: {exc}") from exc

    raise RuntimeError(f"No fue posible consultar {url}: {last_error}")


def get_export_settings(base_url: str, asset_uid: str, token: str) -> list[dict[str, Any]]:
    url = f"{base_url}/api/v2/assets/{asset_uid}/export-settings/"
    payload = http_get(
        url,
        headers={
            "Authorization": f"Token {token}",
            "Accept": "application/json",
        },
    )
    data = json.loads(payload.decode("utf-8"))
    return data.get("results", [])


def pick_export(exports: list[dict[str, Any]], export_name: str) -> dict[str, Any]:
    wanted = export_name.strip().lower()
    for item in exports:
        name = str(item.get("name", "")).strip().lower()
        if name == wanted:
            return item
    available = [str(item.get("name", "")).strip() for item in exports]
    raise RuntimeError(
        "No se encontró el export nombrado "
        f"'{export_name}'. Disponibles: {available}"
    )


def main() -> int:
    token = getenv_required("KOBO_EPC_TOKEN")
    asset_uid = getenv_required("KOBO_EPC_ASSET_UID")
    export_name = getenv_required("KOBO_EPC_EXPORT_NAME")
    base_url = (
        os.getenv("KOBO_EPC_BASE_URL")
        or os.getenv("KOBO_BASE_URL")
        or DEFAULT_BASE_URL
    ).rstrip("/")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    exports = get_export_settings(base_url, asset_uid, token)
    export_item = pick_export(exports, export_name)

    # Preferimos XLSX porque el formulario tiene repeticiones.
    file_url = (
        export_item.get("data_url_xlsx")
        or export_item.get("data_url")
        or export_item.get("data_url_csv")
    )
    if not file_url:
        raise RuntimeError(
            "El export nombrado existe, pero no trae una URL de descarga válida. "
            "Revisa que el export se haya guardado correctamente en Kobo."
        )

    xlsx_bytes = http_get(
        file_url,
        headers={
            "Authorization": f"Token {token}",
            "Accept": "*/*",
        },
        timeout=240,
        tries=7,
    )

    OUT_XLSX.write_bytes(xlsx_bytes)

    meta = {
        "programa": "educando_para_conservar",
        "asset_uid": asset_uid,
        "export_name": export_name,
        "base_url": base_url,
        "download_url": file_url,
        "saved_file": str(OUT_XLSX.relative_to(ROOT)),
        "saved_at_unix": int(time.time()),
        "export_item": export_item,
    }
    OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"OK: raw guardado en {OUT_XLSX}")
    print(f"OK: metadatos guardados en {OUT_META}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
