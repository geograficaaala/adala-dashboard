#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Transformación de Fortalecimiento Municipal (Google Sheets -> CSV procesados)

Lee los CSV raw generados desde el Google Sheet y construye salidas procesadas
para el dashboard. El script está pensado para ejecutarse cada vez que se lee
el Sheet mensual y hacer "upsert" del período actual dentro del histórico
existente en data_processed/fortalecimiento_municipal/.

Entradas esperadas:
- data_raw/fortalecimiento_municipal/encabezado.csv
- data_raw/fortalecimiento_municipal/modulos_raw.csv
- data_raw/fortalecimiento_municipal/capacitaciones_raw.csv
- data_raw/fortalecimiento_municipal/asistencias_raw.csv
- data_raw/fortalecimiento_municipal/estudios_raw.csv
- data_raw/fortalecimiento_municipal/pirds_raw.csv
- data_raw/fortalecimiento_municipal/reuniones_raw.csv
- data_raw/fortalecimiento_municipal/resumen_raw.csv
- data_raw/fortalecimiento_municipal/manifest.json

Salidas:
- data_processed/fortalecimiento_municipal/total_mes.csv
- data_processed/fortalecimiento_municipal/institucional_indicadores.csv
- data_processed/fortalecimiento_municipal/capacitaciones_detalle.csv
- data_processed/fortalecimiento_municipal/asistencias_detalle.csv
- data_processed/fortalecimiento_municipal/estudios_detalle.csv
- data_processed/fortalecimiento_municipal/pirds_detalle.csv
- data_processed/fortalecimiento_municipal/reuniones_detalle.csv
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence

import numpy as np
import pandas as pd

PROGRAM_ID = "fortalecimiento_municipal"
PROGRAM_NAME_DEFAULT = "Fortalecimiento municipal"

RAW_DIR = Path("data_raw") / PROGRAM_ID
PROCESSED_DIR = Path("data_processed") / PROGRAM_ID

