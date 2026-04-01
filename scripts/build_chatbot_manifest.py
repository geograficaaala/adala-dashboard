from __future__ import annotations
import argparse
import json
import math
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pandas as pd

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

STATUS_NORMALIZATION = {
    "green": "verde",
    "yellow": "amarillo",
    "red": "rojo",
    "muted": "gris",
    "gray": "gris",
    "grey": "gris",
    "blue": "azul",
    "verde": "verde",
    "amarillo": "amarillo",
    "rojo": "rojo",
    "gris": "gris",
    "azul": "azul",
}

PROGRAMS: dict[str, dict[str, Any]] = {
    "atitlan_recicla": {
        "program_name": "Atitlán Recicla",
        "kind": "atitlan",
        "base_dir": Path("."),
        "total_file": Path("total_mes.csv"),
        "indicators_file": Path("institucional_indicadores.csv"),
        "metadata_file": None,
    },
    "conservando_atitlan": {
        "program_name": "Conservando Atitlán",
        "kind": "standard",
        "base_dir": Path("conservando_atitlan"),
        "total_file": Path("total_mes.csv"),
        "indicators_file": Path("institucional_indicadores.csv"),
        "metadata_file": Path("metadata_publicacion.csv"),
    },
    "educando_para_conservar": {
        "program_name": "Educando para Conservar",
        "kind": "standard",
        "base_dir": Path("educando_para_conservar"),
        "total_file": Path("total_mes.csv"),
        "indicators_file": Path("institucional_indicadores.csv"),
        "metadata_file": Path("metadata_publicacion.csv"),
    },
    "fortalecimiento_municipal": {
        "program_name": "Fortalecimiento Municipal",
        "kind": "fortalecimiento",
        "base_dir": Path("fortalecimiento_municipal"),
        "total_file": Path("total_mes.csv"),
        "indicators_file": Path("institucional_indicadores.csv"),
        "metadata_file": Path("metadata_publicacion.csv"),
    },
    "reforestacion": {
        "program_name": "Reforestación",
        "kind": "standard",
        "base_dir": Path("reforestacion"),
        "total_file": Path("total_mes.csv"),
        "indicators_file": Path("institucional_indicadores.csv"),
        "metadata_file": Path("metadata_publicacion.csv"),
    },
}

ATITLAN_SUMMARY_FIELDS = {
    "total_materiales_qq": "Materiales reciclables recolectados",
    "ingreso_bruto_total": "Ingresos brutos totales",
    "ingreso_diario_lideresa": "Ingreso diario por lideresa",
    "mujeres_activas": "Mujeres activas",
    "mujeres_comercializacion": "Mujeres en comercialización",
    "pct_participacion_actividades": "Participación en actividades",
    "pct_participacion_comercializacion": "Participación en comercialización",
    "pet_qq": "PET recolectado",
    "vidrio_total_qq": "Vidrio recolectado",
}

STANDARD_SUMMARY_FIELDS = {
    "conservando_atitlan": [
        ("jornadas_recoleccion_ciclo_mes", "Jornadas de recolección"),
        ("inmuebles_atendidos_mes", "Inmuebles atendidos"),
        ("litros_aceite_recolectados_mes", "Litros de aceite recolectados"),
        ("jabones_vendidos_mes", "Jabones vendidos"),
        ("ingresos_ventas_q_mes", "Ingresos por ventas"),
    ],
    "educando_para_conservar": [
        ("docentes_mes", "Docentes atendidos"),
        ("estudiantes_epc_mes", "Estudiantes beneficiados"),
        ("centros_mes", "Centros educativos"),
        ("municipios_mes", "Municipios alcanzados"),
        ("actividades_campo_mes", "Actividades de campo"),
    ],
    "fortalecimiento_municipal": [
        ("eventos_capacitacion_mes", "Eventos de capacitación"),
        ("municipios_capacitacion_nucleo_mes", "Municipios con capacitación núcleo"),
        ("personas_capacitadas_nucleo_mes", "Personas capacitadas núcleo"),
        ("asistencias_priorizadas_proxy_mes", "Asistencias priorizadas"),
        ("reuniones_totales_mes", "Reuniones totales"),
    ],
    "reforestacion": [
        ("ha_monitoreadas_kpi_mes", "Ha monitoreadas"),
        ("arboles_sembrados_kpi_mes", "Árboles sembrados"),
        ("aporte_sig_mes", "Aporte SIG"),
        ("plantas_netas_mes", "Plantas netas"),
        ("especies_activas_mes", "Especies activas"),
    ],
}


