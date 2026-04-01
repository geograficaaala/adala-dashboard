(function (global) {
  'use strict';

  const MANIFEST_PATH = './data/chatbot_manifest.json';

  const PROGRAMS = {
    atitlan_recicla: {
      id: 'atitlan_recicla',
      name: 'Atitlán Recicla',
      aliases: ['atitlan_recicla', 'cooperativa atitlán recicla', 'cooperativa atitlan recicla', 'atitlán recicla', 'atitlan recicla']
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
      name: 'Reforestación',
      aliases: ['reforestacion', 'reforestación', 'reforestando atitlán', 'reforestando atitlan']
    }
  };

  const OPTIONAL_DATASETS = [
    { key: 'atitlan_zona_mes', path: './data/zona_mes.csv', kind: 'zone_monthly', programId: 'atitlan_recicla', optional: true },
    { key: 'atitlan_territorio_mes', path: './data/territorio_mes.csv', kind: 'territory_monthly', programId: 'atitlan_recicla', optional: true },
    { key: 'atitlan_materiales_resumen_mes', path: './data/materiales_resumen_mes.csv', kind: 'materials_monthly', programId: 'atitlan_recicla', optional: true },
    { key: 'atitlan_materiales_detalle', path: './data/materiales_detalle.csv', kind: 'materials_detail', programId: 'atitlan_recicla', optional: true },
    { key: 'atitlan_materiales_raw', path: './data/materiales_raw.csv', kind: 'materials_raw', programId: 'atitlan_recicla', optional: true },
    { key: 'atitlan_cdm_raw', path: './data/cdm_raw.csv', kind: 'cdm_raw', programId: 'atitlan_recicla', optional: true },
    { key: 'fm_asistencias_sector_mes', path: './data/fortalecimiento_municipal/asistencias_sector_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_calidad_datos_mes', path: './data/fortalecimiento_municipal/calidad_datos_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_capacitaciones_municipio_mes', path: './data/fortalecimiento_municipal/capacitaciones_municipio_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_capacitaciones_tema_mes', path: './data/fortalecimiento_municipal/capacitaciones_tema_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_estudios_sector_mes', path: './data/fortalecimiento_municipal/estudios_sector_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_reuniones_tipo_mes', path: './data/fortalecimiento_municipal/reuniones_tipo_mes.csv', kind: 'detail_monthly', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_detalle_asistencias', path: './data/fortalecimiento_municipal/detalle_asistencias.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_detalle_capacitaciones', path: './data/fortalecimiento_municipal/detalle_capacitaciones.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_detalle_estudios', path: './data/fortalecimiento_municipal/detalle_estudios.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_detalle_pirdes', path: './data/fortalecimiento_municipal/detalle_pirdes.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal', optional: true },
    { key: 'fm_detalle_reuniones', path: './data/fortalecimiento_municipal/detalle_reuniones.csv', kind: 'detail_row', programId: 'fortalecimiento_municipal', optional: true }
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
    version: '2.0.0',
    manifest: null,
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

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

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

  function unique(items) {
    return Array.from(new Set(items));
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

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
    return response.json();
  }

  async function fetchText(path, optional) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      if (optional) return null;
      throw new Error(`No se pudo cargar ${path}`);
    }
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

  function comparePeriods(a, b) {
    const ay = Number(a.year || 0);
    const by = Number(b.year || 0);
    if (ay !== by) return ay - by;
    const am = Number(a.month_num || 0);
    const bm = Number(b.month_num || 0);
    if (am !== bm) return am - bm;
    return String(a.id).localeCompare(String(b.id), 'es');
  }

  function manifestPathToClientPath(path) {
    if (!path) return null;
    return String(path).replace(/^docs\//, './');
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

  function inferProgramName(row, dataset, programId, manifestProgram) {
    const direct = row.program_name || row.programa_nombre || row.programa || null;
    if (direct && typeof direct === 'string' && direct.trim()) return direct.trim();
    return manifestProgram?.program_name || PROGRAMS[programId]?.name || dataset.programId || null;
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
      ene: 1, enero: 1,
      feb: 2, febrero: 2,
      mar: 3, marzo: 3,
      abr: 4, abril: 4,
      may: 5, mayo: 5,
      jun: 6, junio: 6,
      jul: 7, julio: 7,
      ago: 8, agosto: 8,
      sep: 9, sept: 9, septiembre: 9,
      oct: 10, octubre: 10,
      nov: 11, noviembre: 11,
      dic: 12, diciembre: 12
    };
    return map[normalizeText(monthLabel)] || null;
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

  function normalizeRecord(row, dataset, manifestProgram, rowIndex) {
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
      program_name: inferProgramName(values, dataset, programId, manifestProgram),
      period_key: periodKey,
      year,
      month_num: monthNum,
      month_label: monthLabel,
      status: inferStatus(values),
      is_latest_data_month: false,
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

  function buildCoreDatasets(manifest) {
    const datasets = [];
    (manifest.program_order || []).forEach((programId) => {
      const program = manifest.programs?.[programId];
      if (!program?.files) return;
      if (program.files.total) {
        datasets.push({
          key: `${programId}_total_mes`,
          path: manifestPathToClientPath(program.files.total),
          kind: 'monthly_total',
          programId,
          optional: false
        });
      }
      if (program.files.indicators) {
        datasets.push({
          key: `${programId}_indicadores`,
          path: manifestPathToClientPath(program.files.indicators),
          kind: 'indicator',
          programId,
          optional: false
        });
      }
    });
    return datasets;
  }

  function isPeriodAllowed(row, manifestProgram, dataset) {
    if (!manifestProgram) return false;
    if (KIND_GROUPS.metadata.has(dataset.kind)) return true;
    if (!row.period_key) return false;
    return (manifestProgram.valid_periods || []).includes(row.period_key);
  }

  function summarizeDatasetRows(dataset, rows, manifest) {
    const manifestProgram = manifest.programs?.[dataset.programId] || null;
    const normalizedRows = rows
      .map((row, index) => normalizeRecord(row, dataset, manifestProgram, index))
      .filter((row) => row.program_id && manifest.programs?.[row.program_id])
      .filter((row) => isPeriodAllowed(row, manifest.programs[row.program_id], dataset));
    return {
      ...dataset,
      rows: normalizedRows,
      count: normalizedRows.length,
      periods: unique(normalizedRows.map((row) => row.period_key).filter(Boolean)).sort(),
      programs: unique(normalizedRows.map((row) => row.program_id).filter(Boolean)).sort(),
      loadedAt: new Date().toISOString()
    };
  }

  async function loadDataset(dataset, manifest) {
    const text = await fetchText(dataset.path, !!dataset.optional);
    if (text == null) {
      return {
        ...dataset,
        rows: [],
        count: 0,
        periods: [],
        programs: [],
        loadedAt: new Date().toISOString()
      };
    }
    const rows = parseCsvText(text).map(cleanRow);
    return summarizeDatasetRows(dataset, rows, manifest);
  }

  function buildMetadataDatasets(manifest) {
    return (manifest.program_order || []).map((programId) => {
      const program = manifest.programs?.[programId] || {};
      const row = {
        program_id: programId,
        program_name: program.program_name || PROGRAMS[programId]?.name || programId,
        latest_period: program.latest_valid_period || null,
        latest_month_label: program.latest_valid_month_label || null,
        first_period: (program.valid_periods || [])[0] || null,
        periods_count: (program.valid_periods || []).length,
        periodos_detectados: (program.available_periods_total || []).length,
        executive_summary: program.narratives?.executive_summary || null,
        what_is_going_well: (program.narratives?.what_is_going_well || []).join(' '),
        what_needs_attention: (program.narratives?.what_needs_attention || []).join(' '),
        context_notes: (program.narratives?.context_notes || []).join(' '),
        institutional_cutoff_period: manifest.cutoff?.institutional_cutoff_period || null
      };
      const dataset = { key: `${programId}_metadata_manifest`, path: MANIFEST_PATH, kind: 'metadata', programId, optional: false };
      const normalized = normalizeRecord(row, dataset, program, 0);
      return {
        ...dataset,
        rows: [normalized],
        count: 1,
        periods: normalized.period_key ? [normalized.period_key] : [],
        programs: [programId],
        loadedAt: new Date().toISOString()
      };
    });
  }

  function toPercent(value) {
    const numeric = parseMaybeNumber(value);
    if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return null;
    return Math.abs(numeric) <= 1.5 ? numeric * 100 : numeric;
  }

  function scoreToStatus(score) {
    if (score == null) return null;
    if (score >= 100) return 'verde';
    if (score >= 85) return 'amarillo';
    return 'rojo';
  }

  function scoreToBucket(score) {
    if (score == null) return 'neutral';
    if (score >= 100) return 'positivo';
    if (score >= 85) return 'neutral';
    return 'alerta';
  }

  function buildIndicatorLookup(manifestProgram) {
    const map = new Map();
    (manifestProgram?.indicators?.all || []).forEach((item) => {
      const keys = [item.indicator_id, item.indicator_name].filter(Boolean).map((value) => normalizeText(value));
      keys.forEach((key) => map.set(key, item));
    });
    return map;
  }

  function enrichIndicatorRow(row, manifestProgram) {
    row.values.valor_mes = row.values.valor_mes ?? row.values.valor ?? null;
    row.values.valor_acumulado = row.values.valor_acumulado ?? row.values.valor_acum ?? null;
    row.values.meta_mes = row.values.meta_mes ?? row.values.meta_mensual ?? null;
    row.values.meta_anual = row.values.meta_anual ?? null;

    const pctExpected = toPercent(row.values.pct_vs_esperado);
    const pctYear = toPercent(row.values.pct_meta_anual);
    if (pctExpected != null) row.values.pct_vs_esperado = pctExpected;
    if (pctYear != null) row.values.pct_meta_anual = pctYear;

    const lookup = buildIndicatorLookup(manifestProgram);
    const manifestIndicator = lookup.get(normalizeText(row.indicator_id)) || lookup.get(normalizeText(row.indicator_name));

    if (manifestIndicator && row.period_key === manifestProgram.latest_valid_period) {
      row.indicator_id = manifestIndicator.indicator_id || row.indicator_id;
      row.indicator_name = manifestIndicator.indicator_name || row.indicator_name;
      row.unit = manifestIndicator.unit || row.unit;
      row.category = manifestIndicator.category || row.category;
      row.status = manifestIndicator.status || row.status;
      row.values.valor_mes = manifestIndicator.value_month ?? row.values.valor_mes;
      row.values.valor_acumulado = manifestIndicator.value_accumulated ?? row.values.valor_acumulado;
      row.values.meta_mes = manifestIndicator.target_month ?? row.values.meta_mes;
      row.values.meta_anual = manifestIndicator.target_year ?? row.values.meta_anual;
      row.values.pct_vs_esperado = toPercent(manifestIndicator.pct_vs_expected) ?? row.values.pct_vs_esperado;
      row.values.pct_meta_anual = toPercent(manifestIndicator.pct_meta_year) ?? row.values.pct_meta_anual;
      row.values.human_summary = manifestIndicator.human_summary || row.values.human_summary || null;
      row.values.note = manifestIndicator.note || row.values.note || null;
      row.values.bucket = manifestIndicator.bucket || row.values.bucket || null;
      row.values.is_required = manifestIndicator.is_required != null ? !!manifestIndicator.is_required : row.values.is_required;
    }

    if (!row.status) {
      let score = row.values.pct_vs_esperado;
      if (typeof score !== 'number') {
        const value = parseMaybeNumber(row.values.valor_mes);
        const target = parseMaybeNumber(row.values.meta_mes);
        if (typeof value === 'number' && typeof target === 'number' && target > 0) {
          score = (value / target) * 100;
          row.values.pct_vs_esperado = score;
        }
      }
      row.status = scoreToStatus(score);
      if (!row.values.bucket) row.values.bucket = scoreToBucket(score);
    }

    row.searchable_text = buildSearchableText({ key: row.dataset_key, kind: row.dataset_kind }, row);
    return row;
  }

  function buildSyntheticMonthlyRow(programId, manifestProgram) {
    if (!manifestProgram?.latest_total) return null;
    const dataset = { key: `${programId}_manifest_latest_total`, path: MANIFEST_PATH, kind: 'monthly_total', programId };
    const row = normalizeRecord({
      ...manifestProgram.latest_total,
      program_id: programId,
      program_name: manifestProgram.program_name || PROGRAMS[programId]?.name || programId,
      periodo_clave: manifestProgram.latest_valid_period,
      latest_month_label: manifestProgram.latest_valid_month_label,
      latest_period: manifestProgram.latest_valid_period
    }, dataset, manifestProgram, 0);
    return row;
  }

  function enrichLatestMonthlyRow(row, manifest, manifestProgram) {
    if (!row) return null;
    const narratives = manifestProgram?.narratives || {};
    row.values = {
      ...row.values,
      ...(manifestProgram?.latest_total || {}),
      latest_valid_period: manifestProgram?.latest_valid_period || row.period_key,
      latest_valid_month_label: manifestProgram?.latest_valid_month_label || row.month_label,
      institutional_cutoff_period: manifest.cutoff?.institutional_cutoff_period || null,
      resumen_ejecutivo_texto: narratives.executive_summary || null,
      logros_texto: (narratives.what_is_going_well || []).join(' '),
      alertas_texto: (narratives.what_needs_attention || []).join(' '),
      contexto_texto: (narratives.context_notes || []).join(' ')
    };
    row.is_latest_data_month = true;
    row.searchable_text = buildSearchableText({ key: row.dataset_key, kind: row.dataset_kind }, row);
    return row;
  }

  function pickLatestRows(rows, periodKey) {
    if (!periodKey) return [];
    return rows.filter((row) => row.period_key === periodKey);
  }

  function buildProgramSnapshot(program, manifestProgram) {
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
      pct_vs_esperado: row.values.pct_vs_esperado ?? null,
      human_summary: row.values.human_summary || null
    }));
    return {
      id: program.id,
      name: program.name,
      latest_period: program.latest_period,
      available_periods: program.periods,
      latest_monthly: latestMonthly ? latestMonthly.values : null,
      latest_indicators: latestIndicators,
      latest_metadata: program.latest_metadata ? program.latest_metadata.values : null,
      narratives: clone(manifestProgram?.narratives || {}),
      alerts_count: (manifestProgram?.indicators?.alerts || []).length,
      positives_count: (manifestProgram?.indicators?.positives || []).length,
      cutoff_period: manifestProgram?.cutoff_period || manifestProgram?.latest_valid_period || null,
      dataset_count: program.datasets.length,
      row_count: program.rows.length
    };
  }

  function groupByProgram(rows, manifest) {
    const output = {};
    (manifest.program_order || []).forEach((programId) => {
      const manifestProgram = manifest.programs?.[programId] || {};
      output[programId] = {
        id: programId,
        name: manifestProgram.program_name || PROGRAMS[programId]?.name || programId,
        rows: [],
        monthly: [],
        indicators: [],
        metadata: [],
        details: [],
        datasets: [],
        periods: [...(manifestProgram.valid_periods || [])],
        latest_period: manifestProgram.latest_valid_period || null,
        narratives: clone(manifestProgram.narratives || {}),
        manifest: clone(manifestProgram)
      };
    });

    rows.forEach((row) => {
      const programId = row.program_id || 'sin_programa';
      if (!output[programId]) return;
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
      const manifestProgram = program.manifest || {};
      program.monthly.sort(comparePeriods);
      program.indicators.sort(comparePeriods);
      program.metadata.sort(comparePeriods);
      program.details.sort(comparePeriods);
      program.rows.sort(comparePeriods);
      program.datasets = unique(program.datasets).sort();
      program.periods = unique([...(manifestProgram.valid_periods || []), ...program.periods]).sort();
      program.latest_period = manifestProgram.latest_valid_period || program.periods[program.periods.length - 1] || null;

      let latestMonthly = program.monthly.find((row) => row.period_key === program.latest_period && row.dataset_kind === 'monthly_total')
        || program.monthly.find((row) => row.period_key === program.latest_period)
        || null;
      if (!latestMonthly) {
        const synthetic = buildSyntheticMonthlyRow(program.id, manifestProgram);
        if (synthetic) {
          program.monthly.push(synthetic);
          program.rows.push(synthetic);
          program.datasets.push(synthetic.dataset_key);
          latestMonthly = synthetic;
        }
      }
      if (latestMonthly) enrichLatestMonthlyRow(latestMonthly, manifest, manifestProgram);

      program.indicators = program.indicators.map((row) => enrichIndicatorRow(row, manifestProgram));
      program.rows = program.rows.map((row) => {
        if (KIND_GROUPS.indicator.has(row.dataset_kind)) {
          const replacement = program.indicators.find((candidate) => candidate.id === row.id);
          return replacement || row;
        }
        return row;
      });

      program.monthly.sort(comparePeriods);
      program.indicators.sort(comparePeriods);
      program.rows.sort(comparePeriods);
      program.latest_monthly = pickLatestRows(program.monthly, program.latest_period);
      program.latest_indicators = pickLatestRows(program.indicators, program.latest_period);
      program.latest_metadata = program.metadata[program.metadata.length - 1] || null;
      program.snapshot = buildProgramSnapshot(program, manifestProgram);
    });

    return output;
  }

  function buildSearchIndex(rows, byProgram) {
    return rows.map((row) => ({
      id: row.id,
      program_id: row.program_id,
      dataset_key: row.dataset_key,
      dataset_kind: row.dataset_kind,
      period_key: row.period_key,
      score_base: row.period_key && row.period_key === byProgram[row.program_id]?.latest_period ? 12 : 0,
      text: row.searchable_text,
      row
    }));
  }

  function requireLoaded() {
    if (!state.loaded) throw new Error('ChatbotData no ha sido cargado todavía. Ejecuta ChatbotData.loadAll() primero.');
  }

  async function loadAll(options = {}) {
    const force = !!options.force;
    if (state.loaded && !force) return state;
    if (state.loading && !force) return state.loading;

    state.loading = (async () => {
      const manifest = await fetchJson(MANIFEST_PATH);
      const datasetDefs = [...buildCoreDatasets(manifest), ...OPTIONAL_DATASETS];
      const loadedDatasets = await Promise.all(datasetDefs.map((dataset) => loadDataset(dataset, manifest)));
      const metadataDatasets = buildMetadataDatasets(manifest);
      const datasets = [...loadedDatasets, ...metadataDatasets];
      const rows = datasets.flatMap((dataset) => dataset.rows);
      const byProgram = groupByProgram(rows, manifest);
      const normalizedRows = Object.values(byProgram).flatMap((program) => program.rows).sort(comparePeriods);
      const collections = {
        monthly: normalizedRows.filter((row) => KIND_GROUPS.monthly.has(row.dataset_kind)).sort(comparePeriods),
        indicators: normalizedRows.filter((row) => KIND_GROUPS.indicator.has(row.dataset_kind)).sort(comparePeriods),
        metadata: normalizedRows.filter((row) => KIND_GROUPS.metadata.has(row.dataset_kind)).sort(comparePeriods),
        details: normalizedRows.filter((row) => KIND_GROUPS.detail.has(row.dataset_kind)).sort(comparePeriods)
      };
      const programs = (manifest.program_order || []).map((programId) => ({
        id: programId,
        name: manifest.programs?.[programId]?.program_name || PROGRAMS[programId]?.name || programId
      }));
      const latestByProgram = Object.fromEntries(Object.entries(byProgram).map(([key, value]) => [key, value.snapshot]));
      const searchIndex = buildSearchIndex(normalizedRows, byProgram);

      state.loaded = true;
      state.loadedAt = new Date().toISOString();
      state.manifest = manifest;
      state.datasets = datasets;
      state.rows = normalizedRows;
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
    if (!programId) return [...(state.manifest?.valid_periods_global || [])];
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
    if (indicatorId) {
      const target = normalizeText(indicatorId);
      rows = rows.filter((row) => normalizeText(row.indicator_id) === target || normalizeText(row.indicator_name) === target);
    }
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
          if (entry.row.values?.human_summary && normalizeText(entry.row.values.human_summary).includes(term)) score += 5;
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
      cutoff: clone(state.manifest?.cutoff || {}),
      valid_periods_global: [...(state.manifest?.valid_periods_global || [])],
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
        narratives: clone(program.narratives || {}),
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
    MANIFEST_PATH,
    PROGRAMS: clone(PROGRAMS),
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
    getManifest() {
      requireLoaded();
      return clone(state.manifest);
    },
    getState() {
      requireLoaded();
      return clone({
        loaded: state.loaded,
        loadedAt: state.loadedAt,
        programs: state.programs,
        datasets: getDatasets(),
        latestByProgram: state.latestByProgram,
        cutoff: state.manifest?.cutoff || null
      });
    }
  };
})(window);