MONTH_NAME_TO_NUM = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}
MONTH_NUM_TO_NAME = {
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

META_DEFAULTS = {
    "municipios_capacitados": 15.0,
    "personas_capacitadas": 75.0,
    "asistencias_tecnicas": 3.0,
    "estudios_caracterizacion": 2.0,
    "pirds_implementados": 5.0,
    "reuniones_eje_agua_saneamiento": 10.0,
    "mesas_tecnicas_departamentales": 2.0,
}


CAP_DETAIL_COLS = [
    "periodo_clave",
    "anio_reportado",
    "mes_num",
    "mes_label",
    "fecha_capacitacion",
    "municipios_capacitacion",
    "modalidad_capacitacion",
    "tipo_capacitacion",
    "temas_capacitacion",
    "participantes_total",
    "participantes_tecnicos",
    "participantes_operarios",
    "participantes_otro",
    "instituciones_participantes",
    "observaciones_capacitacion",
]

ASIS_DETAIL_COLS = [
    "periodo_clave",
    "anio_reportado",
    "mes_num",
    "mes_label",
    "fecha_asistencia",
    "municipio_asistencia",
    "proyecto_codigo",
    "nombre_corto_proyecto",
    "tipo_asistencia_actividad",
    "linea_enfoque",
    "sector_asistencia",
    "movimiento_asistencia",
    "etapa_proyecto",
    "cuenta_nueva_asistencia",
    "nueva_asistencia_flag",
    "resultado_asistencia",
    "observaciones_asistencia",
]

EST_DETAIL_COLS = [
    "periodo_clave",
    "anio_reportado",
    "mes_num",
    "mes_label",
    "fecha_estudio",
    "municipio_estudio",
    "tipo_estudio",
    "sector_estudio",
    "estado_estudio",
    "estudio_finalizado_mes",
    "estudio_finalizado_flag",
    "instituciones_apoyo_estudio",
    "observaciones_estudio",
]

PIRDS_DETAIL_COLS = [
    "periodo_clave",
    "anio_reportado",
    "mes_num",
    "mes_label",
    "fecha_pirds",
    "municipio_pirds",
    "estado_pirds",
    "participantes_total",
    "participantes_tecnicos",
    "participantes_operarios",
    "pirds_implementado_mes",
    "pirds_implementado_flag",
    "requiere_seguimiento_pirds",
    "observaciones_pirds",
]

REU_DETAIL_COLS = [
    "periodo_clave",
    "anio_reportado",
    "mes_num",
    "mes_label",
    "fecha_reunion",
    "tipo_reunion",
    "municipios_reunion",
    "tema_reunion",
    "instituciones_presentes",
    "acuerdos_reunion",
    "reunion_eje_flag",
    "mesa_departamental_flag",
]

TOTAL_COLS = [
    "programa_id",
    "programa_nombre",
    "anio_reportado",
    "mes_reportado",
    "mes_num",
    "mes_label",
    "periodo_clave",
    "estado_reporte",
    "capacitaciones_mes",
    "municipios_capacitados_mes",
    "personas_capacitadas_mes",
    "asistencias_tecnicas_mes",
    "estudios_caracterizacion_mes",
    "pirds_implementados_mes",
    "reuniones_mes",
    "reuniones_eje_agua_saneamiento_mes",
    "mesas_tecnicas_departamentales_mes",
    "municipios_capacitados_acum",
    "personas_capacitadas_acum",
    "asistencias_tecnicas_acum",
    "estudios_caracterizacion_acum",
    "pirds_implementados_acum",
    "reuniones_eje_agua_saneamiento_acum",
    "mesas_tecnicas_departamentales_acum",
    "meta_anual_municipios_capacitados",
    "meta_anual_personas_capacitadas",
    "meta_anual_asistencias_tecnicas",
    "meta_anual_estudios_caracterizacion",
    "meta_anual_pirds_implementados",
    "meta_anual_reuniones_eje_agua_saneamiento",
    "meta_anual_mesas_tecnicas_departamentales",
    "municipios_capacitados_esperado",
    "personas_capacitadas_esperado",
    "asistencias_tecnicas_esperado",
    "estudios_caracterizacion_esperado",
    "pirds_implementados_esperado",
    "reuniones_eje_agua_saneamiento_esperado",
    "mesas_tecnicas_departamentales_esperado",
    "municipios_capacitados_pct_meta",
    "personas_capacitadas_pct_meta",
    "asistencias_tecnicas_pct_meta",
    "estudios_caracterizacion_pct_meta",
    "pirds_implementados_pct_meta",
    "reuniones_eje_agua_saneamiento_pct_meta",
    "mesas_tecnicas_departamentales_pct_meta",
    "municipios_capacitados_pct_esperado",
    "personas_capacitadas_pct_esperado",
    "asistencias_tecnicas_pct_esperado",
    "estudios_caracterizacion_pct_esperado",
    "pirds_implementados_pct_esperado",
    "reuniones_eje_agua_saneamiento_pct_esperado",
    "mesas_tecnicas_departamentales_pct_esperado",
    "fraccion_anual_esperada",
    "observaciones_generales",
    "comentarios_revision",
    "_submission_time",
    "_id",
    "_uuid",
    "es_ultimo_mes_real",
]

INDICATOR_ROWS = [
    ("municipios_capacitados", "Municipios capacitados"),
    ("personas_capacitadas", "Personas capacitadas"),
    ("asistencias_tecnicas", "Asistencias técnicas"),
    ("estudios_caracterizacion", "Estudios de caracterización"),
    ("pirds_implementados", "PIRDES implementados"),
    ("reuniones_eje_agua_saneamiento", "Reuniones del eje agua y saneamiento"),
    ("mesas_tecnicas_departamentales", "Mesas técnicas departamentales"),
]


@dataclass
class ReportContext:
    programa_id: str
    programa_nombre: str
    anio_reportado: int
    mes_num: int
    mes_label: str
    mes_reportado: str
    periodo_clave: str
    estado_reporte: str
    observaciones_generales: str
    comentarios_revision: str
    submission_time: str
    metas: Dict[str, float]


def safe_read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    try:
        return pd.read_csv(path)
    except pd.errors.EmptyDataError:
        return pd.DataFrame()


def write_csv(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False, encoding="utf-8-sig")


def as_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    if pd.isna(value):
        return ""
    return str(value).strip()


def as_num(value: Any) -> float:
    if value is None:
        return 0.0
    try:
        num = float(value)
    except Exception:
        return 0.0
    if math.isnan(num):
        return 0.0
    return num


def as_int(value: Any) -> int:
    return int(round(as_num(value)))


def yes_flag(value: Any) -> bool:
    text = as_str(value).lower()
    return text in {"si", "sí", "s", "1", "true", "verdadero", "yes", "y", "ok"}


def parse_date(value: Any) -> pd.Timestamp:
    text = as_str(value)
    if not text:
        return pd.NaT
    return pd.to_datetime(text, errors="coerce")


def month_num_from_value(value: Any) -> int:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return 0
    if isinstance(value, (int, np.integer)):
        num = int(value)
        return num if 1 <= num <= 12 else 0
    if isinstance(value, float) and not math.isnan(value):
        num = int(round(value))
        return num if 1 <= num <= 12 else 0
    text = as_str(value).lower()
    if text.isdigit():
        num = int(text)
        return num if 1 <= num <= 12 else 0
    return MONTH_NAME_TO_NUM.get(text, 0)


def month_label_from_num(num: int) -> str:
    return MONTH_NUM_TO_NAME.get(int(num or 0), "")


def infer_period_from_dates(*frames: pd.DataFrame) -> tuple[int, int]:
    for df in frames:
        if df.empty:
            continue
        for col in df.columns:
            if "Fecha" in col or "fecha" in col:
                series = pd.to_datetime(df[col], errors="coerce")
                series = series.dropna()
                if not series.empty:
                    first = series.iloc[0]
                    return int(first.year), int(first.month)
    return 0, 0


def normalize_existing_period_columns(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df.copy()
    out = df.copy()
    if "anio_reportado" in out.columns:
        out["anio_reportado"] = pd.to_numeric(out["anio_reportado"], errors="coerce").fillna(0).astype(int)
    else:
        out["anio_reportado"] = 0
    if "mes_num" in out.columns:
        out["mes_num"] = pd.to_numeric(out["mes_num"], errors="coerce").fillna(0).astype(int)
    else:
        out["mes_num"] = out.get("mes_reportado", "").map(month_num_from_value).fillna(0).astype(int)
    if "mes_label" not in out.columns:
        out["mes_label"] = out["mes_num"].map(month_label_from_num)
    if "periodo_clave" not in out.columns:
        out["periodo_clave"] = out["anio_reportado"].astype(str) + "-" + out["mes_num"].astype(str).str.zfill(2)
    return out


def remove_current_period(existing: pd.DataFrame, ctx: ReportContext) -> pd.DataFrame:
    if existing.empty:
        return existing.copy()
    out = normalize_existing_period_columns(existing)
    mask = ~((out["anio_reportado"] == ctx.anio_reportado) & (out["mes_num"] == ctx.mes_num))
    return out.loc[mask].copy()


def combine_history(existing: pd.DataFrame, current: pd.DataFrame, ctx: ReportContext, cols: Sequence[str]) -> pd.DataFrame:
    base = remove_current_period(existing, ctx)
    if current.empty:
        combined = base.copy()
    else:
        combined = pd.concat([base, current], ignore_index=True, sort=False)
    for col in cols:
        if col not in combined.columns:
            combined[col] = np.nan
    combined = normalize_existing_period_columns(combined)
    combined = combined[cols].copy()
    sort_cols = [c for c in ["anio_reportado", "mes_num"] if c in combined.columns]
    date_cols = [c for c in ["fecha_capacitacion", "fecha_asistencia", "fecha_estudio", "fecha_pirds", "fecha_reunion"] if c in combined.columns]
    combined = combined.sort_values(sort_cols + date_cols, na_position="last").reset_index(drop=True)
    return combined


def columns_with_prefix(df: pd.DataFrame, prefix: str) -> List[str]:
    return [col for col in df.columns if str(col).startswith(prefix)]


def join_selected(row: pd.Series, columns: Iterable[str], prefix: str) -> str:
    selected: List[str] = []
    for col in columns:
        if yes_flag(row.get(col)):
            label = str(col).replace(prefix, "", 1).strip()
            selected.append(label)
    return " | ".join(selected)


def is_blank_row(row: pd.Series, ignore_cols: Iterable[str] = ()) -> bool:
    ignore = set(ignore_cols)
    for col, value in row.items():
        if col in ignore:
            continue
        if as_str(value):
            return False
    return True


def infer_estado_reporte(value: Any) -> str:
    text = as_str(value)
    return text if text else "Borrador"


def parse_summary_metas(resumen_raw: pd.DataFrame) -> Dict[str, float]:
    metas = dict(META_DEFAULTS)
    if resumen_raw.empty:
        return metas

    indicator_map = {
        "Municipios con al menos una capacitación": "municipios_capacitados",
        "Personas capacitadas": "personas_capacitadas",
        "Nuevas asistencias técnicas registradas": "asistencias_tecnicas",
        "Nuevos estudios finalizados": "estudios_caracterizacion",
        "PIRDES implementados": "pirds_implementados",
        "Reuniones del eje de agua y saneamiento / CODEMA": "reuniones_eje_agua_saneamiento",
        "Mesas técnicas departamentales de agua y saneamiento": "mesas_tecnicas_departamentales",
    }
    for _, row in resumen_raw.iterrows():
        indicator = as_str(row.get("Indicador"))
        key = indicator_map.get(indicator)
        if key:
            meta_val = as_num(row.get("Meta anual"))
            if meta_val > 0:
                metas[key] = meta_val
    return metas


def build_context(
    encabezado: pd.DataFrame,
    resumen_raw: pd.DataFrame,
    manifest: Dict[str, Any],
    *detail_frames: pd.DataFrame,
) -> ReportContext:
    row = encabezado.iloc[0].to_dict() if not encabezado.empty else {}
    program_name = as_str(row.get("programa")) or PROGRAM_NAME_DEFAULT
    year = as_int(row.get("ano_reportado")) or as_int(row.get("anio_reportado"))
    month_num = month_num_from_value(row.get("mes_reportado"))
    period = as_str(row.get("periodo_clave"))
    status = infer_estado_reporte(row.get("estado_del_reporte"))
    observations = as_str(row.get("observaciones_generales_del_mes"))
    comments = as_str(row.get("comentarios_revision"))

    manifest_ts = as_str(manifest.get("read_at_utc"))
    manifest_dt = pd.to_datetime(manifest_ts, errors="coerce")
    inferred_year, inferred_month = infer_period_from_dates(*detail_frames)

    if year == 0:
        if inferred_year:
            year = inferred_year
        elif pd.notna(manifest_dt):
            year = int(manifest_dt.year)
        else:
            year = int(pd.Timestamp.utcnow().year)

    if month_num == 0:
        if inferred_month:
            month_num = inferred_month
        elif pd.notna(manifest_dt):
            month_num = int(manifest_dt.month)
        else:
            month_num = int(pd.Timestamp.utcnow().month)

    month_label = month_label_from_num(month_num)
    mes_reportado = as_str(row.get("mes_reportado")) or month_label
    if not period:
        period = f"{year}-{month_num:02d}"

    metas = parse_summary_metas(resumen_raw)

    return ReportContext(
        programa_id=PROGRAM_ID,
        programa_nombre=program_name,
        anio_reportado=year,
        mes_num=month_num,
        mes_label=month_label,
        mes_reportado=mes_reportado,
        periodo_clave=period,
        estado_reporte=status,
        observaciones_generales=observations,
        comentarios_revision=comments,
        submission_time=manifest_ts or pd.Timestamp.utcnow().isoformat(),
        metas=metas,
    )


def ensure_required_columns(df: pd.DataFrame, cols: Sequence[str]) -> pd.DataFrame:
    out = df.copy()
    for col in cols:
        if col not in out.columns:
            out[col] = np.nan
    return out


def finalize_current_df(df: pd.DataFrame, ctx: ReportContext, cols: Sequence[str]) -> pd.DataFrame:
    out = ensure_required_columns(df, cols)
    if out.empty:
        return pd.DataFrame(columns=cols)
    out["periodo_clave"] = ctx.periodo_clave
    out["anio_reportado"] = ctx.anio_reportado
    out["mes_num"] = ctx.mes_num
    out["mes_label"] = ctx.mes_label
    return out[cols].copy()


def transform_capacitaciones(raw: pd.DataFrame, ctx: ReportContext) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=CAP_DETAIL_COLS)

    muni_cols = columns_with_prefix(raw, "Mun:")
    tema_cols = columns_with_prefix(raw, "Tema:")
    rows: List[Dict[str, Any]] = []

    for _, row in raw.iterrows():
        if is_blank_row(row, ignore_cols={"No.", "Subtotal categorías", "Validación subtotal", "Estado fila"}):
            continue
        fecha = parse_date(row.get("Fecha *"))
        modalidad = as_str(row.get("Modalidad *"))
        tipo = as_str(row.get("Tipo de actividad *"))
        participantes_total = as_int(row.get("Participantes totales *"))

        # Filtrar filas claramente incompletas.
        if pd.isna(fecha) or not modalidad or not tipo or participantes_total <= 0:
            continue

        municipios = join_selected(row, muni_cols, "Mun:")
        temas = join_selected(row, tema_cols, "Tema:")

        rows.append(
            {
                "fecha_capacitacion": fecha.date().isoformat(),
                "municipios_capacitacion": municipios,
                "modalidad_capacitacion": modalidad,
                "tipo_capacitacion": tipo,
                "temas_capacitacion": temas,
                "participantes_total": participantes_total,
                "participantes_tecnicos": as_int(row.get("N° técnicos")),
                "participantes_operarios": as_int(row.get("N° operarios")),
                "participantes_otro": as_int(row.get("N° otro personal")),
                "instituciones_participantes": as_str(row.get("Instituciones participantes")),
                "observaciones_capacitacion": as_str(row.get("Observaciones")),
            }
        )

    return finalize_current_df(pd.DataFrame(rows), ctx, CAP_DETAIL_COLS)


def transform_asistencias(raw: pd.DataFrame, ctx: ReportContext) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=ASIS_DETAIL_COLS)

    sector_cols = columns_with_prefix(raw, "Sector:")
    rows: List[Dict[str, Any]] = []

    for _, row in raw.iterrows():
        if is_blank_row(row, ignore_cols={"No.", "Nueva asistencia (auto)", "Estado fila"}):
            continue
        fecha = parse_date(row.get("Fecha *"))
        municipio = as_str(row.get("Municipio *"))
        tipo = as_str(row.get("Tipo de asistencia / actividad *"))
        linea = as_str(row.get("Línea / enfoque *"))
        if pd.isna(fecha) or not municipio or not tipo or not linea:
            continue

        nueva_flag = as_int(row.get("Nueva asistencia (auto)"))
        if nueva_flag == 0:
            nueva_flag = int(yes_flag(row.get("¿Cuenta como nueva asistencia? *")))

        rows.append(
            {
                "fecha_asistencia": fecha.date().isoformat(),
                "municipio_asistencia": municipio,
                "proyecto_codigo": as_str(row.get("Código corto del proyecto *")),
                "nombre_corto_proyecto": as_str(row.get("Nombre corto del proyecto")),
                "tipo_asistencia_actividad": tipo,
                "linea_enfoque": linea,
                "sector_asistencia": join_selected(row, sector_cols, "Sector:"),
                "movimiento_asistencia": "Nueva" if nueva_flag else "Seguimiento",
                # Para no romper el dashboard existente, usamos la línea/enfoque
                # como "etapa" operativa mientras se ajusta el frontend.
                "etapa_proyecto": linea,
                "cuenta_nueva_asistencia": "Sí" if nueva_flag else "No",
                "nueva_asistencia_flag": nueva_flag,
                "resultado_asistencia": as_str(row.get("Resultado o avance del mes")),
                "observaciones_asistencia": as_str(row.get("Observaciones")),
            }
        )

    return finalize_current_df(pd.DataFrame(rows), ctx, ASIS_DETAIL_COLS)


