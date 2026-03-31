from __future__ import annotations
import json
import shutil
from pathlib import Path

import pandas as pd

PROGRAM_ID = "reforestacion"
PROGRAM_NAME = "Reforestación"

RAW_DIR = Path("data_raw/reforestacion")
OUT_DIR = Path("data_processed/reforestacion")
DOCS_DIR = Path("docs/data/reforestacion")

OUT_DIR.mkdir(parents=True, exist_ok=True)
DOCS_DIR.mkdir(parents=True, exist_ok=True)

MONTH_NAMES_ES = {
    1: "Enero",
    2: "Febrero",
    3: "Marzo",
    4: "Abril",
    5: "Mayo",
    6: "Junio",
    7: "Julio",
    8: "Agosto",
    9: "Septiembre",
    10: "Octubre",
    11: "Noviembre",
    12: "Diciembre",
}
MONTH_NUM_ES = {name.lower(): num for num, name in MONTH_NAMES_ES.items()}

STATUS_MAP = {
    "cumplida": "verde",
    "en ruta": "amarillo",
    "atención": "rojo",
    "atencion": "rojo",
    "inicial": "azul",
    "sin avance": "rojo",
    "no inicia": "gris",
    "en proceso": "azul",
    "logrado": "verde",
    "activo": "azul",
    "sin datos": "gris",
    "con movimiento": "azul",
    "sin movimiento": "gris",
}

TOTAL_FIELD_SPECS = [
    ("estado_reporte", "Estado reporte", "text"),
    ("monitoreo_activo", "Monitoreo activo", "bool"),
    ("ha_monitoreadas_registradas_mes", "Ha monitoreadas registradas", "float"),
    ("ha_monitoreadas_kpi_mes", "Ha monitoreadas KPI", "float"),
    ("ha_monitoreadas_kpi_acum", "Ha monitoreadas acum KPI", "float"),
    ("meta_ha", "Meta ha", "float"),
    ("pct_meta_ha", "% meta ha", "float"),
    ("eventos_monitoreo_mes", "Eventos monitoreo", "float"),
    ("eventos_cartografia_mes", "Eventos con cartografía", "float"),
    ("pct_cartografia_mes", "% cartografía mes", "float"),
    ("pct_cartografia_acum", "% cartografía acum", "float"),
    ("siembra_activa", "Siembra activa", "bool"),
    ("arboles_sembrados_registrados_mes", "Árboles sembrados registrados", "float"),
    ("arboles_sembrados_kpi_mes", "Árboles sembrados KPI", "float"),
    ("arboles_sembrados_acum", "Árboles sembrados acum", "float"),
    ("meta_arboles", "Meta árboles", "float"),
    ("pct_meta_arboles", "% meta árboles", "float"),
    ("area_intervenida_ha_mes", "Área intervenida (ha)", "float"),
    ("aporte_sig_mes", "Aporte SIG del mes", "float"),
    ("aporte_sig_acum", "Aporte SIG acum", "float"),
    ("meta_unidad_sig", "Meta unidad SIG", "float"),
    ("pct_meta_sig", "% meta SIG", "float"),
    ("hitos_sig_logrados_mes", "Hitos SIG logrados", "float"),
    ("vivero_activo", "Vivero activo", "bool"),
    ("plantas_netas_mes", "Plantas netas mes", "float"),
    ("plantas_netas_acum", "Plantas netas acum", "float"),
    ("meta_plantas", "Meta plantas", "float"),
    ("pct_meta_plantas", "% meta plantas", "float"),
    ("especies_activas_mes", "Especies activas mes", "float"),
    ("especies_acumuladas_proxy", "Especies acumuladas proxy", "float"),
    ("meta_especies", "Meta especies", "float"),
    ("pct_meta_especies", "% meta especies", "float"),
    ("logros_texto", "Logros del mes", "text"),
    ("alertas_texto", "Alertas / notas", "text"),
    ("fuente_texto", "Fuente / soporte", "text"),
    ("semaforo_ha_texto", "Semáforo ha", "text"),
    ("semaforo_arboles_texto", "Semáforo árboles", "text"),
    ("semaforo_sig_texto", "Semáforo SIG", "text"),
    ("semaforo_plantas_texto", "Semáforo plantas", "text"),
    ("semaforo_especies_texto", "Semáforo especies", "text"),
]

