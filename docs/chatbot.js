(function (global) {
  'use strict';

  const Config = global.ChatbotConfig || null;
  const Data = global.ChatbotData || null;

  if (!Config || !Data) {
    console.error('AALA Chatbot: faltan ChatbotConfig o ChatbotData.');
    return;
  }

  const FIELD_LABELS = {
    total_materiales_qq: 'materiales reciclables recolectados',
    materiales_lideresas_qq: 'materiales de lideresas',
    materiales_municipalidad_qq: 'materiales de municipalidad',
    ingreso_bruto_total: 'ingresos brutos totales',
    ingreso_neto_total_territorio: 'ingreso neto del territorio',
    ingreso_neto_cooperativa: 'ingreso neto de la cooperativa',
    mujeres_activas: 'mujeres activas',
    mujeres_actividades: 'mujeres en actividades',
    mujeres_comercializacion: 'mujeres en comercialización',
    mujeres_inscritas_total: 'mujeres inscritas',
    mujeres_nuevas_inscritas: 'nuevas inscritas',
    ingreso_diario_lideresa: 'ingreso diario por lideresa',
    litros_aceite_recolectados_mes: 'litros de aceite recolectados',
    litros_agua_protegidos_mes: 'litros de agua protegidos',
    municipios_visitados_mes: 'municipios visitados',
    inmuebles_atendidos_mes: 'inmuebles atendidos',
    jabones_producidos_mes: 'jabones producidos',
    jabones_vendidos_mes: 'jabones vendidos',
    ingresos_ventas_q_mes: 'ingresos por ventas',
    publicaciones_redes_mes: 'publicaciones en redes',
    docentes_mes: 'docentes atendidos',
    estudiantes_epc_mes: 'estudiantes beneficiados',
    centros_mes: 'centros alcanzados',
    municipios_mes: 'municipios con actividad pedagógica',
    actividades_campo_mes: 'actividades de campo',
    estudiantes_actividades_campo_mes: 'estudiantes en actividades de campo',
    propuestas_juveniles_mes: 'propuestas juveniles',
    capitales_semilla_mes: 'capitales semilla',
    coordinaciones_clave_mes: 'coordinaciones clave',
    eventos_capacitacion_mes: 'eventos de capacitación',
    personas_capacitadas_total_mes: 'personas capacitadas',
    personas_capacitadas_nucleo_mes: 'personas capacitadas en temas núcleo',
    municipios_capacitacion_nucleo_mes: 'municipios con capacitación núcleo',
    pirdes_nuevos_total_mes: 'PIRDES nuevos',
    pirdes_actualizados_total_mes: 'PIRDES actualizados',
    pirdes_aprobados_total_mes: 'PIRDES aprobados',
    ha_monitoreadas_kpi_mes: 'ha monitoreadas',
    arboles_sembrados_kpi_mes: 'árboles sembrados',
    plantas_netas_mes: 'plantas netas',
    area_intervenida_ha_mes: 'área intervenida',
    especies_activas_mes: 'especies nativas activas'
  };

  const PROGRAM_HIGHLIGHTS = {
    atitlan_recicla: ['total_materiales_qq', 'ingreso_bruto_total', 'mujeres_activas', 'ingreso_neto_cooperativa'],
    conservando_atitlan: ['litros_aceite_recolectados_mes', 'litros_agua_protegidos_mes', 'jabones_producidos_mes', 'jabones_vendidos_mes'],
    educando_para_conservar: ['docentes_mes', 'estudiantes_epc_mes', 'centros_mes', 'actividades_campo_mes'],
    fortalecimiento_municipal: ['eventos_capacitacion_mes', 'personas_capacitadas_total_mes', 'pirdes_aprobados_total_mes', 'asistencias_nuevas_total_mes'],
    reforestacion: ['arboles_sembrados_kpi_mes', 'ha_monitoreadas_kpi_mes', 'plantas_netas_mes', 'area_intervenida_ha_mes']
  };

  const MONTH_NAMES = {
    '01': 'Enero',
    '02': 'Febrero',
    '03': 'Marzo',
    '04': 'Abril',
    '05': 'Mayo',
    '06': 'Junio',
    '07': 'Julio',
    '08': 'Agosto',
    '09': 'Septiembre',
    '10': 'Octubre',
    '11': 'Noviembre',
    '12': 'Diciembre'
  };

  const GREETINGS = ['hola', 'buenas', 'buen día', 'buen dia', 'que tal', 'qué tal', 'hello', 'hey'];
  const THANKS = ['gracias', 'muchas gracias', 'thanks'];
  const OFFTOPIC_HINTS = ['chiste', 'meme', 'novio', 'novia', 'sexo', 'bitcoin', 'futbol', 'fútbol', 'horoscopo', 'horóscopo', 'presidente', 'gobierno'];
  const PERIOD_REGEX = /(20\d{2})[-\/ ]?(0[1-9]|1[0-2])/;

  const state = {
    initialized: false,
    open: false,
    busy: false,
    scopeProgramId: null,
    messages: [],
    elements: {},
    dataLoaded: false,
    hasUserInteracted: false,
    requestToken: 0
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

  function toNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value.replace(/,/g, ''));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function formatNumber(value, maxDigits) {
    const num = toNumber(value);
    if (num == null) return null;
    const fractionDigits = typeof maxDigits === 'number'
      ? maxDigits
      : Math.abs(num) >= 100 ? 0 : Math.abs(num) >= 10 ? 1 : 2;
    return new Intl.NumberFormat('es-GT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits
    }).format(num);
  }

  function formatCurrency(value) {
    const num = toNumber(value);
    if (num == null) return null;
    return `Q${new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)}`;
  }

  function formatPercent(value) {
    const num = toNumber(value);
    if (num == null) return null;
    return `${new Intl.NumberFormat('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(num)}%`;
  }

  function describePeriod(periodKey) {
    if (!periodKey) return null;
    const [year, month] = String(periodKey).split('-');
    return `${MONTH_NAMES[month] || month} ${year}`;
  }

  function humanizeKey(key) {
    if (!key) return '';
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return String(key)
      .replace(/_mes$/i, '')
      .replace(/_acum$/i, ' acumulado')
      .replace(/_/g, ' ')
      .replace(/\bqq\b/gi, 'qq')
      .replace(/\bgtq\b/gi, 'GTQ')
      .replace(/\b[a-záéíóúüñ]/g, (s) => s.toUpperCase());
  }

  function sentenceCase(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function humanList(items) {
    const clean = items.filter(Boolean);
    if (!clean.length) return '';
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return `${clean[0]} y ${clean[1]}`;
    return `${clean.slice(0, -1).join(', ')} y ${clean[clean.length - 1]}`;
  }

  function summarizeText(text, maxLength) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    if (!maxLength || clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength - 1).trim()}…`;
  }

  function cleanNarrative(text) {
    const clean = String(text || '')
      .replace(/\s*El chatbot debería[^.]*\.?/gi, '')
      .replace(/\s*Actualizar narrativa[^.]*\.?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return clean;
  }

  function isUsefulContextNote(note) {
    const clean = cleanNarrative(note);
    if (!clean) return false;
    return !/actualizar narrativa|revisar mes activo/i.test(clean);
  }

  function getProgramName(programId) {
    return Config.getProgramLabel(programId) || programId || '';
  }

  function getManifest() {
    return Data.getManifest ? Data.getManifest() : null;
  }

  function getProgram(programId) {
    return Data.getProgram(programId);
  }

  function getProgramManifest(programId) {
    const program = getProgram(programId);
    return program ? (program.manifest || {}) : {};
  }

  function getCutoffPeriod() {
    return getManifest()?.cutoff?.institutional_cutoff_period || null;
  }

  function getGlobalValidPeriods() {
    return getManifest()?.valid_periods_global || [];
  }

  function matchAny(text, words) {
    const normalized = normalizeText(text);
    return words.some((word) => normalized.includes(normalizeText(word)));
  }

  function isGreeting(text) {
    return matchAny(text, GREETINGS);
  }

  function isThanks(text) {
    return matchAny(text, THANKS);
  }

  function detectProgram(text) {
    const fromText = Config.resolveProgramFromText(text);
    return fromText || state.scopeProgramId || null;
  }

  function detectRawPeriod(text) {
    const match = String(text || '').match(PERIOD_REGEX);
    if (!match) return null;
    return `${match[1]}-${match[2]}`;
  }

  function detectNamedPeriod(text, programId) {
    const normalized = normalizeText(text);
    const periods = programId ? Data.listPeriods(programId) : getGlobalValidPeriods();
    if (!periods.length) return null;

    if (/ultimo|último|reciente|actual|vigente|mas reciente|más reciente/.test(normalized)) {
      return periods[periods.length - 1] || null;
    }

    const monthMap = {
      enero: '01', ene: '01',
      febrero: '02', feb: '02',
      marzo: '03', mar: '03',
      abril: '04', abr: '04',
      mayo: '05', may: '05',
      junio: '06', jun: '06',
      julio: '07', jul: '07',
      agosto: '08', ago: '08',
      septiembre: '09', setiembre: '09', sep: '09',
      octubre: '10', oct: '10',
      noviembre: '11', nov: '11',
      diciembre: '12', dic: '12'
    };
    const yearMatch = normalized.match(/20\d{2}/);
    const year = yearMatch ? yearMatch[0] : null;
    if (!year) return null;
    for (const [token, month] of Object.entries(monthMap)) {
      if (normalized.includes(token)) {
        const candidate = `${year}-${month}`;
        if (periods.includes(candidate)) return candidate;
      }
    }
    return null;
  }

  function resolvePeriodInfo(text, programId) {
    const requestedRawPeriod = detectRawPeriod(text);
    const explicitNamedPeriod = detectNamedPeriod(text, programId);
    const candidate = explicitNamedPeriod || requestedRawPeriod || null;
    const validPeriods = programId ? Data.listPeriods(programId) : getGlobalValidPeriods();
    const latestValid = validPeriods[validPeriods.length - 1] || getCutoffPeriod() || null;

    if (!candidate) {
      return { requested: null, effective: latestValid, invalid: false, validPeriods, latestValid };
    }

    if (validPeriods.includes(candidate)) {
      return { requested: candidate, effective: candidate, invalid: false, validPeriods, latestValid };
    }

    return { requested: candidate, effective: latestValid, invalid: true, validPeriods, latestValid };
  }

  function detectIntent(text) {
    const normalized = normalizeText(text);
    if (/compar|versus| vs |diferencia|frente a/.test(normalized)) return 'comparacion';
    if (/falla|fallando|rezago|rezagos|alerta|alertas|debajo|bajo meta|no estan llegando|no están llegando|riesgo/.test(normalized)) return 'alerta';
    if (/tendencia|evolucion|evolución|comparado con|vs mes anterior|mes anterior|cambio/.test(normalized)) return 'tendencia';
    if (/territorio|territorios|municipio|municipios|zona|zonas|sector|sectores|tema|temas|material|materiales/.test(normalized)) return 'territorio';
    if (/indicador|indicadores|meta|metas|cumplimiento|avance|como va|cómo va/.test(normalized)) return 'indicadores';
    if (/resumen|resume|resumir|panorama|estado general|situacion|situación/.test(normalized)) return 'resumen';
    return 'search';
  }

  function looksOffTopic(text) {
    const normalized = normalizeText(text);
    if (!normalized) return false;
    if (OFFTOPIC_HINTS.some((word) => normalized.includes(normalizeText(word)))) return true;
    const searchHits = Data.search(text, { latestOnly: true, limit: 3 });
    const program = Config.resolveProgramFromText(text);
    const hasDashboardSignals = /programa|indicador|meta|avance|periodo|período|mes|material|municipio|resultado|dashboard|aala/.test(normalized);
    return !hasDashboardSignals && !program && searchHits.length === 0;
  }

  function getProgramScope(question) {
    const programId = detectProgram(question);
    if (programId) return [programId];
    return Data.getPrograms().map((item) => item.id);
  }

  function getMonthlyRow(programId, periodKey) {
    const program = getProgram(programId);
    if (!program) return null;
    if (periodKey) {
      return program.monthly.find((row) => row.period_key === periodKey && row.dataset_kind === 'monthly_total')
        || program.monthly.find((row) => row.period_key === periodKey)
        || null;
    }
    return program.latest_monthly[0] || null;
  }

  function getIndicatorRows(programId, periodKey) {
    const program = getProgram(programId);
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

  function formatValueWithUnit(value, unit, field) {
    const num = toNumber(value);
    if (num == null) return null;
    const normalizedUnit = normalizeText(unit || '');
    const key = normalizeText(field || '');
    if (normalizedUnit === 'gtq' || /ingreso|venta|capital|q_mes|q$/.test(key)) return formatCurrency(num);
    if (normalizedUnit === '%' || key.startsWith('pct')) return formatPercent(num);
    return `${formatNumber(num)}${unit ? ` ${unit}` : ''}`;
  }

  function pickSummaryMetrics(programId, periodKey) {
    const manifestProgram = getProgramManifest(programId);
    const latestPeriod = manifestProgram.latest_valid_period || null;
    if (periodKey && periodKey === latestPeriod && Array.isArray(manifestProgram.summary_metrics) && manifestProgram.summary_metrics.length) {
      return manifestProgram.summary_metrics.slice(0, 4).map((item) => ({
        field: item.field,
        label: item.label || humanizeKey(item.field),
        value: item.value
      }));
    }

    const monthly = getMonthlyRow(programId, periodKey);
    const values = monthly ? (monthly.values || {}) : {};
    const preferred = PROGRAM_HIGHLIGHTS[programId] || [];
    const metrics = [];

    preferred.forEach((field) => {
      const value = toNumber(values[field]);
      if (value != null) metrics.push({ field, label: humanizeKey(field), value });
    });

    if (metrics.length >= 3) return metrics.slice(0, 4);

    Object.entries(values).forEach(([field, value]) => {
      if (metrics.some((item) => item.field === field)) return;
      const numeric = toNumber(value);
      if (numeric == null || numeric === 0) return;
      if (/meta_|pct_|esperado_|anio|mes_num|periodo|latest|aporta|is_latest|activo/i.test(field)) return;
      metrics.push({ field, label: humanizeKey(field), value: numeric });
    });

    return metrics.slice(0, 4);
  }

  function normalizeIndicatorStatus(status) {
    const normalized = normalizeText(status || '');
    if (normalized.includes('rojo') || normalized.includes('alerta')) return 'rojo';
    if (normalized.includes('amarillo') || normalized.includes('riesgo')) return 'amarillo';
    if (normalized.includes('verde') || normalized.includes('cumple') || normalized.includes('positivo')) return 'verde';
    return normalized || null;
  }

  function findIndicatorByQuestion(question, rows) {
    const normalizedQuestion = normalizeText(question);
    const ranked = rows.map((row) => {
      const haystack = normalizeText([
        row.indicator_name,
        row.indicator_id,
        row.values?.indicador_nombre,
        row.values?.subindicador_id,
        row.values?.human_summary,
        row.values?.note
      ].filter(Boolean).join(' '));
      let score = 0;
      normalizedQuestion.split(' ').filter(Boolean).forEach((term) => {
        if (term.length < 3) return;
        if (haystack.includes(term)) score += 2;
      });
      return { row, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    return ranked[0] ? ranked[0].row : null;
  }

  function getAlertRows(programId, periodKey) {
    const manifestProgram = getProgramManifest(programId);
    const latestPeriod = manifestProgram.latest_valid_period || null;
    if ((!periodKey || periodKey === latestPeriod) && manifestProgram.indicators?.alerts) {
      return clone(manifestProgram.indicators.alerts || []);
    }
    return getIndicatorRows(programId, periodKey)
      .filter((row) => {
        const status = normalizeIndicatorStatus(row.status);
        const pct = toNumber(row.values?.pct_vs_esperado ?? row.values?.pct_meta_anual);
        return status === 'rojo' || status === 'amarillo' || (pct != null && pct < 100);
      })
      .sort((a, b) => {
        const ap = toNumber(a.values?.pct_vs_esperado ?? a.values?.pct_meta_anual);
        const bp = toNumber(b.values?.pct_vs_esperado ?? b.values?.pct_meta_anual);
        return (ap ?? 999) - (bp ?? 999);
      });
  }

  function getPositiveRows(programId, periodKey) {
    const manifestProgram = getProgramManifest(programId);
    const latestPeriod = manifestProgram.latest_valid_period || null;
    if ((!periodKey || periodKey === latestPeriod) && manifestProgram.indicators?.positives) {
      return clone(manifestProgram.indicators.positives || []);
    }
    return getIndicatorRows(programId, periodKey)
      .filter((row) => {
        const status = normalizeIndicatorStatus(row.status);
        const pct = toNumber(row.values?.pct_vs_esperado ?? row.values?.pct_meta_anual);
        return status === 'verde' || (pct != null && pct >= 100);
      })
      .sort((a, b) => {
        const ap = toNumber(a.values?.pct_vs_esperado ?? a.values?.pct_meta_anual);
        const bp = toNumber(b.values?.pct_vs_esperado ?? b.values?.pct_meta_anual);
        return (bp ?? -999) - (ap ?? -999);
      });
  }

  function buildIndicatorHumanSummary(row) {
    if (!row) return '';
    if (row.human_summary) return cleanNarrative(row.human_summary);
    if (row.values?.human_summary) return cleanNarrative(row.values.human_summary);

    const indicatorName = row.indicator_name || row.indicator_id || 'El indicador';
    const value = row.value_month ?? row.values?.valor_mes ?? row.values?.valor ?? row.values?.valor_acumulado;
    const target = row.target_month ?? row.values?.meta_mes ?? row.values?.meta_mensual ?? row.target_year ?? row.values?.meta_anual;
    const pct = row.pct_vs_expected ?? row.values?.pct_vs_esperado ?? row.pct_meta_year ?? row.values?.pct_meta_anual;
    const unit = row.unit || row.values?.unidad || '';
    const status = normalizeIndicatorStatus(row.status);

    const parts = [`${indicatorName} reporta ${formatValueWithUnit(value, unit, row.indicator_id) || formatNumber(value) || 'sin dato visible'}`];
    if (target != null) parts.push(`frente a una meta de ${formatValueWithUnit(target, unit, row.indicator_id)}`);
    if (pct != null) parts.push(`equivale a ${formatPercent(Math.abs(pct) <= 1.5 ? pct * 100 : pct)} del esperado`);
    if (status === 'rojo') parts.push('y hoy aparece como alerta');
    if (status === 'amarillo') parts.push('y conviene darle seguimiento cercano');
    if (status === 'verde') parts.push('y muestra un comportamiento favorable');
    return `${parts.join(' ')}.`;
  }

  function pickContextNotes(programId) {
    const manifestProgram = getProgramManifest(programId);
    const notes = Array.isArray(manifestProgram.narratives?.context_notes)
      ? manifestProgram.narratives.context_notes.filter(isUsefulContextNote).slice(0, 2)
      : [];
    return notes.map((note) => cleanNarrative(note)).filter(Boolean);
  }

  function buildInvalidPeriodMessage(periodInfo, programId) {
    if (!periodInfo.invalid) return null;
    const label = periodInfo.requested ? describePeriod(periodInfo.requested) || periodInfo.requested : 'ese período';
    const latest = periodInfo.latestValid ? describePeriod(periodInfo.latestValid) : null;
    const scope = programId ? `para ${getProgramName(programId)}` : 'para el chatbot';
    const validRange = periodInfo.validPeriods.length
      ? `Ahora mismo solo tengo habilitados ${humanList(periodInfo.validPeriods.map((item) => describePeriod(item)).filter(Boolean))}.`
      : '';
    return `${label} no está habilitado ${scope}. ${latest ? `Voy a responder con el corte válido más reciente, ${latest}.` : ''} ${validRange}`.trim();
  }

  function buildProgramSummary(programId, periodKey) {
    const program = getProgram(programId);
    if (!program) return null;
    const effectivePeriod = periodKey || program.latest_period;
    const manifestProgram = program.manifest || {};
    const narratives = manifestProgram.narratives || {};
    const metrics = pickSummaryMetrics(programId, effectivePeriod);
    const positives = getPositiveRows(programId, effectivePeriod).slice(0, 2).map(buildIndicatorHumanSummary).filter(Boolean);
    const alerts = getAlertRows(programId, effectivePeriod).slice(0, 3).map(buildIndicatorHumanSummary).filter(Boolean);
    const contextNotes = pickContextNotes(programId);
    const monthly = getMonthlyRow(programId, effectivePeriod);
    const monthlyValues = monthly ? (monthly.values || {}) : {};

    const blocks = [];
    const executive = cleanNarrative(effectivePeriod === manifestProgram.latest_valid_period ? narratives.executive_summary : '');
    if (executive) {
      blocks.push(executive);
    } else if (metrics.length) {
      blocks.push(`${getProgramName(programId)} en ${describePeriod(effectivePeriod)} muestra como lectura rápida ${metrics.map((item) => `${item.label}: ${formatValueWithUnit(item.value, '', item.field) || formatNumber(item.value)}`).join(', ')}.`);
    }

    if (metrics.length) {
      blocks.push(`Lo más visible en este corte es ${humanList(metrics.slice(0, 3).map((item) => `${item.label} con ${formatValueWithUnit(item.value, '', item.field) || formatNumber(item.value)}`))}.`);
    }

    if (positives.length) {
      blocks.push(`Lo que va mejor es lo siguiente: ${positives.join(' ')}`);
    }

    if (alerts.length) {
      blocks.push(`Lo que más atención requiere es esto: ${alerts.join(' ')}`);
    } else {
      blocks.push(`No veo alertas fuertes reportadas para ${getProgramName(programId)} en ${describePeriod(effectivePeriod)}.`);
    }

    if (effectivePeriod === manifestProgram.latest_valid_period) {
      const goodText = Array.isArray(narratives.what_is_going_well) ? narratives.what_is_going_well.map(cleanNarrative).filter(Boolean) : [];
      const attentionText = Array.isArray(narratives.what_needs_attention) ? narratives.what_needs_attention.map(cleanNarrative).filter(Boolean) : [];
      if (!positives.length && goodText.length) blocks.push(`Entre los avances reportados destacan ${humanList(goodText.slice(0, 2))}.`);
      if (!alerts.length && attentionText.length) blocks.push(`Aun así conviene dar seguimiento a ${humanList(attentionText.slice(0, 2))}.`);
    }

    if (monthlyValues.contexto_texto && !contextNotes.length) {
      const cleanContext = cleanNarrative(monthlyValues.contexto_texto);
      if (cleanContext) blocks.push(`Contexto útil: ${cleanContext}`);
    } else if (contextNotes.length) {
      blocks.push(`Contexto útil: ${contextNotes.join(' ')}`);
    }

    return {
      title: `${getProgramName(programId)} · ${describePeriod(effectivePeriod) || 'Sin período'}`,
      text: blocks.filter(Boolean).join('\n\n'),
      meta: { programId, periodKey: effectivePeriod }
    };
  }

  function buildAlertsAnswer(programIds, periodKey) {
    const parts = [];
    const metaPrograms = [];

    programIds.forEach((programId) => {
      const program = getProgram(programId);
      if (!program) return;
      const effectivePeriod = periodKey || program.latest_period;
      const alerts = getAlertRows(programId, effectivePeriod).slice(0, 3);
      if (!alerts.length) return;
      metaPrograms.push(programId);
      const intro = `${getProgramName(programId)} en ${describePeriod(effectivePeriod)} tiene ${alerts.length} frente(s) que merecen seguimiento.`;
      const detail = alerts.map((row) => buildIndicatorHumanSummary(row)).filter(Boolean).join(' ');
      parts.push(`${intro} ${detail}`.trim());
    });

    if (!parts.length) {
      return {
        title: 'Alertas y rezagos',
        text: 'Con el corte válido que hoy tiene cargado el chatbot, no veo alertas fuertes suficientes para afirmar que un programa esté en rojo general. Aun así, vale la pena revisar cada indicador puntual si quieres bajar a más detalle.',
        meta: { programs: programIds, periodKey: periodKey || null }
      };
    }

    return {
      title: 'Alertas y rezagos',
      text: parts.join('\n\n'),
      meta: { programs: metaPrograms, periodKey: periodKey || null }
    };
  }

  function buildIndicatorsAnswer(programId, periodKey, question) {
    const effectivePeriod = periodKey || getProgram(programId)?.latest_period || null;
    const indicatorRows = getIndicatorRows(programId, effectivePeriod);
    if (!indicatorRows.length) return null;

    const specific = findIndicatorByQuestion(question, indicatorRows);
    if (specific) {
      const humanSummary = buildIndicatorHumanSummary(specific);
      const value = specific.values?.valor_mes ?? specific.values?.valor ?? specific.values?.valor_acumulado;
      const target = specific.values?.meta_mes ?? specific.values?.meta_mensual ?? specific.values?.meta_anual;
      const pct = specific.values?.pct_vs_esperado ?? specific.values?.pct_meta_anual;
      const detailBits = [];
      if (value != null) detailBits.push(`valor reportado ${formatValueWithUnit(value, specific.unit, specific.indicator_id)}`);
      if (target != null) detailBits.push(`meta ${formatValueWithUnit(target, specific.unit, specific.indicator_id)}`);
      if (pct != null) detailBits.push(`avance ${formatPercent(pct)}`);
      return {
        title: `${specific.indicator_name || specific.indicator_id} · ${getProgramName(programId)}`,
        text: `${humanSummary}${detailBits.length ? `\n\nEn números, el corte de ${describePeriod(effectivePeriod)} muestra ${detailBits.join(', ')}.` : ''}`,
        meta: { programId, periodKey: effectivePeriod }
      };
    }

    const top = indicatorRows.slice(0, 6).map((row) => buildIndicatorHumanSummary(row)).filter(Boolean);
    return {
      title: `Indicadores de ${getProgramName(programId)}`,
      text: `Tomando ${describePeriod(effectivePeriod)} como referencia, esta es la lectura más útil que te puedo dar:\n\n${top.join('\n\n')}`,
      meta: { programId, periodKey: effectivePeriod }
    };
  }

  function buildComparisonAnswer(periodKey) {
    const blocks = [];
    const programs = Data.getPrograms().map((item) => item.id);
    const snapshots = [];

    programs.forEach((programId) => {
      const program = getProgram(programId);
      if (!program) return;
      const effectivePeriod = periodKey || program.latest_period;
      const metrics = pickSummaryMetrics(programId, effectivePeriod).slice(0, 2);
      const alerts = getAlertRows(programId, effectivePeriod);
      const positives = getPositiveRows(programId, effectivePeriod);
      snapshots.push({ programId, effectivePeriod, metrics, alertsCount: alerts.length, positivesCount: positives.length });
      const metricText = metrics.length
        ? metrics.map((item) => `${item.label}: ${formatValueWithUnit(item.value, '', item.field) || formatNumber(item.value)}`).join(' · ')
        : 'sin métricas resumidas visibles';
      const tone = alerts.length ? `${alerts.length} alerta(s) relevantes` : 'sin alertas fuertes visibles';
      blocks.push(`${getProgramName(programId)} (${describePeriod(effectivePeriod)}): ${metricText}. En lectura rápida, queda ${tone}.`);
    });

    if (!snapshots.length) return null;

    snapshots.sort((a, b) => (b.alertsCount - a.alertsCount) || (b.positivesCount - a.positivesCount));
    const mostAttention = snapshots[0];
    const mostStable = [...snapshots].sort((a, b) => (a.alertsCount - b.alertsCount) || (b.positivesCount - a.positivesCount))[0];

    const closing = [];
    if (mostAttention) closing.push(`El programa que hoy merece más seguimiento es ${getProgramName(mostAttention.programId)}.`);
    if (mostStable) closing.push(`El que luce más estable en su corte válido es ${getProgramName(mostStable.programId)}.`);

    return {
      title: 'Comparación entre programas',
      text: `${blocks.join('\n\n')}\n\n${closing.join(' ')}`,
      meta: { programs, periodKey: periodKey || null }
    };
  }

  function aggregateDimensionRows(rows) {
    const bucket = new Map();
    rows.forEach((row) => {
      const label = row.primary_dimension_value;
      if (!label) return;
      const numericEntries = Object.entries(row.values || {})
        .map(([key, value]) => ({ key, value: toNumber(value) }))
        .filter((item) => item.value != null && item.value !== 0);
      if (!numericEntries.length) return;
      numericEntries.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      const strongest = numericEntries[0];
      if (!bucket.has(label)) {
        bucket.set(label, { label, key: strongest.key, total: 0 });
      }
      const item = bucket.get(label);
      item.total += strongest.value;
      item.key = strongest.key;
    });
    return Array.from(bucket.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total)).slice(0, 5);
  }

  function buildTerritoryAnswer(programId, periodKey) {
    const program = getProgram(programId);
    if (!program) return null;
    const effectivePeriod = periodKey || program.latest_period;
    const rows = program.details.filter((row) => row.period_key === effectivePeriod && row.primary_dimension_value)
      .concat(program.monthly.filter((row) => row.period_key === effectivePeriod && row.primary_dimension_value));
    const grouped = aggregateDimensionRows(rows);
    if (!grouped.length) return null;
    const text = grouped.map((item) => `${sentenceCase(item.label)}: ${formatNumber(item.total)} en ${humanizeKey(item.key)}`).join(' · ');
    return {
      title: `Detalle territorial o temático de ${getProgramName(programId)}`,
      text: `Para ${describePeriod(effectivePeriod)}, lo que más resalta es ${text}.`,
      meta: { programId, periodKey: effectivePeriod }
    };
  }

  function buildTrendAnswer(programId, periodKey) {
    const currentPeriod = periodKey || getProgram(programId)?.latest_period || null;
    const previousPeriod = getPreviousPeriod(programId, currentPeriod);
    if (!currentPeriod || !previousPeriod) return null;

    const current = getMonthlyRow(programId, currentPeriod);
    const previous = getMonthlyRow(programId, previousPeriod);
    if (!current || !previous) return null;

    const keys = PROGRAM_HIGHLIGHTS[programId] || [];
    const deltas = keys.map((key) => {
      const currentValue = toNumber(current.values?.[key]);
      const previousValue = toNumber(previous.values?.[key]);
      if (currentValue == null || previousValue == null) return null;
      return { key, currentValue, previousValue, delta: currentValue - previousValue };
    }).filter(Boolean).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 4);

    if (!deltas.length) return null;

    const sentences = deltas.map((item) => {
      const direction = item.delta > 0 ? 'subió' : item.delta < 0 ? 'bajó' : 'se mantuvo';
      const magnitude = item.delta === 0 ? formatValueWithUnit(item.currentValue, '', item.key) || formatNumber(item.currentValue) : formatValueWithUnit(Math.abs(item.delta), '', item.key) || formatNumber(Math.abs(item.delta));
      return `${humanizeKey(item.key)} ${direction} ${item.delta === 0 ? `en ${magnitude}` : magnitude}`;
    });

    return {
      title: `Tendencia de ${getProgramName(programId)}`,
      text: `Si comparo ${describePeriod(previousPeriod)} contra ${describePeriod(currentPeriod)}, veo que ${sentences.join(' · ')}.`,
      meta: { programId, periodKey: currentPeriod, comparisonPeriodKey: previousPeriod }
    };
  }

  function buildSearchAnswer(question, programIds, periodKey) {
    const hits = Data.search(question, { latestOnly: !periodKey, limit: Config.DATA.maxSearchResults || 25 });
    const filtered = hits.filter((row) => programIds.includes(row.program_id)).filter((row) => !periodKey || row.period_key === periodKey);
    if (!filtered.length) return null;

    const first = filtered[0];
    if (first.dataset_kind === 'indicator' || first.dataset_kind === 'indicator_chart') {
      return buildIndicatorsAnswer(first.program_id, periodKey || first.period_key, question);
    }

    if (first.program_id) {
      return buildProgramSummary(first.program_id, periodKey || first.period_key);
    }

    return null;
  }

  function buildOffTopicAnswer() {
    const cutoff = getCutoffPeriod();
    return {
      title: '',
      text: `${Config.FALLBACKS.offTopic} ${cutoff ? `Ahorita además estoy limitado al corte válido ${describePeriod(cutoff)}.` : ''}`.trim(),
      meta: {}
    };
  }

  function buildLocalAnswer(question) {
    const text = String(question || '').trim();
    if (!text) {
      return { title: '', text: Config.FALLBACKS.ambiguous, meta: {} };
    }
    if (isGreeting(text)) {
      const cutoff = getCutoffPeriod();
      return {
        title: '',
        text: `${Config.APP.greeting} ${cutoff ? `Estoy respondiendo con el corte válido de ${describePeriod(cutoff)}.` : ''} Puedes pedirme resúmenes, alertas, comparaciones, tendencias o detalle por programa.`,
        meta: {}
      };
    }
    if (isThanks(text)) {
      return { title: '', text: 'Con gusto. Si quieres, ahora puedo bajarlo a un programa, un indicador o un período específico.', meta: {} };
    }
    if (looksOffTopic(text)) {
      return buildOffTopicAnswer();
    }

    const programId = detectProgram(text);
    const programIds = getProgramScope(text);
    const periodInfo = resolvePeriodInfo(text, programId);
    const intent = detectIntent(text);
    const invalidPeriodMessage = buildInvalidPeriodMessage(periodInfo, programId);

    let response = null;
    if (intent === 'comparacion') {
      response = buildComparisonAnswer(periodInfo.effective);
    } else if (intent === 'alerta') {
      response = buildAlertsAnswer(programIds, periodInfo.effective);
    } else if (programId && intent === 'tendencia') {
      response = buildTrendAnswer(programId, periodInfo.effective);
    } else if (programId && intent === 'territorio') {
      response = buildTerritoryAnswer(programId, periodInfo.effective) || buildProgramSummary(programId, periodInfo.effective);
    } else if (programId && intent === 'indicadores') {
      response = buildIndicatorsAnswer(programId, periodInfo.effective, text);
    } else if (programId && intent === 'resumen') {
      response = buildProgramSummary(programId, periodInfo.effective);
    } else if (!programId && intent === 'resumen') {
      response = buildComparisonAnswer(periodInfo.effective);
    }

    if (!response) {
      response = buildSearchAnswer(text, programIds, periodInfo.effective);
    }
    if (!response && programId) {
      response = buildProgramSummary(programId, periodInfo.effective);
    }
    if (!response) {
      response = { title: '', text: Config.FALLBACKS.noData, meta: { programId: programId || null, periodKey: periodInfo.effective || null } };
    }

    if (invalidPeriodMessage) {
      response.text = `${invalidPeriodMessage}\n\n${response.text}`;
    }

    return response;
  }

  async function buildAnswer(question) {
    if (Config.MODEL.backendEnabled && Config.MODEL.endpoint) {
      try {
        const programId = detectProgram(question);
        const periodInfo = resolvePeriodInfo(question, programId);
        const context = Data.buildContext({
          programId,
          periodKey: periodInfo.effective,
          latestOnly: !periodInfo.requested,
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
        right:26px;
        bottom:24px;
        z-index:1200;
        font-family:var(--font-body,'Sora',system-ui,sans-serif)
      }

      .aala-chatbot-launcher{
        width:68px;
        height:68px;
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
        font-size:27px;
        line-height:1
      }

      .aala-chatbot-launcher span:last-child{
        display:none
      }

      .aala-chatbot-panel{
        width:min(540px,calc(100vw - 30px));
        height:min(760px,82vh);
        background:#ffffff;
        border:1px solid rgba(19,72,86,.10);
        border-radius:24px;
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
        padding:16px 18px 12px;
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
        width:44px;
        height:44px;
        border-radius:999px;
        flex:0 0 44px;
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
        font-size:1.04rem;
        line-height:1.2;
        margin:0;
        color:#1b7f76;
        font-weight:700
      }

      .aala-chatbot-head p{
        font-size:.8rem;
        color:#5f6f78;
        line-height:1.45;
        margin:4px 0 0
      }

      .aala-chatbot-head-actions{
        display:flex;
        align-items:center;
        gap:8px
      }

      .aala-chatbot-reset,
      .aala-chatbot-close{
        border:0;
        background:#f1f5f7;
        color:#47626c;
        border-radius:10px;
        width:34px;
        height:34px;
        font-size:18px;
        cursor:pointer;
        line-height:1
      }

      .aala-chatbot-reset:hover,
      .aala-chatbot-close:hover{
        background:#e7eef1
      }

      .aala-chatbot-status{
        padding:8px 18px 0;
        font-size:.76rem;
        color:#78909a;
        background:#ffffff;
        min-height:26px
      }

      .aala-chatbot-body{
        flex:1;
        overflow:auto;
        padding:16px 16px 12px;
        background:linear-gradient(180deg,#f6f7f8 0%,#f2f5f7 100%)
      }

      .aala-chatbot-row{
        display:flex;
        align-items:flex-end;
        gap:8px;
        margin-bottom:14px
      }

      .aala-chatbot-row.user{
        justify-content:flex-end
      }

      .aala-chatbot-mini-avatar{
        width:32px;
        height:32px;
        border-radius:999px;
        flex:0 0 32px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:.78rem;
        font-weight:700;
        color:#ffffff;
        background:linear-gradient(135deg,#d88662 0%,#1b7f76 100%)
      }

      .aala-chatbot-msg{
        max-width:88%;
        padding:14px 15px;
        border-radius:20px;
        line-height:1.62;
        font-size:.95rem;
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
        color:#1b7f76;
        font-size:.95rem
      }

      .aala-chatbot-meta{
        display:flex;
        flex-wrap:wrap;
        gap:6px;
        margin-top:10px
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
        padding:0 16px 12px;
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        background:linear-gradient(180deg,#f2f5f7 0%,#ffffff 60%)
      }

      .aala-chatbot-suggestions.is-hidden{
        display:none
      }

      .aala-chatbot-suggestion{
        border:1px solid #d9e6eb;
        background:#ffffff;
        color:#35535f;
        border-radius:999px;
        padding:8px 12px;
        font-size:.79rem;
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
        min-height:50px;
        max-height:150px;
        resize:none;
        border:1px solid #d9e5ea;
        border-radius:16px;
        padding:13px 14px;
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
        padding:12px 16px;
        font-weight:700;
        cursor:pointer;
        min-width:88px;
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

      .aala-chatbot-loader span:nth-child(2){ animation-delay:.15s }
      .aala-chatbot-loader span:nth-child(3){ animation-delay:.3s }

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
          height:min(82vh,760px)
        }

        .aala-chatbot-launcher{
          margin-left:auto
        }

        .aala-chatbot-msg{
          max-width:91%
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
            <button type="button" class="aala-chatbot-reset" aria-label="Reiniciar chat">↺</button>
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
    state.elements.reset = root.querySelector('.aala-chatbot-reset');
    state.elements.status = root.querySelector('.aala-chatbot-status');
    state.elements.body = root.querySelector('.aala-chatbot-body');
    state.elements.suggestions = root.querySelector('.aala-chatbot-suggestions');
    state.elements.form = root.querySelector('.aala-chatbot-form');
    state.elements.input = root.querySelector('.aala-chatbot-input');
    state.elements.send = root.querySelector('.aala-chatbot-send');
  }

  function scrollToBottom() {
    state.elements.body.scrollTop = state.elements.body.scrollHeight;
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
      return;
    }

    if (!state.dataLoaded) {
      state.elements.status.textContent = Config.APP.errorLabel;
      return;
    }

    const cutoff = getCutoffPeriod();
    const latestLabel = cutoff ? `Corte válido del bot: ${describePeriod(cutoff)}.` : 'Datos listos.';
    state.elements.status.textContent = latestLabel;
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

  function clearBody() {
    state.elements.body.innerHTML = '';
    state.messages = [];
  }

  function setSuggestionsHidden(hidden) {
    state.elements.suggestions.classList.toggle('is-hidden', !!hidden);
  }

  function renderSuggestions(programId) {
    if (!Config.UX.showSuggestedQuestions) return;
    if (state.hasUserInteracted) {
      state.elements.suggestions.innerHTML = '';
      setSuggestionsHidden(true);
      return;
    }
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
    setSuggestionsHidden(false);
  }

  function updateScopeFromQuestion(question) {
    const programId = Config.resolveProgramFromText(question);
    if (programId) state.scopeProgramId = programId;
  }

  function autoGrowTextarea() {
    const el = state.elements.input;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }

  function renderWelcomeMessages() {
    const cutoff = getCutoffPeriod();
    pushMessage('bot', Config.APP.greeting, '', {});
    if (state.dataLoaded) {
      const cutoffText = cutoff
        ? `Responderé usando únicamente el corte válido ${describePeriod(cutoff)} y los períodos habilitados para cada programa.`
        : 'Responderé usando solo los CSV publicados y cargados en el dashboard.';
      pushMessage('bot', `${cutoffText} Puedes preguntarme por resúmenes, alertas, comparaciones, indicadores o tendencias.`, 'Datos listos', {});
    }
  }

  function resetConversation(options) {
    const opts = options || {};
    state.requestToken += 1;
    state.busy = false;
    state.scopeProgramId = null;
    state.hasUserInteracted = false;
    state.elements.send.disabled = false;
    state.elements.input.disabled = false;
    state.elements.input.value = '';
    state.elements.input.style.height = 'auto';
    clearBody();
    renderWelcomeMessages();
    renderSuggestions(null);
    setBusy(false);
    if (!opts.keepClosed) setOpen(true);
  }

  async function handleUserMessage(question) {
    const text = String(question || '').trim();
    if (!text || state.busy) return;

    const requestToken = ++state.requestToken;
    state.hasUserInteracted = true;
    setSuggestionsHidden(true);
    state.elements.suggestions.innerHTML = '';
    updateScopeFromQuestion(text);
    pushMessage('user', text, '', {});
    if (Config.UX.clearInputOnSend) state.elements.input.value = '';
    autoGrowTextarea();
    setBusy(true);

    try {
      const answer = await buildAnswer(text);
      if (requestToken !== state.requestToken) return;
      pushMessage('bot', answer.text || Config.FALLBACKS.noData, answer.title || '', answer.meta || {});
    } catch (error) {
      if (requestToken !== state.requestToken) return;
      console.error(error);
      pushMessage('bot', Config.APP.errorLabel, '', {});
    } finally {
      if (requestToken === state.requestToken) {
        setBusy(false);
        state.elements.input.focus();
      }
    }
  }

  function bindEvents() {
    state.elements.launcher.addEventListener('click', () => setOpen(true));
    state.elements.close.addEventListener('click', () => {
      resetConversation({ keepClosed: true });
      setOpen(false);
    });
    state.elements.reset.addEventListener('click', () => resetConversation({ keepClosed: false }));
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
    setBusy(true);

    try {
      await bootstrapData();
      setBusy(false);
      resetConversation({ keepClosed: true });
    } catch (error) {
      console.error(error);
      state.dataLoaded = false;
      clearBody();
      pushMessage('bot', Config.APP.errorLabel, '', {});
      setBusy(false);
    }

    state.initialized = true;
  }

  global.AALAChatbot = {
    init,
    open() { setOpen(true); },
    close() {
      resetConversation({ keepClosed: true });
      setOpen(false);
    },
    reset() { resetConversation({ keepClosed: false }); },
    ask(question) { return handleUserMessage(question); },
    getState() {
      return clone({
        initialized: state.initialized,
        open: state.open,
        busy: state.busy,
        scopeProgramId: state.scopeProgramId,
        messages: state.messages,
        hasUserInteracted: state.hasUserInteracted
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