def transform_estudios(raw: pd.DataFrame, ctx: ReportContext) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=EST_DETAIL_COLS)

    sector_cols = columns_with_prefix(raw, "Sector:")
    rows: List[Dict[str, Any]] = []

    for _, row in raw.iterrows():
        if is_blank_row(row, ignore_cols={"No.", "Nuevo estudio finalizado (auto)", "Estado fila"}):
            continue
        fecha = parse_date(row.get("Fecha *"))
        municipio = as_str(row.get("Municipio *"))
        tipo_estudio = as_str(row.get("Tipo de estudio *"))
        estado = as_str(row.get("Estado del estudio *"))
        if pd.isna(fecha) or not municipio or not tipo_estudio or not estado:
            continue

        finalizado_flag = as_int(row.get("Nuevo estudio finalizado (auto)"))
        if finalizado_flag == 0:
            finalizado_flag = int(yes_flag(row.get("¿Se finalizó este mes? *")))

        rows.append(
            {
                "fecha_estudio": fecha.date().isoformat(),
                "municipio_estudio": municipio,
                "tipo_estudio": tipo_estudio,
                "sector_estudio": join_selected(row, sector_cols, "Sector:"),
                "estado_estudio": estado,
                "estudio_finalizado_mes": "Sí" if finalizado_flag else "No",
                "estudio_finalizado_flag": finalizado_flag,
                "instituciones_apoyo_estudio": as_str(row.get("Instituciones de apoyo")),
                "observaciones_estudio": as_str(row.get("Observaciones")),
            }
        )

    return finalize_current_df(pd.DataFrame(rows), ctx, EST_DETAIL_COLS)


