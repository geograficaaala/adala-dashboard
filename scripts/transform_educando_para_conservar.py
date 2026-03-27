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


def safe_float(value, default=0.0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def safe_int(value, default=0):
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except Exception:
        return default


def yes_no_to_bool(value):
    return str(value).strip().lower() in {"sí", "si", "true", "1", "yes"}


def normalize_period(periodo_clave: str):
    periodo_clave = str(periodo_clave).strip()
    if len(periodo_clave) >= 7 and "-" in periodo_clave:
        year_str, month_str = periodo_clave.split("-", 1)
        try:
            year = int(year_str)
            month = int(month_str[:2])
            return year, month
        except Exception:
            return None, None
    return None, None


def semaforo_from_ratio(ratio: float, exigible: bool = True):
    if not exigible:
        return "gris"
    if ratio >= 1:
        return "verde"
    if ratio >= 0.85:
        return "amarillo"
    return "rojo"


def milestone_status(month_num: int, value: float, expected_final: float):
    if month_num < 6:
        return "gris", False, 0.0
    if 6 <= month_num < 10:
        expected = expected_final * 0.5
        ratio = value / expected if expected > 0 else 0
        if value >= expected:
            return "verde", True, expected
        if ratio >= 0.85:
            return "amarillo", True, expected
        return "azul", True, expected
    expected = expected_final
    ratio = value / expected if expected > 0 else 0
    return semaforo_from_ratio(ratio, True), True, expected


def expected_share_for_month(month_num: int):
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


def read_csv(name: str):
    path = RAW_DIR / name
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


def build_total_mes(cierre: pd.DataFrame):
    rows = []

    for _, r in cierre.iterrows():
        periodo_clave = str(r.get("Mes clave", "")).strip()
        if not periodo_clave:
            continue

        year, month_num = normalize_period(periodo_clave)
        mes_label = str(r.get("Mes", "")).strip() or MONTH_NAMES_ES.get(month_num, periodo_clave)
        aporta = yes_no_to_bool(r.get("¿Aporta a metas EPC?", "No"))

        rows.append(
            {
                "program_id": PROGRAM_ID,
                "program_name": PROGRAM_NAME,
                "periodo_clave": periodo_clave,
                "anio": year,
                "mes_num": month_num,
                "mes_label": mes_label,
                "mes_ciclo_epc": safe_int(r.get("Mes ciclo EPC", 0)),
                "aporta_metas_epc": aporta,
                "docentes_mes": safe_float(r.get("Docentes atendidos este mes", 0)),
                "estudiantes_epc_mes": safe_float(r.get("Estudiantes EPC atendidos este mes", 0)),
                "centros_mes": safe_float(r.get("Centros educativos atendidos este mes", 0)),
                "municipios_mes": safe_float(r.get("Municipios con actividad pedagógica", 0)),
                "actividades_campo_mes": safe_float(r.get("Actividades de campo ejecutadas", 0)),
                "estudiantes_actividades_campo_mes": safe_float(r.get("Estudiantes en actividades de campo", 0)),
                "act_reforestacion_mes": safe_float(r.get("Campaña de reforestación", 0)),
                "act_monitoreo_reforestadas_mes": safe_float(r.get("Monitoreo de áreas reforestadas", 0)),
                "act_tul_mes": safe_float(r.get("Manejo/poda/mantenimiento de tul", 0)),
                "act_ferias_mes": safe_float(r.get("Feria ambiental escolar/comunitaria", 0)),
                "act_huertos_mes": safe_float(r.get("Huerto escolar", 0)),
                "act_giras_mes": safe_float(r.get("Gira educativa", 0)),
                "act_murales_mes": safe_float(r.get("Mural pedagógico", 0)),
                "act_centros_acopio_mes": safe_float(r.get("Centro de acopio escolar", 0)),
                "act_limpiezas_mes": safe_float(r.get("Campaña de limpieza escolar", 0)),
                "act_proyectos_gestion_mes": safe_float(r.get("Proyecto de gestión ambiental escolar", 0)),
                "docentes_induccion_mes": safe_float(r.get("Docentes en inducción / socialización", 0)),
                "centros_induccion_mes": safe_float(r.get("Centros con inducción / socialización", 0)),
                "estudiantes_diagnostico_mes": safe_float(r.get("Estudiantes diagnóstico inicial", 0)),
                "diplomado_marzo_inscritos_mes": safe_float(r.get("Diplomado cohorte marzo inscritos", 0)),
                "diplomado_marzo_asistentes_mes": safe_float(r.get("Diplomado cohorte marzo asistentes a sesiones", 0)),
                "diplomado_junio_inscritos_mes": safe_float(r.get("Diplomado cohorte junio inscritos", 0)),
                "coordinaciones_clave_mes": safe_float(r.get("Coordinaciones / reuniones clave", 0)),
                "logros_texto": str(r.get("Logros / texto base para informe", "")).strip(),
                "alertas_texto": str(r.get("Alertas / notas", "")).strip(),
                "fuente_texto": str(r.get("Fuente soporte / criterio", "")).strip(),
            }
        )

    total = pd.DataFrame(rows).sort_values(["anio", "mes_num"], na_position="last").reset_index(drop=True)
    if total.empty:
        return total

    total["is_latest_data_month"] = False
    latest_idx = total.index[-1]
    total.loc[latest_idx, "is_latest_data_month"] = True

    return total


def build_indicator_rows(total: pd.DataFrame):
    if total.empty:
        return pd.DataFrame()

    indicator_rows = []

    cumulative_ids = [
        "actividades_campo",
        "estudiantes_actividades_campo",
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
        month_num = safe_int(r["mes_num"])
        periodo = r["periodo_clave"]
        mes_label = r["mes_label"]
        meses_transcurridos = safe_int(r["mes_ciclo_epc"])
        aporta = bool(r["aporta_metas_epc"])

        month_values = {
            "docentes_capacitados": safe_float(r["docentes_mes"]),
            "centros_cobertura": safe_float(r["centros_mes"]),
            "municipios_actividad_pedagogica": safe_float(r["municipios_mes"]),
            "estudiantes_epc": safe_float(r["estudiantes_epc_mes"]),
            "actividades_campo": safe_float(r["actividades_campo_mes"]),
            "estudiantes_actividades_campo": safe_float(r["estudiantes_actividades_campo_mes"]),
            "jovenes_formados_diplomado": safe_float(r["diplomado_marzo_asistentes_mes"]) + safe_float(r["diplomado_junio_inscritos_mes"]),
            "propuestas_juveniles": 0.0,
            "capitales_semilla": 0.0,
            "act_reforestacion": safe_float(r["act_reforestacion_mes"]),
            "act_monitoreo_reforestadas": safe_float(r["act_monitoreo_reforestadas_mes"]),
            "act_tul": safe_float(r["act_tul_mes"]),
            "act_ferias": safe_float(r["act_ferias_mes"]),
            "act_huertos": safe_float(r["act_huertos_mes"]),
            "act_giras": safe_float(r["act_giras_mes"]),
            "act_murales": safe_float(r["act_murales_mes"]),
            "act_centros_acopio": safe_float(r["act_centros_acopio_mes"]),
            "act_limpiezas": safe_float(r["act_limpiezas_mes"]),
            "act_proyectos_gestion": safe_float(r["act_proyectos_gestion_mes"]),
        }

        for indicator_id, value in month_values.items():
            if indicator_id in cumulative_map and aporta:
                cumulative_map[indicator_id] += value

        for indicator_id in RECURRING_MONTHLY_IDS:
            meta_mes = PRIMARY_META[indicator_id]
            ratio_mes = month_values[indicator_id] / meta_mes if meta_mes > 0 else 0
            if aporta and ratio_mes >= 1:
                recurring_compliance[indicator_id] += 1

        for indicator_id, value in month_values.items():
            label, unidad, categoria = INDICATOR_LABELS[indicator_id]

            if indicator_id in RECURRING_MONTHLY_IDS:
                meta_mes = PRIMARY_META[indicator_id]
                meta_anual = 8.0
                cumplio_mes = 1 if (aporta and value >= meta_mes) else 0
                valor_acumulado = float(recurring_compliance[indicator_id])
                esperado_al_corte = float(meses_transcurridos if aporta else 0)
                pct_meta_anual = valor_acumulado / meta_anual if meta_anual > 0 else 0
                pct_vs_esperado = (
                    valor_acumulado / esperado_al_corte if esperado_al_corte > 0 else 0
                )
                estatus = semaforo_from_ratio(pct_vs_esperado, exigible=aporta)
                modelo = "monthly_recurrent"

            elif indicator_id in MILESTONE_IDS:
                meta_anual = PRIMARY_META.get(indicator_id, SUBTYPE_META.get(indicator_id, 0.0))
                valor_acumulado = cumulative_map.get(indicator_id, value)
                estatus, es_exigible, esperado_al_corte = milestone_status(month_num, valor_acumulado, meta_anual)
                pct_meta_anual = valor_acumulado / meta_anual if meta_anual > 0 else 0
                pct_vs_esperado = valor_acumulado / esperado_al_corte if esperado_al_corte > 0 else 0
                cumplio_mes = 1 if value > 0 else 0
                meta_mes = 0.0
                modelo = "milestone_window"
                if not es_exigible:
                    pct_vs_esperado = 0.0

            else:
                meta_anual = PRIMARY_META.get(indicator_id, SUBTYPE_META.get(indicator_id, 0.0))
                valor_acumulado = cumulative_map.get(indicator_id, value)
                share = expected_share_for_month(month_num) if aporta else 0.0
                esperado_al_corte = meta_anual * share
                pct_meta_anual = valor_acumulado / meta_anual if meta_anual > 0 else 0
                pct_vs_esperado = valor_acumulado / esperado_al_corte if esperado_al_corte > 0 else 0
                estatus = semaforo_from_ratio(pct_vs_esperado, exigible=aporta)
                cumplio_mes = 1 if value > 0 else 0
                meta_mes = 0.0
                modelo = "annual_cumulative_profiled"

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
                    "meta_mes": meta_mes if indicator_id in RECURRING_MONTHLY_IDS else 0.0,
                    "meta_anual": meta_anual,
                    "esperado_al_corte": esperado_al_corte,
                    "pct_meta_anual": pct_meta_anual,
                    "pct_vs_esperado": pct_vs_esperado,
                    "cumplio_mes": cumplio_mes,
                    "meses_cumplidos": recurring_compliance.get(indicator_id, 0),
                    "meses_transcurridos": meses_transcurridos,
                    "aporta_metas_epc": aporta,
                    "estatus": estatus,
                    "orden_dashboard": list(INDICATOR_LABELS.keys()).index(indicator_id) + 1,
                }
            )

    indicators = pd.DataFrame(indicator_rows)
    if indicators.empty:
        return indicators

    indicators["is_latest_data_month"] = False
    latest_period = indicators["periodo_clave"].dropna().astype(str).sort_values().iloc[-1]
    indicators.loc[indicators["periodo_clave"] == latest_period, "is_latest_data_month"] = True

    return indicators.sort_values(["mes_num", "orden_dashboard"]).reset_index(drop=True)


