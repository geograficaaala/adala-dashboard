from __future__ import annotations

import json
import shutil
from pathlib import Path

import pandas as pd

PROGRAM_ID = "educando_para_conservar"
PROGRAM_NAME = "Educando para Conservar"

RAW_DIR = Path("data_raw/educando_para_conservar")
OUT_DIR = Path("data_processed/educando_para_conservar")
DOCS_DIR = Path("docs/data/educando_para_conservar")

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

PRIMARY_META = {
    "docentes_capacitados": 121.0,
    "centros_cobertura": 50.0,
    "municipios_actividad_pedagogica": 13.0,
    "estudiantes_epc": 3514.0,
    "actividades_campo": 128.0,
    "estudiantes_actividades_campo": 3514.0,
    "jovenes_formados_diplomado": 120.0,
    "propuestas_juveniles": 12.0,
    "capitales_semilla": 4.0,
}

SUBTYPE_META = {
    "act_reforestacion": 20.0,
    "act_monitoreo_reforestadas": 8.0,
    "act_tul": 10.0,
    "act_ferias": 16.0,
    "act_huertos": 8.0,
    "act_giras": 24.0,
    "act_murales": 4.0,
    "act_centros_acopio": 8.0,
    "act_limpiezas": 24.0,
    "act_proyectos_gestion": 2.0,
}

INDICATOR_LABELS = {
    "docentes_capacitados": ("Docentes capacitados", "personas", "estrategico"),
    "centros_cobertura": ("Centros alcanzados", "centros", "estrategico"),
    "municipios_actividad_pedagogica": ("Municipios con actividad pedagógica", "municipios", "estrategico"),
    "estudiantes_epc": ("Estudiantes EPC", "estudiantes", "estrategico"),
    "actividades_campo": ("Actividades de campo", "actividades", "estrategico"),
    "estudiantes_actividades_campo": ("Estudiantes en actividades de campo", "estudiantes", "estrategico"),
    "jovenes_formados_diplomado": ("Jóvenes formados en diplomado", "jóvenes", "estrategico"),
    "propuestas_juveniles": ("Propuestas juveniles", "propuestas", "estrategico"),
    "capitales_semilla": ("Capitales semilla entregados", "capitales", "estrategico"),
    "act_reforestacion": ("Campañas de reforestación", "actividades", "tactico"),
    "act_monitoreo_reforestadas": ("Monitoreo de áreas reforestadas", "actividades", "tactico"),
    "act_tul": ("Manejo / poda / mantenimiento de tul", "actividades", "tactico"),
    "act_ferias": ("Ferias ambientales", "actividades", "tactico"),
    "act_huertos": ("Huertos escolares", "actividades", "tactico"),
    "act_giras": ("Giras educativas", "actividades", "tactico"),
    "act_murales": ("Murales pedagógicos", "actividades", "tactico"),
    "act_centros_acopio": ("Centros de acopio escolar", "actividades", "tactico"),
    "act_limpiezas": ("Campañas de limpieza escolar", "actividades", "tactico"),
    "act_proyectos_gestion": ("Proyectos de gestión ambiental escolar", "actividades", "tactico"),
}

RECURRING_MONTHLY_IDS = {
    "docentes_capacitados",
    "centros_cobertura",
    "municipios_actividad_pedagogica",
    "estudiantes_epc",
}

MILESTONE_IDS = {
    "jovenes_formados_diplomado",
    "propuestas_juveniles",
    "capitales_semilla",
    "act_huertos",
    "act_murales",
    "act_centros_acopio",
    "act_proyectos_gestion",
}


def read_csv(name: str) -> pd.DataFrame:
    path = RAW_DIR / name
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


def safe_float(value, default=0.0) -> float:
    if value is None or (isinstance(value, str) and value.strip() == ""):
        return default
    try:
        if pd.isna(value):
            return default
    except Exception:
        pass
    try:
        text = str(value).strip().replace(",", "")
        if text.lower() in {"nan", "none", ""}:
            return default
        return float(text)
    except Exception:
        return default


def safe_int(value, default=0) -> int:
    return int(round(safe_float(value, default)))


def safe_text(value) -> str:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass
    text = str(value).strip()
    return "" if text.lower() == "nan" else text


def yes_no_to_bool(value) -> bool:
    return safe_text(value).lower() in {"sí", "si", "true", "1", "yes", "y", "x"}