def transform_pirds(raw: pd.DataFrame, ctx: ReportContext) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=PIRDS_DETAIL_COLS)

    rows: List[Dict[str, Any]] = []
    for _, row in raw.iterrows():
        if is_blank_row(row, ignore_cols={"No.", "Subtotal téc.+oper.", "Validación participantes", "PIRDES implementado (auto)", "Estado fila"}):
            continue
        fecha = parse_date(row.get("Fecha *"))
        municipio = as_str(row.get("Municipio *"))
        estado = as_str(row.get("Estado del PIRDES *"))
        if pd.isna(fecha) or not municipio or not estado:
            continue

        flag = as_int(row.get("PIRDES implementado (auto)"))
        if flag == 0:
            flag = int(yes_flag(row.get("¿Implementado este mes? *")))

        rows.append(
            {
                "fecha_pirds": fecha.date().isoformat(),
                "municipio_pirds": municipio,
                "estado_pirds": estado,
                "participantes_total": as_int(row.get("Participantes totales")),
                "participantes_tecnicos": as_int(row.get("N° técnicos")),
                "participantes_operarios": as_int(row.get("N° operarios")),
                "pirds_implementado_mes": "Sí" if flag else "No",
                "pirds_implementado_flag": flag,
                "requiere_seguimiento_pirds": "Sí" if yes_flag(row.get("¿Requiere seguimiento adicional? *")) else "No",
                "observaciones_pirds": as_str(row.get("Observaciones")),
            }
        )

    return finalize_current_df(pd.DataFrame(rows), ctx, PIRDS_DETAIL_COLS)


