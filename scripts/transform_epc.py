import pandas as pd
import numpy as np
from pathlib import Path

PROGRAM_ID = "educando_para_conservar"
PROGRAM_NAME = "Educando para Conservar"

RAW_PATH = Path("data_raw/educando_para_conservar/kobo_mensual_raw.xlsx")
OUT_DIR = Path("data_processed/educando_para_conservar")

MONTH_MAP = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12,
}
MONTH_LABELS = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}

FIELD_TYPE_META = {
    "campana_reforestacion": 25,
    "monitoreo_reforestacion": 8,
    "manejo_tul": 10,
    "feria_ambiental": 15,
    "huerto_escolar": 8,
    "gira_educativa": 25,
    "mural_pedagogico": 4,
    "centro_acopio_escolar": 8,
    "campana_limpieza_escolar": 25,
    "proyecto_gestion_ambiental": 2,
}
FIELD_TYPE_LABEL = {
    "campana_reforestacion": "Campañas de reforestación",
    "monitoreo_reforestacion": "Monitoreos de áreas reforestadas",
    "manejo_tul": "Jornadas de manejo y conservación de tul",
    "feria_ambiental": "Ferias ambientales",
    "huerto_escolar": "Huertos escolares",
    "gira_educativa": "Giras educativas",
    "mural_pedagogico": "Murales pedagógicos",
    "centro_acopio_escolar": "Centros de acopio escolar",
    "campana_limpieza_escolar": "Campañas de limpieza escolar",
    "proyecto_gestion_ambiental": "Proyectos de gestión ambiental escolar",
}


def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def month_num_from_series(series: pd.Series) -> pd.Series:
    s = series.astype(str).str.strip().str.lower().str[:3]
    return s.map(MONTH_MAP)


def month_label_from_num(series: pd.Series) -> pd.Series:
    return series.map(MONTH_LABELS)


def to_num(series: pd.Series, default=0.0) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(default)


def load_workbook(path: Path) -> dict[str, pd.DataFrame]:
    xl = pd.ExcelFile(path)
    out = {}
    for sh in xl.sheet_names:
        out[sh] = pd.read_excel(path, sheet_name=sh)
    return out


