
from __future__ import annotations

import json
import shutil
from pathlib import Path

import pandas as pd

PROGRAM_ID = "conservando_atitlan"
PROGRAM_NAME = "Conservando Atitlán"

RAW_DIR = Path("data_raw/conservando_atitlan")
OUT_DIR = Path("data_processed/conservando_atitlan")
DOCS_DIR = Path("docs/data/conservando_atitlan")

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
    "jornadas_recoleccion_ciclo": 12.0,
    "litros_aceite_recolectados": 80000.0,
    "litros_agua_protegidos": 80000000.0,
    "jabones_producidos": 65040.0,
    "jabones_vendidos": 51600.0,
}

INDICATOR_LABELS = {
    "jornadas_recoleccion_ciclo": ("Jornadas de recolección a inmuebles", "jornadas", "estrategico"),
    "litros_aceite_recolectados": ("Litros de aceite usado recolectados", "litros", "estrategico"),
    "litros_agua_protegidos": ("Litros de agua protegidos", "litros", "estrategico"),
    "jabones_producidos": ("Jabones producidos", "jabones", "estrategico"),
    "jabones_vendidos": ("Jabones vendidos", "jabones", "estrategico"),
    "municipios_visitados": ("Municipios visitados", "municipios", "complementario"),
    "inmuebles_atendidos": ("Inmuebles atendidos", "inmuebles", "complementario"),
    "jornadas_codigos_unicos": ("Códigos únicos de jornada", "códigos", "complementario"),
    "clientes_recurrentes_atendidos": ("Clientes recurrentes atendidos", "clientes", "complementario"),
    "jabones_hotel_producidos": ("Jabones de hotel producidos", "jabones", "complementario"),
    "jabones_tocador_producidos": ("Jabones de tocador producidos", "jabones", "complementario"),
    "jabones_hotel_vendidos": ("Jabones de hotel vendidos", "jabones", "complementario"),
    "jabones_tocador_vendidos": ("Jabones de tocador vendidos", "jabones", "complementario"),
    "ingresos_ventas_q": ("Ingresos por ventas", "quetzales", "complementario"),
    "publicaciones_redes": ("Publicaciones en redes", "publicaciones", "complementario"),
    "pruebas_jabon_liquido": ("Pruebas de jabón líquido", "pruebas", "complementario"),
}

INDICATOR_ORDER = [
    "jornadas_recoleccion_ciclo",
    "litros_aceite_recolectados",
    "litros_agua_protegidos",
    "jabones_producidos",
    "jabones_vendidos",
    "municipios_visitados",
    "inmuebles_atendidos",
    "jornadas_codigos_unicos",
    "clientes_recurrentes_atendidos",
    "jabones_hotel_producidos",
    "jabones_tocador_producidos",
    "jabones_hotel_vendidos",
    "jabones_tocador_vendidos",
    "ingresos_ventas_q",
    "publicaciones_redes",
    "pruebas_jabon_liquido",
]

RECURRING_MONTHLY_IDS = {"jornadas_recoleccion_ciclo"}

TOTAL_FIELD_MAP = {
    "jornadas_recoleccion_ciclo": "jornadas_recoleccion_ciclo_mes",
    "litros_aceite_recolectados": "litros_aceite_recolectados_mes",
    "litros_agua_protegidos": "litros_agua_protegidos_mes",
    "jabones_producidos": "jabones_producidos_mes",
    "jabones_vendidos": "jabones_vendidos_mes",
    "municipios_visitados": "municipios_visitados_mes",
    "inmuebles_atendidos": "inmuebles_atendidos_mes",
    "jornadas_codigos_unicos": "jornadas_codigos_unicos_mes",
    "clientes_recurrentes_atendidos": "clientes_recurrentes_atendidos_mes",
    "jabones_hotel_producidos": "jabones_hotel_producidos_mes",
    "jabones_tocador_producidos": "jabones_tocador_producidos_mes",
    "jabones_hotel_vendidos": "jabones_hotel_vendidos_mes",
    "jabones_tocador_vendidos": "jabones_tocador_vendidos_mes",
    "ingresos_ventas_q": "ingresos_ventas_q_mes",
    "publicaciones_redes": "publicaciones_redes_mes",
    "pruebas_jabon_liquido": "pruebas_jabon_liquido_mes",
}

