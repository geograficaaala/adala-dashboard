const PATHS = {
  total: './data/educando_para_conservar/total_mes.csv',
  indicadores: './data/educando_para_conservar/institucional_indicadores.csv',
  metadata: './data/educando_para_conservar/metadata_publicacion.csv'
};

const MODEL_LABELS = {
  monthly_recurrent: 'Cumplimiento mensual recurrente',
  annual_cumulative_profiled: 'Acumulado anual perfilado',
  milestone_window: 'Hito / ventana'
};

let state = {
  total: [],
  indicadores: [],
  metadata: {},
  period: ''
};

document.addEventListener('DOMContentLoaded', bootstrap);

async function bootstrap() {
  try {
    const [total, indicadores, metadata] = await Promise.all([
      fetchCsv(PATHS.total),
      fetchCsv(PATHS.indicadores),
      fetchCsv(PATHS.metadata)
    ]);

    state.total = total.map(normalizeRow).sort(sortByPeriod);
    state.indicadores = indicadores.map(normalizeRow);
    state.metadata = (metadata.map(normalizeRow)[0]) || {};

    const latestFromFlag = state.total.find(row => isTruthy(row.is_latest_data_month));
    const periods = uniquePeriods();
    state.period = String(
      state.metadata.latest_period ||
      (latestFromFlag ? latestFromFlag.periodo_clave : '') ||
      periods.at(-1) ||
      ''
    );

    buildControls();
    renderAll();
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `
      <div style="max-width:980px;margin:48px auto;padding:24px;font-family:system-ui">
        <h2>No se pudo cargar el dashboard EPC</h2>
        <p>Verifica estos archivos:</p>
        <ul>
          <li>docs/data/educando_para_conservar/total_mes.csv</li>
          <li>docs/data/educando_para_conservar/institucional_indicadores.csv</li>
          <li>docs/data/educando_para_conservar/metadata_publicacion.csv</li>
        </ul>
        <pre>${escapeHtml(err.message || String(err))}</pre>
      </div>
    `;
  }
}

function uniquePeriods() {
  return [...new Set(state.total.map(row => String(row.periodo_clave || '')).filter(Boolean))];
}

function sortByPeriod(a, b) {
  return String(a.periodo_clave || '').localeCompare(String(b.periodo_clave || ''));
}

function buildControls() {
  const select = document.getElementById('periodSelect');
  const periods = uniquePeriods();

  select.innerHTML = periods.map(period => `
    <option value="${escapeAttr(period)}">${escapeHtml(periodLabel(period))}</option>
  `).join('');

  select.value = state.period;

  select.addEventListener('change', () => {
    state.period = select.value;
    renderAll();
  });
}

function renderAll() {
  renderHero();
  renderGoals();
  renderKpis();
  renderIndicatorTable();
  renderNarrative();
  renderMethodology();
}

function selectedTotal() {
  return state.total.find(row => String(row.periodo_clave) === String(state.period)) || null;
}

function selectedIndicators() {
  return state.indicadores
    .filter(row => String(row.periodo_clave) === String(state.period))
    .sort((a, b) => Number(a.orden_dashboard || 0) - Number(b.orden_dashboard || 0));
}

function selectedStrategic() {
  return selectedIndicators().filter(row => String(row.categoria) === 'estrategico');
}