def classify_reunion(tipo_reunion: str) -> tuple[int, int]:
    text = tipo_reunion.lower()
    eje = int("eje de agua y saneamiento" in text)
    mesa_dep = int("departamental" in text)
    return eje, mesa_dep


def transform_reuniones(raw: pd.DataFrame, ctx: ReportContext) -> pd.DataFrame:
    if raw.empty:
        return pd.DataFrame(columns=REU_DETAIL_COLS)

    muni_cols = columns_with_prefix(raw, "Mun:")
    rows: List[Dict[str, Any]] = []

    for _, row in raw.iterrows():
        if is_blank_row(row, ignore_cols={"No.", "Estado fila"}):
            continue
        fecha = parse_date(row.get("Fecha *"))
        tipo = as_str(row.get("Tipo de reunión / espacio *"))
        if pd.isna(fecha) or not tipo:
            continue

        eje_flag, mesa_dep_flag = classify_reunion(tipo)

        rows.append(
            {
                "fecha_reunion": fecha.date().isoformat(),
                "tipo_reunion": tipo,
                "municipios_reunion": join_selected(row, muni_cols, "Mun:"),
                "tema_reunion": as_str(row.get("Tema principal")),
                "instituciones_presentes": as_str(row.get("Instituciones participantes")),
                "acuerdos_reunion": as_str(row.get("Acuerdos principales")),
                "reunion_eje_flag": eje_flag,
                "mesa_departamental_flag": mesa_dep_flag,
            }
        )

    return finalize_current_df(pd.DataFrame(rows), ctx, REU_DETAIL_COLS)


def unique_municipios_from_pipe(series: pd.Series) -> set[str]:
    selected: set[str] = set()
    for value in series.fillna("").astype(str):
        for part in [p.strip() for p in value.split("|")]:
            if part:
                selected.add(part)
    return selected


def build_period_registry(existing_total: pd.DataFrame, ctx: ReportContext, *details: pd.DataFrame) -> pd.DataFrame:
    existing = remove_current_period(existing_total, ctx) if not existing_total.empty else pd.DataFrame()
    if not existing.empty:
        existing = normalize_existing_period_columns(existing)

    registry_rows: List[Dict[str, Any]] = []
    if not existing.empty:
        for _, row in existing.iterrows():
            registry_rows.append(
                {
                    "programa_id": as_str(row.get("programa_id")) or PROGRAM_ID,
                    "programa_nombre": as_str(row.get("programa_nombre")) or PROGRAM_NAME_DEFAULT,
                    "anio_reportado": as_int(row.get("anio_reportado")),
                    "mes_num": as_int(row.get("mes_num")),
                    "mes_label": as_str(row.get("mes_label")) or month_label_from_num(as_int(row.get("mes_num"))),
                    "mes_reportado": as_str(row.get("mes_reportado")) or as_str(row.get("mes_label")),
                    "periodo_clave": as_str(row.get("periodo_clave")) or f"{as_int(row.get('anio_reportado'))}-{as_int(row.get('mes_num')):02d}",
                    "estado_reporte": as_str(row.get("estado_reporte")) or "Final",
                    "observaciones_generales": as_str(row.get("observaciones_generales")),
                    "comentarios_revision": as_str(row.get("comentarios_revision")),
                    "_submission_time": as_str(row.get("_submission_time")),
                    "_id": row.get("_id", np.nan),
                    "_uuid": as_str(row.get("_uuid")),
                }
            )

    # Agregar el período actual aunque no tenga registros válidos.
    registry_rows.append(
        {
            "programa_id": ctx.programa_id,
            "programa_nombre": ctx.programa_nombre,
            "anio_reportado": ctx.anio_reportado,
            "mes_num": ctx.mes_num,
            "mes_label": ctx.mes_label,
            "mes_reportado": ctx.mes_reportado,
            "periodo_clave": ctx.periodo_clave,
            "estado_reporte": ctx.estado_reporte,
            "observaciones_generales": ctx.observaciones_generales,
            "comentarios_revision": ctx.comentarios_revision,
            "_submission_time": ctx.submission_time,
            "_id": np.nan,
            "_uuid": "",
        }
    )

    # Períodos presentes en detalles históricos.
    for df in details:
        if df.empty:
            continue
        temp = normalize_existing_period_columns(df)
        for _, row in temp[["anio_reportado", "mes_num", "mes_label", "periodo_clave"]].drop_duplicates().iterrows():
            registry_rows.append(
                {
                    "programa_id": ctx.programa_id,
                    "programa_nombre": ctx.programa_nombre,
                    "anio_reportado": as_int(row["anio_reportado"]),
                    "mes_num": as_int(row["mes_num"]),
                    "mes_label": as_str(row["mes_label"]) or month_label_from_num(as_int(row["mes_num"])),
                    "mes_reportado": as_str(row["mes_label"]) or month_label_from_num(as_int(row["mes_num"])),
                    "periodo_clave": as_str(row["periodo_clave"]) or f"{as_int(row['anio_reportado'])}-{as_int(row['mes_num']):02d}",
                    "estado_reporte": "Final",
                    "observaciones_generales": "",
                    "comentarios_revision": "",
                    "_submission_time": "",
                    "_id": np.nan,
                    "_uuid": "",
                }
            )

    registry = pd.DataFrame(registry_rows)
    if registry.empty:
        return pd.DataFrame(columns=TOTAL_COLS)

    registry = normalize_existing_period_columns(registry)
    registry = registry.sort_values(["anio_reportado", "mes_num", "_submission_time"], na_position="last")
    registry = registry.drop_duplicates(subset=["anio_reportado", "mes_num"], keep="last").reset_index(drop=True)
    return registry