def normalize_period(periodo_clave: str):
    periodo_clave = safe_text(periodo_clave)
    if len(periodo_clave) >= 7 and "-" in periodo_clave:
        year_str, month_str = periodo_clave.split("-", 1)
        try:
            return int(year_str), int(month_str[:2])
        except Exception:
            return None, None
    return None, None


def find_number(row, *candidates, default=0.0) -> float:
    for col in candidates:
        if col in row:
            value = safe_float(row.get(col), default=None)
            if value is not None:
                return value
    return default


def find_text(row, *candidates, default="") -> str:
    for col in candidates:
        if col in row:
            text = safe_text(row.get(col))
            if text:
                return text
    return default


def find_bool(row, *candidates, default=False) -> bool:
    for col in candidates:
        if col in row:
            return yes_no_to_bool(row.get(col))
    return default


def month_name(month_num: int, fallback: str) -> str:
    return MONTH_NAMES_ES.get(month_num, fallback)


def semaforo_from_ratio(ratio: float, exigible: bool = True) -> str:
    if not exigible:
        return "gris"
    if ratio >= 1:
        return "verde"
    if ratio >= 0.85:
        return "amarillo"
    return "rojo"


def milestone_status(month_num: int, value: float, expected_final: float, aporta: bool):
    if not aporta or month_num < 6:
        return "gris", False, 0.0
    if 6 <= month_num < 10:
        expected = expected_final * 0.5
        ratio = value / expected if expected > 0 else 0.0
        if value >= expected:
            return "verde", True, expected
        if ratio >= 0.85:
            return "amarillo", True, expected
        return "azul", True, expected
    expected = expected_final
    ratio = value / expected if expected > 0 else 0.0
    return semaforo_from_ratio(ratio, True), True, expected


def expected_share_for_month(month_num: int) -> float:
    profile = {
        1: 0.00,
        2: 0.00,
        3: 0.08,
        4: 0.19,
        5: 0.32,
        6: 0.47,
        7: 0.62,
        8: 0.76,
        9: 0.89,
        10: 1.00,
        11: 1.00,
        12: 1.00,
    }
    return profile.get(month_num, 0.0)


def has_real_data(record: dict) -> bool:
    numeric_keys = [
        "docentes_mes",
        "estudiantes_epc_mes",
        "centros_mes",
        "municipios_mes",
        "actividades_campo_mes",
        "estudiantes_actividades_campo_mes",
        "act_reforestacion_mes",
        "act_monitoreo_reforestadas_mes",
        "act_tul_mes",
        "act_ferias_mes",
        "act_huertos_mes",
        "act_giras_mes",
        "act_murales_mes",
        "act_centros_acopio_mes",
        "act_limpiezas_mes",
        "act_proyectos_gestion_mes",
        "docentes_induccion_mes",
        "centros_induccion_mes",
        "estudiantes_diagnostico_mes",
        "diplomado_marzo_inscritos_mes",
        "diplomado_marzo_asistentes_mes",
        "diplomado_junio_inscritos_mes",
        "jovenes_formados_diplomado_mes",
        "propuestas_juveniles_mes",
        "capitales_semilla_mes",
        "coordinaciones_clave_mes",
    ]
    for key in numeric_keys:
        if safe_float(record.get(key, 0)) != 0:
            return True

    text_keys = ["logros_texto", "alertas_texto", "fuente_texto"]
    return any(safe_text(record.get(key, "")) for key in text_keys)