def read_csv(name: str) -> pd.DataFrame:
    path = RAW_DIR / name
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, dtype=str).fillna("")
    df.columns = [str(c).strip() for c in df.columns]
    return df

def normalize_text(value) -> str:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass
    text = str(value).strip()
    if text.lower() == "nan":
        return ""
    return " ".join(text.split())

def parse_bool(value) -> bool:
    return normalize_text(value).lower() in {"sí", "si", "true", "1", "yes", "y", "x", "verdadero"}

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

def to_float(value, default=0.0) -> float:
    num = parse_number(value)
    return float(num) if pd.notna(num) else float(default)

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
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        dt = pd.to_datetime(s, errors="coerce")
        if pd.notna(dt):
            return dt
    dt = pd.to_datetime(s, errors="coerce", dayfirst=True)
    if pd.notna(dt):
        return dt
    dt = pd.to_datetime(s, errors="coerce", dayfirst=False)
    if pd.notna(dt):
        return dt
    return pd.NaT

def month_name(month_num: int) -> str:
    return MONTH_NAMES_ES.get(int(month_num), f"Mes {month_num}")

def semaforo_from_ratio(ratio: float, exigible: bool = True) -> str:
    if not exigible:
        return "gris"
    if ratio >= 1:
        return "verde"
    if ratio >= 0.85:
        return "amarillo"
    return "rojo"

def ensure_period_columns(df: pd.DataFrame, date_col: str = "Fecha") -> pd.DataFrame:
    df = df.copy()
    if date_col not in df.columns:
        df["fecha"] = pd.NaT
    else:
        df["fecha"] = df[date_col].apply(parse_date_any)
    df["anio"] = df["fecha"].dt.year.astype("Int64")
    df["mes_num"] = df["fecha"].dt.month.astype("Int64")
    df["periodo_clave"] = df["fecha"].dt.to_period("M").astype(str)
    df.loc[df["fecha"].isna(), "periodo_clave"] = ""
    df["mes_label"] = df["mes_num"].apply(lambda x: month_name(int(x)) if pd.notna(x) else "")
    return df

def summarize_months(df: pd.DataFrame, numeric_aggs: dict[str, str], extra_builders=None) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["periodo_clave", "anio", "mes_num", "mes_label", *numeric_aggs.keys()])
    keep = df[df["periodo_clave"] != ""].copy()
    if keep.empty:
        return pd.DataFrame(columns=["periodo_clave", "anio", "mes_num", "mes_label", *numeric_aggs.keys()])
    rows = []
    for periodo, grp in keep.groupby("periodo_clave", sort=True):
        first = grp.iloc[0]
        row = {
            "periodo_clave": periodo,
            "anio": int(first["anio"]),
            "mes_num": int(first["mes_num"]),
            "mes_label": first["mes_label"],
        }
        for out_col, source_col in numeric_aggs.items():
            row[out_col] = float(pd.to_numeric(grp[source_col], errors="coerce").fillna(0).sum())
        if extra_builders:
            for out_col, builder in extra_builders.items():
                row[out_col] = builder(grp)
        rows.append(row)
    return pd.DataFrame(rows)