def aggregate_by_period(df: pd.DataFrame, value_cols: Sequence[str], agg: str = "sum") -> pd.DataFrame:
    if df.empty:
        cols = ["anio_reportado", "mes_num", "periodo_clave"] + list(value_cols)
        return pd.DataFrame(columns=cols)
    temp = normalize_existing_period_columns(df)
    grouped = temp.groupby(["anio_reportado", "mes_num", "periodo_clave"], as_index=False)
    if agg == "count":
        out = grouped.size().rename(columns={"size": value_cols[0]})
    else:
        out = grouped[list(value_cols)].sum(min_count=1)
    return out


def build_total_mes(
    registry: pd.DataFrame,
    cap_hist: pd.DataFrame,
    asis_hist: pd.DataFrame,
    est_hist: pd.DataFrame,
    pirds_hist: pd.DataFrame,
    reu_hist: pd.DataFrame,
    ctx: ReportContext,
) -> pd.DataFrame:
    if registry.empty:
        return pd.DataFrame(columns=TOTAL_COLS)

    total = registry.copy()
    total = normalize_existing_period_columns(total)

    # Métricas mensuales.
    if not cap_hist.empty:
        cap_temp = normalize_existing_period_columns(cap_hist)
        cap_temp["participantes_total"] = pd.to_numeric(cap_temp["participantes_total"], errors="coerce").fillna(0)
        cap_month = cap_temp.groupby(["anio_reportado", "mes_num", "periodo_clave"], as_index=False).agg(
            capacitaciones_mes=("fecha_capacitacion", "count"),
            personas_capacitadas_mes=("participantes_total", "sum"),
        )
        muni_month_rows = []
        for (anio, mes, periodo), g in cap_temp.groupby(["anio_reportado", "mes_num", "periodo_clave"]):
            muni_count = len(unique_municipios_from_pipe(g["municipios_capacitacion"]))
            muni_month_rows.append(
                {
                    "anio_reportado": anio,
                    "mes_num": mes,
                    "periodo_clave": periodo,
                    "municipios_capacitados_mes": muni_count,
                }
            )
        cap_muni = pd.DataFrame(muni_month_rows)
        total = total.merge(cap_month, on=["anio_reportado", "mes_num", "periodo_clave"], how="left")
        total = total.merge(cap_muni, on=["anio_reportado", "mes_num", "periodo_clave"], how="left")
    else:
        total["capacitaciones_mes"] = 0
        total["personas_capacitadas_mes"] = 0
        total["municipios_capacitados_mes"] = 0

    if not asis_hist.empty:
        asis_temp = normalize_existing_period_columns(asis_hist)
        asis_temp["nueva_asistencia_flag"] = pd.to_numeric(asis_temp["nueva_asistencia_flag"], errors="coerce").fillna(0)
        asis_month = asis_temp.groupby(["anio_reportado", "mes_num", "periodo_clave"], as_index=False).agg(
            asistencias_tecnicas_mes=("nueva_asistencia_flag", "sum")
        )
        total = total.merge(asis_month, on=["anio_reportado", "mes_num", "periodo_clave"], how="left")
    else:
        total["asistencias_tecnicas_mes"] = 0

    if not est_hist.empty:
        est_temp = normalize_existing_period_columns(est_hist)
        est_temp["estudio_finalizado_flag"] = pd.to_numeric(est_temp["estudio_finalizado_flag"], errors="coerce").fillna(0)
        est_month = est_temp.groupby(["anio_reportado", "mes_num", "periodo_clave"], as_index=False).agg(
            estudios_caracterizacion_mes=("estudio_finalizado_flag", "sum")
        )
        total = total.merge(est_month, on=["anio_reportado", "mes_num", "periodo_clave"], how="left")
    else:
        total["estudios_caracterizacion_mes"] = 0

    if not pirds_hist.empty:
        pirds_temp = normalize_existing_period_columns(pirds_hist)
        pirds_temp["pirds_implementado_flag"] = pd.to_numeric(pirds_temp["pirds_implementado_flag"], errors="coerce").fillna(0)
        pirds_month = pirds_temp.groupby(["anio_reportado", "mes_num", "periodo_clave"], as_index=False).agg(
            pirds_implementados_mes=("pirds_implementado_flag", "sum")
        )
        total = total.merge(pirds_month, on=["anio_reportado", "mes_num", "periodo_clave"], how="left")
    else:
        total["pirds_implementados_mes"] = 0

    if not reu_hist.empty:
        reu_temp = normalize_existing_period_columns(reu_hist)
        reu_temp["reunion_eje_flag"] = pd.to_numeric(reu_temp["reunion_eje_flag"], errors="coerce").fillna(0)
        reu_temp["mesa_departamental_flag"] = pd.to_numeric(reu_temp["mesa_departamental_flag"], errors="coerce").fillna(0)
        reu_month = reu_temp.groupby(["anio_reportado", "mes_num", "periodo_clave"], as_index=False).agg(
            reuniones_mes=("fecha_reunion", "count"),
            reuniones_eje_agua_saneamiento_mes=("reunion_eje_flag", "sum"),
            mesas_tecnicas_departamentales_mes=("mesa_departamental_flag", "sum"),
        )
        total = total.merge(reu_month, on=["anio_reportado", "mes_num", "periodo_clave"], how="left")
    else:
        total["reuniones_mes"] = 0
        total["reuniones_eje_agua_saneamiento_mes"] = 0
        total["mesas_tecnicas_departamentales_mes"] = 0

    # Completar nulos numéricos.
    for col in [
        "capacitaciones_mes",
        "personas_capacitadas_mes",
        "municipios_capacitados_mes",
        "asistencias_tecnicas_mes",
        "estudios_caracterizacion_mes",
        "pirds_implementados_mes",
        "reuniones_mes",
        "reuniones_eje_agua_saneamiento_mes",
        "mesas_tecnicas_departamentales_mes",
    ]:
        if col not in total.columns:
            total[col] = 0
        total[col] = pd.to_numeric(total[col], errors="coerce").fillna(0)

    # Acumulados anuales.
    total = total.sort_values(["anio_reportado", "mes_num"]).reset_index(drop=True)
    total["personas_capacitadas_acum"] = total.groupby("anio_reportado")["personas_capacitadas_mes"].cumsum()
    total["asistencias_tecnicas_acum"] = total.groupby("anio_reportado")["asistencias_tecnicas_mes"].cumsum()
    total["estudios_caracterizacion_acum"] = total.groupby("anio_reportado")["estudios_caracterizacion_mes"].cumsum()
    total["pirds_implementados_acum"] = total.groupby("anio_reportado")["pirds_implementados_mes"].cumsum()
    total["reuniones_eje_agua_saneamiento_acum"] = total.groupby("anio_reportado")["reuniones_eje_agua_saneamiento_mes"].cumsum()
    total["mesas_tecnicas_departamentales_acum"] = total.groupby("anio_reportado")["mesas_tecnicas_departamentales_mes"].cumsum()

    # Municipios acumulados únicos dentro del año.
    muni_accum: Dict[tuple[int, int], int] = {}
    if not cap_hist.empty:
        cap_temp = normalize_existing_period_columns(cap_hist).sort_values(["anio_reportado", "mes_num"])
        for anio, g_year in cap_temp.groupby("anio_reportado"):
            seen: set[str] = set()
            for mes, g_month in g_year.groupby("mes_num"):
                seen.update(unique_municipios_from_pipe(g_month["municipios_capacitacion"]))
                muni_accum[(int(anio), int(mes))] = len(seen)
    total["municipios_capacitados_acum"] = [
        muni_accum.get((int(row.anio_reportado), int(row.mes_num)), 0) for row in total.itertuples()
    ]

    # Metas.
    total["meta_anual_municipios_capacitados"] = ctx.metas["municipios_capacitados"]
    total["meta_anual_personas_capacitadas"] = ctx.metas["personas_capacitadas"]
    total["meta_anual_asistencias_tecnicas"] = ctx.metas["asistencias_tecnicas"]
    total["meta_anual_estudios_caracterizacion"] = ctx.metas["estudios_caracterizacion"]
    total["meta_anual_pirds_implementados"] = ctx.metas["pirds_implementados"]
    total["meta_anual_reuniones_eje_agua_saneamiento"] = ctx.metas["reuniones_eje_agua_saneamiento"]
    total["meta_anual_mesas_tecnicas_departamentales"] = ctx.metas["mesas_tecnicas_departamentales"]

    total["fraccion_anual_esperada"] = total["mes_num"] / 12.0

    total["municipios_capacitados_esperado"] = total["meta_anual_municipios_capacitados"] * total["fraccion_anual_esperada"]
    total["personas_capacitadas_esperado"] = total["meta_anual_personas_capacitadas"] * total["fraccion_anual_esperada"]
    total["asistencias_tecnicas_esperado"] = total["meta_anual_asistencias_tecnicas"] * total["fraccion_anual_esperada"]
    total["estudios_caracterizacion_esperado"] = total["meta_anual_estudios_caracterizacion"] * total["fraccion_anual_esperada"]
    total["pirds_implementados_esperado"] = total["meta_anual_pirds_implementados"] * total["fraccion_anual_esperada"]
    total["reuniones_eje_agua_saneamiento_esperado"] = total["meta_anual_reuniones_eje_agua_saneamiento"] * total["fraccion_anual_esperada"]
    total["mesas_tecnicas_departamentales_esperado"] = total["meta_anual_mesas_tecnicas_departamentales"] * total["fraccion_anual_esperada"]

    def pct(num_col: str, den_col: str) -> pd.Series:
        den = pd.to_numeric(total[den_col], errors="coerce").fillna(0)
        num = pd.to_numeric(total[num_col], errors="coerce").fillna(0)
        return np.where(den > 0, num / den * 100.0, 0.0)

    total["municipios_capacitados_pct_meta"] = pct("municipios_capacitados_acum", "meta_anual_municipios_capacitados")
    total["personas_capacitadas_pct_meta"] = pct("personas_capacitadas_acum", "meta_anual_personas_capacitadas")
    total["asistencias_tecnicas_pct_meta"] = pct("asistencias_tecnicas_acum", "meta_anual_asistencias_tecnicas")
    total["estudios_caracterizacion_pct_meta"] = pct("estudios_caracterizacion_acum", "meta_anual_estudios_caracterizacion")
    total["pirds_implementados_pct_meta"] = pct("pirds_implementados_acum", "meta_anual_pirds_implementados")
    total["reuniones_eje_agua_saneamiento_pct_meta"] = pct("reuniones_eje_agua_saneamiento_acum", "meta_anual_reuniones_eje_agua_saneamiento")
    total["mesas_tecnicas_departamentales_pct_meta"] = pct("mesas_tecnicas_departamentales_acum", "meta_anual_mesas_tecnicas_departamentales")

    total["municipios_capacitados_pct_esperado"] = pct("municipios_capacitados_acum", "municipios_capacitados_esperado")
    total["personas_capacitadas_pct_esperado"] = pct("personas_capacitadas_acum", "personas_capacitadas_esperado")
    total["asistencias_tecnicas_pct_esperado"] = pct("asistencias_tecnicas_acum", "asistencias_tecnicas_esperado")
    total["estudios_caracterizacion_pct_esperado"] = pct("estudios_caracterizacion_acum", "estudios_caracterizacion_esperado")
    total["pirds_implementados_pct_esperado"] = pct("pirds_implementados_acum", "pirds_implementados_esperado")
    total["reuniones_eje_agua_saneamiento_pct_esperado"] = pct("reuniones_eje_agua_saneamiento_acum", "reuniones_eje_agua_saneamiento_esperado")
    total["mesas_tecnicas_departamentales_pct_esperado"] = pct("mesas_tecnicas_departamentales_acum", "mesas_tecnicas_departamentales_esperado")

    # Último período real.
    total["es_ultimo_mes_real"] = False
    if not total.empty:
        last_idx = total.index[-1]
        total.loc[last_idx, "es_ultimo_mes_real"] = True

    for col in TOTAL_COLS:
        if col not in total.columns:
            total[col] = np.nan

    total["programa_id"] = total["programa_id"].replace("", np.nan).fillna(ctx.programa_id)
    total["programa_nombre"] = total["programa_nombre"].replace("", np.nan).fillna(ctx.programa_nombre)
    total["mes_label"] = total["mes_label"].replace("", np.nan).fillna(total["mes_num"].map(month_label_from_num))
    total["mes_reportado"] = total["mes_reportado"].replace("", np.nan).fillna(total["mes_label"])
    total["periodo_clave"] = total["periodo_clave"].replace("", np.nan).fillna(
        total["anio_reportado"].astype(str) + "-" + total["mes_num"].astype(str).str.zfill(2)
    )

    return total[TOTAL_COLS].copy()