KPI_FIELD_MAP = {
    "Indicador ID": "indicador_grupo_id",
    "Indicador": "indicador_grupo_nombre",
    "Subindicador ID": "subindicador_id",
    "Subindicador": "subindicador_nombre",
    "Orden indicador": "orden_indicador",
    "Mes orden": "mes_orden",
    "Mes": "mes_label",
    "Periodo clave": "periodo_clave",
    "Categoría": "categoria",
    "Modelo": "modelo_medicion",
    "Activo mes": "activo_mes",
    "Unidad": "unidad",
    "Valor mes": "valor_mes",
    "Valor acumulado": "valor_acumulado",
    "Meta anual": "meta_anual",
    "% meta anual": "pct_meta_anual",
    "Semáforo": "estatus_texto_original",
    "Fuente": "fuente",
    "Ventana inicio": "ventana_inicio",
    "Ventana fin": "ventana_fin",
    "Nota técnica": "nota_metodologica",
}


def read_csv(name: str) -> pd.DataFrame:
    path = RAW_DIR / name
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, dtype=str).fillna("")
    df.columns = [str(c).strip() for c in df.columns]
    return df


def safe_text(value) -> str:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass
    text = str(value).strip()
    return "" if text.lower() == "nan" else " ".join(text.split())


def parse_number(value):
    if value is None:
        return pd.NA
    s = str(value).strip().replace(" ", "")
    if s == "" or s.lower() in {"nan", "na", "n/a", "none", "null", "-"}:
        return pd.NA
    try:
        if "," in s and "." in s:
            if s.rfind(".") > s.rfind(","):
                s = s.replace(",", "")
            else:
                s = s.replace(".", "").replace(",", ".")
        elif "," in s:
            s = s.replace(",", ".")
        return float(s)
    except Exception:
        return pd.NA


def safe_float(value, default=0.0) -> float:
    num = parse_number(value)
    return float(num) if pd.notna(num) else float(default)


def safe_int(value, default=0) -> int:
    return int(round(safe_float(value, default)))


def safe_bool(value) -> bool:
    return safe_text(value).lower() in {"sí", "si", "true", "1", "yes", "y", "x", "verdadero"}


def parse_date_any(value):
    if value is None:
        return pd.NaT
    s = str(value).strip()
    if s == "" or s.lower() in {"nan", "na", "n/a", "none"}:
        return pd.NaT

    num = parse_number(s)
    if pd.notna(num):
        try:
            n = float(num)
            if n > 20000:
                return pd.Timestamp("1899-12-30") + pd.to_timedelta(n, unit="D")
        except Exception:
            pass

    dt = pd.to_datetime(s, errors="coerce", dayfirst=False)
    if pd.notna(dt):
        return dt

    dt = pd.to_datetime(s, errors="coerce", dayfirst=True)
    if pd.notna(dt):
        return dt

    return pd.NaT


def month_num_from_label(label: str):
    text = safe_text(label).lower()
    if text in MONTH_NUM_ES:
        return MONTH_NUM_ES[text]
    return pd.NA


def month_name(month_num: int, fallback: str = "") -> str:
    return MONTH_NAMES_ES.get(int(month_num), fallback or f"Mes {month_num}")


def normalize_status(text: str) -> str:
    raw = safe_text(text).lower()
    return STATUS_MAP.get(raw, "gris" if raw == "" else "azul")


def has_real_data(record: dict) -> bool:
    numeric_keys = [
        "ha_monitoreadas_kpi_mes",
        "ha_monitoreadas_kpi_acum",
        "arboles_sembrados_kpi_mes",
        "arboles_sembrados_acum",
        "aporte_sig_mes",
        "aporte_sig_acum",
        "plantas_netas_mes",
        "plantas_netas_acum",
        "especies_activas_mes",
        "especies_acumuladas_proxy",
    ]
    for key in numeric_keys:
        if safe_float(record.get(key), 0.0) != 0:
            return True
    text_keys = ["logros_texto", "alertas_texto", "fuente_texto", "estado_reporte"]
    return any(safe_text(record.get(key)) for key in text_keys)