def build_recoleccion() -> pd.DataFrame:
    df = read_csv("03_recoleccion_raw.csv")
    if df.empty:
        return pd.DataFrame()
    df = ensure_period_columns(df, "Fecha")
    df["codigo_jornada"] = df.get("Código jornada", "").apply(normalize_text)
    df["municipio_visitado"] = df.get("Municipio visitado", "").apply(normalize_text)
    df["inmuebles_atendidos"] = df.get("Inmuebles atendidos", "").apply(to_float)
    df["litros_aceite_recolectados"] = df.get("Litros de aceite recolectados", "").apply(to_float)
    df["litros_agua_protegidos"] = df.get("Litros de agua protegidos", "").apply(to_float)
    df["jornada_valida_token"] = df.get("_Jornada válida", "").apply(normalize_text)
    df["fila_valida"] = (
        ((df["fecha"].notna()) & (df["codigo_jornada"] != "") & (df["litros_aceite_recolectados"] > 0))
        | (df["jornada_valida_token"] != "")
    )
    valid = df[df["fila_valida"]].copy()
    if valid.empty:
        return pd.DataFrame()
    valid["litros_agua_protegidos"] = valid.apply(
        lambda r: r["litros_agua_protegidos"] if r["litros_agua_protegidos"] > 0 else r["litros_aceite_recolectados"] * 1000,
        axis=1,
    )
    return summarize_months(
        valid,
        {
            "inmuebles_atendidos_mes": "inmuebles_atendidos",
            "litros_aceite_recolectados_mes": "litros_aceite_recolectados",
            "litros_agua_protegidos_mes": "litros_agua_protegidos",
        },
        extra_builders={
            "municipios_visitados_mes": lambda grp: int(grp["municipio_visitado"].replace("", pd.NA).dropna().nunique()),
            "jornadas_codigos_unicos_mes": lambda grp: int(grp["codigo_jornada"].replace("", pd.NA).dropna().nunique()),
            "jornadas_recoleccion_ciclo_mes": lambda grp: 1 if len(grp) > 0 else 0,
            "filas_recoleccion_validas_mes": lambda grp: int(len(grp)),
        },
    )

def build_clientes_recurrentes() -> pd.DataFrame:
    df = read_csv("03a_clientes_recurrentes_raw.csv")
    if df.empty:
        return pd.DataFrame()
    df = ensure_period_columns(df, "Fecha")
    df["codigo_jornada"] = df.get("Código jornada", "").apply(normalize_text)
    df["cliente_catalogo"] = df.get("Cliente recurrente (catálogo)", "").apply(normalize_text)
    df["cliente_nuevo"] = df.get("Cliente nuevo / no listado", "").apply(normalize_text)
    df["cliente_clave"] = df.apply(
        lambda r: r["cliente_catalogo"] if r["cliente_catalogo"] not in {"", "No"} else r["cliente_nuevo"],
        axis=1,
    )
    df["fila_valida"] = (df["fecha"].notna()) & (df["codigo_jornada"] != "") & (df["cliente_clave"] != "")
    valid = df[df["fila_valida"]].copy()
    if valid.empty:
        return pd.DataFrame()
    return summarize_months(
        valid,
        {},
        extra_builders={
            "clientes_recurrentes_atendidos_mes": lambda grp: int(grp["cliente_clave"].replace("", pd.NA).dropna().nunique()),
            "filas_clientes_recurrentes_mes": lambda grp: int(len(grp)),
        },
    )

def build_produccion() -> pd.DataFrame:
    df = read_csv("04_produccion_raw.csv")
    if df.empty:
        return pd.DataFrame()
    df = ensure_period_columns(df, "Fecha")
    df["jabones_hotel_producidos"] = df.get("Jabones de hotel producidos", "").apply(to_float)
    df["jabones_tocador_producidos"] = df.get("Jabones de tocador producidos", "").apply(to_float)
    df["total_producido"] = df.get("Total producido", "").apply(to_float)
    df["total_producido"] = df.apply(
        lambda r: r["total_producido"] if r["total_producido"] > 0 else r["jabones_hotel_producidos"] + r["jabones_tocador_producidos"],
        axis=1,
    )
    df["fila_valida"] = (df["fecha"].notna()) & (
        (df["jabones_hotel_producidos"] > 0)
        | (df["jabones_tocador_producidos"] > 0)
        | (df["total_producido"] > 0)
    )
    valid = df[df["fila_valida"]].copy()
    if valid.empty:
        return pd.DataFrame()
    return summarize_months(
        valid,
        {
            "jabones_hotel_producidos_mes": "jabones_hotel_producidos",
            "jabones_tocador_producidos_mes": "jabones_tocador_producidos",
            "jabones_producidos_mes": "total_producido",
        },
    )

