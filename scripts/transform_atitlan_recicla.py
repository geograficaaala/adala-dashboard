from pathlib import Path
import pandas as pd

RAW_DIR = Path("data_raw/atitlan_recicla")
OUT_DIR = Path("data_processed/atitlan_recicla")
OUT_DIR.mkdir(parents=True, exist_ok=True)

PROGRAMA_ID_DEFAULT = "atitlan_recicla"
PROGRAMA_NOMBRE_DEFAULT = "Atitlán Recicla"

CDM_NUMERIC_COLS = [
    "mujeres_activas",
    "mujeres_actividades",
    "mujeres_comercializacion",
    "mujeres_comercializacion_no_inscritas",
    "mujeres_inscritas_total",
    "mujeres_nuevas_inscritas",
    "materiales_lideresas_qq",
    "materiales_municipalidad_qq",
    "total_materiales_qq",
    "ingreso_bruto_lideresas",
    "gasto_transporte",
    "pago_coop_lideresas",
    "ingreso_neto_lideresas",
    "ingreso_bruto_municipalidad",
    "pago_coop_municipalidad",
    "ingreso_neto_municipalidad",
    "ingreso_bruto_total",
    "ingreso_neto_total_territorio",
    "ingreso_neto_cooperativa",
    "horas_trabajadas_lideresas",
    "ingreso_diario_lideresa",
    "pet_qq",
    "vidrio_cerveza_gronn_unid",
    "vidrio_vino_gronn_unid",
    "vidrio_cerveza_surusic_unid",
    "vidrio_vino_surusic_unid",
    "vidrio_peso_qq",
    "vidrio_total_qq",
    "ingreso_pet",
    "ingreso_vidrio_peso",
    "ingreso_vidrio_gronn",
    "ingreso_vidrio_surusic",
]

MATERIALES_NUMERIC_COLS = [
    "cantidad",
    "pagado_unit_gtq",
    "precio_vendido_unit_gtq",
    "gtq_total_pagados",
    "ingreso_total_venta",
    "ingreso_cooperativa",
]

AVG_COLS = [
    "mujeres_activas",
    "mujeres_actividades",
    "mujeres_comercializacion",
    "mujeres_comercializacion_no_inscritas",
    "ingreso_diario_lideresa",
]

MAX_COLS = [
    "mujeres_inscritas_total",
]

SUM_COLS = [
    "mujeres_nuevas_inscritas",
    "materiales_lideresas_qq",
    "materiales_municipalidad_qq",
    "total_materiales_qq",
    "ingreso_bruto_lideresas",
    "gasto_transporte",
    "pago_coop_lideresas",
    "ingreso_neto_lideresas",
    "ingreso_bruto_municipalidad",
    "pago_coop_municipalidad",
    "ingreso_neto_municipalidad",
    "ingreso_bruto_total",
    "ingreso_neto_total_territorio",
    "ingreso_neto_cooperativa",
    "horas_trabajadas_lideresas",
    "pet_qq",
    "vidrio_cerveza_gronn_unid",
    "vidrio_vino_gronn_unid",
    "vidrio_cerveza_surusic_unid",
    "vidrio_vino_surusic_unid",
    "vidrio_peso_qq",
    "vidrio_total_qq",
    "ingreso_pet",
    "ingreso_vidrio_peso",
    "ingreso_vidrio_gronn",
    "ingreso_vidrio_surusic",
]

MONTHLY_METAS = {
    "total_materiales_qq": 1630.0,
    "pet_qq": 153.0,
    "vidrio_total_qq": 1018.0,
    "ingreso_bruto_total": 40727.0,
    "ingreso_bruto_lideresas": 36655.0,
    "ingreso_bruto_municipalidad": 4073.0,
    "ingreso_diario_lideresa": 135.0,
    "pct_participacion_actividades": 0.75,
    "pct_participacion_comercializacion": 0.60,
}

INDICATOR_LABELS = {
    "total_materiales_qq": (
        "materiales_generales",
        "Materiales reciclables recolectados",
        "qq",
    ),
    "pet_qq": ("pet", "PET recolectado", "qq"),
    "vidrio_total_qq": ("vidrio", "Vidrio recolectado", "qq"),
    "ingreso_bruto_total": (
        "ingreso_bruto_total",
        "Ingresos brutos totales",
        "GTQ",
    ),
    "ingreso_bruto_lideresas": (
        "ingreso_bruto_mujeres",
        "Ingresos brutos por mujeres",
        "GTQ",
    ),
    "ingreso_bruto_municipalidad": (
        "ingreso_bruto_municipalidades",
        "Ingresos brutos por municipalidades",
        "GTQ",
    ),
    "ingreso_diario_lideresa": (
        "ingreso_diario_lideresa",
        "Ingreso diario por lideresa",
        "GTQ/día",
    ),
    "pct_participacion_actividades": (
        "participacion_actividades",
        "Participación activa en actividades",
        "proporción",
    ),
    "pct_participacion_comercializacion": (
        "participacion_comercializacion",
        "Participación en comercialización",
        "proporción",
    ),
}