def pick_main_sheet(sheets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    for name, df in sheets.items():
        if name.startswith("rep_"):
            continue
        return df.copy()
    raise RuntimeError("No se encontró la hoja principal del raw XLSX.")


def dedupe_main(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if out.empty:
        return out

    out["_submission_time"] = pd.to_datetime(out.get("_submission_time"), errors="coerce")
    out["anio_reportado"] = to_num(out.get("anio_reportado"), 2026).astype(int)
    if "mes_num" in out.columns:
        out["mes_num"] = to_num(out["mes_num"], 0).astype(int)
    else:
        out["mes_num"] = month_num_from_series(out.get("mes_reportado", pd.Series(dtype="object"))).fillna(0).astype(int)
    out["mes_label"] = month_label_from_num(out["mes_num"])
    if "periodo_clave" not in out.columns:
        out["periodo_clave"] = out["anio_reportado"].astype(str) + "-" + out["mes_num"].astype(str).str.zfill(2)

    estado = out.get("estado_reporte", pd.Series([""] * len(out))).astype(str).str.lower()
    out["_rank_estado"] = np.where(estado.eq("final_validado"), 2, np.where(estado.ne(""), 1, 0))
    out = out.sort_values(["anio_reportado", "mes_num", "_rank_estado", "_submission_time"]).drop_duplicates(
        subset=["anio_reportado", "mes_num"], keep="last"
    )
    out = out.drop(columns=["_rank_estado"], errors="ignore").reset_index(drop=True)
    return out


def attach_period(df: pd.DataFrame, main_df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if out.empty:
        return out
    key = main_df.copy()
    key["mes_num"] = to_num(key.get("mes_num"), 0).astype(int)
    if "mes_label" not in key.columns:
        key["mes_label"] = month_label_from_num(key["mes_num"])
    if "periodo_clave" not in key.columns:
        key["periodo_clave"] = key["anio_reportado"].astype(str) + "-" + key["mes_num"].astype(str).str.zfill(2)
    key = key[["_id", "periodo_clave", "anio_reportado", "mes_num", "mes_label"]].rename(columns={"_id": "_submission__id"})
    out = out.merge(key, on="_submission__id", how="left")
    return out


def prep_centros(df: pd.DataFrame, main_df: pd.DataFrame) -> pd.DataFrame:
    out = attach_period(df, main_df)
    if out.empty:
        cols = [
            "periodo_clave", "anio_reportado", "mes_num", "mes_label", "fecha_centro", "municipio_centro",
            "centro_educativo", "niveles_centro", "acciones_centro", "temas_epc", "docentes_atendidos",
            "docentes_nuevos_capacitados", "directores_participantes", "materiales_entregados",
            "estudiantes_diagnostico", "estudiantes_atendidos_mes", "estudiantes_nuevos_epc", "observaciones_centro"
        ]
        return pd.DataFrame(columns=cols)

    num_cols = [
        "docentes_atendidos", "docentes_nuevos_capacitados", "directores_participantes",
        "materiales_entregados", "estudiantes_diagnostico", "estudiantes_atendidos_mes", "estudiantes_nuevos_epc"
    ]
    for c in num_cols:
        out[c] = to_num(out.get(c), 0)

    keep = [
        "periodo_clave", "anio_reportado", "mes_num", "mes_label", "fecha_centro", "municipio_centro",
        "centro_educativo", "niveles_centro", "acciones_centro", "temas_epc", "docentes_atendidos",
        "docentes_nuevos_capacitados", "directores_participantes", "materiales_entregados",
        "estudiantes_diagnostico", "estudiantes_atendidos_mes", "estudiantes_nuevos_epc", "observaciones_centro"
    ]
    return out[keep].copy()


def prep_campo(df: pd.DataFrame, main_df: pd.DataFrame) -> pd.DataFrame:
    out = attach_period(df, main_df)
    if out.empty:
        cols = [
            "periodo_clave", "anio_reportado", "mes_num", "mes_label", "fecha_campo", "municipio_campo",
            "centro_campo", "tipo_actividad_campo", "estado_actividad_campo", "estudiantes_participantes_evento",
            "estudiantes_nuevos_campo", "docentes_participantes_evento", "lugar_actividad",
            "resultado_actividad", "actividad_campo_ejecutada_flag", "observaciones_campo"
        ]
        return pd.DataFrame(columns=cols)

    num_cols = [
        "estudiantes_participantes_evento", "estudiantes_nuevos_campo", "docentes_participantes_evento",
        "actividad_campo_ejecutada_flag"
    ]
    for c in num_cols:
        out[c] = to_num(out.get(c), 0)

    keep = [
        "periodo_clave", "anio_reportado", "mes_num", "mes_label", "fecha_campo", "municipio_campo",
        "centro_campo", "tipo_actividad_campo", "estado_actividad_campo", "estudiantes_participantes_evento",
        "estudiantes_nuevos_campo", "docentes_participantes_evento", "lugar_actividad",
        "resultado_actividad", "actividad_campo_ejecutada_flag", "observaciones_campo"
    ]
    return out[keep].copy()


def prep_diplomado(df: pd.DataFrame, main_df: pd.DataFrame) -> pd.DataFrame:
    out = attach_period(df, main_df)
    if out.empty:
        cols = [
            "periodo_clave", "anio_reportado", "mes_num", "mes_label", "fecha_diplomado_operativo",
            "cohorte_operativa", "municipios_diplomado_operativo", "tipo_movimiento_diplomado",
            "jovenes_alcanzados_operativo", "avance_diplomado_operativo", "observaciones_diplomado_operativo",
            "jovenes_formados_total_corte", "propuestas_juveniles_total_corte", "capitales_semilla_total_corte"
        ]
        return pd.DataFrame(columns=cols)

    out["jovenes_alcanzados_operativo"] = to_num(out.get("jovenes_alcanzados_operativo"), 0)
    keep = [
        "periodo_clave", "anio_reportado", "mes_num", "mes_label", "fecha_diplomado_operativo",
        "cohorte_operativa", "municipios_diplomado_operativo", "tipo_movimiento_diplomado",
        "jovenes_alcanzados_operativo", "avance_diplomado_operativo", "observaciones_diplomado_operativo"
    ]
    out = out[keep].copy()

    # Adjuntar resultados oficiales desde la hoja principal (solo tendrán valor en junio/octubre o cuando aplique)
    official = main_df[[
        "periodo_clave", "jovenes_formados_total_corte", "propuestas_juveniles_total_corte", "capitales_semilla_total_corte"
    ]].copy()
    for c in ["jovenes_formados_total_corte", "propuestas_juveniles_total_corte", "capitales_semilla_total_corte"]:
        official[c] = to_num(official.get(c), 0)
    out = out.merge(official, on="periodo_clave", how="left")
    return out


def prep_coordinacion(df: pd.DataFrame, main_df: pd.DataFrame) -> pd.DataFrame:
    out = attach_period(df, main_df)
    if out.empty:
        cols = [
            "periodo_clave", "anio_reportado", "mes_num", "mes_label", "fecha_coordinacion",
            "municipios_coordinacion", "tipo_coordinacion", "instituciones_coordinacion",
            "resultado_coordinacion", "observaciones_coordinacion"
        ]
        return pd.DataFrame(columns=cols)
    keep = [
        "periodo_clave", "anio_reportado", "mes_num", "mes_label", "fecha_coordinacion",
        "municipios_coordinacion", "tipo_coordinacion", "instituciones_coordinacion",
        "resultado_coordinacion", "observaciones_coordinacion"
    ]
    return out[keep].copy()


def expected_fraction_linear_active(m, start_month, end_month):
    # 0 before start, linear by active month count, 1 after end
    if m < start_month:
        return 0.0
    if m > end_month:
        return 1.0
    active_index = m - start_month + 1
    active_total = end_month - start_month + 1
    return active_index / active_total


def expected_fraction_diplomado(m):
    # Corta en junio (50%) y octubre (100%)
    if m < 6:
        return 0.0
    if m < 10:
        return 0.5
    return 1.0


def build_total_mes(main_df: pd.DataFrame, centros_df: pd.DataFrame, campo_df: pd.DataFrame, dip_df: pd.DataFrame, coord_df: pd.DataFrame) -> pd.DataFrame:
    out = main_df.copy()

    # Base numeric fields from principal
    numeric_main = [
        "centros_reportados_mes", "docentes_nuevos_mes", "estudiantes_nuevos_epc_mes",
        "actividades_campo_ejecutadas_mes", "estudiantes_nuevos_campo_mes", "coordinaciones_mes",
        "jovenes_formados_total_corte", "propuestas_juveniles_total_corte", "capitales_semilla_total_corte",
        "meta_anual_docentes_capacitados", "meta_anual_centros_cobertura", "meta_anual_estudiantes_epc",
        "meta_anual_estudiantes_campo", "meta_anual_actividades_campo", "meta_anual_reforestacion",
        "meta_anual_monitoreo_reforestacion", "meta_anual_tul", "meta_anual_ferias", "meta_anual_huertos",
        "meta_anual_giras", "meta_anual_murales", "meta_anual_centros_acopio", "meta_anual_limpieza_escolar",
        "meta_anual_proyectos_gestion", "meta_anual_jovenes_formados", "meta_anual_propuestas_juveniles",
        "meta_anual_capitales_semilla"
    ]
    for c in numeric_main:
        out[c] = to_num(out.get(c), 0)

    # Recompute operational monthly metrics from detail where possible
    if not centros_df.empty:
        m = centros_df.groupby("periodo_clave", dropna=False).agg(
            centros_reportados_mes_det=("centro_educativo", "count"),
            docentes_nuevos_mes_det=("docentes_nuevos_capacitados", "sum"),
            estudiantes_nuevos_epc_mes_det=("estudiantes_nuevos_epc", "sum"),
        ).reset_index()
        out = out.merge(m, on="periodo_clave", how="left")
        out["centros_reportados_mes"] = out["centros_reportados_mes_det"].fillna(out["centros_reportados_mes"])
        out["docentes_nuevos_mes"] = out["docentes_nuevos_mes_det"].fillna(out["docentes_nuevos_mes"])
        out["estudiantes_nuevos_epc_mes"] = out["estudiantes_nuevos_epc_mes_det"].fillna(out["estudiantes_nuevos_epc_mes"])
    if not campo_df.empty:
        m = campo_df.groupby("periodo_clave", dropna=False).agg(
            actividades_campo_ejecutadas_mes_det=("actividad_campo_ejecutada_flag", "sum"),
            estudiantes_nuevos_campo_mes_det=("estudiantes_nuevos_campo", "sum"),
        ).reset_index()
        out = out.merge(m, on="periodo_clave", how="left")
        out["actividades_campo_ejecutadas_mes"] = out["actividades_campo_ejecutadas_mes_det"].fillna(out["actividades_campo_ejecutadas_mes"])
        out["estudiantes_nuevos_campo_mes"] = out["estudiantes_nuevos_campo_mes_det"].fillna(out["estudiantes_nuevos_campo_mes"])
    if not coord_df.empty:
        m = coord_df.groupby("periodo_clave", dropna=False).size().rename("coordinaciones_mes_det").reset_index()
        out = out.merge(m, on="periodo_clave", how="left")
        out["coordinaciones_mes"] = out["coordinaciones_mes_det"].fillna(out["coordinaciones_mes"])

    # Unique center cumulative coverage
    if centros_df.empty:
        unique_centers_month = pd.DataFrame(columns=["periodo_clave", "centros_cobertura_acum"])
    else:
        centers = centros_df.copy()
        centers["centro_key"] = (
            centers.get("municipio_centro", "").astype(str).str.strip().str.lower() + "||" +
            centers.get("centro_educativo", "").astype(str).str.strip().str.lower()
        )
        centers = centers.sort_values(["anio_reportado", "mes_num"])
        first_center = centers.groupby("centro_key", dropna=False).agg(
            first_month=("mes_num", "min"),
            first_periodo=("periodo_clave", "first")
        ).reset_index()
        months = sorted(out["mes_num"].astype(int).tolist())
        rows = []
        for mnum in months:
            count = int((first_center["first_month"] <= mnum).sum())
            period = out.loc[out["mes_num"] == mnum, "periodo_clave"].iloc[0]
            rows.append({"periodo_clave": period, "centros_cobertura_acum": count})
        unique_centers_month = pd.DataFrame(rows)
    out = out.merge(unique_centers_month, on="periodo_clave", how="left")

    out = out.sort_values(["anio_reportado", "mes_num"]).reset_index(drop=True)

    # Accumulados
    out["docentes_capacitados_acum"] = out["docentes_nuevos_mes"].cumsum()
    out["estudiantes_epc_acum"] = out["estudiantes_nuevos_epc_mes"].cumsum()
    out["actividades_campo_acum"] = out["actividades_campo_ejecutadas_mes"].cumsum()
    out["estudiantes_campo_acum"] = out["estudiantes_nuevos_campo_mes"].cumsum()
    out["coordinaciones_acum"] = out["coordinaciones_mes"].cumsum()
    out["centros_cobertura_acum"] = to_num(out.get("centros_cobertura_acum"), 0)

    # Diplomado oficial acumulado por cortes: usar el máximo/ffill del total reportado
    for c in ["jovenes_formados_total_corte", "propuestas_juveniles_total_corte", "capitales_semilla_total_corte"]:
        out[c] = to_num(out.get(c), 0)
        out[c + "_acum"] = out[c].replace({0: np.nan}).ffill().fillna(0)
        # Si un corte posterior trae un total menor por error, conserva el máximo histórico
        out[c + "_acum"] = out[c + "_acum"].cummax()

    # Expected schedule
    out["expected_frac_docentes"] = out["mes_num"].apply(lambda m: expected_fraction_linear_active(int(m), 2, 10))
    out["expected_frac_centros"] = out["mes_num"].apply(lambda m: expected_fraction_linear_active(int(m), 2, 10))
    out["expected_frac_estudiantes_epc"] = out["mes_num"].apply(lambda m: expected_fraction_linear_active(int(m), 2, 10))
    out["expected_frac_estudiantes_campo"] = out["mes_num"].apply(lambda m: expected_fraction_linear_active(int(m), 3, 10))
    out["expected_frac_actividades_campo"] = out["mes_num"].apply(lambda m: expected_fraction_linear_active(int(m), 3, 10))
    out["expected_frac_diplomado"] = out["mes_num"].apply(lambda m: expected_fraction_diplomado(int(m)))

    out["docentes_esperado_acum"] = out["meta_anual_docentes_capacitados"] * out["expected_frac_docentes"]
    out["centros_esperado_acum"] = out["meta_anual_centros_cobertura"] * out["expected_frac_centros"]
    out["estudiantes_epc_esperado_acum"] = out["meta_anual_estudiantes_epc"] * out["expected_frac_estudiantes_epc"]
    out["estudiantes_campo_esperado_acum"] = out["meta_anual_estudiantes_campo"] * out["expected_frac_estudiantes_campo"]
    out["actividades_campo_esperado_acum"] = out["meta_anual_actividades_campo"] * out["expected_frac_actividades_campo"]
    out["jovenes_formados_esperado_acum"] = out["meta_anual_jovenes_formados"] * out["expected_frac_diplomado"]
    out["propuestas_juveniles_esperado_acum"] = out["meta_anual_propuestas_juveniles"] * out["expected_frac_diplomado"]
    out["capitales_semilla_esperado_acum"] = out["meta_anual_capitales_semilla"] * out["expected_frac_diplomado"]

    # Percentages
    def pct(num, den):
        den = den.replace(0, np.nan)
        return (num / den * 100).fillna(0)

    out["pct_docentes_meta"] = pct(out["docentes_capacitados_acum"], out["meta_anual_docentes_capacitados"])
    out["pct_centros_meta"] = pct(out["centros_cobertura_acum"], out["meta_anual_centros_cobertura"])
    out["pct_estudiantes_epc_meta"] = pct(out["estudiantes_epc_acum"], out["meta_anual_estudiantes_epc"])
    out["pct_estudiantes_campo_meta"] = pct(out["estudiantes_campo_acum"], out["meta_anual_estudiantes_campo"])
    out["pct_actividades_campo_meta"] = pct(out["actividades_campo_acum"], out["meta_anual_actividades_campo"])
    out["pct_jovenes_formados_meta"] = pct(out["jovenes_formados_total_corte_acum"], out["meta_anual_jovenes_formados"])
    out["pct_propuestas_juveniles_meta"] = pct(out["propuestas_juveniles_total_corte_acum"], out["meta_anual_propuestas_juveniles"])
    out["pct_capitales_semilla_meta"] = pct(out["capitales_semilla_total_corte_acum"], out["meta_anual_capitales_semilla"])

    out["pct_docentes_vs_esperado"] = pct(out["docentes_capacitados_acum"], out["docentes_esperado_acum"])
    out["pct_centros_vs_esperado"] = pct(out["centros_cobertura_acum"], out["centros_esperado_acum"])
    out["pct_estudiantes_epc_vs_esperado"] = pct(out["estudiantes_epc_acum"], out["estudiantes_epc_esperado_acum"])
    out["pct_estudiantes_campo_vs_esperado"] = pct(out["estudiantes_campo_acum"], out["estudiantes_campo_esperado_acum"])
    out["pct_actividades_campo_vs_esperado"] = pct(out["actividades_campo_acum"], out["actividades_campo_esperado_acum"])
    out["pct_jovenes_formados_vs_esperado"] = pct(out["jovenes_formados_total_corte_acum"], out["jovenes_formados_esperado_acum"])
    out["pct_propuestas_juveniles_vs_esperado"] = pct(out["propuestas_juveniles_total_corte_acum"], out["propuestas_juveniles_esperado_acum"])
    out["pct_capitales_semilla_vs_esperado"] = pct(out["capitales_semilla_total_corte_acum"], out["capitales_semilla_esperado_acum"])

    # Special field activities by type
    if campo_df.empty:
        type_wide = pd.DataFrame({"periodo_clave": out["periodo_clave"]})
    else:
        campo_exec = campo_df.copy()
        campo_exec["is_exec"] = np.where(
            campo_exec.get("actividad_campo_ejecutada_flag", 0).fillna(0).astype(float).gt(0) |
            campo_exec.get("estado_actividad_campo", pd.Series([""]*len(campo_exec))).astype(str).str.lower().eq("ejecutada"),
            1, 0
        )
        campo_exec = campo_exec[campo_exec["is_exec"] == 1]
        if campo_exec.empty:
            type_wide = pd.DataFrame({"periodo_clave": out["periodo_clave"]})
        else:
            pivot = pd.pivot_table(
                campo_exec,
                index="periodo_clave",
                columns="tipo_actividad_campo",
                values="is_exec",
                aggfunc="sum",
                fill_value=0,
            ).reset_index()
            type_wide = pivot.copy()
            for key in FIELD_TYPE_META:
                if key not in type_wide.columns:
                    type_wide[key] = 0
    out = out.merge(type_wide, on="periodo_clave", how="left")
    for key, meta in FIELD_TYPE_META.items():
        out[key] = to_num(out.get(key), 0)
        out[f"{key}_acum"] = out[key].cumsum()
        out[f"{key}_esperado_acum"] = meta * out["expected_frac_actividades_campo"]
        out[f"{key}_pct_meta"] = pct(out[f"{key}_acum"], pd.Series([meta]*len(out)))
        out[f"{key}_pct_vs_esperado"] = pct(out[f"{key}_acum"], out[f"{key}_esperado_acum"])

    # Latest real data month
    metric_cols = [
        "docentes_nuevos_mes", "estudiantes_nuevos_epc_mes", "actividades_campo_ejecutadas_mes",
        "estudiantes_nuevos_campo_mes", "coordinaciones_mes", "jovenes_formados_total_corte",
        "propuestas_juveniles_total_corte", "capitales_semilla_total_corte"
    ]
    out["_has_data"] = out[metric_cols].fillna(0).sum(axis=1).gt(0)
    latest_period = out.loc[out["_has_data"], "periodo_clave"].iloc[-1] if out["_has_data"].any() else None
    out["is_latest_data_month"] = out["periodo_clave"].eq(latest_period)

    drop_cols = [c for c in out.columns if c.endswith("_det")] + ["_has_data"]
    return out.drop(columns=drop_cols, errors="ignore")


def build_indicadores(total_mes: pd.DataFrame) -> pd.DataFrame:
    if total_mes.empty:
        return pd.DataFrame(columns=[
            "programa_id", "programa_nombre", "periodo_clave", "mes_num", "mes_label", "is_latest_data_month",
            "indicator_id", "indicator_label", "unidad", "meta_anual", "valor_mes", "valor_acumulado",
            "esperado_acumulado", "pct_meta_anual", "pct_vs_esperado"
        ])
    rows = []
    latest = total_mes.sort_values(["anio_reportado", "mes_num"]).iloc[-1]
    defs = [
        ("docentes_capacitados", "Docentes capacitados", "personas",
         "meta_anual_docentes_capacitados", "docentes_nuevos_mes", "docentes_capacitados_acum",
         "docentes_esperado_acum", "pct_docentes_meta", "pct_docentes_vs_esperado"),
        ("centros_cobertura", "Centros educativos alcanzados", "centros",
         "meta_anual_centros_cobertura", "centros_reportados_mes", "centros_cobertura_acum",
         "centros_esperado_acum", "pct_centros_meta", "pct_centros_vs_esperado"),
        ("estudiantes_epc", "Estudiantes beneficiados EPC", "estudiantes",
         "meta_anual_estudiantes_epc", "estudiantes_nuevos_epc_mes", "estudiantes_epc_acum",
         "estudiantes_epc_esperado_acum", "pct_estudiantes_epc_meta", "pct_estudiantes_epc_vs_esperado"),
        ("estudiantes_campo", "Estudiantes en actividades de campo", "estudiantes",
         "meta_anual_estudiantes_campo", "estudiantes_nuevos_campo_mes", "estudiantes_campo_acum",
         "estudiantes_campo_esperado_acum", "pct_estudiantes_campo_meta", "pct_estudiantes_campo_vs_esperado"),
        ("actividades_campo", "Actividades de campo ejecutadas", "actividades",
         "meta_anual_actividades_campo", "actividades_campo_ejecutadas_mes", "actividades_campo_acum",
         "actividades_campo_esperado_acum", "pct_actividades_campo_meta", "pct_actividades_campo_vs_esperado"),
        ("jovenes_formados", "Jóvenes formados", "jóvenes",
         "meta_anual_jovenes_formados", "jovenes_formados_total_corte", "jovenes_formados_total_corte_acum",
         "jovenes_formados_esperado_acum", "pct_jovenes_formados_meta", "pct_jovenes_formados_vs_esperado"),
        ("propuestas_juveniles", "Propuestas juveniles", "propuestas",
         "meta_anual_propuestas_juveniles", "propuestas_juveniles_total_corte", "propuestas_juveniles_total_corte_acum",
         "propuestas_juveniles_esperado_acum", "pct_propuestas_juveniles_meta", "pct_propuestas_juveniles_vs_esperado"),
        ("capitales_semilla", "Capitales semilla", "capitales",
         "meta_anual_capitales_semilla", "capitales_semilla_total_corte", "capitales_semilla_total_corte_acum",
         "capitales_semilla_esperado_acum", "pct_capitales_semilla_meta", "pct_capitales_semilla_vs_esperado"),
    ]
    for ind_id, label, unidad, meta_col, mes_col, acum_col, esp_col, pct_meta_col, pct_exp_col in defs:
        rows.append({
            "programa_id": PROGRAM_ID,
            "programa_nombre": PROGRAM_NAME,
            "periodo_clave": latest["periodo_clave"],
            "mes_num": int(latest["mes_num"]),
            "mes_label": latest["mes_label"],
            "is_latest_data_month": bool(latest["is_latest_data_month"]),
            "indicator_id": ind_id,
            "indicator_label": label,
            "unidad": unidad,
            "meta_anual": float(latest[meta_col]),
            "valor_mes": float(latest[mes_col]),
            "valor_acumulado": float(latest[acum_col]),
            "esperado_acumulado": float(latest[esp_col]),
            "pct_meta_anual": float(latest[pct_meta_col]),
            "pct_vs_esperado": float(latest[pct_exp_col]),
        })

    # Subtipos campo
    subtype_map = {
        "campana_reforestacion": "meta_anual_reforestacion",
        "monitoreo_reforestacion": "meta_anual_monitoreo_reforestacion",
        "manejo_tul": "meta_anual_tul",
        "feria_ambiental": "meta_anual_ferias",
        "huerto_escolar": "meta_anual_huertos",
        "gira_educativa": "meta_anual_giras",
        "mural_pedagogico": "meta_anual_murales",
        "centro_acopio_escolar": "meta_anual_centros_acopio",
        "campana_limpieza_escolar": "meta_anual_limpieza_escolar",
        "proyecto_gestion_ambiental": "meta_anual_proyectos_gestion",
    }
    for key, meta_col in subtype_map.items():
        rows.append({
            "programa_id": PROGRAM_ID,
            "programa_nombre": PROGRAM_NAME,
            "periodo_clave": latest["periodo_clave"],
            "mes_num": int(latest["mes_num"]),
            "mes_label": latest["mes_label"],
            "is_latest_data_month": bool(latest["is_latest_data_month"]),
            "indicator_id": key,
            "indicator_label": FIELD_TYPE_LABEL[key],
            "unidad": "actividades",
            "meta_anual": float(latest[meta_col]),
            "valor_mes": float(latest.get(key, 0)),
            "valor_acumulado": float(latest.get(f"{key}_acum", 0)),
            "esperado_acumulado": float(latest.get(f"{key}_esperado_acum", 0)),
            "pct_meta_anual": float(latest.get(f"{key}_pct_meta", 0)),
            "pct_vs_esperado": float(latest.get(f"{key}_pct_vs_esperado", 0)),
        })
    return pd.DataFrame(rows)


def main():
    ensure_dir(OUT_DIR)
    if not RAW_PATH.exists():
        raise FileNotFoundError(f"No se encontró el raw XLSX en {RAW_PATH}")

    sheets = load_workbook(RAW_PATH)
    main_df = dedupe_main(pick_main_sheet(sheets))
    centros_raw = sheets.get("rep_centro", pd.DataFrame())
    campo_raw = sheets.get("rep_campo", pd.DataFrame())
    dip_raw = sheets.get("rep_diplomado_operativo", pd.DataFrame())
    coord_raw = sheets.get("rep_coordinacion", pd.DataFrame())

    centros_det = prep_centros(centros_raw, main_df)
    campo_det = prep_campo(campo_raw, main_df)
    dip_det = prep_diplomado(dip_raw, main_df)
    coord_det = prep_coordinacion(coord_raw, main_df)

    total_mes = build_total_mes(main_df, centros_det, campo_det, dip_det, coord_det)
    indicadores = build_indicadores(total_mes)

    total_mes.to_csv(OUT_DIR / "total_mes.csv", index=False, encoding="utf-8-sig")
    indicadores.to_csv(OUT_DIR / "institucional_indicadores.csv", index=False, encoding="utf-8-sig")
    centros_det.to_csv(OUT_DIR / "centros_detalle.csv", index=False, encoding="utf-8-sig")
    campo_det.to_csv(OUT_DIR / "actividades_campo_detalle.csv", index=False, encoding="utf-8-sig")
    dip_det.to_csv(OUT_DIR / "diplomado_detalle.csv", index=False, encoding="utf-8-sig")
    coord_det.to_csv(OUT_DIR / "coordinacion_detalle.csv", index=False, encoding="utf-8-sig")

    print("OK: EPC transformado y publicado en data_processed/educando_para_conservar/")


if __name__ == "__main__":
    raise SystemExit(main())