def build_institucional_indicadores(total_mes: pd.DataFrame) -> pd.DataFrame:
    if total_mes.empty:
        return pd.DataFrame(
            columns=[
                "indicador_id",
                "indicador_nombre",
                "valor_mes",
                "valor_acumulado",
                "meta_anual",
                "esperado_corte",
                "pct_meta",
                "pct_esperado",
                "periodo_clave",
                "mes_label",
                "mes_num",
                "anio_reportado",
                "es_ultimo_mes_real",
            ]
        )

    row = total_mes.loc[total_mes["es_ultimo_mes_real"]].copy()
    if row.empty:
        row = total_mes.tail(1).copy()
    r = row.iloc[0]

    rows = []
    for indicator_id, indicator_name in INDICATOR_ROWS:
        rows.append(
            {
                "indicador_id": indicator_id,
                "indicador_nombre": indicator_name,
                "valor_mes": r.get(f"{indicator_id}_mes", 0),
                "valor_acumulado": r.get(f"{indicator_id}_acum", 0),
                "meta_anual": r.get(f"meta_anual_{indicator_id}", 0),
                "esperado_corte": r.get(f"{indicator_id}_esperado", 0),
                "pct_meta": r.get(f"{indicator_id}_pct_meta", 0),
                "pct_esperado": r.get(f"{indicator_id}_pct_esperado", 0),
                "periodo_clave": r.get("periodo_clave"),
                "mes_label": r.get("mes_label"),
                "mes_num": r.get("mes_num"),
                "anio_reportado": r.get("anio_reportado"),
                "es_ultimo_mes_real": True,
            }
        )
    return pd.DataFrame(rows)