def build_total_mes(cierre: pd.DataFrame) -> pd.DataFrame:
    rows = []

    for _, r in cierre.iterrows():
        row = r.to_dict()
        periodo_clave = find_text(row, "Mes clave", "Mes_clave")
        year, month_num = normalize_period(periodo_clave)
        mes_label = find_text(row, "Mes", "Mes label", "Mes_label", default=month_name(month_num, periodo_clave))
        aporta = find_bool(row, "¿Aporta a metas EPC?", "Aporta a metas EPC", default=False)

        record = {
            "program_id": PROGRAM_ID,
            "program_name": PROGRAM_NAME,
            "periodo_clave": periodo_clave,
            "anio": year,
            "mes_num": month_num,
            "mes_label": mes_label,
            "mes_ciclo_epc": safe_int(find_number(row, "Mes ciclo EPC", "Mes_ciclo_EPC", default=0)),
            "aporta_metas_epc": aporta,
            "docentes_mes": find_number(row, "Docentes atendidos este mes", default=0.0),
            "estudiantes_epc_mes": find_number(row, "Estudiantes EPC atendidos este mes", default=0.0),
            "centros_mes": find_number(row, "Centros educativos atendidos este mes", default=0.0),
            "municipios_mes": find_number(row, "Municipios con actividad pedagógica", default=0.0),
            "actividades_campo_mes": find_number(row, "Actividades de campo ejecutadas", default=0.0),
            "estudiantes_actividades_campo_mes": find_number(row, "Estudiantes en actividades de campo", default=0.0),
            "act_reforestacion_mes": find_number(row, "Campaña de reforestación", "Campañas de reforestación", default=0.0),
            "act_monitoreo_reforestadas_mes": find_number(row, "Monitoreo de áreas reforestadas", default=0.0),
            "act_tul_mes": find_number(row, "Manejo/poda/mantenimiento de tul", "Manejo, poda y mantenimiento de tul", default=0.0),
            "act_ferias_mes": find_number(row, "Feria ambiental escolar/comunitaria", "Ferias ambientales escolares y comunitarias", default=0.0),
            "act_huertos_mes": find_number(row, "Huerto escolar", "Huertos escolares", default=0.0),
            "act_giras_mes": find_number(row, "Gira educativa", "Giras educativas", default=0.0),
            "act_murales_mes": find_number(row, "Mural pedagógico", "Murales pedagógicos", default=0.0),
            "act_centros_acopio_mes": find_number(row, "Centro de acopio escolar", "Centros de acopio escolar", default=0.0),
            "act_limpiezas_mes": find_number(row, "Campaña de limpieza escolar", "Campañas de limpieza a nivel escolar", default=0.0),
            "act_proyectos_gestion_mes": find_number(row, "Proyecto de gestión ambiental escolar", "Proyectos de gestión ambiental escolar", default=0.0),
            "docentes_induccion_mes": find_number(row, "Docentes en inducción / socialización", default=0.0),
            "centros_induccion_mes": find_number(row, "Centros con inducción / socialización", default=0.0),
            "estudiantes_diagnostico_mes": find_number(row, "Estudiantes diagnóstico inicial", default=0.0),
            "diplomado_marzo_inscritos_mes": find_number(row, "Diplomado cohorte marzo inscritos", default=0.0),
            "diplomado_marzo_asistentes_mes": find_number(row, "Diplomado cohorte marzo asistentes a sesiones", default=0.0),
            "diplomado_junio_inscritos_mes": find_number(row, "Diplomado cohorte junio inscritos", default=0.0),
            "jovenes_formados_diplomado_mes": find_number(row, "Jóvenes formados diplomado", "Jovenes formados diplomado", default=0.0),
            "propuestas_juveniles_mes": find_number(row, "Propuestas juveniles presentadas", "Propuestas juveniles", default=0.0),
            "capitales_semilla_mes": find_number(row, "Capitales semilla entregados", "Capitales semilla", default=0.0),
            "coordinaciones_clave_mes": find_number(row, "Coordinaciones / reuniones clave", default=0.0),
            "logros_texto": find_text(row, "Logros / texto base para informe", default=""),
            "alertas_texto": find_text(row, "Alertas / notas", default=""),
            "fuente_texto": find_text(row, "Fuente soporte / criterio", default=""),
        }

        if not periodo_clave:
            continue
        if not has_real_data(record):
            continue

        rows.append(record)

    total = pd.DataFrame(rows)
    if total.empty:
        return total

    total = total.sort_values(["anio", "mes_num"]).reset_index(drop=True)
    total["tiene_datos_mes"] = True
    total["is_latest_data_month"] = False
    total.loc[total.index[-1], "is_latest_data_month"] = True
    return total