def build_metadata(total: pd.DataFrame):
    if total.empty:
        return pd.DataFrame(
            [
                {
                    "program_id": PROGRAM_ID,
                    "program_name": PROGRAM_NAME,
                    "periodos_detectados": "",
                    "latest_period": "",
                }
            ]
        )

    periodos = total["periodo_clave"].astype(str).tolist()
    latest_period = periodos[-1]

    return pd.DataFrame(
        [
            {
                "program_id": PROGRAM_ID,
                "program_name": PROGRAM_NAME,
                "periodos_detectados": " | ".join(periodos),
                "latest_period": latest_period,
                "latest_month_label": total.iloc[-1]["mes_label"],
            }
        ]
    )


def copy_to_docs(*filenames):
    for filename in filenames:
        shutil.copy2(OUT_DIR / filename, DOCS_DIR / filename)


def main():
    cierre = read_csv("08a_cierre_mensual_indicadores_raw.csv")
    if cierre.empty:
        raise RuntimeError("No se encontró data en 08a_cierre_mensual_indicadores_raw.csv")

    total = build_total_mes(cierre)
    indicators = build_indicator_rows(total)
    metadata = build_metadata(total)

    total.to_csv(OUT_DIR / "total_mes.csv", index=False)
    indicators.to_csv(OUT_DIR / "institucional_indicadores.csv", index=False)
    metadata.to_csv(OUT_DIR / "metadata_publicacion.csv", index=False)

    copy_to_docs(
        "total_mes.csv",
        "institucional_indicadores.csv",
        "metadata_publicacion.csv",
    )

    manifest = {
        "program_id": PROGRAM_ID,
        "program_name": PROGRAM_NAME,
        "rows_total_mes": int(len(total)),
        "rows_indicadores": int(len(indicators)),
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