function renderHero() {
  const row = selectedTotal();
  const strategic = selectedStrategic();

  document.getElementById('heroPeriod').textContent = row ? periodLabel(row.periodo_clave) : 'Sin período';
  document.getElementById('heroSubtitle').textContent = row
    ? `Cierre oficial ${periodLabel(row.periodo_clave)} basado en la hoja 08A.`
    : 'No hay datos disponibles para este período.';

  const greens = strategic.filter(r => String(r.estatus) === 'verde').length;
  const yellows = strategic.filter(r => String(r.estatus) === 'amarillo').length;
  const reds = strategic.filter(r => String(r.estatus) === 'rojo').length;
  const blues = strategic.filter(r => String(r.estatus) === 'azul').length;

  let statusLabel = 'Sin evaluación';
  let statusClass = 'status-muted';

  if (reds > 0) {
    statusLabel = 'Riesgos prioritarios';
    statusClass = 'status-red';
  } else if (yellows > 0) {
    statusLabel = 'Seguimiento cercano';
    statusClass = 'status-yellow';
  } else if (blues > 0) {
    statusLabel = 'En ventana de hito';
    statusClass = 'status-blue';
  } else if (greens > 0) {
    statusLabel = 'Desempeño favorable';
    statusClass = 'status-green';
  }

  document.getElementById('heroStatus').className = `status-badge ${statusClass}`;
  document.getElementById('heroStatus').textContent = statusLabel;

  const stats = row ? [
    {
      label: 'Docentes mes',
      value: `${fmtNum(row.docentes_mes)} / 121`
    },
    {
      label: 'Estudiantes mes',
      value: `${fmtNum(row.estudiantes_epc_mes)} / 3,514`
    },
    {
      label: 'Actividades de campo mes',
      value: fmtNum(row.actividades_campo_mes)
    },
    {
      label: 'Períodos publicados',
      value: fmtNum(state.metadata.periods_count || state.total.length)
    }
  ] : [];

  document.getElementById('heroStats').innerHTML = stats.map(stat => `
    <div class="hero-stat">
      <small>${escapeHtml(stat.label)}</small>
      <strong>${escapeHtml(stat.value)}</strong>
    </div>
  `).join('');

  document.getElementById('heroMiniList').innerHTML = row ? `
    <div class="mini-item">
      <span class="muted">Mes del ciclo EPC</span>
      <strong>${fmtNum(row.mes_ciclo_epc || 0)}</strong>
    </div>
    <div class="mini-item">
      <span class="muted">Aporta a metas EPC</span>
      <strong>${isTruthy(row.aporta_metas_epc) ? 'Sí' : 'No'}</strong>
    </div>
    <div class="mini-item">
      <span class="muted">Coordinaciones clave</span>
      <strong>${fmtNum(row.coordinaciones_clave_mes)}</strong>
    </div>
    <div class="mini-item">
      <span class="muted">Meses con datos</span>
      <strong>${fmtNum(state.total.length)}</strong>
    </div>
  ` : '<div class="mini-item"><span class="muted">Sin datos</span><strong>—</strong></div>';
}

function renderGoals() {
  const strategic = selectedStrategic();
  const goals = strategic.slice(0, 6);

  document.getElementById('annualGoalsGrid').innerHTML = goals.map(row => {
    const progress = goalProgressText(row);
    const badge = statusBadgeInline(row.estatus);

    return `
      <div class="goal-card">
        <small>${escapeHtml(goalTypeLabel(row.modelo_medicion))}</small>
        <strong>${escapeHtml(row.indicador_nombre)}</strong>
        <div class="goal-meta">${escapeHtml(progress.metaLine)}</div>
        <div class="goal-progress">${escapeHtml(progress.progressLine)}</div>
        <div style="margin-top:8px">${badge}</div>
      </div>
    `;
  }).join('');

  document.getElementById('goalNote').textContent =
    'Lectura metodológica: cobertura pedagógica se mide como cumplimiento mensual del estándar y sostenimiento del ciclo; actividades se leen como acumulado vs esperado al corte; diplomado e hitos solo se castigan cuando su ventana ya es exigible.';
}