def main() -> int:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    encabezado = safe_read_csv(RAW_DIR / "encabezado.csv")
    resumen_raw = safe_read_csv(RAW_DIR / "resumen_raw.csv")
    cap_raw = safe_read_csv(RAW_DIR / "capacitaciones_raw.csv")
    asis_raw = safe_read_csv(RAW_DIR / "asistencias_raw.csv")
    est_raw = safe_read_csv(RAW_DIR / "estudios_raw.csv")
    pirds_raw = safe_read_csv(RAW_DIR / "pirds_raw.csv")
    reu_raw = safe_read_csv(RAW_DIR / "reuniones_raw.csv")
    manifest_path = RAW_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}

    ctx = build_context(encabezado, resumen_raw, manifest, cap_raw, asis_raw, est_raw, pirds_raw, reu_raw)

    current_cap = transform_capacitaciones(cap_raw, ctx)
    current_asis = transform_asistencias(asis_raw, ctx)
    current_est = transform_estudios(est_raw, ctx)
    current_pirds = transform_pirds(pirds_raw, ctx)
    current_reu = transform_reuniones(reu_raw, ctx)

    existing_cap = safe_read_csv(PROCESSED_DIR / "capacitaciones_detalle.csv")
    existing_asis = safe_read_csv(PROCESSED_DIR / "asistencias_detalle.csv")
    existing_est = safe_read_csv(PROCESSED_DIR / "estudios_detalle.csv")
    existing_pirds = safe_read_csv(PROCESSED_DIR / "pirds_detalle.csv")
    existing_reu = safe_read_csv(PROCESSED_DIR / "reuniones_detalle.csv")
    existing_total = safe_read_csv(PROCESSED_DIR / "total_mes.csv")

    cap_hist = combine_history(existing_cap, current_cap, ctx, CAP_DETAIL_COLS)
    asis_hist = combine_history(existing_asis, current_asis, ctx, ASIS_DETAIL_COLS)
    est_hist = combine_history(existing_est, current_est, ctx, EST_DETAIL_COLS)
    pirds_hist = combine_history(existing_pirds, current_pirds, ctx, PIRDS_DETAIL_COLS)
    reu_hist = combine_history(existing_reu, current_reu, ctx, REU_DETAIL_COLS)

    registry = build_period_registry(existing_total, ctx, cap_hist, asis_hist, est_hist, pirds_hist, reu_hist)
    total_mes = build_total_mes(registry, cap_hist, asis_hist, est_hist, pirds_hist, reu_hist, ctx)
    institucional = build_institucional_indicadores(total_mes)

    write_csv(total_mes, PROCESSED_DIR / "total_mes.csv")
    write_csv(institucional, PROCESSED_DIR / "institucional_indicadores.csv")
    write_csv(cap_hist, PROCESSED_DIR / "capacitaciones_detalle.csv")
    write_csv(asis_hist, PROCESSED_DIR / "asistencias_detalle.csv")
    write_csv(est_hist, PROCESSED_DIR / "estudios_detalle.csv")
    write_csv(pirds_hist, PROCESSED_DIR / "pirds_detalle.csv")
    write_csv(reu_hist, PROCESSED_DIR / "reuniones_detalle.csv")

    print("OK: Transformación Fortalecimiento Municipal completada.")
    print(f"Periodo actualizado: {ctx.periodo_clave}")
    print(f"Salida: {PROCESSED_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
