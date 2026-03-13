
from __future__ import annotations

from pathlib import Path
import pandas as pd
import numpy as np

RAW_FILE = Path("data_raw/conservando_atitlan/kobo_mensual_raw.xlsx")
OUT_DIR = Path("data_processed/conservando_atitlan")
OUT_DIR.mkdir(parents=True, exist_ok=True)

PROGRAMA_ID = "conservando_atitlan"
PROGRAMA_NOMBRE = "Conservando Atitlán"

MONTH_ABBR = {
    1: "ENE",
    2: "FEB",
    3: "MAR",
    4: "ABR",
    5: "MAY",
    6: "JUN",
    7: "JUL",
    8: "AGO",
    9: "SEP",
    10: "OCT",
    11: "NOV",
    12: "DIC",
}

STATUS_RANK = {
    "final_validado": 3,
    "validado": 2,
    "en_revision": 1,
    "borrador": 0,
}

MAIN_NUMERIC_COLS = [
    "anio_reportado",
    "mes_num",
    "jornadas_mes",
    "aceite_litros_mes",
    "agua_protegida_mes",
    "inmuebles_atendidos_mes",
    "hotel_producidos_mes",
    "tocador_producidos_mes",
    "jabones_producidos_mes",
    "hotel_vendidos_mes",
    "tocador_vendidos_mes",
    "ingresos_mes",
    "actividades_mes",
    "meta_anual_jornadas",
    "meta_anual_aceite",
    "meta_anual_agua",
    "meta_anual_jabones",
]

JORNADAS_NUMERIC = [
    "num_municipios_visitados",
    "inmuebles_atendidos",
    "litros_aceite_jornada",
    "agua_protegida_jornada",
]

PRODUCCION_NUMERIC = [
    "codigo_lote",
    "litros_aceite_utilizados",
    "hotel_producidos",
    "tocador_producidos",
    "jabones_oficiales_lote",
]

VENTAS_NUMERIC = [
    "hotel_vendidos",
    "precio_hotel_unit",
    "subtotal_hotel",
    "tocador_vendidos",
    "precio_tocador_unit",
    "subtotal_tocador",
    "total_venta",
]

ACTIVIDADES_NUMERIC = ["cantidad_actividad"]


def read_sheet(xl: pd.ExcelFile, sheet_name: str) -> pd.DataFrame:
    if sheet_name not in xl.sheet_names:
        return pd.DataFrame()
    return pd.read_excel(RAW_FILE, sheet_name=sheet_name)