def build_indicator_rows(total: pd.DataFrame) -> pd.DataFrame:
    if total.empty:
        return pd.DataFrame()

    indicator_rows = []

    cumulative_ids = [
        "actividades_campo",
        "estudiantes_actividades_campo",
        "jovenes_formados_diplomado",
        "propuestas_juveniles",
        "capitales_semilla",
        "act_reforestacion",
        "act_monitoreo_reforestadas",
        "act_tul",
        "act_ferias",
        "act_huertos",
        "act_giras",
        "act_murales",
        "act_centros_acopio",
        "act_limpiezas",
        "act_proyectos_gestion",
    ]

    cumulative_map = {k: 0.0 for k in cumulative_ids}
    recurring_compliance = {k: 0 for k in RECURRING_MONTHLY_IDS}

    for _, r in total.iterrows():
        month_num = safe_int(r.get("mes_num"))
        periodo = safe_text(r.get("periodo_clave"))
        mes_label = safe_text(r.get("mes_label"))
        meses_transcurridos = safe_int(r.get("mes_ciclo_epc"))
        aporta = bool(r.get("aporta_metas_epc"))

        month_values = {
            "docentes_capacitados": safe_float(r.get("docentes_mes")),
            "centros_cobertura": safe_float(r.get("centros_mes")),
            "municipios_actividad_pedagogica": safe_float(r.get("municipios_mes")),
            "estudiantes_epc": safe_float(r.get("estudiantes_epc_mes")),
            "actividades_campo": safe_float(r.get("actividades_campo_mes")),
            "estudiantes_actividades_campo": safe_float(r.get("estudiantes_actividades_campo_mes")),
            "jovenes_formados_diplomado": safe_float(r.get("jovenes_formados_diplomado_mes")),
            "propuestas_juveniles": safe_float(r.get("propuestas_juveniles_mes")),
            "capitales_semilla": safe_float(r.get("capitales_semilla_mes")),
            "act_reforestacion": safe_float(r.get("act_reforestacion_mes")),
            "act_monitoreo_reforestadas": safe_float(r.get("act_monitoreo_reforestadas_mes")),
            "act_tul": safe_float(r.get("act_tul_mes")),
            "act_ferias": safe_float(r.get("act_ferias_mes")),
            "act_huertos": safe_float(r.get("act_huertos_mes")),
            "act_giras": safe_float(r.get("act_giras_mes")),
            "act_murales": safe_float(r.get("act_murales_mes")),
            "act_centros_acopio": safe_float(r.get("act_centros_acopio_mes")),
            "act_limpiezas": safe_float(r.get("act_limpiezas_mes")),
            "act_proyectos_gestion": safe_float(r.get("act_proyectos_gestion_mes")),
        }

        for indicator_id in cumulative_ids:
            if aporta:
                cumulative_map[indicator_id] += month_values[indicator_id]

        for indicator_id in RECURRING_MONTHLY_IDS:
            meta_mes = PRIMARY_META[indicator_id]
            if aporta and month_values[indicator_id] >= meta_mes:
                recurring_compliance[indicator_id] += 1

        for indicator_id, value in month_values.items():
            label, unidad, categoria = INDICATOR_LABELS[indicator_id]
            meta_anual = PRIMARY_META.get(indicator_id, SUBTYPE_META.get(indicator_id, 0.0))
            meta_mes = PRIMARY_META.get(indicator_id, 0.0) if indicator_id in RECURRING_MONTHLY_IDS else 0.0
            nota_metodologica = ""

            if indicator_id in RECURRING_MONTHLY_IDS:
                valor_acumulado = float(recurring_compliance[indicator_id])
                esperado_al_corte = float(meses_transcurridos if aporta else 0.0)
                pct_meta_anual = valor_acumulado / 8.0
                pct_vs_esperado = valor_acumulado / esperado_al_corte if esperado_al_corte > 0 else 0.0
                estatus = semaforo_from_ratio(pct_vs_esperado, exigible=aporta)
                cumplio_mes = 1 if (aporta and value >= meta_mes) else 0
                modelo = "monthly_recurrent"
                es_exigible = aporta
                nota_metodologica = "Mide cumplimiento mensual del estándar y sostenimiento del ciclo EPC."
                meta_anual_salida = 8.0

            elif indicator_id in MILESTONE_IDS:
                valor_acumulado = cumulative_map[indicator_id]
                estatus, es_exigible, esperado_al_corte = milestone_status(month_num, valor_acumulado, meta_anual, aporta)
                pct_meta_anual = valor_acumulado / meta_anual if meta_anual > 0 else 0.0
                pct_vs_esperado = valor_acumulado / esperado_al_corte if esperado_al_corte > 0 else 0.0
                cumplio_mes = 1 if value > 0 else 0
                modelo = "milestone_window"
                nota_metodologica = "Solo se exige en la ventana del hito; antes se reporta como no exigible."
                meta_anual_salida = meta_anual

            else:
                valor_acumulado = cumulative_map[indicator_id]
                esperado_al_corte = meta_anual * expected_share_for_month(month_num) if aporta else 0.0
                pct_meta_anual = valor_acumulado / meta_anual if meta_anual > 0 else 0.0
                pct_vs_esperado = valor_acumulado / esperado_al_corte if esperado_al_corte > 0 else 0.0
                estatus = semaforo_from_ratio(pct_vs_esperado, exigible=aporta)
                cumplio_mes = 1 if value > 0 else 0
                modelo = "annual_cumulative_profiled"
                es_exigible = aporta
                nota_metodologica = "Compara acumulado real vs esperado al corte con perfil marzo-octubre."
                meta_anual_salida = meta_anual

            indicator_rows.append(
                {
                    "program_id": PROGRAM_ID,
                    "program_name": PROGRAM_NAME,
                    "periodo_clave": periodo,
                    "mes_num": month_num,
                    "mes_label": mes_label,
                    "indicator_id": indicator_id,
                    "indicador_nombre": label,
                    "unidad": unidad,
                    "categoria": categoria,
                    "modelo_medicion": modelo,
                    "valor_mes": value,
                    "valor_acumulado": valor_acumulado,
                    "meta_mes": meta_mes,
                    "meta_anual": meta_anual_salida,
                    "esperado_al_corte": esperado_al_corte,
                    "pct_meta_anual": pct_meta_anual,
                    "pct_vs_esperado": pct_vs_esperado,
                    "cumplio_mes": cumplio_mes,
                    "meses_cumplidos": recurring_compliance.get(indicator_id, 0),
                    "meses_transcurridos": meses_transcurridos if aporta else 0,
                    "aporta_metas_epc": aporta,
                    "es_exigible": es_exigible,
                    "estatus": estatus,
                    "orden_dashboard": list(INDICATOR_LABELS.keys()).index(indicator_id) + 1,
                    "nota_metodologica": nota_metodologica,
                }
            )

    indicators = pd.DataFrame(indicator_rows)
    if indicators.empty:
        return indicators

    indicators["is_latest_data_month"] = False
    latest_period = safe_text(total.iloc[-1]["periodo_clave"])
    indicators.loc[indicators["periodo_clave"] == latest_period, "is_latest_data_month"] = True

    return indicators.sort_values(["mes_num", "orden_dashboard"]).reset_index(drop=True)