def build_total_mes(cierre: pd.DataFrame) -> pd.DataFrame:
    if cierre.empty:
        return pd.DataFrame()

    rows = []
    fallback_year = None

    # Detecta año predominante si ya viene una fecha válida en alguna fila.
    fechas_validas = cierre.get("Fecha corte", pd.Series(dtype=str)).apply(parse_date_any)
    fechas_validas = fechas_validas[fechas_validas.notna()]
    if not fechas_validas.empty:
        fallback_year = int(fechas_validas.iloc[0].year)

    for _, r in cierre.iterrows():
        row = r.to_dict()
        fecha_corte = parse_date_any(row.get("Fecha corte"))
        mes_label = safe_text(row.get("Mes"))
        mes_num = int(fecha_corte.month) if pd.notna(fecha_corte) else month_num_from_label(mes_label)
        anio = int(fecha_corte.year) if pd.notna(fecha_corte) else fallback_year

        if pd.isna(mes_num) or not anio:
            continue

        periodo_clave = f"{int(anio)}-{int(mes_num):02d}"
        mes_label = mes_label or month_name(int(mes_num))

        record = {
            "program_id": PROGRAM_ID,
            "program_name": PROGRAM_NAME,
            "periodo_clave": periodo_clave,
            "anio": int(anio),
            "mes_num": int(mes_num),
            "mes_label": mes_label,
            "fecha_corte": "" if pd.isna(fecha_corte) else fecha_corte.strftime("%Y-%m-%d"),
        }

        for output_col, source_col, field_type in TOTAL_FIELD_SPECS:
            raw_value = row.get(source_col, "")
            if field_type == "float":
                record[output_col] = safe_float(raw_value, 0.0)
            elif field_type == "bool":
                record[output_col] = safe_bool(raw_value)
            else:
                record[output_col] = safe_text(raw_value)

        record["estatus_reporte"] = record.pop("estado_reporte", "")
        record["semaforo_ha"] = normalize_status(record.pop("semaforo_ha_texto", ""))
        record["semaforo_arboles"] = normalize_status(record.pop("semaforo_arboles_texto", ""))
        record["semaforo_sig"] = normalize_status(record.pop("semaforo_sig_texto", ""))
        record["semaforo_plantas"] = normalize_status(record.pop("semaforo_plantas_texto", ""))
        record["semaforo_especies"] = normalize_status(record.pop("semaforo_especies_texto", ""))

        record["aporta_metas_programa"] = any([
            bool(record["monitoreo_activo"]),
            bool(record["siembra_activa"]),
            bool(record["vivero_activo"]),
            record["ha_monitoreadas_kpi_mes"] > 0,
            record["arboles_sembrados_kpi_mes"] > 0,
            record["aporte_sig_mes"] > 0,
            record["plantas_netas_mes"] > 0,
            record["especies_activas_mes"] > 0,
        ])

        if not has_real_data(record):
            continue

        rows.append(record)

    total = pd.DataFrame(rows)
    if total.empty:
        return total

    total = total.sort_values(["anio", "mes_num"]).reset_index(drop=True)
    total["tiene_datos_mes"] = total.apply(
        lambda r: any([
            safe_float(r["ha_monitoreadas_kpi_mes"]) > 0,
            safe_float(r["arboles_sembrados_kpi_mes"]) > 0,
            safe_float(r["aporte_sig_mes"]) > 0,
            safe_float(r["plantas_netas_mes"]) > 0,
            safe_float(r["especies_activas_mes"]) > 0,
            safe_text(r["logros_texto"]) != "",
            safe_text(r["alertas_texto"]) != "",
        ]),
        axis=1,
    )
    total["is_latest_data_month"] = False
    total.loc[total.index[-1], "is_latest_data_month"] = True
    return total


