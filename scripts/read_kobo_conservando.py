import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


KOBO_BASE_URL = os.getenv("KOBO_BASE_URL", "https://kf.kobotoolbox.org").rstrip("/")
KOBO_TOKEN = os.environ.get("KOBO_TOKEN", "")
KOBO_ASSET_UID = os.environ.get("KOBO_ASSET_UID", "")
KOBO_EXPORT_NAME = os.environ.get("KOBO_EXPORT_NAME", "")

OUT_DIR = Path("data_raw/conservando_atitlan")
OUT_XLSX = OUT_DIR / "kobo_mensual_raw.xlsx"
OUT_CSV = OUT_DIR / "kobo_mensual_raw.csv"
OUT_META = OUT_DIR / "kobo_export_meta.json"


def require_env(name: str, value: str) -> None:
    if not value.strip():
        raise RuntimeError(f"Falta la variable de entorno requerida: {name}")


def build_api_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Token {KOBO_TOKEN}",
        "Accept": "application/json",
        "User-Agent": "adala-dashboard/1.1",
    }


def build_file_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Token {KOBO_TOKEN}",
        "Accept": "*/*",
        "User-Agent": "adala-dashboard/1.1",
    }


def http_get(url: str, headers: Dict[str, str], timeout: int = 180, tries: int = 6) -> bytes:
    last_error: Optional[Exception] = None
    for attempt in range(tries):
        try:
            request = Request(url=url, headers=headers, method="GET")
            with urlopen(request, timeout=timeout) as response:
                return response.read()
        except HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504):
                body = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else ""
                raise RuntimeError(
                    f"Error HTTP no recuperable al consultar {url}: {e.code}. {body}"
                ) from e
            last_error = e
        except URLError as e:
            last_error = e
        except Exception as e:
            last_error = e

        sleep_seconds = min(30, 2 ** attempt)
        time.sleep(sleep_seconds)

    raise RuntimeError(f"No se pudo consultar {url} tras reintentos. Error: {last_error}")


def http_get_json(url: str, headers: Dict[str, str], timeout: int = 180, tries: int = 6) -> Any:
    raw = http_get(url, headers=headers, timeout=timeout, tries=tries)
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise RuntimeError(f"La respuesta no es JSON válido para {url}") from e


def absolutize(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if url.startswith("/"):
        return KOBO_BASE_URL + url
    return url


def fetch_all_export_settings(headers: Dict[str, str]) -> List[Dict[str, Any]]:
    url = f"{KOBO_BASE_URL}/api/v2/assets/{KOBO_ASSET_UID}/export-settings/"
    results: List[Dict[str, Any]] = []

    while url:
        payload = http_get_json(url, headers=headers, timeout=120, tries=5)

        if isinstance(payload, dict) and "results" in payload:
            page_results = payload.get("results") or []
            if not isinstance(page_results, list):
                raise RuntimeError("La API de Kobo devolvió un formato inesperado en 'results'.")
            results.extend(page_results)
            url = payload.get("next")
        elif isinstance(payload, list):
            results.extend(payload)
            url = None
        else:
            raise RuntimeError("La API de Kobo devolvió un formato inesperado al listar export-settings.")

    return results


def find_named_export(export_settings: List[Dict[str, Any]], export_name: str) -> Dict[str, Any]:
    for item in export_settings:
        name = str(item.get("name") or item.get("title") or "").strip()
        if name == export_name:
            return item

    available = sorted(
        {str(item.get("name") or item.get("title") or "").strip() for item in export_settings if item}
    )
    raise RuntimeError(
        "No encontré el export nombrado en Kobo. "
        f"Busqué: '{export_name}'. Disponibles: {available}"
    )


def choose_download_target(export_setting: Dict[str, Any]) -> Tuple[str, str]:
    data_url_xlsx = absolutize(str(export_setting.get("data_url_xlsx") or ""))
    data_url_csv = absolutize(str(export_setting.get("data_url_csv") or ""))

    if data_url_xlsx:
        return data_url_xlsx, "xlsx"
    if data_url_csv:
        return data_url_csv, "csv"

    settings_url = absolutize(str(export_setting.get("url") or ""))
    if settings_url:
        # Preferimos XLSX para conservar repeat groups.
        return settings_url.rstrip("/") + "/data.xlsx", "xlsx"

    export_uid = str(export_setting.get("uid") or "").strip()
    if export_uid:
        return (
            f"{KOBO_BASE_URL}/api/v2/assets/{KOBO_ASSET_UID}/export-settings/{export_uid}/data.xlsx",
            "xlsx",
        )

    raise RuntimeError("El export-setting de Kobo no trae URLs utilizables ni 'uid'.")


def save_outputs(file_bytes: bytes, export_setting: Dict[str, Any], file_url: str, file_kind: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    saved_file = OUT_XLSX if file_kind == "xlsx" else OUT_CSV
    saved_file.write_bytes(file_bytes)

    # Limpia el otro archivo para no dejar versiones mezcladas.
    other_file = OUT_CSV if file_kind == "xlsx" else OUT_XLSX
    if other_file.exists():
        other_file.unlink()

    metadata = {
        "kobo_base_url": KOBO_BASE_URL,
        "asset_uid": KOBO_ASSET_UID,
        "export_name": KOBO_EXPORT_NAME,
        "export_uid": export_setting.get("uid"),
        "export_url": export_setting.get("url"),
        "data_url_csv": export_setting.get("data_url_csv"),
        "data_url_xlsx": export_setting.get("data_url_xlsx"),
        "downloaded_kind": file_kind,
        "downloaded_url": file_url,
        "saved_file": str(saved_file),
        "size_bytes": len(file_bytes),
    }
    OUT_META.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    require_env("KOBO_TOKEN", KOBO_TOKEN)
    require_env("KOBO_ASSET_UID", KOBO_ASSET_UID)
    require_env("KOBO_EXPORT_NAME", KOBO_EXPORT_NAME)

    api_headers = build_api_headers()
    file_headers = build_file_headers()

    export_settings = fetch_all_export_settings(api_headers)
    named_export = find_named_export(export_settings, KOBO_EXPORT_NAME)
    download_url, file_kind = choose_download_target(named_export)
    file_bytes = http_get(download_url, headers=file_headers, timeout=240, tries=7)

    if not file_bytes:
        raise RuntimeError(f"Kobo respondió sin contenido para el archivo {file_kind} exportado.")

    save_outputs(file_bytes, named_export, download_url, file_kind)

    saved_path = OUT_XLSX if file_kind == "xlsx" else OUT_CSV
    print("Descarga Kobo completada.")
    print(f"Archivo guardado: {saved_path}")
    print(f"Tipo descargado: {file_kind}")
    print(f"Bytes descargados: {len(file_bytes)}")
    print(f"Export usado: {KOBO_EXPORT_NAME}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