function goalProgressText(row) {
  if (String(row.modelo_medicion) === 'monthly_recurrent') {
    return {
      metaLine: `Meta mensual: ${fmtNum(row.meta_mes)}`,
      progressLine: `Mes cumplido: ${fmtYesNo(row.cumplio_mes)} · Ciclo: ${fmtNum(row.meses_cumplidos)}/8`
    };
  }

  if (String(row.modelo_medicion) === 'milestone_window') {
    return {
      metaLine: `Meta anual: ${fmtNum(row.meta_anual)}`,
      progressLine: `Acumulado: ${fmtNum(row.valor_acumulado)} · Hito esperado: ${fmtNum(row.esperado_al_corte)}`
    };
  }

  return {
    metaLine: `Meta anual: ${fmtNum(row.meta_anual)}`,
    progressLine: `Acumulado: ${fmtNum(row.valor_acumulado)} · Esperado: ${fmtNum(row.esperado_al_corte)}`
  };
}

function renderKpis() {
  const rows = selectedStrategic();
  const el = document.getElementById('kpiGrid');

  if (!rows.length) {
    el.innerHTML = '<div class="card" style="padding:20px">No hay indicadores estratégicos para este período.</div>';
    return;
  }

  el.innerHTML = rows.map(row => {
    const primary = primaryMetric(row);

    return `
      <article class="kpi-card">
        <div class="kpi-top">
          <div>
            <div class="kpi-title">${escapeHtml(row.indicador_nombre)}</div>
            <div class="kpi-value">${escapeHtml(primary.value)}</div>
          </div>
          ${statusBadgeInline(row.estatus)}
        </div>
        <div class="kpi-detail">${escapeHtml(primary.line1)}</div>
        <div class="kpi-detail">${escapeHtml(primary.line2)}</div>
        <div class="kpi-progress">
          <div class="kpi-progress-bar">
            <span style="width:${Math.min(100, Math.max(0, primary.barPct))}%"></span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function primaryMetric(row) {
  if (String(row.modelo_medicion) === 'monthly_recurrent') {
    const barPct = Number(row.meta_mes) > 0 ? (Number(row.valor_mes || 0) / Number(row.meta_mes || 1)) * 100 : 0;
    return {
      value: `${fmtNum(row.valor_mes)} / ${fmtNum(row.meta_mes)}`,
      line1: `Cumplimiento del mes: ${fmtYesNo(row.cumplio_mes)}`,
      line2: `Sostenimiento del ciclo: ${fmtNum(row.meses_cumplidos)}/8`,
      barPct
    };
  }

  const barPct = Number(row.meta_anual) > 0 ? (Number(row.valor_acumulado || 0) / Number(row.meta_anual || 1)) * 100 : 0;

  if (String(row.modelo_medicion) === 'milestone_window') {
    return {
      value: `${fmtNum(row.valor_acumulado)} / ${fmtNum(row.meta_anual)}`,
      line1: `Esperado en ventana: ${fmtNum(row.esperado_al_corte)}`,
      line2: `Lectura por hito: ${goalTypeLabel(row.modelo_medicion)}`,
      barPct
    };
  }

  return {
    value: `${fmtNum(row.valor_acumulado)} / ${fmtNum(row.meta_anual)}`,
    line1: `Valor del mes: ${fmtNum(row.valor_mes)}`,
    line2: `Esperado al corte: ${fmtNum(row.esperado_al_corte)}`,
    barPct
  };
}

function renderIndicatorTable() {
  const rows = selectedIndicators();
  const tbody = document.getElementById('indicatorTable');

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7">Sin datos para este período.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>
        <strong>${escapeHtml(row.indicador_nombre)}</strong><br>
        <span class="small">${escapeHtml(goalTypeLabel(row.modelo_medicion))}</span>
      </td>
      <td>${escapeHtml(tableProgressLabel(row))}</td>
      <td>${fmtNum(row.valor_mes)}</td>
      <td>${fmtNum(row.valor_acumulado)}</td>
      <td>${fmtNum(row.esperado_al_corte)}</td>
      <td>${fmtPct(row.pct_vs_esperado)}</td>
      <td>${statusBadgeInline(row.estatus)}</td>
    </tr>
  `).join('');
}

function tableProgressLabel(row) {
  if (String(row.modelo_medicion) === 'monthly_recurrent') {
    return `Mes ${fmtNum(row.valor_mes)}/${fmtNum(row.meta_mes)} · ciclo ${fmtNum(row.meses_cumplidos)}/8`;
  }
  return `${fmtNum(row.valor_acumulado)}/${fmtNum(row.meta_anual)}`;
}

function renderNarrative() {
  const row = selectedTotal();

  document.getElementById('logrosBox').textContent = row?.logros_texto || 'Sin narrativa cargada para este período.';
  document.getElementById('alertasBox').textContent = row?.alertas_texto || 'Sin alertas registradas para este período.';
  document.getElementById('fuenteBox').textContent = row?.fuente_texto || 'Sin referencia metodológica cargada.';
}

function renderMethodology() {
  const row = selectedTotal();
  const strategic = selectedStrategic();
  const recurringOk = strategic.filter(r => String(r.modelo_medicion) === 'monthly_recurrent' && Number(r.cumplio_mes || 0) === 1).length;
  const recurringTotal = strategic.filter(r => String(r.modelo_medicion) === 'monthly_recurrent').length;

  const text = row ? [
    `Período seleccionado: ${periodLabel(row.periodo_clave)}.`,
    `Mes del ciclo EPC: ${fmtNum(row.mes_ciclo_epc || 0)}.`,
    `Aporta a metas EPC: ${isTruthy(row.aporta_metas_epc) ? 'sí' : 'no'}.`,
    `Cobertura mensual cumplida: ${fmtNum(recurringOk)} de ${fmtNum(recurringTotal)} indicadores recurrentes.`,
    'Los meses sin datos reales ya no se publican como cierres válidos.',
    'Los hitos del diplomado y otros entregables por ventana permanecen en gris o azul antes de ser exigibles, para evitar falsos rezagos.'
  ].join(' ') : 'Sin datos metodológicos.';

  document.getElementById('methodBox').textContent = text;
}

function fetchCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: results => resolve(results.data || []),
      error: err => reject(err)
    });
  });
}