def build_kpi_dataset(kpi_raw: pd.DataFrame, total: pd.DataFrame) -> pd.DataFrame:
    if kpi_raw.empty:
        return pd.DataFrame()

    rows = []
    latest_period = safe_text(total.iloc[-1]["periodo_clave"]) if not total.empty else ""

    # Para un orden estable dentro de cada grupo.
    suborder_seen: dict[str, int] = {}

    for _, r in kpi_raw.iterrows():
        row = r.to_dict()
        normalized = {}

        for raw_col, out_col in KPI_FIELD_MAP.items():
            normalized[out_col] = row.get(raw_col, "")

        periodo = safe_text(normalized["periodo_clave"])
        mes_orden = safe_int(normalized["mes_orden"], 0)
        mes_label = safe_text(normalized["mes_label"])
        mes_num = 0

        if len(periodo) >= 7 and "-" in periodo:
            try:
                mes_num = int(periodo.split("-", 1)[1][:2])
            except Exception:
                mes_num = mes_orden
        elif mes_orden:
            mes_num = mes_orden
            periodo = f"2026-{mes_num:02d}"
        else:
            mes_num = month_num_from_label(mes_label)
            if pd.notna(mes_num):
                periodo = f"2026-{int(mes_num):02d}"
                mes_num = int(mes_num)
            else:
                continue

        indicador_grupo_id = safe_text(normalized["indicador_grupo_id"])
        subindicador_id = safe_text(normalized["subindicador_id"])
        if not indicador_grupo_id or not subindicador_id:
            continue

        sub_key = f"{indicador_grupo_id}::{subindicador_id}"
        if sub_key not in suborder_seen:
            suborder_seen[sub_key] = len(suborder_seen) + 1

        activo_mes = safe_bool(normalized["activo_mes"])
        valor_mes = safe_float(normalized["valor_mes"], 0.0)
        valor_acumulado = safe_float(normalized["valor_acumulado"], 0.0)
        meta_anual = safe_float(normalized["meta_anual"], 0.0)
        pct_meta_anual = safe_float(normalized["pct_meta_anual"], 0.0)

        rows.append(
            {
                "program_id": PROGRAM_ID,
                "program_name": PROGRAM_NAME,
                "periodo_clave": periodo,
                "mes_num": mes_num,
                "mes_label": mes_label or month_name(mes_num),
                "indicator_id": f"{indicador_grupo_id}__{subindicador_id}",
                "indicador_grupo_id": indicador_grupo_id,
                "indicador_grupo_nombre": safe_text(normalized["indicador_grupo_nombre"]),
                "subindicador_id": subindicador_id,
                "indicador_nombre": safe_text(normalized["subindicador_nombre"]),
                "unidad": safe_text(normalized["unidad"]),
                "categoria": safe_text(normalized["categoria"]) or "programa",
                "modelo_medicion": safe_text(normalized["modelo_medicion"]),
                "valor_mes": valor_mes,
                "valor_acumulado": valor_acumulado,
                "meta_mes": 0.0,
                "meta_anual": meta_anual,
                "esperado_al_corte": 0.0,
                "pct_meta_anual": pct_meta_anual,
                "pct_vs_esperado": pct_meta_anual,
                "cumplio_mes": 1 if valor_mes > 0 else 0,
                "meses_cumplidos": 0,
                "meses_transcurridos": 0,
                "aporta_metas_programa": activo_mes or valor_acumulado > 0,
                "es_exigible": activo_mes or valor_acumulado > 0,
                "estatus_texto_original": safe_text(normalized["estatus_texto_original"]),
                "estatus": normalize_status(normalized["estatus_texto_original"]),
                "orden_dashboard": (safe_int(normalized["orden_indicador"], 0) * 10) + suborder_seen[sub_key],
                "nota_metodologica": safe_text(normalized["nota_metodologica"]),
                "fuente": safe_text(normalized["fuente"]),
                "ventana_inicio": safe_text(normalized["ventana_inicio"]),
                "ventana_fin": safe_text(normalized["ventana_fin"]),
                "activo_mes": activo_mes,
                "is_latest_data_month": periodo == latest_period,
            }
        )

    kpi = pd.DataFrame(rows)
    if kpi.empty:
        return kpi

    kpi = kpi.sort_values(["mes_num", "orden_dashboard"]).reset_index(drop=True)

    # Meses transcurridos por subindicador, contando solo meses activos.
    kpi["meses_transcurridos"] = (
        kpi.sort_values(["indicator_id", "mes_num"])
        .groupby("indicator_id")["activo_mes"]
        .transform(lambda s: s.astype(int).cumsum())
        .astype(int)
    )

    # Para estos modelos no existe meta esperada mensual; dejamos el porcentaje anual
    # como referencia principal y "esperado_al_corte" en 0 de forma explícita.
    return kpi


