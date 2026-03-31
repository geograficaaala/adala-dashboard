(function (global) {
  'use strict';

  const PROGRAMS = {
    atitlan_recicla: {
      id: 'atitlan_recicla',
      name: 'Atitlán Recicla',
      aliases: ['atitlan_recicla', 'cooperativa atitlán recicla', 'cooperativa atitlan recicla', 'atitlán recicla']
    },
    conservando_atitlan: {
      id: 'conservando_atitlan',
      name: 'Conservando Atitlán',
      aliases: ['conservando_atitlan', 'conservando atitlán', 'conservando atitlan']
    },
    educando_para_conservar: {
      id: 'educando_para_conservar',
      name: 'Educando para Conservar',
      aliases: ['educando_para_conservar', 'educando para conservar', 'epc']
    },
    fortalecimiento_municipal: {
      id: 'fortalecimiento_municipal',
      name: 'Fortalecimiento Municipal',
      aliases: ['fortalecimiento_municipal', 'fortalecimiento municipal', 'fm']
    },
    reforestacion: {
      id: 'reforestacion',
      name: 'Reforestando Atitlán',
      aliases: ['reforestacion', 'reforestación', 'reforestando atitlán', 'reforestando atitlan']
    }
  };

  const DATASETS = [
    { key: 'atitlan_total_mes', path: './data/total_mes.csv', kind: 'monthly_total', programId: 'atitlan_recicla' },
    { key: 'atitlan_indicadores', path: './data/institucional_indicadores.csv', kind: 'indicator', programId: 'atitlan_recicla' },
    { key: 'atitlan_zona_mes', path: './data/zona_mes.csv', kind: 'zone_monthly', programId: 'atitlan_recicla' },
    { key: 'atitlan_territorio_mes', path: './data/territorio_mes.csv', kind: 'territory_monthly', programId: 'atitlan_recicla' },
    { key: 'atitlan_materiales_resumen_mes', path: './data/materiales_resumen_mes.csv', kind: 'materials_monthly', programId: 'atitlan_recicla' },
    { key: 'atitlan_materiales_detalle', path: './data/materiales_detalle.csv', kind: 'materials_detail', programId: 'atitlan_recicla' },
    { key: 'atitlan_materiales_raw', path: './data/materiales_raw.csv', kind: 'materials_raw', programId: 'atitlan_recicla' },
    { key: 'atitlan_cdm_raw', path: './data/cdm_raw.csv', kind: 'cdm_raw', programId: 'atitlan_recicla' },
    { key: 'conservando_total_mes', path: './data/conservando_atitlan/total_mes.csv', kind: 'monthly_total', programId: 'conservando_atitlan' },
    { key: 'conservando_indicadores', path: './data/conservando_atitlan/institucional_indicadores.csv', kind: 'indicator', programId: 'conservando_atitlan' },
    { key: 'conservando_metadata', path: './data/conservando_atitlan/metadata_publicacion.csv', kind: 'metadata', programId: 'conservando_atitlan' },
    { key: 'epc_total_mes', path: './data/educando_para_conservar/total_mes.csv', kind: 'monthly_total', programId: 'educando_para_conservar' },
    { key: 'epc_indicadores', path: './data/educando_para_conservar/institucional_indicadores.csv', kind: 'indicator', programId: 'educando_para_conservar' },
    { key: 'epc_metadata', path: './data/educando_para_conservar/metadata_publicacion.csv', kind: 'metadata', programId: 'educando_para_conservar' },
    { key: 'fm_total_mes', path: './data/fortalecimiento_municipal/total_mes.csv', kind: 'monthly_total', programId: 'fortalecimiento_municipal' },
    { key: 'fm_indicadores', path: './data/fortalecimiento_municipal/institucional_indicadores.csv', kind: 'indicator', programId: 'fortalecimiento_municipal' },
    { key: 'fm_metadata', path: './data/fortalecimiento_municipal/metadata_publicacion.csv', kind: 'metadata', programId: 'fortalecimiento_municipal' },
    { key: 'fm_asistencias_sector_mes', path: './data/fortalecimiento_municipal/asistencias_sector_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal' },
    { key: 'fm_calidad_datos_mes', path: './data/fortalecimiento_municipal/calidad_datos_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal' },
    { key: 'fm_capacitaciones_municipio_mes', path: './data/fortalecimiento_municipal/capacitaciones_municipio_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal' },
    { key: 'fm_capacitaciones_tema_mes', path: './data/fortalecimiento_municipal/capacitaciones_tema_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal' },
    { key: 'fm_estudios_sector_mes', path: './data/fortalecimiento_municipal/estudios_sector_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal' },
    { key: 'fm_reuniones_tipo_mes', path: './data/fortalecimiento_municipal/reuniones_tipo_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal' },
    { key: 'fm_detalle_asistencias', path: './data/fortalecimiento_municipal/detalle_asistencias.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal' },
    { key: 'fm_detalle_capacitaciones', path: './data/fortalecimiento_municipal/detalle_capacitaciones.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal' },
    { key: 'fm_detalle_estudios', path: './data/fortalecimiento_municipal/detalle_estudios.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal' },
    { key: 'fm_detalle_pirdes', path: './data/fortalecimiento_municipal/detalle_pirdes.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal' },
    { key: 'fm_detalle_reuniones', path: './data/fortalecimiento_municipal/detalle_reuniones.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal' },
    { key: 'reforestacion_total_mes', path: './data/reforestacion/total_mes.csv', kind: 'monthly_total', programId: 'reforestacion' },
    { key: 'reforestacion_indicadores', path: './data/reforestacion/institucional_indicadores.csv', kind: 'indicator', programId: 'reforestacion' },
    { key: 'reforestacion_kpi_graficos', path: './data/reforestacion/kpi_graficos.csv', kind: 'indicator_chart', programId: 'reforestacion' },
    { key: 'reforestacion_metadata', path: './data/reforestacion/metadata_publicacion.csv', kind: 'metadata', programId: 'reforestacion' }
  ];

  const MONTHS = {
    1: 'Enero',
    2: 'Febrero',
    3: 'Marzo',
    4: 'Abril',
    5: 'Mayo',
    6: 'Junio',
    7: 'Julio',
    8: 'Agosto',
    9: 'Septiembre',
    10: 'Octubre',
    11: 'Noviembre',
    12: 'Diciembre'
  };

  const KIND_GROUPS = {
    monthly: new Set(['monthly_total', 'zone_monthly', 'territory_monthly', 'materials_monthly', 'detail_monthly']),
    indicator: new Set(['indicator', 'indicator_chart']),
    detail: new Set(['materials_detail', 'materials_raw', 'cdm_raw', 'detail_row']),
    metadata: new Set(['metadata'])
  };

  const state = {
    loaded: false,
    loading: null,
    loadedAt: null,
    version: '1.0.0',
    datasets: [],
    rows: [],
    collections: {
      monthly: [],
      indicators: [],
      metadata: [],
      details: []
    },
    programs: [],
    byProgram: {},
    latestByProgram: {},
    searchIndex: []
  };

  function stripAccents(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function normalizeText(value) {
    return stripAccents(value)
      .toLowerCase()
      .replace(/[_|/]+/g, ' ')
      .replace(/[^a-z0-9áéíóúüñ\s.-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toTitleMonth(monthNum) {
    return MONTHS[Number(monthNum)] || null;
  }

  function parseMaybeNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^(true|false)$/i.test(trimmed)) return /^true$/i.test(trimmed);
    if (/^(si|sí|no)$/i.test(trimmed)) return /^(si|sí)$/i.test(trimmed);
    const compact = trimmed.replace(/,/g, '');
    if (/^-?\d+(\.\d+)?$/.test(compact)) {
      const num = Number(compact);
      return Number.isFinite(num) ? num : value;
    }
    return value;
  }

  function cleanRow(row) {
    const out = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      const cleanKey = String(key || '').trim();
      if (!cleanKey) return;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        out[cleanKey] = trimmed === '' ? null : parseMaybeNumber(trimmed);
      } else {
        out[cleanKey] = parseMaybeNumber(value);
      }
    });
    return out;
  }

  async function fetchText(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
    return response.text();
  }

  function parseCsvText(text) {
    if (global.Papa && typeof global.Papa.parse === 'function') {
      const parsed = global.Papa.parse(text, { header: true, skipEmptyLines: 'greedy' });
      if (parsed.errors && parsed.errors.length) {
        const hardErrors = parsed.errors.filter((error) => error.code !== 'UndetectableDelimiter');
        if (hardErrors.length) throw new Error(hardErrors[0].message || 'Error parseando CSV');
      }
      return parsed.data || [];
    }
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = splitCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      return headers.reduce((acc, header, index) => {
        acc[header] = values[index] ?? null;
        return acc;
      }, {});
    });
  }

  function splitCsvLine(line) {
    const values = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"') {
        if (quoted && next === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === ',' && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  function inferProgramId(row, dataset) {
    const direct = row.program_id || row.programa_id || row.programa || dataset.programId || null;
    if (!direct) return null;
    const normalized = normalizeText(direct);
    const exact = Object.values(PROGRAMS).find((program) => normalizeText(program.id) === normalized);
    if (exact) return exact.id;
    const alias = Object.values(PROGRAMS).find((program) => program.aliases.some((item) => normalizeText(item) === normalized));
    if (alias) return alias.id;
    if (normalized.includes('atitlan') && normalized.includes('recicla')) return 'atitlan_recicla';
    if (normalized.includes('conservando')) return 'conservando_atitlan';
    if (normalized.includes('educando') || normalized === 'epc') return 'educando_para_conservar';
    if (normalized.includes('fortalecimiento')) return 'fortalecimiento_municipal';
    if (normalized.includes('reforest')) return 'reforestacion';
    return dataset.programId || normalized.replace(/\s+/g, '_');
  }

  function inferProgramName(row, dataset, programId) {
    const direct = row.program_name || row.programa_nombre || row.program_name || row.programa || null;
    if (direct && typeof direct === 'string' && direct.trim()) {
      if (normalizeText(direct) === normalizeText(programId)) return PROGRAMS[programId]?.name || direct;
      return direct.trim();
    }
    return PROGRAMS[programId]?.name || dataset.programId || null;
  }

  function inferYear(row) {
    if (row.anio != null) return Number(row.anio) || null;
    const period = row.periodo_clave || row.periodo || row.latest_period || row.first_period || null;
    if (period && /^\d{4}-\d{2}$/.test(String(period))) return Number(String(period).slice(0, 4));
    return null;
  }

  function inferMonthNum(row) {
    if (row.mes_num != null) return Number(row.mes_num) || null;
    const period = row.periodo_clave || row.periodo || row.latest_period || row.first_period || null;
    if (period && /^\d{4}-\d{2}$/.test(String(period))) return Number(String(period).slice(5, 7));
    const monthLabel = row.mes_label || row.mes_nombre || row.mes || row.latest_month_label || null;
    const map = {
      ene: 1,
      enero: 1,
      feb: 2,
      febrero: 2,
      mar: 3,
      marzo: 3,
      abr: 4,
      abril: 4,
      may: 5,
      mayo: 5,
      jun: 6,
      junio: 6,
      jul: 7,
      julio: 7,
      ago: 8,
      agosto: 8,
      sep: 9,
      sept: 9,
      septiembre: 9,
      oct: 10,
      octubre: 10,
      nov: 11,
      noviembre: 11,
      dic: 12,
      diciembre: 12
    };
    const normalized = normalizeText(monthLabel);
    return map[normalized] || null;
  }

  function inferPeriodKey(row, year, monthNum) {
    const direct = row.periodo_clave || row.periodo || row.latest_period || row.first_period || null;
    if (direct && /^\d{4}-\d{2}$/.test(String(direct))) return String(direct);
    if (year && monthNum) return `${String(year).padStart(4, '0')}-${String(monthNum).padStart(2, '0')}`;
    return null;
  }

  function inferMonthLabel(row, monthNum) {
    return row.mes_label || row.mes_nombre || row.latest_month_label || toTitleMonth(monthNum) || row.mes || null;
  }

  function inferLatestFlag(row) {
    const flags = [row.is_latest_data_month, row.tiene_datos_mes, row.has_any_data, row.aporta_metas_programa, row.aporta_metas_epc];
    if (flags.some((value) => value === true)) return !!row.is_latest_data_month;
    return !!row.is_latest_data_month;
  }

  function inferStatus(row) {
    return row.estatus || row.semaforo || row.estatus_reporte || row.estatus_texto_original || null;
  }

  function inferIndicatorId(row) {
    return row.indicator_id || row.indicador_id || row.subindicador_id || null;
  }

  function inferIndicatorName(row) {
    return row.indicador_nombre || row.indicador_grupo_nombre || null;
  }

  function inferUnit(row) {
    return row.unidad || null;
  }

  function inferPrimaryDimension(row) {
    const keys = ['territorio', 'municipio', 'municipios', 'zona', 'zona_codigo', 'sector', 'tema', 'tipo_reunion', 'tipo_estudio', 'tipo_asistencia', 'material', 'recolector'];
    for (const key of keys) {
      if (row[key] != null && row[key] !== '') return { key, value: row[key] };
    }
    return { key: null, value: null };
  }

  function buildSearchableText(dataset, normalized) {
    const fields = [
      dataset.key,
      dataset.kind,
      normalized.program_id,
      normalized.program_name,
      normalized.period_key,
      normalized.month_label,
      normalized.status,
      normalized.indicator_id,
      normalized.indicator_name,
      normalized.unit,
      normalized.primary_dimension_key,
      normalized.primary_dimension_value,
      ...Object.values(normalized.values || {})
    ];
    return normalizeText(fields.filter((value) => value != null).join(' | '));
  }

  function normalizeRecord(row, dataset, rowIndex) {
    const values = cleanRow(row);
    const programId = inferProgramId(values, dataset);
    const year = inferYear(values);
    const monthNum = inferMonthNum(values);
    const periodKey = inferPeriodKey(values, year, monthNum);
    const monthLabel = inferMonthLabel(values, monthNum);
    const primaryDimension = inferPrimaryDimension(values);
    const normalized = {
      id: `${dataset.key}::${rowIndex}`,
      row_index: rowIndex,
      dataset_key: dataset.key,
      dataset_kind: dataset.kind,
      source_path: dataset.path,
      program_id: programId,
      program_name: inferProgramName(values, dataset, programId),
      period_key: periodKey,
      year,
      month_num: monthNum,
      month_label: monthLabel,
      status: inferStatus(values),
      is_latest_data_month: inferLatestFlag(values),
      indicator_id: inferIndicatorId(values),
      indicator_name: inferIndicatorName(values),
      unit: inferUnit(values),
      category: values.categoria || null,
      source_label: values.fuente || values.fuente_texto || values.source_sheet || null,
      primary_dimension_key: primaryDimension.key,
      primary_dimension_value: primaryDimension.value,
      values
    };
    normalized.searchable_text = buildSearchableText(dataset, normalized);
    return normalized;
  }

  function comparePeriods(a, b) {
    const ay = Number(a.year || 0);
    const by = Number(b.year || 0);
    if (ay !== by) return ay - by;
    const am = Number(a.month_num || 0);
    const bm = Number(b.month_num || 0);
    if (am !== bm) return am - bm;
    return String(a.id).localeCompare(String(b.id), 'es');
  }

  function summarizeDatasetRows(dataset, rows) {
    const normalizedRows = rows.map((row, index) => normalizeRecord(row, dataset, index));
    return {
      ...dataset,
      rows: normalizedRows,
      count: normalizedRows.length,
      periods: unique(normalizedRows.map((row) => row.period_key).filter(Boolean)).sort(),
      programs: unique(normalizedRows.map((row) => row.program_id).filter(Boolean)).sort(),
      loadedAt: new Date().toISOString()
    };
  }

  function unique(items) {
    return Array.from(new Set(items));
  }

  async function loadDataset(dataset) {
    const text = await fetchText(dataset.path);
    const rows = parseCsvText(text).map(cleanRow);
    return summarizeDatasetRows(dataset, rows);
  }

  function buildProgramRegistry(datasetResults) {
    const ids = unique(datasetResults.flatMap((dataset) => dataset.programs)).filter(Boolean).sort();
    return ids.map((id) => ({ id, name: PROGRAMS[id]?.name || id }));
  }

  function groupByProgram(rows) {
    const output = {};
    rows.forEach((row) => {
      const programId = row.program_id || 'sin_programa';
      if (!output[programId]) {
        output[programId] = {
          id: programId,
          name: PROGRAMS[programId]?.name || row.program_name || programId,
          rows: [],
          monthly: [],
          indicators: [],
          metadata: [],
          details: [],
          datasets: [],
          periods: []
        };
      }
      const target = output[programId];
      target.rows.push(row);
      if (KIND_GROUPS.monthly.has(row.dataset_kind)) target.monthly.push(row);
      if (KIND_GROUPS.indicator.has(row.dataset_kind)) target.indicators.push(row);
      if (KIND_GROUPS.metadata.has(row.dataset_kind)) target.metadata.push(row);
      if (KIND_GROUPS.detail.has(row.dataset_kind)) target.details.push(row);
      target.datasets.push(row.dataset_key);
      if (row.period_key) target.periods.push(row.period_key);
    });
    Object.values(output).forEach((program) => {
      program.monthly.sort(comparePeriods);
      program.indicators.sort(comparePeriods);
      program.metadata.sort(comparePeriods);
      program.details.sort(comparePeriods);
      program.rows.sort(comparePeriods);
      program.datasets = unique(program.datasets).sort();
      program.periods = unique(program.periods).sort();
      program.latest_period = inferLatestPeriod(program);
      program.latest_monthly = pickLatestRows(program.monthly, program.latest_period);
      program.latest_indicators = pickLatestRows(program.indicators, program.latest_period);
      program.latest_metadata = program.metadata[program.metadata.length - 1] || null;
      program.snapshot = buildProgramSnapshot(program);
    });
    return output;
  }

  function inferLatestPeriod(program) {
    const explicitMeta = [...program.metadata].reverse().find((row) => row.values.latest_period);
    if (explicitMeta?.values?.latest_period) return explicitMeta.values.latest_period;
    const latestTagged = [...program.rows].reverse().find((row) => row.is_latest_data_month && row.period_key);
    if (latestTagged?.period_key) return latestTagged.period_key;
    return program.periods[program.periods.length - 1] || null;
  }

  function pickLatestRows(rows, periodKey) {
    if (!periodKey) return [];
    return rows.filter((row) => row.period_key === periodKey);
  }

  function buildProgramSnapshot(program) {
    const latestMonthly = program.latest_monthly[0] || null;
    const latestIndicators = program.latest_indicators.map((row) => ({
      indicator_id: row.indicator_id,
      indicator_name: row.indicator_name,
      unit: row.unit,
      status: row.status,
      valor_mes: row.values.valor_mes ?? row.values.valor ?? null,
      valor_acumulado: row.values.valor_acumulado ?? null,
      meta_mes: row.values.meta_mes ?? row.values.meta_mensual ?? null,
      meta_anual: row.values.meta_anual ?? null,
      pct_meta_anual: row.values.pct_meta_anual ?? null,
      pct_vs_esperado: row.values.pct_vs_esperado ?? null
    }));
    return {
      id: program.id,
      name: program.name,
      latest_period: program.latest_period,
      available_periods: program.periods,
      latest_monthly: latestMonthly ? latestMonthly.values : null,
      latest_indicators: latestIndicators,
      latest_metadata: program.latest_metadata ? program.latest_metadata.values : null,
      dataset_count: program.datasets.length,
      row_count: program.rows.length
    };
  }

  function buildSearchIndex(rows) {
    return rows.map((row) => ({
      id: row.id,
      program_id: row.program_id,
      dataset_key: row.dataset_key,
      dataset_kind: row.dataset_kind,
      period_key: row.period_key,
      score_base: row.is_latest_data_month ? 10 : 0,
      text: row.searchable_text,
      row
    }));
  }

  async function loadAll(options = {}) {
    const force = !!options.force;
    if (state.loaded && !force) return state;
    if (state.loading && !force) return state.loading;
    state.loading = (async () => {
      const datasets = await Promise.all(DATASETS.map(loadDataset));
      const rows = datasets.flatMap((dataset) => dataset.rows);
      const collections = {
        monthly: rows.filter((row) => KIND_GROUPS.monthly.has(row.dataset_kind)).sort(comparePeriods),
        indicators: rows.filter((row) => KIND_GROUPS.indicator.has(row.dataset_kind)).sort(comparePeriods),
        metadata: rows.filter((row) => KIND_GROUPS.metadata.has(row.dataset_kind)).sort(comparePeriods),
        details: rows.filter((row) => KIND_GROUPS.detail.has(row.dataset_kind)).sort(comparePeriods)
      };
      const programs = buildProgramRegistry(datasets);
      const byProgram = groupByProgram(rows);
      const latestByProgram = Object.fromEntries(Object.entries(byProgram).map(([key, value]) => [key, value.snapshot]));
      const searchIndex = buildSearchIndex(rows);
      state.loaded = true;
      state.loadedAt = new Date().toISOString();
      state.datasets = datasets;
      state.rows = rows.sort(comparePeriods);
      state.collections = collections;
      state.programs = programs;
      state.byProgram = byProgram;
      state.latestByProgram = latestByProgram;
      state.searchIndex = searchIndex;
      state.loading = null;
      return state;
    })().catch((error) => {
      state.loading = null;
      throw error;
    });
    return state.loading;
  }

  function requireLoaded() {
    if (!state.loaded) throw new Error('ChatbotData no ha sido cargado todavía. Ejecuta ChatbotData.loadAll() primero.');
  }

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function getPrograms() {
    requireLoaded();
    return clone(state.programs);
  }

  function getDatasets() {
    requireLoaded();
    return state.datasets.map((dataset) => ({
      key: dataset.key,
      path: dataset.path,
      kind: dataset.kind,
      programId: dataset.programId,
      count: dataset.count,
      periods: [...dataset.periods],
      programs: [...dataset.programs],
      loadedAt: dataset.loadedAt
    }));
  }

  function getProgram(programId) {
    requireLoaded();
    return state.byProgram[programId] ? clone(state.byProgram[programId]) : null;
  }

  function getLatest(programId) {
    requireLoaded();
    if (programId) return clone(state.latestByProgram[programId] || null);
    return clone(state.latestByProgram);
  }

  function listPeriods(programId) {
    requireLoaded();
    if (!programId) return unique(state.rows.map((row) => row.period_key).filter(Boolean)).sort();
    return [...(state.byProgram[programId]?.periods || [])];
  }

  function getRows(filters = {}) {
    requireLoaded();
    const {
      programId = null,
      datasetKey = null,
      datasetKind = null,
      periodKey = null,
      latestOnly = false,
      limit = null,
      indicatorId = null
    } = filters;
    let rows = state.rows;
    if (programId) rows = rows.filter((row) => row.program_id === programId);
    if (datasetKey) rows = rows.filter((row) => row.dataset_key === datasetKey);
    if (datasetKind) rows = rows.filter((row) => row.dataset_kind === datasetKind);
    if (periodKey) rows = rows.filter((row) => row.period_key === periodKey);
    if (indicatorId) rows = rows.filter((row) => row.indicator_id === indicatorId);
    if (latestOnly) {
      rows = rows.filter((row) => {
        const latest = state.byProgram[row.program_id]?.latest_period || null;
        return latest && row.period_key === latest;
      });
    }
    if (typeof limit === 'number') rows = rows.slice(0, Math.max(0, limit));
    return clone(rows);
  }

  function search(query, options = {}) {
    requireLoaded();
    const {
      programId = null,
      datasetKinds = null,
      latestOnly = false,
      limit = 25
    } = options;
    const terms = normalizeText(query).split(' ').filter(Boolean);
    if (!terms.length) return [];
    let index = state.searchIndex;
    if (programId) index = index.filter((entry) => entry.program_id === programId);
    if (datasetKinds && datasetKinds.length) index = index.filter((entry) => datasetKinds.includes(entry.dataset_kind));
    if (latestOnly) {
      index = index.filter((entry) => {
        const latest = state.byProgram[entry.program_id]?.latest_period || null;
        return latest && entry.period_key === latest;
      });
    }
    const scored = index
      .map((entry) => {
        let score = entry.score_base;
        for (const term of terms) {
          if (entry.text.includes(term)) score += 3;
          if (normalizeText(entry.row.program_name).includes(term)) score += 4;
          if (normalizeText(entry.row.dataset_key).includes(term)) score += 2;
          if (entry.row.indicator_name && normalizeText(entry.row.indicator_name).includes(term)) score += 5;
          if (entry.row.primary_dimension_value && normalizeText(entry.row.primary_dimension_value).includes(term)) score += 4;
        }
        return { score, row: entry.row };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || comparePeriods(b.row, a.row))
      .slice(0, limit)
      .map((item) => item.row);
    return clone(scored);
  }

  function buildContext(options = {}) {
    requireLoaded();
    const {
      programId = null,
      periodKey = null,
      latestOnly = true,
      includeDetails = true,
      includeIndicators = true,
      includeMetadata = true,
      maxRowsPerCollection = 200
    } = options;
    const programs = programId ? [programId] : state.programs.map((program) => program.id);
    const context = {
      generated_at: new Date().toISOString(),
      loaded_at: state.loadedAt,
      programs: {},
      datasets: getDatasets()
    };
    programs.forEach((id) => {
      const program = state.byProgram[id];
      if (!program) return;
      const effectivePeriod = periodKey || (latestOnly ? program.latest_period : null);
      const monthly = program.monthly.filter((row) => !effectivePeriod || row.period_key === effectivePeriod).slice(-maxRowsPerCollection);
      const indicators = includeIndicators ? program.indicators.filter((row) => !effectivePeriod || row.period_key === effectivePeriod).slice(-maxRowsPerCollection) : [];
      const metadata = includeMetadata ? program.metadata.slice(-maxRowsPerCollection) : [];
      const details = includeDetails ? program.details.filter((row) => !effectivePeriod || row.period_key === effectivePeriod).slice(-maxRowsPerCollection) : [];
      context.programs[id] = {
        id: program.id,
        name: program.name,
        latest_period: program.latest_period,
        available_periods: [...program.periods],
        snapshot: clone(program.snapshot),
        monthly: clone(monthly.map((row) => row.values)),
        indicators: clone(indicators.map((row) => row.values)),
        metadata: clone(metadata.map((row) => row.values)),
        details: clone(details.map((row) => row.values))
      };
    });
    return context;
  }

  function refresh() {
    return loadAll({ force: true });
  }

  global.ChatbotData = {
    version: state.version,
    PROGRAMS: clone(PROGRAMS),
    DATASETS: clone(DATASETS),
    loadAll,
    refresh,
    getPrograms,
    getDatasets,
    getProgram,
    getLatest,
    listPeriods,
    getRows,
    search,
    buildContext,
    getState() {
      requireLoaded();
      return clone({
        loaded: state.loaded,
        loadedAt: state.loadedAt,
        programs: state.programs,
        datasets: getDatasets(),
        latestByProgram: state.latestByProgram
      });
    }
  };
})(window);