MONTH_MAP = {
    "ENE": 1,
    "FEB": 2,
    "MAR": 3,
    "ABR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AGO": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DIC": 12,
}

REV_MONTH_MAP = {v: k for k, v in MONTH_MAP.items()}


def read_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str).fillna("")
    df.columns = [str(c).strip() for c in df.columns]
    return df


def parse_number_es(value):
    if pd.isna(value):
        return pd.NA

    s = str(value).strip().replace(" ", "")

    if s in {"", "NA", "N/A", "nan", "-"}:
        return pd.NA

    if "," in s and "." in s:
        if s.rfind(".") > s.rfind(","):
            s = s.replace(",", "")
        else:
            s = s.replace(".", "").replace(",", ".")

    elif "," in s:
        s = s.replace(",", ".")

    elif "." in s:
        pass

    try:
        return float(s)
    except ValueError:
        return pd.NA


def to_numeric(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = df[col].apply(parse_number_es)
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def to_bool(series: pd.Series) -> pd.Series:
    return (
        series.astype(str)
        .str.strip()
        .str.lower()
        .isin(["true", "1", "yes", "si", "sí", "verdadero"])
    )


def safe_div(num: pd.Series, den: pd.Series) -> pd.Series:
    den = den.replace({0: pd.NA})
    return num / den


def normalize_programa_id(series: pd.Series) -> pd.Series:
    return (
        series.astype(str)
        .str.strip()
        .str.lower()
        .str.replace("á", "a", regex=False)
        .str.replace("é", "e", regex=False)
        .str.replace("í", "i", regex=False)
        .str.replace("ó", "o", regex=False)
        .str.replace("ú", "u", regex=False)
        .str.replace(" ", "_", regex=False)
    )


def programa_nombre_from_id(programa_id: str) -> str:
    if programa_id == "atitlan_recicla":
        return PROGRAMA_NOMBRE_DEFAULT
    return programa_id.replace("_", " ").title()


def build_cdm_tables() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    cdm = read_csv(RAW_DIR / "cdm_raw.csv")

    if "has_any_data" in cdm.columns:
        cdm = cdm[to_bool(cdm["has_any_data"])].copy()

    cdm = to_numeric(cdm, ["anio", "mes_num"] + CDM_NUMERIC_COLS)

    if "anio" in cdm.columns:
        cdm["anio"] = cdm["anio"].astype("Int64")
    if "mes_num" in cdm.columns:
        cdm["mes_num"] = cdm["mes_num"].astype("Int64")

    if "mes" in cdm.columns:
        cdm["mes"] = cdm["mes"].astype(str).str.strip().str.upper()
    if "zona" in cdm.columns:
        cdm["zona"] = cdm["zona"].astype(str).str.strip()
    if "territorio" in cdm.columns:
        cdm["territorio"] = cdm["territorio"].astype(str).str.strip()

    if "programa" in cdm.columns:
        cdm["programa"] = normalize_programa_id(cdm["programa"])
    else:
        cdm["programa"] = PROGRAMA_ID_DEFAULT

    territorio_cols = [
        "record_key",
        "programa",
        "anio",
        "mes_num",
        "mes",
        "zona",
        "territorio",
        "tipo_operacion",
    ] + [c for c in CDM_NUMERIC_COLS if c in cdm.columns]

    territorio_mes = cdm[territorio_cols].copy()
    territorio_mes = territorio_mes.sort_values(
        ["anio", "mes_num", "zona", "territorio"]
    )

    agg_map = {}
    for col in AVG_COLS:
        if col in territorio_mes.columns:
            agg_map[col] = "mean"
    for col in MAX_COLS:
        if col in territorio_mes.columns:
            agg_map[col] = "max"
    for col in SUM_COLS:
        if col in territorio_mes.columns:
            agg_map[col] = "sum"

    zona_group = ["programa", "anio", "mes_num", "mes", "zona"]
    zona_mes = (
        territorio_mes.groupby(zona_group, dropna=False)
        .agg(agg_map)
        .reset_index()
    )

    zonas_n = (
        territorio_mes.groupby(zona_group, dropna=False)["territorio"]
        .nunique()
        .reset_index(name="territorios_reportados")
    )
    zona_mes = zona_mes.merge(zonas_n, on=zona_group, how="left")

    total_group = ["programa", "anio", "mes_num", "mes"]
    total_mes = (
        territorio_mes.groupby(total_group, dropna=False)
        .agg(agg_map)
        .reset_index()
    )
    total_mes["zona"] = "TOTAL"

    if {"mujeres_actividades", "mujeres_activas"}.issubset(total_mes.columns):
        total_mes["pct_participacion_actividades"] = safe_div(
            total_mes["mujeres_actividades"],
            total_mes["mujeres_activas"],
        )

    if {
        "mujeres_comercializacion",
        "mujeres_comercializacion_no_inscritas",
        "mujeres_activas",
    }.issubset(total_mes.columns):
        total_mes["pct_participacion_comercializacion"] = safe_div(
            total_mes["mujeres_comercializacion"]
            + total_mes["mujeres_comercializacion_no_inscritas"],
            total_mes["mujeres_activas"],
        )

    indicadores_rows = []
    for _, row in total_mes.iterrows():
        programa_id = row.get("programa", PROGRAMA_ID_DEFAULT)
        programa_nombre = programa_nombre_from_id(programa_id)

        for col, (indicador_id, indicador_nombre, unidad) in INDICATOR_LABELS.items():
            if col in total_mes.columns:
                valor = row.get(col)
                if pd.notna(valor):
                    indicadores_rows.append(
                        {
                            "programa_id": programa_id,
                            "programa_nombre": programa_nombre,
                            "anio": row["anio"],
                            "mes_num": row["mes_num"],
                            "mes": row["mes"],
                            "nivel_agregacion": "programa",
                            "territorio": "TOTAL",
                            "indicador_id": indicador_id,
                            "indicador_nombre": indicador_nombre,
                            "valor": valor,
                            "meta_mensual": MONTHLY_METAS.get(col),
                            "unidad": unidad,
                            "fuente": "CDM",
                        }
                    )

    indicadores = pd.DataFrame(indicadores_rows)

    if not indicadores.empty:
        indicadores = indicadores[
            [
                "programa_id",
                "programa_nombre",
                "anio",
                "mes_num",
                "mes",
                "nivel_agregacion",
                "territorio",
                "indicador_id",
                "indicador_nombre",
                "valor",
                "meta_mensual",
                "unidad",
                "fuente",
            ]
        ]

    return territorio_mes, zona_mes, total_mes, indicadores


def build_materiales_tables() -> tuple[pd.DataFrame, pd.DataFrame]:
    materiales = read_csv(RAW_DIR / "materiales_raw.csv")
    materiales = to_numeric(materiales, ["anio"] + MATERIALES_NUMERIC_COLS)

    if "anio" in materiales.columns:
        materiales["anio"] = materiales["anio"].astype("Int64")

    if "programa" in materiales.columns:
        materiales["programa"] = normalize_programa_id(materiales["programa"])
    else:
        materiales["programa"] = PROGRAMA_ID_DEFAULT

    if "mes" in materiales.columns:
        mes_raw = materiales["mes"].astype(str).str.strip().str.upper()
    else:
        mes_raw = pd.Series([""] * len(materiales), index=materiales.index, dtype="object")

    if "record_key" in materiales.columns:
        mes_from_key = (
            materiales["record_key"]
            .astype(str)
            .str.split("|")
            .str[1]
            .fillna("")
            .str.strip()
            .str.upper()
        )
        mes_raw = mes_raw.mask(mes_raw.eq(""), mes_from_key)

    mes_num = pd.to_numeric(mes_raw, errors="coerce")
    mes_num = mes_num.fillna(mes_raw.map(MONTH_MAP))

    materiales["mes_num"] = mes_num.astype("Int64")
    materiales["mes"] = materiales["mes_num"].map(REV_MONTH_MAP)

    for col in ["recolector", "municipio_origen", "zona_codigo", "material"]:
        if col in materiales.columns:
            materiales[col] = materiales[col].astype(str).str.strip()

    if "record_key" in materiales.columns:
        materiales = materiales[
            materiales["record_key"].astype(str).str.strip() != ""
        ].copy()

    detalle = materiales.copy()

    group_cols = [
        "programa",
        "anio",
        "mes_num",
        "mes",
        "zona_codigo",
        "municipio_origen",
        "material",
    ]
    resumen_cols = [c for c in MATERIALES_NUMERIC_COLS if c in detalle.columns]
    resumen = (
        detalle.groupby(group_cols, dropna=False)[resumen_cols]
        .sum()
        .reset_index()
    )

    return detalle, resumen


def main():
    territorio_mes, zona_mes, total_mes, indicadores = build_cdm_tables()
    materiales_detalle, materiales_resumen = build_materiales_tables()

    territorio_mes.to_csv(OUT_DIR / "territorio_mes.csv", index=False)
    zona_mes.to_csv(OUT_DIR / "zona_mes.csv", index=False)
    total_mes.to_csv(OUT_DIR / "total_mes.csv", index=False)
    indicadores.to_csv(OUT_DIR / "institucional_indicadores.csv", index=False)
    materiales_detalle.to_csv(OUT_DIR / "materiales_detalle.csv", index=False)
    materiales_resumen.to_csv(OUT_DIR / "materiales_resumen_mes.csv", index=False)

    print("Transformación completada.")
    print(f"territorio_mes: {len(territorio_mes)} filas")
    print(f"zona_mes: {len(zona_mes)} filas")
    print(f"total_mes: {len(total_mes)} filas")
    print(f"institucional_indicadores: {len(indicadores)} filas")
    print(f"materiales_detalle: {len(materiales_detalle)} filas")
    print(f"materiales_resumen_mes: {len(materiales_resumen)} filas")


if __name__ == "__main__":
    main()