def build_metadata(total: pd.DataFrame, indicators: pd.DataFrame) -> pd.DataFrame:
    if total.empty:
        return pd.DataFrame(
            [
                {
                    "program_id": PROGRAM_ID,
                    "program_name": PROGRAM_NAME,
                    "latest_period": "",
                    "latest_month_label": "",
                    "first_period": "",
                    "periods_count": 0,
                    "indicators_count": int(len(indicators)),
                }
            ]
        )

    periodos = total["periodo_clave"].astype(str).tolist()
    return pd.DataFrame(
        [
            {
                "program_id": PROGRAM_ID,
                "program_name": PROGRAM_NAME,
                "latest_period": periodos[-1],
                "latest_month_label": safe_text(total.iloc[-1]["mes_label"]),
                "first_period": periodos[0],
                "periods_count": len(periodos),
                "periodos_detectados": " | ".join(periodos),
                "indicators_count": int(indicators["indicator_id"].nunique()) if not indicators.empty else 0,
            }
        ]
    )


def copy_to_docs(*filenames) -> None:
    for filename in filenames:
        shutil.copy2(OUT_DIR / filename, DOCS_DIR / filename)


def main() -> None:
    cierre = read_csv("08a_cierre_mensual_indicadores_raw.csv")
    if cierre.empty:
        raise RuntimeError(
            "No se encontró data en data_raw/reforestacion/08a_cierre_mensual_indicadores_raw.csv"
        )

    kpi_raw = read_csv("10_kpi_graficos_raw.csv")

    total = build_total_mes(cierre)
    indicators = build_kpi_dataset(kpi_raw, total)
    metadata = build_metadata(total, indicators)

    total.to_csv(OUT_DIR / "total_mes.csv", index=False)
    indicators.to_csv(OUT_DIR / "institucional_indicadores.csv", index=False)
    metadata.to_csv(OUT_DIR / "metadata_publicacion.csv", index=False)

    if not indicators.empty:
        indicators.to_csv(OUT_DIR / "kpi_graficos.csv", index=False)
        copy_to_docs("total_mes.csv", "institucional_indicadores.csv", "metadata_publicacion.csv", "kpi_graficos.csv")
        files_published = [
            "total_mes.csv",
            "institucional_indicadores.csv",
            "metadata_publicacion.csv",
            "kpi_graficos.csv",
        ]
    else:
        copy_to_docs("total_mes.csv", "institucional_indicadores.csv", "metadata_publicacion.csv")
        files_published = [
            "total_mes.csv",
            "institucional_indicadores.csv",
            "metadata_publicacion.csv",
        ]

    manifest = {
        "program_id": PROGRAM_ID,
        "program_name": PROGRAM_NAME,
        "rows_total_mes": int(len(total)),
        "rows_indicadores": int(len(indicators)),
        "latest_period": "" if total.empty else safe_text(total.iloc[-1]["periodo_clave"]),
        "files_published": files_published,
    }

    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("Transformación Reforestación completada.")
    print(f"total_mes.csv: {len(total)} filas")
    print(f"institucional_indicadores.csv: {len(indicators)} filas")
    if not indicators.empty:
        print("kpi_graficos.csv: publicado")


if __name__ == "__main__":
    main()