def build_ventas() -> pd.DataFrame:
    df = read_csv("05_ventas_raw.csv")
    if df.empty:
        return pd.DataFrame()
    df = ensure_period_columns(df, "Fecha")
    df["jabones_hotel_vendidos"] = df.get("Jabones de hotel vendidos", "").apply(to_float)
    df["jabones_tocador_vendidos"] = df.get("Jabones de tocador vendidos", "").apply(to_float)
    df["total_venta_q"] = df.get("Total venta Q.", "").apply(to_float)
    df["fila_valida"] = (df["fecha"].notna()) & (
        (df["jabones_hotel_vendidos"] > 0)
        | (df["jabones_tocador_vendidos"] > 0)
        | (df["total_venta_q"] > 0)
    )
    valid = df[df["fila_valida"]].copy()
    if valid.empty:
        return pd.DataFrame()
    return summarize_months(
        valid,
        {
            "jabones_hotel_vendidos_mes": "jabones_hotel_vendidos",
            "jabones_tocador_vendidos_mes": "jabones_tocador_vendidos",
            "ingresos_ventas_q_mes": "total_venta_q",
        },
        extra_builders={
            "jabones_vendidos_mes": lambda grp: float(
                pd.to_numeric(grp["jabones_hotel_vendidos"], errors="coerce").fillna(0).sum()
                + pd.to_numeric(grp["jabones_tocador_vendidos"], errors="coerce").fillna(0).sum()
            )
        },
    )

def build_publicaciones() -> pd.DataFrame:
    df = read_csv("06_publicaciones_raw.csv")
    if df.empty:
        return pd.DataFrame()
    df = ensure_period_columns(df, "Fecha")
    df["cantidad_publicaciones"] = df.get("Cantidad de publicaciones", "").apply(to_float)
    df["fila_valida"] = (df["fecha"].notna()) & (df["cantidad_publicaciones"] > 0)
    valid = df[df["fila_valida"]].copy()
    if valid.empty:
        return pd.DataFrame()
    return summarize_months(valid, {"publicaciones_redes_mes": "cantidad_publicaciones"})

def build_pruebas() -> pd.DataFrame:
    df = read_csv("07_pruebas_liquido_raw.csv")
    if df.empty:
        return pd.DataFrame()
    df = ensure_period_columns(df, "Fecha")
    df["cantidad_pruebas"] = df.get("Cantidad de pruebas", "").apply(to_float)
    df["fila_valida"] = (df["fecha"].notna()) & (df["cantidad_pruebas"] > 0)
    valid = df[df["fila_valida"]].copy()
    if valid.empty:
        return pd.DataFrame()
    return summarize_months(valid, {"pruebas_jabon_liquido_mes": "cantidad_pruebas"})