function normalizeRow(row) {
  const out = {};

  for (const [key, value] of Object.entries(row)) {
    const cleanKey = String(key || '').trim();
    const raw = typeof value === 'string' ? value.trim() : value;

    if (raw === '' || raw === null || raw === undefined || String(raw).toLowerCase() === 'nan') {
      out[cleanKey] = '';
      continue;
    }

    if (typeof raw === 'string' && /^(true|false)$/i.test(raw)) {
      out[cleanKey] = raw.toLowerCase() === 'true';
      continue;
    }

    const numericCandidate = Number(raw);
    if (!Number.isNaN(numericCandidate) && /^-?\d+(\.\d+)?$/.test(String(raw))) {
      out[cleanKey] = numericCandidate;
      continue;
    }

    out[cleanKey] = raw;
  }

  return out;
}

function isTruthy(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'sí', 'si', 'yes', 'y'].includes(String(value || '').trim().toLowerCase());
}

function fmtNum(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-GT', {
    maximumFractionDigits: Number.isInteger(n) ? 0 : 1
  }).format(n);
}

function fmtPct(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-GT', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(n);
}

function fmtYesNo(value) {
  return Number(value || 0) > 0 ? 'Sí' : 'No';
}

function goalTypeLabel(model) {
  return MODEL_LABELS[String(model || '')] || String(model || '—');
}

function statusBadgeInline(status) {
  const cls = badgeClass(status);
  return `<span class="status-pill ${cls}">${escapeHtml(status || 'gris')}</span>`;
}

function badgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'verde') return 'status-green';
  if (s === 'amarillo') return 'status-yellow';
  if (s === 'rojo') return 'status-red';
  if (s === 'azul') return 'status-blue';
  return 'status-muted';
}

function periodLabel(period) {
  const p = String(period || '');
  if (!p.includes('-')) return p;
  const [year, month] = p.split('-');
  const names = {
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
  return `${names[month] || p} ${year}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