def to_numeric(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def ensure_datetime(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    return df


def clean_text(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = df[col].where(df[col].notna(), "")
            df[col] = df[col].astype(str).str.strip()
    return df


def safe_div(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    denominator = denominator.replace({0: np.nan})
    return numerator / denominator


def period_key(year: pd.Series, month: pd.Series) -> pd.Series:
    y = year.astype("Int64").astype(str)
    m = month.astype("Int64").astype(str).str.zfill(2)
    return y + "-" + m


def select_latest_valid_reports(main: pd.DataFrame) -> pd.DataFrame:
    if main.empty:
        return main

    main = main.copy()
    main = to_numeric(main, MAIN_NUMERIC_COLS)
    main = ensure_datetime(main, ["start", "end", "_submission_time"])
    main = clean_text(
        main,
        [
            "programa_id",
            "programa_nombre",
            "mes_reportado",
            "estado_reporte",
            "periodo_clave",
            "_uuid",
        ],
    )

    if "programa_id" not in main.columns:
        main["programa_id"] = PROGRAMA_ID
    main["programa_id"] = main["programa_id"].replace("", PROGRAMA_ID)

    if "programa_nombre" not in main.columns:
        main["programa_nombre"] = PROGRAMA_NOMBRE
    main["programa_nombre"] = main["programa_nombre"].replace("", PROGRAMA_NOMBRE)

    if "mes_num" not in main.columns:
        main["mes_num"] = pd.NA
    if "anio_reportado" not in main.columns:
        main["anio_reportado"] = pd.NA

    main["estado_rank"] = (
        main.get("estado_reporte", pd.Series("", index=main.index))
        .astype(str)
        .str.strip()
        .str.lower()
        .map(STATUS_RANK)
        .fillna(-1)
    )

    if "_id" in main.columns:
        main["_id_num"] = pd.to_numeric(main["_id"], errors="coerce")
    else:
        main["_id_num"] = np.arange(len(main))

    main["periodo"] = period_key(main["anio_reportado"], main["mes_num"])
    main["periodo_clave"] = main["periodo_clave"].replace("", pd.NA)
    main["periodo_clave"] = main["periodo_clave"].fillna(main["periodo"])

    main = main.sort_values(
        ["anio_reportado", "mes_num", "estado_rank", "_submission_time", "_id_num"],
        ascending=[True, True, True, True, True],
    )
    main = main.groupby(["anio_reportado", "mes_num"], dropna=False).tail(1).copy()
    main = main.sort_values(["anio_reportado", "mes_num"]).reset_index(drop=True)
    main["mes"] = main["mes_num"].map(MONTH_ABBR)
    main["has_any_data"] = (
        main[[
            c for c in [
                "jornadas_mes",
                "aceite_litros_mes",
                "agua_protegida_mes",
                "jabones_producidos_mes",
            ] if c in main.columns
        ]]
        .fillna(0)
        .sum(axis=1)
        > 0
    )
    return main


def build_total_mes(main: pd.DataFrame) -> pd.DataFrame:
    if main.empty:
        cols = [
            "programa_id",
            "programa_nombre",
            "anio",
            "mes_num",
            "mes",
            "periodo",
            "periodo_clave",
            "estado_reporte",
            "has_any_data",
            "jornadas_mes",
            "aceite_litros_mes",
            "agua_protegida_mes",
            "inmuebles_atendidos_mes",
            "hotel_producidos_mes",
            "tocador_producidos_mes",
            "jabones_producidos_mes",
            "hotel_vendidos_mes",
            "tocador_vendidos_mes",
            "ingresos_mes",
            "actividades_mes",
            "jornadas_acum",
            "aceite_litros_acum",
            "agua_protegida_acum",
            "jabones_producidos_acum",
            "meta_anual_jornadas",
            "meta_anual_aceite",
            "meta_anual_agua",
            "meta_anual_jabones",
            "meta_esperada_jornadas",
            "meta_esperada_aceite",
            "meta_esperada_agua",
            "meta_esperada_jabones",
            "pct_avance_anual_jornadas",
            "pct_avance_anual_aceite",
            "pct_avance_anual_agua",
            "pct_avance_anual_jabones",
            "pct_vs_esperado_jornadas",
            "pct_vs_esperado_aceite",
            "pct_vs_esperado_agua",
            "pct_vs_esperado_jabones",
            "es_ultimo_mes_con_datos",
            "_uuid",
            "_submission_time",
        ]
        return pd.DataFrame(columns=cols)

    total = pd.DataFrame(
        {
            "programa_id": main["programa_id"],
            "programa_nombre": main["programa_nombre"],
            "anio": main["anio_reportado"].astype("Int64"),
            "mes_num": main["mes_num"].astype("Int64"),
            "mes": main["mes"],
            "periodo": period_key(main["anio_reportado"], main["mes_num"]),
            "periodo_clave": main["periodo_clave"],
            "estado_reporte": main["estado_reporte"],
            "has_any_data": main["has_any_data"],
            "jornadas_mes": main.get("jornadas_mes", 0),
            "aceite_litros_mes": main.get("aceite_litros_mes", 0),
            "agua_protegida_mes": main.get("agua_protegida_mes", 0),
            "inmuebles_atendidos_mes": main.get("inmuebles_atendidos_mes", 0),
            "hotel_producidos_mes": main.get("hotel_producidos_mes", 0),
            "tocador_producidos_mes": main.get("tocador_producidos_mes", 0),
            "jabones_producidos_mes": main.get("jabones_producidos_mes", 0),
            "hotel_vendidos_mes": main.get("hotel_vendidos_mes", 0),
            "tocador_vendidos_mes": main.get("tocador_vendidos_mes", 0),
            "ingresos_mes": main.get("ingresos_mes", 0),
            "actividades_mes": main.get("actividades_mes", 0),
            "meta_anual_jornadas": main.get("meta_anual_jornadas", np.nan),
            "meta_anual_aceite": main.get("meta_anual_aceite", np.nan),
            "meta_anual_agua": main.get("meta_anual_agua", np.nan),
            "meta_anual_jabones": main.get("meta_anual_jabones", np.nan),
            "_uuid": main.get("_uuid", ""),
            "_submission_time": main.get("_submission_time", pd.NaT),
        }
    )

    numeric_cols = [c for c in total.columns if c.endswith("_mes") or c.startswith("meta_anual_")]
    total = to_numeric(total, numeric_cols)

    total["jornadas_acum"] = total.groupby("anio", dropna=False)["jornadas_mes"].cumsum()
    total["aceite_litros_acum"] = total.groupby("anio", dropna=False)["aceite_litros_mes"].cumsum()
    total["agua_protegida_acum"] = total.groupby("anio", dropna=False)["agua_protegida_mes"].cumsum()
    total["jabones_producidos_acum"] = total.groupby("anio", dropna=False)["jabones_producidos_mes"].cumsum()

    total["meta_esperada_jornadas"] = total["meta_anual_jornadas"] * total["mes_num"] / 12.0
    total["meta_esperada_aceite"] = total["meta_anual_aceite"] * total["mes_num"] / 12.0
    total["meta_esperada_agua"] = total["meta_anual_agua"] * total["mes_num"] / 12.0
    total["meta_esperada_jabones"] = total["meta_anual_jabones"] * total["mes_num"] / 12.0

    total["pct_avance_anual_jornadas"] = safe_div(total["jornadas_acum"], total["meta_anual_jornadas"])
    total["pct_avance_anual_aceite"] = safe_div(total["aceite_litros_acum"], total["meta_anual_aceite"])
    total["pct_avance_anual_agua"] = safe_div(total["agua_protegida_acum"], total["meta_anual_agua"])
    total["pct_avance_anual_jabones"] = safe_div(total["jabones_producidos_acum"], total["meta_anual_jabones"])

    total["pct_vs_esperado_jornadas"] = safe_div(total["jornadas_acum"], total["meta_esperada_jornadas"])
    total["pct_vs_esperado_aceite"] = safe_div(total["aceite_litros_acum"], total["meta_esperada_aceite"])
    total["pct_vs_esperado_agua"] = safe_div(total["agua_protegida_acum"], total["meta_esperada_agua"])
    total["pct_vs_esperado_jabones"] = safe_div(total["jabones_producidos_acum"], total["meta_esperada_jabones"])

    total["es_ultimo_mes_con_datos"] = False
    datos = total[total["has_any_data"]].copy()
    if not datos.empty:
        idx = datos.sort_values(["anio", "mes_num"]).tail(1).index[0]
        total.loc[idx, "es_ultimo_mes_con_datos"] = True

    return total


def build_institucional_indicadores(total: pd.DataFrame) -> pd.DataFrame:
    rows = []
    specs = [
        ("jornadas", "Jornadas de recolección", "jornadas", "jornadas_mes", "jornadas_acum", "meta_anual_jornadas", "meta_esperada_jornadas", "pct_avance_anual_jornadas", "pct_vs_esperado_jornadas"),
        ("aceite_litros", "Aceite usado recolectado", "litros", "aceite_litros_mes", "aceite_litros_acum", "meta_anual_aceite", "meta_esperada_aceite", "pct_avance_anual_aceite", "pct_vs_esperado_aceite"),
        ("agua_protegida_litros", "Agua protegida", "litros", "agua_protegida_mes", "agua_protegida_acum", "meta_anual_agua", "meta_esperada_agua", "pct_avance_anual_agua", "pct_vs_esperado_agua"),
        ("jabones_producidos", "Jabones producidos", "unidades", "jabones_producidos_mes", "jabones_producidos_acum", "meta_anual_jabones", "meta_esperada_jabones", "pct_avance_anual_jabones", "pct_vs_esperado_jabones"),
    ]

    for _, row in total.iterrows():
        for indicador_id, nombre, unidad, col_mes, col_acum, col_meta, col_esp, col_pct, col_pct_esp in specs:
            rows.append(
                {
                    "programa_id": row["programa_id"],
                    "programa_nombre": row["programa_nombre"],
                    "anio": row["anio"],
                    "mes_num": row["mes_num"],
                    "mes": row["mes"],
                    "periodo": row["periodo"],
                    "periodo_clave": row["periodo_clave"],
                    "nivel_agregacion": "programa",
                    "territorio": "TOTAL",
                    "indicador_id": indicador_id,
                    "indicador_nombre": nombre,
                    "valor_mes": row[col_mes],
                    "valor_acumulado": row[col_acum],
                    "meta_anual": row[col_meta],
                    "meta_esperada_corte": row[col_esp],
                    "pct_avance_anual": row[col_pct],
                    "pct_vs_esperado": row[col_pct_esp],
                    "unidad": unidad,
                    "fuente": "KoBo",
                    "es_ultimo_mes_con_datos": row["es_ultimo_mes_con_datos"],
                }
            )

    return pd.DataFrame(rows)


def enrich_with_parent_period(detail: pd.DataFrame, parent_map: pd.DataFrame) -> pd.DataFrame:
    if detail.empty:
        return detail

    detail = detail.copy()
    detail = clean_text(detail, ["_submission__uuid", "_submission_meta/rootUuid"])
    key_col = "_submission__uuid" if "_submission__uuid" in detail.columns else "_submission_meta/rootUuid"
    if key_col not in detail.columns:
        detail["parent_uuid"] = ""
    else:
        detail["parent_uuid"] = detail[key_col].astype(str).str.strip()

    parent_cols = [
        "_uuid",
        "programa_id",
        "programa_nombre",
        "anio_reportado",
        "mes_num",
        "mes",
        "periodo_clave",
    ]
    parent = parent_map[parent_cols].copy()
    parent = parent.rename(columns={"_uuid": "parent_uuid", "anio_reportado": "anio"})
    detail = detail.merge(parent, on="parent_uuid", how="inner")
    detail["periodo"] = period_key(detail["anio"], detail["mes_num"])
    return detail


def build_jornadas_detalle(parent_map: pd.DataFrame, jornadas: pd.DataFrame) -> pd.DataFrame:
    if jornadas.empty:
        cols = ["programa_id", "programa_nombre", "anio", "mes_num", "mes", "periodo", "periodo_clave", "fecha_jornada", "municipios_visitados_texto", "num_municipios_visitados", "inmuebles_atendidos", "litros_aceite_jornada", "agua_protegida_jornada", "foto_jornada", "observaciones_jornada", "parent_uuid"]
        return pd.DataFrame(columns=cols)

    jornadas = to_numeric(jornadas, JORNADAS_NUMERIC)
    jornadas = ensure_datetime(jornadas, ["fecha_jornada"])
    jornadas = enrich_with_parent_period(jornadas, parent_map)
    jornadas = jornadas[
        [
            "programa_id",
            "programa_nombre",
            "anio",
            "mes_num",
            "mes",
            "periodo",
            "periodo_clave",
            "fecha_jornada",
            "municipios_visitados_texto",
            "num_municipios_visitados",
            "inmuebles_atendidos",
            "litros_aceite_jornada",
            "agua_protegida_jornada",
            "foto_jornada",
            "observaciones_jornada",
            "parent_uuid",
        ]
    ].sort_values(["anio", "mes_num", "fecha_jornada"]).reset_index(drop=True)
    return jornadas


def build_produccion_detalle(parent_map: pd.DataFrame, produccion: pd.DataFrame) -> pd.DataFrame:
    if produccion.empty:
        cols = ["programa_id", "programa_nombre", "anio", "mes_num", "mes", "periodo", "periodo_clave", "fecha_produccion", "codigo_lote", "litros_aceite_utilizados", "hotel_producidos", "tocador_producidos", "jabones_oficiales_lote", "foto_produccion", "observaciones_produccion", "parent_uuid"]
        return pd.DataFrame(columns=cols)

    produccion = to_numeric(produccion, PRODUCCION_NUMERIC)
    produccion = ensure_datetime(produccion, ["fecha_produccion"])
    produccion = enrich_with_parent_period(produccion, parent_map)
    produccion = produccion[
        [
            "programa_id",
            "programa_nombre",
            "anio",
            "mes_num",
            "mes",
            "periodo",
            "periodo_clave",
            "fecha_produccion",
            "codigo_lote",
            "litros_aceite_utilizados",
            "hotel_producidos",
            "tocador_producidos",
            "jabones_oficiales_lote",
            "foto_produccion",
            "observaciones_produccion",
            "parent_uuid",
        ]
    ].sort_values(["anio", "mes_num", "fecha_produccion"]).reset_index(drop=True)
    return produccion


def build_ventas_detalle(parent_map: pd.DataFrame, ventas: pd.DataFrame) -> pd.DataFrame:
    if ventas.empty:
        cols = ["programa_id", "programa_nombre", "anio", "mes_num", "mes", "periodo", "periodo_clave", "fecha_venta", "tipo_cliente", "cliente_nombre", "factura_referencia", "fuente_precio", "hotel_vendidos", "precio_hotel_unit", "subtotal_hotel", "tocador_vendidos", "precio_tocador_unit", "subtotal_tocador", "total_venta", "comprobante_venta", "observaciones_venta", "parent_uuid"]
        return pd.DataFrame(columns=cols)

    ventas = to_numeric(ventas, VENTAS_NUMERIC)
    ventas = ensure_datetime(ventas, ["fecha_venta"])
    ventas = enrich_with_parent_period(ventas, parent_map)
    ventas = ventas[
        [
            "programa_id",
            "programa_nombre",
            "anio",
            "mes_num",
            "mes",
            "periodo",
            "periodo_clave",
            "fecha_venta",
            "tipo_cliente",
            "cliente_nombre",
            "factura_referencia",
            "fuente_precio",
            "hotel_vendidos",
            "precio_hotel_unit",
            "subtotal_hotel",
            "tocador_vendidos",
            "precio_tocador_unit",
            "subtotal_tocador",
            "total_venta",
            "comprobante_venta",
            "observaciones_venta",
            "parent_uuid",
        ]
    ].sort_values(["anio", "mes_num", "fecha_venta"]).reset_index(drop=True)
    return ventas


def build_actividades_detalle(parent_map: pd.DataFrame, actividades: pd.DataFrame) -> pd.DataFrame:
    if actividades.empty:
        cols = ["programa_id", "programa_nombre", "anio", "mes_num", "mes", "periodo", "periodo_clave", "fecha_actividad", "tipo_actividad", "cantidad_actividad", "municipio_actividad", "descripcion_actividad", "evidencia_actividad", "parent_uuid"]
        return pd.DataFrame(columns=cols)

    actividades = to_numeric(actividades, ACTIVIDADES_NUMERIC)
    actividades = ensure_datetime(actividades, ["fecha_actividad"])
    actividades = enrich_with_parent_period(actividades, parent_map)
    actividades = actividades[
        [
            "programa_id",
            "programa_nombre",
            "anio",
            "mes_num",
            "mes",
            "periodo",
            "periodo_clave",
            "fecha_actividad",
            "tipo_actividad",
            "cantidad_actividad",
            "municipio_actividad",
            "descripcion_actividad",
            "evidencia_actividad",
            "parent_uuid",
        ]
    ].sort_values(["anio", "mes_num", "fecha_actividad"]).reset_index(drop=True)
    return actividades


def main() -> int:
    if not RAW_FILE.exists():
        raise SystemExit(f"No se encontró el archivo raw: {RAW_FILE}")

    xl = pd.ExcelFile(RAW_FILE)
    main_sheet = xl.sheet_names[0]
    main_raw = pd.read_excel(RAW_FILE, sheet_name=main_sheet)

    main = select_latest_valid_reports(main_raw)
    total_mes = build_total_mes(main)
    indicadores = build_institucional_indicadores(total_mes)

    jornadas_raw = read_sheet(xl, "rep_jornada")
    produccion_raw = read_sheet(xl, "rep_produccion")
    ventas_raw = read_sheet(xl, "rep_ventas")
    actividades_raw = read_sheet(xl, "rep_actividad")

    jornadas = build_jornadas_detalle(main, jornadas_raw)
    produccion = build_produccion_detalle(main, produccion_raw)
    ventas = build_ventas_detalle(main, ventas_raw)
    actividades = build_actividades_detalle(main, actividades_raw)

    total_mes.to_csv(OUT_DIR / "total_mes.csv", index=False)
    indicadores.to_csv(OUT_DIR / "institucional_indicadores.csv", index=False)
    jornadas.to_csv(OUT_DIR / "jornadas_detalle.csv", index=False)
    produccion.to_csv(OUT_DIR / "produccion_detalle.csv", index=False)
    ventas.to_csv(OUT_DIR / "ventas_detalle.csv", index=False)
    actividades.to_csv(OUT_DIR / "actividades_detalle.csv", index=False)

    print("Transformación completada.")
    print(f"total_mes: {len(total_mes)} filas")
    print(f"institucional_indicadores: {len(indicadores)} filas")
    print(f"jornadas_detalle: {len(jornadas)} filas")
    print(f"produccion_detalle: {len(produccion)} filas")
    print(f"ventas_detalle: {len(ventas)} filas")
    print(f"actividades_detalle: {len(actividades)} filas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