def build_total_mes() -> pd.DataFrame:
    sources = [
        build_recoleccion(),
        build_clientes_recurrentes(),
        build_produccion(),
        build_ventas(),
        build_publicaciones(),
        build_pruebas(),
    ]
    periods = sorted({p for df in sources if not df.empty for p in df["periodo_clave"].dropna().tolist() if p})
    if not periods:
        return pd.DataFrame()
    total = pd.DataFrame({"periodo_clave": periods})
    for df in sources:
        if df.empty:
            continue
        cols = [c for c in df.columns if c not in {"periodo_clave", "anio", "mes_num", "mes_label"}]
        total = total.merge(df[["periodo_clave", *cols]], on="periodo_clave", how="left")
    period_parts = total["periodo_clave"].str.split("-", expand=True)
    total["anio"] = pd.to_numeric(period_parts[0], errors="coerce").astype("Int64")
    total["mes_num"] = pd.to_numeric(period_parts[1], errors="coerce").astype("Int64")
    total["mes_label"] = total["mes_num"].apply(lambda x: month_name(int(x)) if pd.notna(x) else "")
    total["program_id"] = PROGRAM_ID
    total["program_name"] = PROGRAM_NAME
    total["aporta_metas_programa"] = True
    numeric_defaults = {
        "jornadas_recoleccion_ciclo_mes": 0,
        "jornadas_codigos_unicos_mes": 0,
        "filas_recoleccion_validas_mes": 0,
        "municipios_visitados_mes": 0,
        "inmuebles_atendidos_mes": 0.0,
        "litros_aceite_recolectados_mes": 0.0,
        "litros_agua_protegidos_mes": 0.0,
        "clientes_recurrentes_atendidos_mes": 0,
        "filas_clientes_recurrentes_mes": 0,
        "jabones_hotel_producidos_mes": 0.0,
        "jabones_tocador_producidos_mes": 0.0,
        "jabones_producidos_mes": 0.0,
        "jabones_hotel_vendidos_mes": 0.0,
        "jabones_tocador_vendidos_mes": 0.0,
        "jabones_vendidos_mes": 0.0,
        "ingresos_ventas_q_mes": 0.0,
        "publicaciones_redes_mes": 0.0,
        "pruebas_jabon_liquido_mes": 0.0,
    }
    for col, default in numeric_defaults.items():
        if col not in total.columns:
            total[col] = default
        total[col] = pd.to_numeric(total[col], errors="coerce").fillna(default)
    total["tiene_datos_mes"] = total[
        [
            "jornadas_recoleccion_ciclo_mes",
            "litros_aceite_recolectados_mes",
            "litros_agua_protegidos_mes",
            "jabones_producidos_mes",
            "jabones_vendidos_mes",
            "publicaciones_redes_mes",
            "pruebas_jabon_liquido_mes",
        ]
    ].sum(axis=1) > 0
    total = total.sort_values("periodo_clave").reset_index(drop=True)
    total["is_latest_data_month"] = False
    total.loc[total.index[-1], "is_latest_data_month"] = True
    ordered_cols = [
        "program_id","program_name","periodo_clave","anio","mes_num","mes_label","aporta_metas_programa",
        "jornadas_recoleccion_ciclo_mes","jornadas_codigos_unicos_mes","filas_recoleccion_validas_mes",
        "municipios_visitados_mes","inmuebles_atendidos_mes","litros_aceite_recolectados_mes",
        "litros_agua_protegidos_mes","clientes_recurrentes_atendidos_mes","filas_clientes_recurrentes_mes",
        "jabones_hotel_producidos_mes","jabones_tocador_producidos_mes","jabones_producidos_mes",
        "jabones_hotel_vendidos_mes","jabones_tocador_vendidos_mes","jabones_vendidos_mes",
        "ingresos_ventas_q_mes","publicaciones_redes_mes","pruebas_jabon_liquido_mes",
        "tiene_datos_mes","is_latest_data_month",
    ]
    return total[ordered_cols]

