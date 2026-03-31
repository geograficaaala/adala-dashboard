(function (global) {
  'use strict';

  const Config = global.ChatbotConfig || null;
  const Data = global.ChatbotData || null;

  if (!Config || !Data) {
    console.error('AALA Chatbot: faltan ChatbotConfig o ChatbotData.');
    return;
  }

  const FIELD_LABELS = {
    total_materiales_qq: 'Materiales totales',
    materiales_lideresas_qq: 'Materiales de lideresas',
    materiales_municipalidad_qq: 'Materiales de municipalidad',
    ingreso_bruto_total: 'Ingreso bruto total',
    ingreso_neto_total_territorio: 'Ingreso neto territorio',
    ingreso_neto_cooperativa: 'Ingreso neto cooperativa',
    mujeres_activas: 'Mujeres activas',
    mujeres_actividades: 'Mujeres en actividades',
    mujeres_comercializacion: 'Mujeres en comercialización',
    mujeres_inscritas_total: 'Mujeres inscritas',
    mujeres_nuevas_inscritas: 'Nuevas inscritas',
    litros_aceite_recolectados_mes: 'Litros de aceite recolectados',
    litros_agua_protegidos_mes: 'Litros de agua protegidos',
    municipios_visitados_mes: 'Municipios visitados',
    inmuebles_atendidos_mes: 'Inmuebles atendidos',
    jabones_producidos_mes: 'Jabones producidos',
    jabones_vendidos_mes: 'Jabones vendidos',
    ingresos_ventas_q_mes: 'Ingresos por ventas',
    publicaciones_redes_mes: 'Publicaciones en redes',
    docentes_mes: 'Docentes participantes',
    estudiantes_epc_mes: 'Estudiantes EPC',
    centros_mes: 'Centros',
    municipios_mes: 'Municipios',
    actividades_campo_mes: 'Actividades de campo',
    estudiantes_actividades_campo_mes: 'Estudiantes en actividades de campo',
    propuestas_juveniles_mes: 'Propuestas juveniles',
    capitales_semilla_mes: 'Capitales semilla',
    coordinaciones_clave_mes: 'Coordinaciones clave',
    eventos_capacitacion_mes: 'Eventos de capacitación',
    personas_capacitadas_total_mes: 'Personas capacitadas',
    personas_capacitadas_nucleo_mes: 'Personas capacitadas núcleo',
    municipios_capacitacion_nucleo_mes: 'Municipios capacitación núcleo',
    asistencias_nuevas_total_mes: 'Asistencias nuevas',
    estudios_finalizados_total_mes: 'Estudios finalizados',
    reuniones_codema_mes: 'Reuniones CODEMA',
    mesas_tecnicas_departamentales_mes: 'Mesas técnicas departamentales',
    mesas_tecnicas_municipales_mes: 'Mesas técnicas municipales',
    pirdes_implementados_mes: 'PIRDES implementados',
    arboles_sembrados_kpi_mes: 'Árboles sembrados',
    arboles_sembrados_registrados_mes: 'Árboles sembrados registrados',
    ha_monitoreadas_kpi_mes: 'Ha monitoreadas',
    ha_monitoreadas_registradas_mes: 'Ha monitoreadas registradas',
    area_intervenida_ha_mes: 'Área intervenida',
    plantas_netas_mes: 'Plantas netas',
    especies_activas_mes: 'Especies activas',
    aporte_sig_mes: 'Aporte SIG',
    eventos_monitoreo_mes: 'Eventos de monitoreo',
    eventos_cartografia_mes: 'Eventos de cartografía'
  };

  const PROGRAM_HIGHLIGHTS = {
    atitlan_recicla: ['total_materiales_qq', 'ingreso_bruto_total', 'ingreso_neto_total_territorio', 'mujeres_activas', 'mujeres_inscritas_total'],
    conservando_atitlan: ['litros_aceite_recolectados_mes', 'litros_agua_protegidos_mes', 'municipios_visitados_mes', 'inmuebles_atendidos_mes', 'jabones_vendidos_mes'],
    educando_para_conservar: ['docentes_mes', 'estudiantes_epc_mes', 'centros_mes', 'actividades_campo_mes', 'estudiantes_actividades_campo_mes'],
    fortalecimiento_municipal: ['personas_capacitadas_total_mes', 'eventos_capacitacion_mes', 'asistencias_nuevas_total_mes', 'estudios_finalizados_total_mes', 'reuniones_codema_mes'],
    reforestacion: ['arboles_sembrados_kpi_mes', 'ha_monitoreadas_kpi_mes', 'plantas_netas_mes', 'area_intervenida_ha_mes', 'especies_activas_mes']
  };

  const PERIOD_REGEX = /(20\d{2})[-\/]?(0[1-9]|1[0-2])/;
  const GREETINGS = ['hola', 'buenas', 'buen dia', 'buen día', 'hello', 'hey'];
  const THANKS = ['gracias', 'thanks'];
  const OFFTOPIC_HINTS = ['chiste', 'novia', 'novio', 'sexo', 'meme', 'horoscopo', 'horóscopo', 'bitcoin', 'futbol', 'fútbol', 'presidente', 'gobierno', 'religion', 'religión'];

  const state = {
    initialized: false,
    open: false,
    busy: false,
    scopeProgramId: null,
    messages: [],
    elements: {},
    dataLoaded: false
  };

  function stripAccents(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function normalizeText(value) {
    return stripAccents(value)
      .toLowerCase()
      .replace(/[_|/]+/g, ' ')
      .replace(/[^a-z0-9áéíóúüñ\s.-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function toNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value.replace(/,/g, ''));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  function formatNumber(value) {
    const num = toNumber(value);
    if (num == null) return null;
    const fractionDigits = Math.abs(num) >= 100 ? 0 : Math.abs(num) >= 10 ? 1 : 2;
    return new Intl.NumberFormat('es-GT', { maximumFractionDigits: fractionDigits }).format(num);
  }

  function formatPercent(value) {
    const num = toNumber(value);
    if (num == null) return null;
    return `${new Intl.NumberFormat('es-GT', { maximumFractionDigits: 1 }).format(num)}%`;
  }

  function humanizeKey(key) {
    if (!key) return '';
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return String(key)
      .replace(/_mes$/i, '')
      .replace(/_acum$/i, ' acumulado')
      .replace(/_/g, ' ')
      .replace(/\bqq\b/gi, 'qq')
      .replace(/\bpct\b/gi, '%')
      .replace(/\b[a-z]/g, (s) => s.toUpperCase());
  }

  function titleCase(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function getProgramName(programId) {
    return Config.getProgramLabel(programId) || programId || '';
  }

  function matchAny(text, words) {
    const normalized = normalizeText(text);
    return words.some((word) => normalized.includes(normalizeText(word)));
  }

  function detectProgram(text) {
    const fromText = Config.resolveProgramFromText(text);
    if (fromText) return fromText;
    return state.scopeProgramId || null;
  }

  function detectPeriod(text, programId) {
    const raw = String(text || '');
    const match = raw.match(PERIOD_REGEX);
    if (match) return `${match[1]}-${match[2]}`;
    const normalized = normalizeText(raw);
    const periods = Data.listPeriods(programId || undefined);
    if (!periods.length) return null;
    if (normalized.includes('ultimo') || normalized.includes('último') || normalized.includes('reciente') || normalized.includes('actual')) {
      return periods[periods.length - 1] || null;
    }
    const monthMap = {
      enero: '01', feb: '02', febrero: '02', mar: '03', marzo: '03', abr: '04', abril: '04', mayo: '05', may: '05', junio: '06', jun: '06', julio: '07', jul: '07', agosto: '08', ago: '08', septiembre: '09', setiembre: '09', sep: '09', oct: '10', octubre: '10', noviembre: '11', nov: '11', diciembre: '12', dic: '12'
    };
    const yearMatch = normalized.match(/20\d{2}/);
    const year = yearMatch ? yearMatch[0] : null;
    if (year) {
      for (const [token, month] of Object.entries(monthMap)) {
        if (normalized.includes(token)) {
          const candidate = `${year}-${month}`;
          if (periods.includes(candidate)) return candidate;
        }
      }
    }
    return null;
  }

  function detectIntent(text) {
    const intents = Config.detectIntents(text);
    if (intents.includes('comparacion')) return 'comparacion';
    if (intents.includes('alerta')) return 'alerta';
    if (intents.includes('tendencia')) return 'tendencia';
    if (intents.includes('territorio')) return 'territorio';
    if (intents.includes('indicadores')) return 'indicadores';
    if (intents.includes('resumen') || intents.includes('ultimo_mes')) return 'resumen';
    return 'search';
  }

  function isGreeting(text) {
    return matchAny(text, GREETINGS);
  }

  function isThanks(text) {
    return matchAny(text, THANKS);
  }

  function looksOffTopic(text) {
    const normalized = normalizeText(text);
    if (!normalized) return false;
    if (OFFTOPIC_HINTS.some((word) => normalized.includes(normalizeText(word)))) return true;
    const intents = Config.detectIntents(text);
    const program = Config.resolveProgramFromText(text);
    const period = detectPeriod(text, null);
    const searchHits = Data.search(text, { latestOnly: false, limit: 3 });
    return !intents.length && !program && !period && searchHits.length === 0;
  }

  function getProgramScope(text) {
    const programId = detectProgram(text);
    if (programId) return [programId];
    return Data.getPrograms().map((item) => item.id);
  }

  function getSnapshot(programId) {
    return Data.getLatest(programId);
  }

  function getProgramData(programId) {
    return Data.getProgram(programId);
  }

  function getLatestPeriod(programId) {
    const snapshot = getSnapshot(programId);
    return snapshot ? snapshot.latest_period : null;
  }

  function describePeriod(periodKey) {
    if (!periodKey) return null;
    const [year, month] = String(periodKey).split('-');
    const months = {
      '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
      '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };
    return `${months[month] || month} ${year}`;
  }

  function getMonthlyRecord(programId, periodKey) {
    const program = getProgramData(programId);
    if (!program) return null;
    if (periodKey) {
      const match = program.monthly.find((row) => row.period_key === periodKey);
      return match || null;
    }
    return program.latest_monthly[0] || null;
  }

  function getIndicatorRows(programId, periodKey) {
    const program = getProgramData(programId);
    if (!program) return [];
    if (periodKey) return program.indicators.filter((row) => row.period_key === periodKey);
    return program.latest_indicators || [];
  }

  function getPreviousPeriod(programId, currentPeriod) {
    const periods = Data.listPeriods(programId);
    const index = periods.indexOf(currentPeriod);
    if (index > 0) return periods[index - 1];
    return null;
  }

  function getPreferredNumericFields(programId, monthlyValues) {
    const preferred = PROGRAM_HIGHLIGHTS[programId] || [];
    const result = [];
    preferred.forEach((key) => {
      const num = toNumber(monthlyValues[key]);
      if (num != null) result.push({ key, value: num });
    });
    if (result.length >= 3) return result.slice(0, 4);
    const ignored = new Set(['anio', 'mes_num', 'cohorte_mes_indice', 'mes_ciclo_epc']);
    Object.entries(monthlyValues || {}).forEach(([key, value]) => {
      if (result.some((item) => item.key === key)) return;
      if (ignored.has(key)) return;
      const num = toNumber(value);
      if (num == null || num === 0) return;
      if (/pct_|meta_|esperado_|indice|year|month|aporta|is_latest|tiene_datos|activo|fecha_|periodo|program/i.test(key)) return;
      result.push({ key, value: num });
    });
    return result.slice(0, 4);
  }

  function findIndicatorByQuestion(question, indicatorRows) {
    const normalized = normalizeText(question);
    const ranked = indicatorRows
      .map((row) => {
        const indicatorText = normalizeText([row.indicator_name, row.indicator_id, row.values.indicador_grupo_nombre, row.values.subindicador_id].filter(Boolean).join(' '));
        let score = 0;
        normalized.split(' ').filter(Boolean).forEach((term) => {
          if (term.length < 3) return;
          if (indicatorText.includes(term)) score += 2;
        });
        return { score, row };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    return ranked[0] ? ranked[0].row : null;
  }

  function normalizeStatus(value) {
    return normalizeText(value || '');
  }

  function statusSeverity(status) {
    const normalized = normalizeStatus(status);
    if (!normalized) return 0;
    if (normalized.includes('rojo') || normalized.includes('critico') || normalized.includes('crítico') || normalized.includes('rezago') || normalized.includes('bajo')) return 3;
    if (normalized.includes('amarillo') || normalized.includes('riesgo') || normalized.includes('parcial')) return 2;
    if (normalized.includes('verde') || normalized.includes('cumple') || normalized.includes('ok')) return 1;
    return 1;
  }

  function extractAlerts(programId, periodKey) {
    const indicators = getIndicatorRows(programId, periodKey);
    const critical = indicators
      .map((row) => ({
        row,
        severity: statusSeverity(row.status),
        pct: toNumber(row.values.pct_vs_esperado ?? row.values.pct_meta_anual)
      }))
      .filter((item) => item.severity >= 2 || (item.pct != null && item.pct < 100))
      .sort((a, b) => b.severity - a.severity || (a.pct ?? 999) - (b.pct ?? 999))
      .slice(0, 4)
      .map((item) => item.row);
    const monthly = getMonthlyRecord(programId, periodKey);
    const notes = [];
    if (monthly && monthly.values.alertas_texto) notes.push(String(monthly.values.alertas_texto).trim());
    return { indicators: critical, notes };
  }

  function summarizeProgram(programId, periodKey, question) {
    const snapshot = getSnapshot(programId);
    const effectivePeriod = periodKey || snapshot?.latest_period || null;
    const monthly = getMonthlyRecord(programId, effectivePeriod);
    const indicators = getIndicatorRows(programId, effectivePeriod);
    if (!monthly && !indicators.length) return null;

    const monthlyValues = monthly ? monthly.values : {};
    const lines = [];
    const title = `${getProgramName(programId)} · ${describePeriod(effectivePeriod) || 'Sin período'}`;

    const highlightMetrics = getPreferredNumericFields(programId, monthlyValues)
      .map((item) => `${humanizeKey(item.key)}: ${formatNumber(item.value)}`)
      .slice(0, 4);

    if (highlightMetrics.length) lines.push(`Lo más relevante fue ${highlightMetrics.join(' · ')}.`);

    const topIndicators = indicators
      .filter((row) => toNumber(row.values.valor_mes ?? row.values.valor_acumulado ?? row.values.valor) != null)
      .slice(0, 4)
      .map((row) => {
        const value = row.values.valor_mes ?? row.values.valor_acumulado ?? row.values.valor;
        const meta = row.values.meta_mes ?? row.values.meta_anual;
        const pct = row.values.pct_vs_esperado ?? row.values.pct_meta_anual;
        const parts = [`${row.indicator_name || row.indicator_id}: ${formatNumber(value)}${row.unit ? ` ${row.unit}` : ''}`];
        if (meta != null) parts.push(`meta ${formatNumber(meta)}${row.unit ? ` ${row.unit}` : ''}`);
        if (pct != null) parts.push(`${formatPercent(pct)} de avance`);
        if (row.status) parts.push(`estatus ${String(row.status).toLowerCase()}`);
        return parts.join(', ');
      });
    if (topIndicators.length) lines.push(`Indicadores destacados: ${topIndicators.join(' | ')}.`);

    const alerts = extractAlerts(programId, effectivePeriod);
    if (alerts.indicators.length) {
      const text = alerts.indicators
        .map((row) => `${row.indicator_name || row.indicator_id}${row.status ? ` (${String(row.status).toLowerCase()})` : ''}`)
        .join(', ');
      lines.push(`Temas que merecen atención: ${text}.`);
    }
    if (monthlyValues.logros_texto) lines.push(`Logros reportados: ${String(monthlyValues.logros_texto).trim()}.`);
    if (monthlyValues.alertas_texto && !alerts.notes.includes(String(monthlyValues.alertas_texto).trim())) lines.push(`Alertas reportadas: ${String(monthlyValues.alertas_texto).trim()}.`);
    if (question && /fuente|origen|metodolog/i.test(normalizeText(question)) && monthlyValues.fuente_texto) {
      lines.push(`Fuente reportada: ${String(monthlyValues.fuente_texto).trim()}.`);
    }

    return {
      title,
      text: lines.join(' '),
      meta: {
        programId,
        periodKey: effectivePeriod,
        sourceCount: 1 + indicators.length
      }
    };
  }

  function comparePrograms(question, periodKey) {
    const programIds = Data.getPrograms().map((item) => item.id);
    const lines = [];
    const comparisons = [];

    programIds.forEach((programId) => {
      const snapshot = getSnapshot(programId);
      const effectivePeriod = periodKey || snapshot?.latest_period || null;
      const monthly = getMonthlyRecord(programId, effectivePeriod);
      if (!monthly) return;
      const metrics = getPreferredNumericFields(programId, monthly.values)
        .slice(0, 2)
        .map((item) => `${humanizeKey(item.key)} ${formatNumber(item.value)}`);
      const alerts = extractAlerts(programId, effectivePeriod);
      comparisons.push({
        programId,
        periodKey: effectivePeriod,
        alertCount: alerts.indicators.length,
        metrics,
        latestPeriod: effectivePeriod
      });
    });

    if (!comparisons.length) return null;

    comparisons.sort((a, b) => (b.alertCount - a.alertCount) || String(a.programId).localeCompare(String(b.programId), 'es'));
    const periods = Array.from(new Set(comparisons.map((item) => item.periodKey).filter(Boolean)));
    if (periods.length === 1) lines.push(`Comparación del período ${describePeriod(periods[0])}.`);
    else lines.push(`Comparación con el período más reciente disponible en cada programa.`);

    comparisons.forEach((item) => {
      lines.push(`${getProgramName(item.programId)}: ${item.metrics.join(' · ')}${item.alertCount ? ` · ${item.alertCount} alerta(s) relevante(s)` : ''}.`);
    });

    const best = comparisons.find((item) => item.alertCount === 0) || comparisons[0];
    const risk = comparisons.find((item) => item.alertCount > 0);
    if (best) lines.push(`En lectura rápida, ${getProgramName(best.programId)} luce más estable en su corte reciente.`);
    if (risk) lines.push(`El frente con más seguimiento pendiente es ${getProgramName(risk.programId)}.`);

    return {
      title: 'Comparación entre programas',
      text: lines.join(' '),
      meta: { periodKey: periods.length === 1 ? periods[0] : null, programs: comparisons.map((item) => item.programId) }
    };
  }

  function answerAlerts(programIds, periodKey) {
    const lines = [];
    const findings = [];
    programIds.forEach((programId) => {
      const effectivePeriod = periodKey || getLatestPeriod(programId);
      const alerts = extractAlerts(programId, effectivePeriod);
      if (!alerts.indicators.length && !alerts.notes.length) return;
      findings.push({ programId, effectivePeriod, alerts });
    });
    if (!findings.length) {
      return {
        title: 'Alertas y rezagos',
        text: 'No vi alertas fuertes en los indicadores más recientes cargados; aun así conviene revisar los semáforos y notas metodológicas de cada programa.',
        meta: { programs: programIds, periodKey: periodKey || null }
      };
    }
    findings.forEach((item) => {
      const indicatorText = item.alerts.indicators.slice(0, 3).map((row) => `${row.indicator_name || row.indicator_id}${row.status ? ` (${String(row.status).toLowerCase()})` : ''}`).join(', ');
      const notesText = item.alerts.notes.slice(0, 1).join(' ');
      const chunks = [];
      if (indicatorText) chunks.push(indicatorText);
      if (notesText) chunks.push(notesText);
      lines.push(`${getProgramName(item.programId)} en ${describePeriod(item.effectivePeriod)}: ${chunks.join(' · ')}.`);
    });
    return {
      title: 'Alertas y rezagos',
      text: lines.join(' '),
      meta: { programs: findings.map((item) => item.programId), periodKey: periodKey || null }
    };
  }

  function answerIndicators(programId, periodKey, question) {
    const effectivePeriod = periodKey || getLatestPeriod(programId);
    const rows = getIndicatorRows(programId, effectivePeriod);
    if (!rows.length) return null;
    const specific = findIndicatorByQuestion(question, rows);
    if (specific) {
      const value = specific.values.valor_mes ?? specific.values.valor_acumulado ?? specific.values.valor;
      const meta = specific.values.meta_mes ?? specific.values.meta_anual;
      const pct = specific.values.pct_vs_esperado ?? specific.values.pct_meta_anual;
      const parts = [`${getProgramName(programId)} en ${describePeriod(effectivePeriod)}: ${specific.indicator_name || specific.indicator_id} = ${formatNumber(value)}${specific.unit ? ` ${specific.unit}` : ''}`];
      if (meta != null) parts.push(`meta ${formatNumber(meta)}${specific.unit ? ` ${specific.unit}` : ''}`);
      if (pct != null) parts.push(`avance ${formatPercent(pct)}`);
      if (specific.status) parts.push(`estatus ${String(specific.status).toLowerCase()}`);
      return { title: 'Indicador consultado', text: `${parts.join(', ')}.`, meta: { programId, periodKey: effectivePeriod } };
    }
    const top = rows.slice(0, 6).map((row) => {
      const value = row.values.valor_mes ?? row.values.valor_acumulado ?? row.values.valor;
      const pct = row.values.pct_vs_esperado ?? row.values.pct_meta_anual;
      const parts = [`${row.indicator_name || row.indicator_id}: ${formatNumber(value)}${row.unit ? ` ${row.unit}` : ''}`];
      if (pct != null) parts.push(`${formatPercent(pct)}`);
      if (row.status) parts.push(String(row.status).toLowerCase());
      return parts.join(', ');
    });
    return {
      title: `Indicadores de ${getProgramName(programId)}`,
      text: `Para ${describePeriod(effectivePeriod)}, los indicadores más visibles son ${top.join(' | ')}.`,
      meta: { programId, periodKey: effectivePeriod }
    };
  }

  function aggregateDimensionRows(rows) {
    const bucket = new Map();
    rows.forEach((row) => {
      const label = row.primary_dimension_value;
      if (!label) return;
      const numericEntries = Object.entries(row.values || {}).map(([key, value]) => ({ key, value: toNumber(value) })).filter((item) => item.value != null && item.value !== 0);
      if (!numericEntries.length) return;
      numericEntries.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      const best = numericEntries[0];
      if (!bucket.has(label)) bucket.set(label, { label, key: best.key, total: 0 });
      const item = bucket.get(label);
      item.total += best.value;
      if (Math.abs(best.value) > Math.abs(item.total)) item.key = best.key;
    });
    return Array.from(bucket.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total)).slice(0, 5);
  }

  function answerTerritory(programId, periodKey) {
    const program = getProgramData(programId);
    if (!program) return null;
    const effectivePeriod = periodKey || program.latest_period;
    const rows = program.details.filter((row) => !effectivePeriod || row.period_key === effectivePeriod);
    const monthlyRows = program.monthly.filter((row) => !effectivePeriod || row.period_key === effectivePeriod);
    const joined = aggregateDimensionRows([...rows, ...monthlyRows].filter((row) => row.primary_dimension_value));
    if (!joined.length) return null;
    const text = joined.map((item) => `${titleCase(item.label)}: ${formatNumber(item.total)} en ${humanizeKey(item.key)}`).join(' | ');
    return {
      title: `Detalle territorial o temático de ${getProgramName(programId)}`,
      text: `En ${describePeriod(effectivePeriod)}, lo que más resalta es ${text}.`,
      meta: { programId, periodKey: effectivePeriod }
    };
  }

  function answerTrend(programId, periodKey) {
    const currentPeriod = periodKey || getLatestPeriod(programId);
    const previousPeriod = getPreviousPeriod(programId, currentPeriod);
    if (!currentPeriod || !previousPeriod) return null;
    const current = getMonthlyRecord(programId, currentPeriod);
    const previous = getMonthlyRecord(programId, previousPeriod);
    if (!current || !previous) return null;
    const keys = PROGRAM_HIGHLIGHTS[programId] || [];
    const deltas = keys.map((key) => {
      const currentValue = toNumber(current.values[key]);
      const previousValue = toNumber(previous.values[key]);
      if (currentValue == null || previousValue == null) return null;
      return { key, currentValue, previousValue, delta: currentValue - previousValue };
    }).filter(Boolean).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 4);
    if (!deltas.length) return null;
    const lines = deltas.map((item) => {
      const direction = item.delta > 0 ? 'subió' : item.delta < 0 ? 'bajó' : 'se mantuvo';
      const magnitude = item.delta === 0 ? formatNumber(item.currentValue) : formatNumber(Math.abs(item.delta));
      return `${humanizeKey(item.key)} ${direction} ${item.delta === 0 ? `en ${magnitude}` : magnitude}`;
    });
    return {
      title: `Tendencia de ${getProgramName(programId)}`,
      text: `Comparando ${describePeriod(previousPeriod)} con ${describePeriod(currentPeriod)}, ${lines.join(' · ')}.`,
      meta: { programId, periodKey: currentPeriod, comparisonPeriodKey: previousPeriod }
    };
  }

  function answerSearch(question, programIds, periodKey) {
    const hits = Data.search(question, { latestOnly: false, limit: Config.DATA.maxSearchResults || 25 });
    const filtered = hits.filter((row) => programIds.includes(row.program_id)).filter((row) => !periodKey || row.period_key === periodKey);
    if (!filtered.length) return null;
    const first = filtered[0];
    if (first.dataset_kind === 'indicator' || first.dataset_kind === 'indicator_chart') {
      return answerIndicators(first.program_id, periodKey || first.period_key, question);
    }
    const monthly = getMonthlyRecord(first.program_id, periodKey || first.period_key);
    if (monthly) {
      const summary = summarizeProgram(first.program_id, periodKey || first.period_key, question);
      if (summary) return summary;
    }
    const simple = filtered.slice(0, 4).map((row) => {
      const numericEntry = Object.entries(row.values || {}).find(([, value]) => toNumber(value) != null);
      const valueText = numericEntry ? `${humanizeKey(numericEntry[0])}: ${formatNumber(numericEntry[1])}` : row.indicator_name || row.primary_dimension_value || row.dataset_key;
      return `${getProgramName(row.program_id)}${row.period_key ? ` (${describePeriod(row.period_key)})` : ''}: ${valueText}`;
    });
    return { title: 'Resultados encontrados', text: simple.join(' | '), meta: { programs: programIds, periodKey: periodKey || null } };
  }

  function buildLocalAnswer(question) {
    const trimmed = String(question || '').trim();
    if (!trimmed) return { title: '', text: Config.FALLBACKS.ambiguous, meta: {} };
    if (isGreeting(trimmed)) return { title: '', text: `${Config.APP.greeting} Puedes pedirme un resumen, una comparación, alertas o indicadores por programa.`, meta: {} };
    if (isThanks(trimmed)) return { title: '', text: 'Con gusto. Puedes seguir preguntando por programa, indicador o período.', meta: {} };
    if (looksOffTopic(trimmed)) return { title: '', text: Config.FALLBACKS.offTopic, meta: {} };

    const programId = detectProgram(trimmed);
    const programIds = getProgramScope(trimmed);
    const periodKey = detectPeriod(trimmed, programId);
    const intent = detectIntent(trimmed);

    if (intent === 'comparacion') {
      const response = comparePrograms(trimmed, periodKey);
      if (response) return response;
    }

    if (intent === 'alerta') {
      const response = answerAlerts(programIds, periodKey);
      if (response) return response;
    }

    if (programId && intent === 'tendencia') {
      const response = answerTrend(programId, periodKey);
      if (response) return response;
    }

    if (programId && intent === 'territorio') {
      const response = answerTerritory(programId, periodKey);
      if (response) return response;
    }

    if (programId && intent === 'indicadores') {
      const response = answerIndicators(programId, periodKey, trimmed);
      if (response) return response;
    }

    if (programId && intent === 'resumen') {
      const response = summarizeProgram(programId, periodKey, trimmed);
      if (response) return response;
    }

    if (!programId && intent === 'resumen') {
      const response = comparePrograms(trimmed, periodKey);
      if (response) return response;
    }

    const searchResponse = answerSearch(trimmed, programIds, periodKey);
    if (searchResponse) return searchResponse;

    if (programId) {
      const summary = summarizeProgram(programId, periodKey, trimmed);
      if (summary) return summary;
    }

    return { title: '', text: Config.FALLBACKS.noData, meta: { programId: programId || null, periodKey: periodKey || null } };
  }

  async function buildAnswer(question) {
    if (Config.MODEL.backendEnabled && Config.MODEL.endpoint) {
      try {
        const programId = detectProgram(question);
        const periodKey = detectPeriod(question, programId);
        const context = Data.buildContext({
          programId,
          periodKey,
          latestOnly: !periodKey,
          includeDetails: Config.DATA.includeDetailsByDefault,
          includeIndicators: Config.DATA.includeIndicatorsByDefault,
          includeMetadata: Config.DATA.includeMetadataByDefault,
          maxRowsPerCollection: Config.DATA.maxRowsPerCollection
        });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), Config.MODEL.timeoutMs || 30000);
        const response = await fetch(Config.MODEL.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            system: Config.buildSystemInstruction(),
            context,
            config: {
              temperature: Config.MODEL.temperature,
              maxTokens: Config.MODEL.maxTokens
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data.answer === 'string' && data.answer.trim()) {
            return { title: data.title || '', text: data.answer.trim(), meta: data.meta || {} };
          }
        }
      } catch (error) {
        console.warn('AALA Chatbot: fallback local activado', error);
      }
    }
    return buildLocalAnswer(question);
  }

  function injectStyles() {
    if (document.getElementById('aala-chatbot-styles')) return;
    const style = document.createElement('style');
    style.id = 'aala-chatbot-styles';
    style.textContent = `
      .aala-chatbot-root{
        position:fixed;
        right:24px;
        bottom:24px;
        z-index:1200;
        font-family:var(--font-body,'Sora',system-ui,sans-serif)
      }

      .aala-chatbot-launcher{
        width:64px;
        height:64px;
        border:0;
        cursor:pointer;
        border-radius:999px;
        background:linear-gradient(135deg,#1b7f76 0%,#27a79d 100%);
        color:#fff;
        box-shadow:0 18px 36px rgba(10,56,73,.24);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:0;
        transition:transform .18s ease, box-shadow .18s ease
      }

      .aala-chatbot-launcher:hover{
        transform:translateY(-2px);
        box-shadow:0 22px 42px rgba(10,56,73,.28)
      }

      .aala-chatbot-launcher span:first-child{
        font-size:26px;
        line-height:1
      }

      .aala-chatbot-launcher span:last-child{
        display:none
      }

      .aala-chatbot-panel{
        width:min(390px,calc(100vw - 28px));
        height:min(680px,74vh);
        background:#ffffff;
        border:1px solid rgba(19,72,86,.10);
        border-radius:22px;
        box-shadow:0 24px 60px rgba(9,38,58,.18);
        overflow:hidden;
        display:none;
        flex-direction:column
      }

      .aala-chatbot-root.is-open .aala-chatbot-panel{
        display:flex
      }

      .aala-chatbot-root.is-open .aala-chatbot-launcher{
        display:none
      }

      .aala-chatbot-head{
        padding:16px 16px 12px;
        background:#ffffff;
        border-bottom:1px solid #e8eff2;
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px
      }

      .aala-chatbot-head-main{
        display:flex;
        align-items:center;
        gap:12px;
        min-width:0
      }

      .aala-chatbot-avatar{
        width:42px;
        height:42px;
        border-radius:999px;
        flex:0 0 42px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:18px;
        font-weight:700;
        color:#ffffff;
        background:linear-gradient(135deg,#d88662 0%,#1b7f76 100%);
        box-shadow:0 8px 20px rgba(27,127,118,.20)
      }

      .aala-chatbot-head h3{
        font-size:1rem;
        line-height:1.2;
        margin:0;
        color:#1b7f76;
        font-weight:700
      }

      .aala-chatbot-head p{
        font-size:.78rem;
        color:#5f6f78;
        line-height:1.45;
        margin:4px 0 0
      }

      .aala-chatbot-head-actions{
        display:flex;
        align-items:center;
        gap:8px
      }

      .aala-chatbot-close{
        border:0;
        background:#f1f5f7;
        color:#47626c;
        border-radius:10px;
        width:34px;
        height:34px;
        font-size:20px;
        cursor:pointer;
        line-height:1
      }

      .aala-chatbot-close:hover{
        background:#e7eef1
      }

      .aala-chatbot-status{
        padding:8px 16px 0;
        font-size:.75rem;
        color:#78909a;
        background:#ffffff
      }

      .aala-chatbot-body{
        flex:1;
        overflow:auto;
        padding:14px 14px 10px;
        background:linear-gradient(180deg,#f6f7f8 0%,#f2f5f7 100%)
      }

      .aala-chatbot-row{
        display:flex;
        align-items:flex-end;
        gap:8px;
        margin-bottom:12px
      }

      .aala-chatbot-row.user{
        justify-content:flex-end
      }

      .aala-chatbot-mini-avatar{
        width:30px;
        height:30px;
        border-radius:999px;
        flex:0 0 30px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:.78rem;
        font-weight:700;
        color:#ffffff;
        background:linear-gradient(135deg,#d88662 0%,#1b7f76 100%)
      }

      .aala-chatbot-msg{
        max-width:84%;
        padding:12px 14px;
        border-radius:18px;
        line-height:1.55;
        font-size:.92rem;
        white-space:pre-wrap;
        word-break:break-word;
        box-shadow:0 8px 18px rgba(18,42,66,.05)
      }

      .aala-chatbot-row.bot .aala-chatbot-msg{
        background:#ffffff;
        color:#17314f;
        border:1px solid #e2eaee;
        border-bottom-left-radius:8px
      }

      .aala-chatbot-row.user .aala-chatbot-msg{
        background:#dff5f1;
        color:#18424f;
        border:1px solid #c5ebe4;
        border-bottom-right-radius:8px
      }

      .aala-chatbot-msg-title{
        font-weight:700;
        margin-bottom:6px;
        color:#1b7f76
      }

      .aala-chatbot-meta{
        display:flex;
        flex-wrap:wrap;
        gap:6px;
        margin-top:9px
      }

      .aala-chatbot-chip{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:4px 8px;
        border-radius:999px;
        background:#eef7f5;
        color:#1b7f76;
        font-size:.72rem;
        font-weight:700
      }

      .aala-chatbot-suggestions{
        padding:0 14px 12px;
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        background:linear-gradient(180deg,#f2f5f7 0%,#ffffff 60%)
      }

      .aala-chatbot-suggestion{
        border:1px solid #d9e6eb;
        background:#ffffff;
        color:#35535f;
        border-radius:999px;
        padding:8px 12px;
        font-size:.78rem;
        cursor:pointer;
        line-height:1.35
      }

      .aala-chatbot-suggestion:hover{
        background:#f4faf8
      }

      .aala-chatbot-form{
        padding:12px;
        border-top:1px solid #e6edf0;
        background:#ffffff;
        display:flex;
        gap:10px;
        align-items:flex-end
      }

      .aala-chatbot-input{
        flex:1;
        min-height:46px;
        max-height:130px;
        resize:none;
        border:1px solid #d9e5ea;
        border-radius:16px;
        padding:12px 14px;
        font:inherit;
        color:#17314f;
        outline:none;
        background:#fafcfd
      }

      .aala-chatbot-input:focus{
        border-color:#34a79e;
        box-shadow:0 0 0 4px rgba(52,167,158,.12)
      }

      .aala-chatbot-send{
        border:0;
        border-radius:14px;
        background:#f0a63f;
        color:#ffffff;
        padding:12px 14px;
        font-weight:700;
        cursor:pointer;
        min-width:84px;
        box-shadow:0 10px 22px rgba(240,166,63,.24)
      }

      .aala-chatbot-send:hover{
        filter:brightness(.98)
      }

      .aala-chatbot-send[disabled]{
        opacity:.6;
        cursor:not-allowed;
        box-shadow:none
      }

      .aala-chatbot-loader{
        display:inline-flex;
        gap:4px;
        align-items:center
      }

      .aala-chatbot-loader span{
        width:6px;
        height:6px;
        border-radius:999px;
        background:#34a79e;
        display:inline-block;
        animation:aala-chatbot-pulse 1.2s infinite ease-in-out
      }

      .aala-chatbot-loader span:nth-child(2){
        animation-delay:.15s
      }

      .aala-chatbot-loader span:nth-child(3){
        animation-delay:.3s
      }

      @keyframes aala-chatbot-pulse{
        0%,80%,100%{transform:scale(.5);opacity:.45}
        40%{transform:scale(1);opacity:1}
      }

      @media (max-width:720px){
        .aala-chatbot-root{
          right:12px;
          left:12px;
          bottom:12px
        }

        .aala-chatbot-panel{
          width:100%;
          height:min(78vh,700px)
        }

        .aala-chatbot-launcher{
          margin-left:auto
        }

        .aala-chatbot-msg{
          max-width:88%
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureRoot() {
    let root = document.getElementById(Config.APP.id);
    if (root) return root;

    root = document.createElement('div');
    root.id = Config.APP.id;
    root.className = 'aala-chatbot-root';
    root.innerHTML = `
      <button type="button" class="aala-chatbot-launcher" aria-label="Abrir asistente de datos">
        <span>💬</span>
        <span>${escapeHtml(Config.APP.name)}</span>
      </button>

      <section class="aala-chatbot-panel" aria-live="polite">
        <header class="aala-chatbot-head">
          <div class="aala-chatbot-head-main">
            <div class="aala-chatbot-avatar">A</div>
            <div>
              <h3>${escapeHtml(Config.APP.name)}</h3>
              <p>${escapeHtml(Config.APP.subtitle)}</p>
            </div>
          </div>
          <div class="aala-chatbot-head-actions">
            <button type="button" class="aala-chatbot-close" aria-label="Cerrar chat">×</button>
          </div>
        </header>

        <div class="aala-chatbot-status"></div>
        <div class="aala-chatbot-body"></div>
        <div class="aala-chatbot-suggestions"></div>

        <form class="aala-chatbot-form">
          <textarea
            class="aala-chatbot-input"
            maxlength="${Number(Config.APP.inputMaxLength || 500)}"
            placeholder="${escapeHtml(Config.APP.placeholder)}"
          ></textarea>
          <button type="submit" class="aala-chatbot-send">Enviar</button>
        </form>
      </section>
    `;

    document.body.appendChild(root);
    return root;
  }

  function bindElements(root) {
    state.elements.root = root;
    state.elements.launcher = root.querySelector('.aala-chatbot-launcher');
    state.elements.panel = root.querySelector('.aala-chatbot-panel');
    state.elements.close = root.querySelector('.aala-chatbot-close');
    state.elements.status = root.querySelector('.aala-chatbot-status');
    state.elements.body = root.querySelector('.aala-chatbot-body');
    state.elements.suggestions = root.querySelector('.aala-chatbot-suggestions');
    state.elements.form = root.querySelector('.aala-chatbot-form');
    state.elements.input = root.querySelector('.aala-chatbot-input');
    state.elements.send = root.querySelector('.aala-chatbot-send');
  }

  function setOpen(open) {
    state.open = !!open;
    state.elements.root.classList.toggle('is-open', state.open);
    if (state.open && Config.UX.autoFocusInput) state.elements.input.focus();
  }

  function setBusy(busy) {
    state.busy = !!busy;
    state.elements.send.disabled = state.busy;
    state.elements.input.disabled = state.busy;
    if (busy) {
      state.elements.status.innerHTML = `<span class="aala-chatbot-loader"><span></span><span></span><span></span></span> ${escapeHtml(Config.APP.loadingLabel)}`;
    } else {
      state.elements.status.textContent = state.dataLoaded ? `Datos cargados: ${new Date().toLocaleString('es-GT')}` : Config.APP.errorLabel;
    }
  }

  function scrollToBottom() {
    state.elements.body.scrollTop = state.elements.body.scrollHeight;
  }

  function renderMessage(message) {
    const row = document.createElement('div');
    row.className = `aala-chatbot-row ${message.role}`;

    const item = document.createElement('div');
    item.className = 'aala-chatbot-msg';

    const title = message.title ? `<div class="aala-chatbot-msg-title">${escapeHtml(message.title)}</div>` : '';
    const text = `<div>${escapeHtml(message.text)}</div>`;

    const chips = [];
    if (message.meta && message.meta.programId) chips.push(getProgramName(message.meta.programId));
    if (message.meta && Array.isArray(message.meta.programs) && !message.meta.programId) {
      message.meta.programs.slice(0, 5).forEach((programId) => chips.push(getProgramName(programId)));
    }
    if (message.meta && message.meta.periodKey) chips.push(describePeriod(message.meta.periodKey));
    if (message.meta && message.meta.comparisonPeriodKey) chips.push(`vs ${describePeriod(message.meta.comparisonPeriodKey)}`);

    const meta = chips.length
      ? `<div class="aala-chatbot-meta">${chips.map((chip) => `<span class="aala-chatbot-chip">${escapeHtml(chip)}</span>`).join('')}</div>`
      : '';

    item.innerHTML = `${title}${text}${meta}`;

    if (message.role === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = 'aala-chatbot-mini-avatar';
      avatar.textContent = 'A';
      row.appendChild(avatar);
      row.appendChild(item);
    } else {
      row.appendChild(item);
    }

    state.elements.body.appendChild(row);
    scrollToBottom();
  }

  function pushMessage(role, text, title, meta) {
    const message = { role, text, title: title || '', meta: meta || {} };
    state.messages.push(message);
    if (state.messages.length > (Config.APP.historyLimit || 30)) state.messages.shift();
    renderMessage(message);
  }

  function clearSuggestions() {
    state.elements.suggestions.innerHTML = '';
  }

  function renderSuggestions(programId) {
    if (!Config.UX.showSuggestedQuestions) return;
    const suggestions = Config.getSuggestedQuestions(programId);
    state.elements.suggestions.innerHTML = '';
    suggestions.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'aala-chatbot-suggestion';
      button.textContent = item.text;
      button.addEventListener('click', () => {
        if (item.programId) state.scopeProgramId = item.programId;
        handleUserMessage(item.text);
      });
      state.elements.suggestions.appendChild(button);
    });
  }

  function updateScopeFromQuestion(question) {
    const programId = Config.resolveProgramFromText(question);
    if (programId) state.scopeProgramId = programId;
    renderSuggestions(state.scopeProgramId);
  }

  async function handleUserMessage(question) {
    const text = String(question || '').trim();
    if (!text || state.busy) return;
    updateScopeFromQuestion(text);
    pushMessage('user', text, '', {});
    if (Config.UX.clearInputOnSend) state.elements.input.value = '';
    setBusy(true);
    try {
      const answer = await buildAnswer(text);
      pushMessage('bot', answer.text || Config.FALLBACKS.noData, answer.title || '', answer.meta || {});
    } catch (error) {
      console.error(error);
      pushMessage('bot', Config.APP.errorLabel, '', {});
    } finally {
      setBusy(false);
      state.elements.input.focus();
    }
  }

  function autoGrowTextarea() {
    const el = state.elements.input;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function bindEvents() {
    state.elements.launcher.addEventListener('click', () => setOpen(true));
    state.elements.close.addEventListener('click', () => setOpen(false));
    state.elements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleUserMessage(state.elements.input.value);
    });
    state.elements.input.addEventListener('input', autoGrowTextarea);
    state.elements.input.addEventListener('keydown', (event) => {
      if (!Config.UX.enterToSend) return;
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleUserMessage(state.elements.input.value);
      }
    });
  }

  async function bootstrapData() {
    await Data.loadAll();
    state.dataLoaded = true;
  }

  async function init() {
    if (state.initialized) return;
    injectStyles();
    const root = ensureRoot();
    bindElements(root);
    bindEvents();
    setOpen(false);
    renderSuggestions(null);
    pushMessage('bot', Config.APP.greeting, '', {});
    setBusy(true);
    try {
      await bootstrapData();
      setBusy(false);
      const latest = Data.getLatest();
      const loadedPrograms = Object.keys(latest || {});
      if (loadedPrograms.length) {
        const periods = loadedPrograms.map((programId) => latest[programId]?.latest_period).filter(Boolean);
        const uniquePeriods = Array.from(new Set(periods));
        const freshness = uniquePeriods.length === 1
          ? `Período más reciente disponible: ${describePeriod(uniquePeriods[0])}.`
          : 'Los programas tienen cortes recientes cargados y pueden variar por período.';
        pushMessage('bot', `${freshness} Puedes preguntarme por resúmenes, comparaciones, alertas, indicadores o detalle por programa.`, 'Datos listos', {});
      }
    } catch (error) {
      console.error(error);
      state.dataLoaded = false;
      setBusy(false);
      pushMessage('bot', Config.APP.errorLabel, '', {});
    }
    state.initialized = true;
  }

  global.AALAChatbot = {
    init,
    open() { setOpen(true); },
    close() { setOpen(false); },
    ask(question) { return handleUserMessage(question); },
    getState() { return clone({ initialized: state.initialized, open: state.open, busy: state.busy, scopeProgramId: state.scopeProgramId, messages: state.messages }); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