def build_metadata(total: pd.DataFrame) -> pd.DataFrame:
    if total.empty:
        return pd.DataFrame(
            [
                {
                    "program_id": PROGRAM_ID,
                    "program_name": PROGRAM_NAME,
                    "periodos_detectados": "",
                    "latest_period": "",
                    "latest_month_label": "",
                    "periods_count": 0,
                }
            ]
        )

    periodos = total["periodo_clave"].astype(str).tolist()
    return pd.DataFrame(
        [
            {
                "program_id": PROGRAM_ID,
                "program_name": PROGRAM_NAME,
                "periodos_detectados": " | ".join(periodos),
                "latest_period": periodos[-1],
                "latest_month_label": safe_text(total.iloc[-1]["mes_label"]),
                "first_period": periodos[0],
                "periods_count": len(periodos),
            }
        ]
    )


def copy_to_docs(*filenames) -> None:
    for filename in filenames:
        shutil.copy2(OUT_DIR / filename, DOCS_DIR / filename)


def main() -> None:
    cierre = read_csv("08a_cierre_mensual_indicadores_raw.csv")
    if cierre.empty:
        raise RuntimeError("No se encontró data en data_raw/educando_para_conservar/08a_cierre_mensual_indicadores_raw.csv")

    total = build_total_mes(cierre)
    indicators = build_indicator_rows(total)
    metadata = build_metadata(total)

    total.to_csv(OUT_DIR / "total_mes.csv", index=False)
    indicators.to_csv(OUT_DIR / "institucional_indicadores.csv", index=False)
    metadata.to_csv(OUT_DIR / "metadata_publicacion.csv", index=False)

    copy_to_docs("total_mes.csv", "institucional_indicadores.csv", "metadata_publicacion.csv")

    manifest = {
        "program_id": PROGRAM_ID,
        "program_name": PROGRAM_NAME,
        "rows_total_mes": int(len(total)),
        "rows_indicadores": int(len(indicators)),
        "latest_period": "" if total.empty else safe_text(total.iloc[-1]["periodo_clave"]),
        "files_published": [
            "total_mes.csv",
            "institucional_indicadores.csv",
            "metadata_publicacion.csv",
        ],
    }

    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("Transformación EPC completada.")
    print(f"total_mes.csv: {len(total)} filas")
    print(f"institucional_indicadores.csv: {len(indicators)} filas")


if __name__ == "__main__":
    main()