def build_indicator_rows(total: pd.DataFrame) -> pd.DataFrame:
    if total.empty:
        return pd.DataFrame()
    cumulative_map = {key: 0.0 for key in INDICATOR_LABELS.keys()}
    recurring_compliance = {key: 0 for key in RECURRING_MONTHLY_IDS}
    rows = []
    for _, row in total.sort_values("periodo_clave").iterrows():
        periodo = normalize_text(row["periodo_clave"])
        month_num = int(row["mes_num"])
        mes_label = normalize_text(row["mes_label"])
        aporta = bool(row["aporta_metas_programa"])
        meses_transcurridos = month_num if aporta else 0
        for order, indicator_id in enumerate(INDICATOR_ORDER, start=1):
            field_name = TOTAL_FIELD_MAP[indicator_id]
            value = float(row.get(field_name, 0) or 0)
            label, unidad, categoria = INDICATOR_LABELS[indicator_id]
            meta_anual = float(PRIMARY_META.get(indicator_id, 0.0))
            meta_mes = 1.0 if indicator_id in RECURRING_MONTHLY_IDS else 0.0
            if indicator_id in RECURRING_MONTHLY_IDS:
                cumplio_mes = 1 if (aporta and value >= 1.0) else 0
                recurring_compliance[indicator_id] += cumplio_mes
                valor_acumulado = float(recurring_compliance[indicator_id])
                esperado_al_corte = float(meses_transcurridos if aporta else 0.0)
                pct_meta_anual = valor_acumulado / meta_anual if meta_anual > 0 else 0.0
                pct_vs_esperado = valor_acumulado / esperado_al_corte if esperado_al_corte > 0 else 0.0
                estatus = semaforo_from_ratio(pct_vs_esperado, exigible=aporta)
                modelo = "monthly_recurrent"
                es_exigible = aporta
                nota_metodologica = "Mide sostenimiento mensual del ciclo anual: 1 jornada cumplida por mes con actividad válida."
                meses_cumplidos = int(valor_acumulado)
            else:
                cumulative_map[indicator_id] += value
                valor_acumulado = float(cumulative_map[indicator_id])
                es_exigible = bool(aporta and meta_anual > 0)
                esperado_al_corte = float(meta_anual * (month_num / 12.0) if es_exigible else 0.0)
                pct_meta_anual = valor_acumulado / meta_anual if meta_anual > 0 else 0.0
                pct_vs_esperado = valor_acumulado / esperado_al_corte if esperado_al_corte > 0 else 0.0
                estatus = semaforo_from_ratio(pct_vs_esperado, exigible=es_exigible)
                cumplio_mes = 1 if value > 0 else 0
                modelo = "annual_cumulative_linear"
                nota_metodologica = (
                    "Compara el acumulado real del año contra el esperado lineal al corte mensual."
                    if meta_anual > 0
                    else "Indicador operativo complementario sin meta anual institucional."
                )
                meses_cumplidos = 0
            rows.append({
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
                "meta_anual": meta_anual,
                "esperado_al_corte": esperado_al_corte,
                "pct_meta_anual": pct_meta_anual,
                "pct_vs_esperado": pct_vs_esperado,
                "cumplio_mes": cumplio_mes,
                "meses_cumplidos": meses_cumplidos,
                "meses_transcurridos": meses_transcurridos,
                "aporta_metas_programa": aporta,
                "es_exigible": es_exigible,
                "estatus": estatus,
                "orden_dashboard": order,
                "nota_metodologica": nota_metodologica,
                "is_latest_data_month": bool(row.get("is_latest_data_month", False)),
            })
    return pd.DataFrame(rows)

def build_metadata(total: pd.DataFrame) -> pd.DataFrame:
    if total.empty:
        return pd.DataFrame([{
            "program_id": PROGRAM_ID,
            "program_name": PROGRAM_NAME,
            "periodos_detectados": "",
            "latest_period": "",
            "latest_month_label": "",
            "first_period": "",
            "periods_count": 0,
        }])
    periodos = total["periodo_clave"].tolist()
    return pd.DataFrame([{
        "program_id": PROGRAM_ID,
        "program_name": PROGRAM_NAME,
        "periodos_detectados": " | ".join(periodos),
        "latest_period": periodos[-1],
        "latest_month_label": normalize_text(total.iloc[-1]["mes_label"]),
        "first_period": periodos[0],
        "periods_count": len(periodos),
    }])

def copy_to_docs(*filenames) -> None:
    for filename in filenames:
        shutil.copy2(OUT_DIR / filename, DOCS_DIR / filename)

def main() -> None:
    total = build_total_mes()
    if total.empty:
        raise RuntimeError("No se encontraron períodos válidos en data_raw/conservando_atitlan/")
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
        "latest_period": "" if total.empty else normalize_text(total.iloc[-1]["periodo_clave"]),
        "files_published": [
            "total_mes.csv",
            "institucional_indicadores.csv",
            "metadata_publicacion.csv",
        ],
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Transformación Conservando Atitlán completada.")
    print(f"total_mes.csv: {len(total)} filas")
    print(f"institucional_indicadores.csv: {len(indicators)} filas")

if __name__ == "__main__":
    main()