@dataclass
class ProgramFiles:
    total_path: Path
    indicators_path: Path
    metadata_path: Path | None


class ManifestBuilder:
    def __init__(self, docs_data_dir: Path, output_path: Path, cutoff_period: str):
        self.docs_data_dir = docs_data_dir
        self.output_path = output_path
        self.cutoff_period = cutoff_period

    def build(self) -> dict[str, Any]:
        program_payloads: dict[str, Any] = {}
        all_valid_periods: set[str] = set()
        generated_at = datetime.now(ZoneInfo("America/Guatemala")).isoformat()

        for program_id, cfg in PROGRAMS.items():
            files = self._resolve_program_files(cfg)
            payload = self._build_program_payload(program_id, cfg, files)
            program_payloads[program_id] = payload
            all_valid_periods.update(payload["valid_periods"])

        manifest = {
            "schema_version": 1,
            "generated_at": generated_at,
            "cutoff": {
                "institutional_cutoff_period": self.cutoff_period,
                "timezone": "America/Guatemala",
                "reason": "Se excluyen meses posteriores al corte y filas placeholder para el chatbot.",
            },
            "program_order": list(PROGRAMS.keys()),
            "valid_periods_global": sorted(all_valid_periods),
            "programs": program_payloads,
            "comparison": self._build_comparison(program_payloads),
        }
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        self.output_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        return manifest

    def _resolve_program_files(self, cfg: dict[str, Any]) -> ProgramFiles:
        base_dir = self.docs_data_dir / cfg["base_dir"]
        total_path = base_dir / cfg["total_file"]
        indicators_path = base_dir / cfg["indicators_file"]
        metadata_path = (base_dir / cfg["metadata_file"]) if cfg.get("metadata_file") else None
        return ProgramFiles(total_path=total_path, indicators_path=indicators_path, metadata_path=metadata_path)

    def _build_program_payload(self, program_id: str, cfg: dict[str, Any], files: ProgramFiles) -> dict[str, Any]:
        total_df = self._read_csv(files.total_path)
        indicators_df = self._read_csv(files.indicators_path)
        metadata_df = self._read_csv(files.metadata_path) if files.metadata_path else pd.DataFrame()

        kind = cfg["kind"]
        if kind == "atitlan":
            total_df = self._normalize_atitlan_total(total_df)
            indicators_df = self._normalize_atitlan_indicators(indicators_df)
        elif kind == "fortalecimiento":
            total_df = self._normalize_fortalecimiento_total(total_df)
            indicators_df = self._normalize_fortalecimiento_indicators(indicators_df)
        else:
            total_df = self._normalize_standard_total(total_df)
            indicators_df = self._normalize_standard_indicators(indicators_df)

        metadata = self._normalize_metadata(metadata_df)
        valid_periods = self._compute_valid_periods(program_id, kind, total_df, indicators_df)
        latest_valid_period = valid_periods[-1] if valid_periods else None

        total_latest = self._latest_total_row(total_df, latest_valid_period)
        indicators_latest = indicators_df[indicators_df["periodo_clave"] == latest_valid_period].copy() if latest_valid_period else pd.DataFrame()
        indicators_payload = self._build_indicators_payload(program_id, kind, indicators_latest)
        summary_metrics = self._build_summary_metrics(program_id, total_latest)
        narratives = self._build_narratives(program_id, cfg["program_name"], latest_valid_period, total_latest, indicators_payload)

        return {
            "program_id": program_id,
            "program_name": cfg["program_name"],
            "kind": kind,
            "files": {
                "total": str(files.total_path.as_posix()),
                "indicators": str(files.indicators_path.as_posix()),
                "metadata": str(files.metadata_path.as_posix()) if files.metadata_path else None,
            },
            "cutoff_period": self.cutoff_period,
            "available_periods_total": self._unique_periods(total_df),
            "available_periods_indicators": self._unique_periods(indicators_df),
            "valid_periods": valid_periods,
            "latest_valid_period": latest_valid_period,
            "latest_valid_month_label": MONTH_NAMES_ES.get(int(latest_valid_period[-2:]), "") if latest_valid_period else None,
            "metadata": metadata,
            "summary_metrics": summary_metrics,
            "latest_total": self._row_to_json(total_latest),
            "indicators": indicators_payload,
            "narratives": narratives,
        }

    def _read_csv(self, path: Path | None) -> pd.DataFrame:
        if path is None or not path.exists():
            return pd.DataFrame()
        df = pd.read_csv(path)
        df.columns = [str(c).strip() for c in df.columns]
        return df

    def _normalize_atitlan_total(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        out = df.copy()
        out["anio"] = pd.to_numeric(out.get("anio"), errors="coerce").astype("Int64")
        out["mes_num"] = pd.to_numeric(out.get("mes_num"), errors="coerce").astype("Int64")
        out["periodo_clave"] = out.apply(lambda row: make_period(row.get("anio"), row.get("mes_num")), axis=1)
        out["mes_label"] = out["mes_num"].apply(lambda value: MONTH_NAMES_ES.get(int(value), "") if pd.notna(value) else "")
        numeric_cols = [
            c for c in out.columns
            if c not in {"programa", "mes", "zona", "periodo_clave", "mes_label"}
        ]
        for col in numeric_cols:
            out[col] = pd.to_numeric(out[col], errors="coerce")
        out["tiene_datos_mes"] = out.apply(self._atitlan_has_real_data, axis=1)
        out["is_latest_data_month"] = False
        return out

    def _normalize_atitlan_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        out = df.copy()
        out["anio"] = pd.to_numeric(out.get("anio"), errors="coerce").astype("Int64")
        out["mes_num"] = pd.to_numeric(out.get("mes_num"), errors="coerce").astype("Int64")
        out["periodo_clave"] = out.apply(lambda row: make_period(row.get("anio"), row.get("mes_num")), axis=1)
        for col in ["valor", "meta_mensual"]:
            out[col] = pd.to_numeric(out.get(col), errors="coerce")
        out["estatus"] = out.apply(self._atitlan_indicator_status, axis=1)
        out["cumplio_mes"] = out.apply(lambda row: bool(pd.notna(row.get("meta_mensual")) and row.get("meta_mensual", 0) > 0 and row.get("valor", 0) >= row.get("meta_mensual", 0)), axis=1)
        out["pct_vs_meta"] = out.apply(lambda row: safe_div(row.get("valor"), row.get("meta_mensual")), axis=1)
        return out

    def _normalize_standard_total(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        out = df.copy()
        if "periodo_clave" not in out.columns and "periodo" in out.columns:
            out["periodo_clave"] = out["periodo"]
        if "mes_label" not in out.columns and "mes_nombre" in out.columns:
            out["mes_label"] = out["mes_nombre"]
        for col in out.columns:
            if col in {"program_id", "program_name", "periodo_clave", "mes_label", "fecha_corte", "logros_texto", "alertas_texto", "fuente_texto", "estatus_reporte", "semaforo_ha", "semaforo_arboles", "semaforo_sig", "semaforo_plantas", "semaforo_especies"}:
                continue
            if out[col].dtype == object:
                maybe_num = pd.to_numeric(out[col], errors="coerce")
                if maybe_num.notna().sum() >= max(1, math.floor(len(out) * 0.5)):
                    out[col] = maybe_num
        if "tiene_datos_mes" not in out.columns:
            out["tiene_datos_mes"] = True
        out["tiene_datos_mes"] = out["tiene_datos_mes"].apply(to_bool)
        if "is_latest_data_month" in out.columns:
            out["is_latest_data_month"] = out["is_latest_data_month"].apply(to_bool)
        else:
            out["is_latest_data_month"] = False
        return out

    def _normalize_fortalecimiento_total(self, df: pd.DataFrame) -> pd.DataFrame:
        out = self._normalize_standard_total(df)
        if out.empty:
            return out
        out["periodo_clave"] = out.get("periodo_clave", out.get("periodo"))
        return out

    def _normalize_standard_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        out = df.copy()
        if "periodo_clave" not in out.columns and "periodo" in out.columns:
            out["periodo_clave"] = out["periodo"]
        if "indicador_nombre" not in out.columns and "indicator_name" in out.columns:
            out["indicador_nombre"] = out["indicator_name"]
        if "indicator_id" not in out.columns and "indicador_id" in out.columns:
            out["indicator_id"] = out["indicador_id"]
        numeric_candidates = [
            "valor_mes", "valor_acumulado", "meta_mes", "meta_anual", "esperado_al_corte",
            "pct_meta_anual", "pct_vs_esperado", "meta_cohorte", "pct_cohorte"
        ]
        for col in numeric_candidates:
            if col in out.columns:
                out[col] = pd.to_numeric(out[col], errors="coerce")
        if "cumplio_mes" in out.columns:
            out["cumplio_mes"] = out["cumplio_mes"].apply(to_bool)
        if "es_exigible" in out.columns:
            out["es_exigible"] = out["es_exigible"].apply(to_bool)
        else:
            out["es_exigible"] = True
        if "is_latest_data_month" in out.columns:
            out["is_latest_data_month"] = out["is_latest_data_month"].apply(to_bool)
        else:
            out["is_latest_data_month"] = False
        if "estatus" in out.columns:
            out["estatus"] = out["estatus"].map(normalize_status)
        else:
            out["estatus"] = None
        return out

    def _normalize_fortalecimiento_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        out = self._normalize_standard_indicators(df)
        if out.empty:
            return out
        if "indicator_id" not in out.columns and "indicador_id" in out.columns:
            out["indicator_id"] = out["indicador_id"]
        if "indicador_nombre" not in out.columns and "indicador_nombre" in out.columns:
            pass
        if "estatus" not in out.columns or out["estatus"].isna().all():
            out["estatus"] = out["semaforo"].map(normalize_status)
        out["es_exigible"] = out["categoria"].astype(str).str.lower().eq("primario")
        out["pct_vs_esperado"] = out["pct_cohorte"]
        return out

    def _normalize_metadata(self, df: pd.DataFrame) -> dict[str, Any] | None:
        if df.empty:
            return None
        row = df.iloc[0].to_dict()
        return {str(key): json_safe(value) for key, value in row.items()}

    def _compute_valid_periods(self, program_id: str, kind: str, total_df: pd.DataFrame, indicators_df: pd.DataFrame) -> list[str]:
        total_periods = set()
        indicator_periods = set()

        if not total_df.empty and "periodo_clave" in total_df.columns:
            total_candidates = total_df[total_df["periodo_clave"].apply(lambda value: is_period_leq(value, self.cutoff_period))].copy()
            if kind == "atitlan":
                total_candidates = total_candidates[total_candidates["tiene_datos_mes"].fillna(False)]
            elif kind == "standard":
                if "tiene_datos_mes" in total_candidates.columns:
                    total_candidates = total_candidates[total_candidates["tiene_datos_mes"].fillna(False)]
            total_periods = set(total_candidates["periodo_clave"].dropna().astype(str).tolist())

        if not indicators_df.empty and "periodo_clave" in indicators_df.columns:
            indicator_candidates = indicators_df[indicators_df["periodo_clave"].apply(lambda value: is_period_leq(value, self.cutoff_period))].copy()
            if kind == "atitlan":
                indicator_candidates = indicator_candidates[indicator_candidates["valor"].notna()]
            indicator_periods = set(indicator_candidates["periodo_clave"].dropna().astype(str).tolist())

        valid = sorted(total_periods | indicator_periods)
        return valid

    def _latest_total_row(self, total_df: pd.DataFrame, latest_valid_period: str | None) -> pd.Series | None:
        if total_df.empty or not latest_valid_period:
            return None
        period_rows = total_df[total_df["periodo_clave"] == latest_valid_period].copy()
        if period_rows.empty:
            return None
        if "zona" in period_rows.columns:
            total_zone = period_rows[period_rows["zona"].astype(str).str.upper().eq("TOTAL")]
            if not total_zone.empty:
                return total_zone.iloc[0]
        return period_rows.iloc[0]

    def _build_summary_metrics(self, program_id: str, total_row: pd.Series | None) -> list[dict[str, Any]]:
        if total_row is None:
            return []
        metrics: list[dict[str, Any]] = []
        if program_id == "atitlan_recicla":
            for field, label in ATITLAN_SUMMARY_FIELDS.items():
                if field in total_row.index:
                    metrics.append({
                        "field": field,
                        "label": label,
                        "value": json_safe(total_row.get(field)),
                    })
            return metrics

        for field, label in STANDARD_SUMMARY_FIELDS.get(program_id, []):
            if field in total_row.index:
                metrics.append({
                    "field": field,
                    "label": label,
                    "value": json_safe(total_row.get(field)),
                })
        return metrics

    def _build_indicators_payload(self, program_id: str, kind: str, latest_df: pd.DataFrame) -> dict[str, Any]:
        if latest_df.empty:
            return {"all": [], "alerts": [], "positives": [], "neutral": []}
        records = [self._indicator_record(program_id, kind, row) for _, row in latest_df.sort_values(by=self._indicator_sort_cols(latest_df)).iterrows()]
        alerts = [item for item in records if item["bucket"] == "alerta"]
        positives = [item for item in records if item["bucket"] == "positivo"]
        neutral = [item for item in records if item["bucket"] == "neutral"]
        return {"all": records, "alerts": alerts, "positives": positives, "neutral": neutral}

    def _build_narratives(
        self,
        program_id: str,
        program_name: str,
        latest_valid_period: str | None,
        total_row: pd.Series | None,
        indicators_payload: dict[str, Any],
    ) -> dict[str, Any]:
        if not latest_valid_period:
            return {
                "executive_summary": f"{program_name} no tiene un período válido disponible antes o dentro del corte institucional {self.cutoff_period}.",
                "what_is_going_well": [],
                "what_needs_attention": [],
                "context_notes": [],
            }

        month_label = MONTH_NAMES_ES.get(int(latest_valid_period[-2:]), latest_valid_period)
        alerts = indicators_payload["alerts"]
        positives = indicators_payload["positives"]
        notes: list[str] = []

        if total_row is not None:
            for text_field in ["logros_texto", "alertas_texto", "nota_metodologica", "fuente_texto", "estatus_reporte"]:
                if text_field in total_row.index and safe_text(total_row.get(text_field)):
                    notes.append(safe_text(total_row.get(text_field)))

        headline = self._headline(program_id, program_name, month_label, latest_valid_period, total_row, alerts, positives)
        going_well = [item["human_summary"] for item in positives[:3]]
        needs_attention = [item["human_summary"] for item in alerts[:4]]
        if not needs_attention and program_id == "conservando_atitlan" and total_row is not None:
            if safe_float(total_row.get("jornadas_recoleccion_ciclo_mes")) == 0:
                needs_attention.append("En marzo no se registró jornada de recolección ni atención de inmuebles, así que conviene confirmar si fue una pausa operativa o una ausencia de carga.")
        return {
            "executive_summary": headline,
            "what_is_going_well": going_well,
            "what_needs_attention": needs_attention,
            "context_notes": dedupe_preserve_order(notes)[:4],
        }

    def _headline(
        self,
        program_id: str,
        program_name: str,
        month_label: str,
        latest_valid_period: str,
        total_row: pd.Series | None,
        alerts: list[dict[str, Any]],
        positives: list[dict[str, Any]],
    ) -> str:
        if program_id == "atitlan_recicla" and total_row is not None:
            total_materiales = total_row.get("total_materiales_qq")
            ingresos = total_row.get("ingreso_bruto_total")
            if safe_float(total_materiales) > 0:
                return (
                    f"En {month_label} de {latest_valid_period[:4]}, {program_name} sí reportó operación real: "
                    f"{format_number(total_materiales)} qq de materiales reciclables y {format_currency(ingresos)} en ingresos brutos. "
                    f"Las alertas del mes deben leerse sobre este corte, no sobre meses futuros placeholder."
                )
        if alerts:
            return (
                f"Para {month_label} de {latest_valid_period[:4]}, {program_name} muestra {len(alerts)} indicador(es) que requieren atención prioritaria. "
                f"El chatbot debería explicar esos rezagos usando solo este corte válido."
            )
        if positives:
            return (
                f"Para {month_label} de {latest_valid_period[:4]}, {program_name} presenta un cierre favorable en sus indicadores principales. "
                f"La lectura del bot debe concentrarse en este período y en los avances efectivamente publicados."
            )
        return (
            f"Para {month_label} de {latest_valid_period[:4]}, {program_name} tiene datos válidos disponibles, pero sin suficientes señales para clasificar avances o rezagos fuertes."
        )

    def _indicator_record(self, program_id: str, kind: str, row: pd.Series) -> dict[str, Any]:
        indicator_id = safe_text(row.get("indicator_id") or row.get("indicador_id"))
        indicator_name = safe_text(row.get("indicador_nombre") or row.get("indicator_name") or indicator_id)
        value_month = first_not_none(row.get("valor_mes"), row.get("valor"))
        value_acc = row.get("valor_acumulado")
        target_month = first_not_none(row.get("meta_mes"), row.get("meta_mensual"), row.get("meta_cohorte"))
        target_year = row.get("meta_anual")
        expected = first_not_none(row.get("esperado_al_corte"), row.get("meta_cohorte"))
        status = normalize_status(row.get("estatus") or row.get("semaforo"))
        pct_vs_expected = first_not_none(row.get("pct_vs_esperado"), row.get("pct_cohorte"), row.get("pct_vs_meta"))
        pct_meta_year = row.get("pct_meta_anual")
        is_required = bool(row.get("es_exigible", True))

        if status is None:
            status = infer_status_from_numbers(value_month, target_month, pct_vs_expected, is_required)

        bucket = indicator_bucket(status, is_required)
        human_summary = self._indicator_human_summary(
            program_id=program_id,
            indicator_name=indicator_name,
            status=status,
            bucket=bucket,
            value_month=value_month,
            target_month=target_month,
            expected=expected,
            unit=safe_text(row.get("unidad")),
            pct_vs_expected=pct_vs_expected,
            pct_meta_year=pct_meta_year,
            is_required=is_required,
        )

        return {
            "indicator_id": indicator_id,
            "indicator_name": indicator_name,
            "unit": safe_text(row.get("unidad")),
            "category": safe_text(row.get("categoria")),
            "status": status,
            "bucket": bucket,
            "is_required": is_required,
            "value_month": json_safe(value_month),
            "value_accumulated": json_safe(value_acc),
            "target_month": json_safe(target_month),
            "target_year": json_safe(target_year),
            "expected_to_date": json_safe(expected),
            "pct_vs_expected": json_safe(pct_vs_expected),
            "pct_meta_year": json_safe(pct_meta_year),
            "note": safe_text(row.get("nota_metodologica") or row.get("estatus_texto_original")),
            "human_summary": human_summary,
        }

    def _indicator_human_summary(
        self,
        program_id: str,
        indicator_name: str,
        status: str,
        bucket: str,
        value_month: Any,
        target_month: Any,
        expected: Any,
        unit: str,
        pct_vs_expected: Any,
        pct_meta_year: Any,
        is_required: bool,
    ) -> str:
        unit_text = f" {unit}" if unit else ""
        if program_id == "atitlan_recicla" and is_number(target_month) and float(target_month) > 0:
            delta = safe_float(value_month) - safe_float(target_month)
            if delta < 0:
                return (
                    f"{indicator_name} quedó por debajo de la meta mensual: {format_number(value_month)}{unit_text} frente a {format_number(target_month)}{unit_text}; "
                    f"la brecha es de {format_number(abs(delta))}{unit_text}."
                )
            return (
                f"{indicator_name} superó la meta mensual con {format_number(value_month)}{unit_text} frente a {format_number(target_month)}{unit_text}."
            )
        if bucket == "alerta" and is_number(pct_vs_expected):
            return (
                f"{indicator_name} está por debajo del ritmo esperado: alcanza {format_percent(pct_vs_expected)} del avance esperado al corte."
            )
        if bucket == "positivo" and is_number(pct_vs_expected):
            return (
                f"{indicator_name} va bien: alcanza {format_percent(pct_vs_expected)} del esperado al corte."
            )
        if bucket == "alerta" and is_number(target_month) and float(target_month) > 0:
            return (
                f"{indicator_name} requiere atención: registró {format_number(value_month)}{unit_text} frente a una meta de {format_number(target_month)}{unit_text}."
            )
        if bucket == "neutral" and not is_required:
            return f"{indicator_name} no se considera exigible en este corte, así que no conviene tratarlo como rezago automático."
        if is_number(pct_meta_year):
            return f"{indicator_name} acumula {format_percent(pct_meta_year)} de la meta anual." 
        return f"{indicator_name} tiene datos válidos para el corte, pero sin una señal suficiente para clasificarlo como alerta o fortaleza fuerte."

    def _build_comparison(self, payloads: dict[str, Any]) -> dict[str, Any]:
        rows = []
        for program_id, payload in payloads.items():
            rows.append({
                "program_id": program_id,
                "program_name": payload["program_name"],
                "latest_valid_period": payload["latest_valid_period"],
                "alerts_count": len(payload["indicators"]["alerts"]),
                "positives_count": len(payload["indicators"]["positives"]),
                "valid_periods_count": len(payload["valid_periods"]),
            })
        rows.sort(key=lambda item: (item["latest_valid_period"] or "", item["program_name"]))
        return {"programs": rows}

    def _indicator_sort_cols(self, df: pd.DataFrame) -> list[str]:
        candidates = ["orden_dashboard", "order_dashboard", "indicador_nombre", "indicator_id"]
        return [col for col in candidates if col in df.columns] or [df.columns[0]]

    def _unique_periods(self, df: pd.DataFrame) -> list[str]:
        if df.empty or "periodo_clave" not in df.columns:
            return []
        return sorted(df["periodo_clave"].dropna().astype(str).unique().tolist())

    def _row_to_json(self, row: pd.Series | None) -> dict[str, Any] | None:
        if row is None:
            return None
        return {str(key): json_safe(value) for key, value in row.to_dict().items()}

    @staticmethod
    def _atitlan_has_real_data(row: pd.Series) -> bool:
        if safe_float(row.get("total_materiales_qq")) > 0:
            return True
        if safe_float(row.get("ingreso_bruto_total")) > 0:
            return True
        if safe_float(row.get("mujeres_activas")) > 0:
            return True
        if pd.notna(row.get("pct_participacion_actividades")):
            return True
        if pd.notna(row.get("pct_participacion_comercializacion")):
            return True
        return False

    @staticmethod
    def _atitlan_indicator_status(row: pd.Series) -> str:
        value = safe_float(row.get("valor"))
        target = safe_float(row.get("meta_mensual"))
        if target <= 0:
            return "gris"
        ratio = value / target if target else 0
        if ratio >= 1:
            return "verde"
        if ratio >= 0.85:
            return "amarillo"
        return "rojo"


def make_period(year: Any, month: Any) -> str | None:
    if pd.isna(year) or pd.isna(month):
        return None
    try:
        return f"{int(year):04d}-{int(month):02d}"
    except Exception:
        return None


def safe_text(value: Any) -> str:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass
    text = str(value).strip()
    return "" if text.lower() == "nan" else " ".join(text.split())


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        if pd.isna(value):
            return default
    except Exception:
        pass
    try:
        return float(value)
    except Exception:
        return default


def to_bool(value: Any) -> bool:
    text = safe_text(value).lower()
    return text in {"true", "1", "yes", "y", "si", "sí", "verdadero", "x"}


def safe_div(num: Any, den: Any) -> float | None:
    den_value = safe_float(den, default=0.0)
    if den_value == 0:
        return None
    return safe_float(num, default=0.0) / den_value


def normalize_status(value: Any) -> str | None:
    text = safe_text(value).lower()
    if not text:
        return None
    return STATUS_NORMALIZATION.get(text, text)


def is_period_leq(value: Any, cutoff_period: str) -> bool:
    text = safe_text(value)
    if not text or len(text) != 7:
        return False
    return text <= cutoff_period


def json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return round(value, 6)
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    if isinstance(value, (pd.Int64Dtype, pd.Float64Dtype)):
        return str(value)
    if hasattr(value, "item"):
        try:
            return json_safe(value.item())
        except Exception:
            pass
    return value


def infer_status_from_numbers(value_month: Any, target_month: Any, pct_vs_expected: Any, is_required: bool) -> str:
    if not is_required:
        return "gris"
    if is_number(pct_vs_expected):
        ratio = float(pct_vs_expected)
        if ratio >= 1:
            return "verde"
        if ratio >= 0.85:
            return "amarillo"
        return "rojo"
    if is_number(target_month) and float(target_month) > 0:
        ratio = safe_float(value_month) / float(target_month)
        if ratio >= 1:
            return "verde"
        if ratio >= 0.85:
            return "amarillo"
        return "rojo"
    return "gris"


def indicator_bucket(status: str | None, is_required: bool) -> str:
    if not is_required:
        return "neutral"
    if status in {"rojo", "amarillo"}:
        return "alerta"
    if status in {"verde", "azul"}:
        return "positivo"
    return "neutral"


def is_number(value: Any) -> bool:
    try:
        if value is None or pd.isna(value):
            return False
    except Exception:
        pass
    try:
        float(value)
        return True
    except Exception:
        return False


def format_number(value: Any) -> str:
    if not is_number(value):
        return "0"
    number = float(value)
    if abs(number) >= 1000:
        return f"{number:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    if number.is_integer():
        return str(int(number))
    return f"{number:.2f}".replace(".", ",")


def format_percent(value: Any) -> str:
    if not is_number(value):
        return "0%"
    return f"{float(value) * 100:.0f}%"


def format_currency(value: Any) -> str:
    if not is_number(value):
        return "Q0"
    return f"Q{format_number(value)}"


def first_not_none(*values: Any) -> Any:
    for value in values:
        try:
            if value is None or pd.isna(value):
                continue
        except Exception:
            pass
        return value
    return None


def dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        text = safe_text(value)
        if not text or text in seen:
            continue
        seen.add(text)
        result.append(text)
    return result


def default_cutoff_period() -> str:
    now = datetime.now(ZoneInfo("America/Guatemala"))
    return f"{now.year:04d}-{now.month:02d}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Construye un manifest JSON exclusivo para el chatbot a partir de docs/data.")
    parser.add_argument("--docs-data-dir", default="docs/data", help="Directorio base donde viven los CSV publicados.")
    parser.add_argument("--output", default="docs/data/chatbot_manifest.json", help="Ruta de salida del manifest JSON del chatbot.")
    parser.add_argument("--cutoff-period", default=None, help="Corte institucional en formato YYYY-MM. Si no se indica, usa el mes actual de Guatemala.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cutoff_period = args.cutoff_period or default_cutoff_period()
    builder = ManifestBuilder(
        docs_data_dir=Path(args.docs_data_dir),
        output_path=Path(args.output),
        cutoff_period=cutoff_period,
    )
    manifest = builder.build()
    summary = {
        program_id: payload["latest_valid_period"]
        for program_id, payload in manifest["programs"].items()
    }
    print(json.dumps({
        "output": str(builder.output_path),
        "cutoff_period": cutoff_period,
        "latest_valid_periods": summary,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
