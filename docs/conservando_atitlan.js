const PATHS = {
  total: './data/conservando_atitlan/total_mes.csv',
  indicadores: './data/conservando_atitlan/institucional_indicadores.csv',
  metadata: './data/conservando_atitlan/metadata_publicacion.csv'
};

const STATUS_UI = {
  verde: { cls: 'al-dia', label: 'Al día' },
  amarillo: { cls: 'seguimiento', label: 'Seguimiento' },
  rojo: { cls: 'rezago', label: 'Rezago' },
  azul: { cls: 'seguimiento', label: 'Ventana' },
  gris: { cls: 'sin-actividad', label: 'Sin actividad' }
};

const INDICATOR_PRIORITY = [
  'jornadas_recoleccion_ciclo',
  'litros_aceite_recolectados',
  'litros_agua_protegidos',
  'jabones_producidos',
  'jabones_vendidos'
];

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

let state = {
  total: [],
  indicadores: [],
  metadata: {},
  period: '',
  periods: []
};

document.addEventListener('DOMContentLoaded', bootstrap);

async function bootstrap() {
  try {
    setLoading(true, 'Cargando CSV de Conservando Atitlán…');

    const [total, indicadores, metadata] = await Promise.all([
      fetchCsv(PATHS.total),
      fetchCsv(PATHS.indicadores),
      fetchCsv(PATHS.metadata)
    ]);

    state.total = total.map(normalizeRow).sort(sortByPeriod);
    state.indicadores = indicadores.map(normalizeRow).sort((a, b) => {
      const p = String(a.periodo_clave || '').localeCompare(String(b.periodo_clave || ''));
      if (p !== 0) return p;
      return Number(a.orden_dashboard || 0) - Number(b.orden_dashboard || 0);
    });
    state.metadata = (metadata.map(normalizeRow)[0]) || {};
    state.periods = unique(state.total.map(r => String(r.periodo_clave || '')).filter(Boolean)).sort();

    const latestFlag = state.total.find(r => isTruthy(r.is_latest_data_month));
    state.period = String(
      state.metadata.latest_period ||
      (latestFlag ? latestFlag.periodo_clave : '') ||
      state.periods.at(-1) ||
      ''
    );

    buildMonthPills();
    renderAll();
    bindZoomTargets();
    setLoading(false);
  } catch (err) {
    console.error(err);
    setLoading(true, `No se pudo cargar el dashboard: ${err.message || String(err)}`);
  }
}

function renderAll() {
  renderEstadoGlobal();
  renderHero();
  renderCycle();
  renderGauge();
  renderKpis();
  renderSummaryTable();
  renderCharts();
}

function selectedTotal() {
  return state.total.find(r => String(r.periodo_clave) === String(state.period)) || null;
}

function allTotals() {
  return state.total.slice().sort(sortByPeriod);
}

function selectedIndicators() {
  const rows = state.indicadores.filter(r => String(r.periodo_clave) === String(state.period));
  rows.sort((a, b) => {
    const ai = INDICATOR_PRIORITY.indexOf(String(a.indicator_id || ''));
    const bi = INDICATOR_PRIORITY.indexOf(String(b.indicator_id || ''));
    const av = ai === -1 ? 999 : ai;
    const bv = bi === -1 ? 999 : bi;
    if (av !== bv) return av - bv;
    return Number(a.orden_dashboard || 0) - Number(b.orden_dashboard || 0);
  });
  return rows;
}

function selectedStrategic() {
  return selectedIndicators().filter(r => String(r.categoria || '').toLowerCase() === 'estrategico');
}

function indicatorSeries(indicatorId) {
  return state.indicadores
    .filter(r => String(r.indicator_id) === String(indicatorId))
    .sort(sortByPeriod);
}

function buildMonthPills() {
  const host = document.getElementById('monthPills');
  host.innerHTML = state.periods.map(period => `
    <button class="month-pill ${period === state.period ? 'active' : ''}" data-period="${escapeAttr(period)}">
      ${escapeHtml(periodLabel(period))}
    </button>
  `).join('');

  host.querySelectorAll('.month-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.period = btn.dataset.period;
      buildMonthPills();
      renderAll();
      bindZoomTargets();
    });
  });
}

function renderEstadoGlobal() {
  const strategic = selectedStrategic();
  const el = document.getElementById('estadoGlobal');
  const label = document.getElementById('estadoLabel');

  let status = 'gris';
  if (strategic.some(r => String(r.estatus) === 'rojo')) status = 'rojo';
  else if (strategic.some(r => ['amarillo', 'azul'].includes(String(r.estatus)))) status = 'amarillo';
  else if (strategic.some(r => String(r.estatus) === 'verde')) status = 'verde';

  const ui = statusUi(status);
  el.className = `estado-global ${ui.cls}`;

  const periodText = state.period ? periodLabel(state.period) : 'Sin período';
  if (status === 'rojo') label.textContent = `${periodText} · Riesgos prioritarios`;
  else if (status === 'amarillo') label.textContent = `${periodText} · Seguimiento cercano`;
  else if (status === 'verde') label.textContent = `${periodText} · Desempeño favorable`;
  else label.textContent = `${periodText} · Sin evaluación`;
}

function renderHero() {
  const row = selectedTotal();
  const strategic = selectedStrategic();
  const heroStats = document.getElementById('heroStats');

  if (!row) {
    heroStats.innerHTML = `<span class="hero-stat-pill"><strong>—</strong> Sin datos para este período</span>`;
    return;
  }

  const completed = strategic.find(r => String(r.indicator_id) === 'jornadas_recoleccion_ciclo');
  const stats = [
    [`${fmtNum(row.jornadas_codigos_unicos_mes, 0)}`, 'jornadas operativas mes'],
    [`${fmtNum(row.litros_aceite_recolectados_mes, 2)}`, 'litros de aceite mes'],
    [`${fmtNum(row.litros_agua_protegidos_mes, 2)}`, 'litros de agua protegidos'],
    [`${fmtNum(row.jabones_producidos_mes, 2)}`, 'jabones producidos mes'],
    [`${fmtNum(row.jabones_vendidos_mes, 2)}`, 'jabones vendidos mes'],
    [`${fmtNum(completed?.meses_cumplidos || 0, 0)}/12`, 'sostenimiento del ciclo']
  ];

  heroStats.innerHTML = stats.map(([value, label]) => `
    <span class="hero-stat-pill"><strong>${escapeHtml(value)}</strong> ${escapeHtml(label)}</span>
  `).join('');
}

function renderCycle() {
  const rows = indicatorSeries('jornadas_recoleccion_ciclo');
  const dots = Array.from(document.querySelectorAll('#cicloDots .ciclo-dot'));
  dots.forEach((dot, idx) => {
    dot.classList.remove('hecho', 'actual');
    const monthNumber = idx + 1;
    const monthly = rows.find(r => Number(r.mes_num || 0) === monthNumber);
    if (monthly && Number(monthly.valor_mes || 0) >= 1) dot.classList.add('hecho');
    if (monthNumber === selectedMonthNumber()) dot.classList.add('actual');
  });
}

function renderGauge() {
  const strategic = selectedStrategic();
  const fill = document.getElementById('gaugeFill');
  const val = document.getElementById('gaugeVal');
  const title = document.getElementById('gaugeTitle');
  const caption = document.getElementById('gaugeCaption');

  if (!strategic.length) {
    setGauge(0);
    val.textContent = '—';
    title.textContent = 'Sin datos';
    caption.textContent = 'No hay indicadores estratégicos para el período seleccionado.';
    return;
  }

  const scores = strategic.map(r => {
    if (String(r.modelo_medicion) === 'monthly_recurrent') {
      const denom = Math.max(1, Number(r.meses_transcurridos || selectedMonthNumber() || 1));
      return clamp(Number(r.meses_cumplidos || 0) / denom, 0, 1.25);
    }
    return clamp(Number(r.pct_vs_esperado || 0), 0, 1.25);
  });
  const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
  const pct = clamp(avg, 0, 1.2);
  setGauge(pct);
  val.textContent = `${Math.round(pct * 100)}%`;
  title.textContent = `Desempeño consolidado · ${periodLabel(state.period)}`;
  caption.textContent = `Promedio simple de avance contra esperado en ${strategic.length} KPIs estratégicos.`;
}

function setGauge(ratio) {
  const circumference = 251.2;
  const pct = clamp(Number(ratio || 0), 0, 1.2);
  document.getElementById('gaugeFill').style.strokeDashoffset = `${circumference * (1 - Math.min(pct, 1))}`;
}

function renderKpis() {
  const host = document.getElementById('kpiGrid');
  const rows = selectedStrategic();

  if (!rows.length) {
    host.innerHTML = `<article class="card kpi-card sin-actividad"><div class="kpi-val">—</div><div class="kpi-sub">Sin indicadores estratégicos para ${escapeHtml(periodLabel(state.period))}.</div></article>`;
    return;
  }

  host.innerHTML = rows.map(row => {
    const ui = statusUi(row.estatus);
    const body = kpiPrimary(row);
    return `
      <article class="card kpi-card ${ui.cls}" data-kpi-id="${escapeAttr(row.indicator_id)}">
        <div class="kpi-top">
          <div class="kpi-nombre">${escapeHtml(row.indicador_nombre)}</div>
          <span class="sem ${ui.cls}">${escapeHtml(ui.label)}</span>
        </div>
        <div class="kpi-val">${escapeHtml(body.value)}</div>
        <div class="kpi-meta">${escapeHtml(body.meta)}</div>
        <div class="kpi-sub">${escapeHtml(body.sub)}</div>
        <div class="kpi-zoom-hint">Zoom ↗</div>
      </article>
    `;
  }).join('');

  host.querySelectorAll('.kpi-card[data-kpi-id]').forEach(card => {
    card.addEventListener('click', () => openKpiModal(card.dataset.kpiId));
  });
}

function kpiPrimary(row) {
  if (String(row.modelo_medicion) === 'monthly_recurrent') {
    return {
      value: `${fmtNum(row.valor_mes, 0)} / ${fmtNum(row.meta_mes, 0)}`,
      meta: `Sostenimiento del ciclo: ${fmtNum(row.meses_cumplidos, 0)}/${fmtNum(row.meta_anual, 0)}`,
      sub: `Cumplimiento del mes: ${Number(row.cumplio_mes || 0) ? 'Sí' : 'No'} · Esperado al corte: ${fmtNum(row.esperado_al_corte, 0)}`
    };
  }

  return {
    value: `${fmtNum(row.valor_acumulado, 2)} / ${fmtNum(row.meta_anual, 2)}`,
    meta: `Valor del mes: ${fmtNum(row.valor_mes, 2)} · Esperado al corte: ${fmtNum(row.esperado_al_corte, 2)}`,
    sub: `Avance anual: ${fmtPct(row.pct_meta_anual)} · Cumplimiento vs esperado: ${fmtPct(row.pct_vs_esperado)}`
  };
}

function renderSummaryTable() {
  const row = selectedTotal();
  const body = document.getElementById('tablaResumenBody');

  if (!row) {
    body.innerHTML = '<tr><td colspan="2">Sin datos para este período.</td></tr>';
    return;
  }

  const entries = [
    ['Municipios atendidos', fmtNum(row.municipios_visitados_mes, 0)],
    ['Inmuebles atendidos', fmtNum(row.inmuebles_atendidos_mes, 0)],
    ['Jornadas operativas (códigos únicos)', fmtNum(row.jornadas_codigos_unicos_mes, 0)],
    ['Filas válidas de recolección', fmtNum(row.filas_recoleccion_validas_mes, 0)],
    ['Litros de aceite del mes', fmtNum(row.litros_aceite_recolectados_mes, 2)],
    ['Litros de agua protegidos del mes', fmtNum(row.litros_agua_protegidos_mes, 2)],
    ['Jabones producidos del mes', fmtNum(row.jabones_producidos_mes, 2)],
    ['Jabones vendidos del mes', fmtNum(row.jabones_vendidos_mes, 2)],
    ['Ingresos por ventas (Q)', fmtNum(row.ingresos_ventas_q_mes, 2)],
    ['Publicaciones en redes', fmtNum(row.publicaciones_redes_mes, 0)],
    ['Pruebas de jabón líquido', fmtNum(row.pruebas_jabon_liquido_mes, 0)]
  ];

  body.innerHTML = entries.map(([label, value]) => `
    <tr>
      <td>${escapeHtml(label)}</td>
      <td class="num">${escapeHtml(value)}</td>
    </tr>
  `).join('');
}

function renderCharts() {
  document.getElementById('chartKpis').innerHTML = renderExecutiveTrendChart();
  document.getElementById('chartCobertura').innerHTML = renderCoverageChart();
  document.getElementById('chartProduccionVentas').innerHTML = renderProductionSalesChart();

  document.getElementById('chartKpis').onclick = () => openChartModal('Tendencia de KPIs estratégicos', 'Avance mensual contra el esperado al corte.', renderExecutiveTrendChart(true));
  document.getElementById('chartCobertura').onclick = () => openChartModal('Recolección y cobertura', 'Municipios, inmuebles y litros de aceite por período.', renderCoverageChart(true));
  document.getElementById('chartProduccionVentas').onclick = () => openChartModal('Producción y ventas', 'Jabones producidos, vendidos e ingresos por ventas.', renderProductionSalesChart(true));
}

function renderExecutiveTrendChart(isModal = false) {
  const strategicIds = INDICATOR_PRIORITY.slice();
  const periods = state.periods;
  if (!periods.length) return emptyChart('Sin períodos publicados todavía.');

  const series = strategicIds.map(id => {
    const rows = indicatorSeries(id);
    const last = rows.at(-1);
    return {
      id,
      label: last?.indicador_nombre || humanizeId(id),
      values: periods.map(p => {
        const row = rows.find(r => String(r.periodo_clave) === String(p));
        if (!row) return null;
        if (String(row.modelo_medicion) === 'monthly_recurrent') {
          const denom = Math.max(1, Number(row.meses_transcurridos || periodToMonth(p) || 1));
          return clamp(Number(row.meses_cumplidos || 0) / denom, 0, 1.25);
        }
        return clamp(Number(row.pct_vs_esperado || 0), 0, 1.25);
      })
    };
  }).filter(s => s.values.some(v => v !== null));

  const width = isModal ? 900 : 560;
  const height = isModal ? 430 : 300;
  return buildMultiLineSvg({
    width,
    height,
    periods,
    series,
    yMax: 1.25,
    formatter: v => `${Math.round(v * 100)}%`,
    legendRight: true,
    selectedPeriod: state.period
  });
}

function renderCoverageChart(isModal = false) {
  const rows = allTotals();
  if (!rows.length) return emptyChart('Sin períodos publicados todavía.');

  const width = isModal ? 900 : 560;
  const height = isModal ? 430 : 300;
  const periods = rows.map(r => r.periodo_clave);
  const max = Math.max(
    1,
    ...rows.map(r => Number(r.municipios_visitados_mes || 0)),
    ...rows.map(r => Number(r.inmuebles_atendidos_mes || 0)),
    ...rows.map(r => Number(r.jornadas_codigos_unicos_mes || 0))
  );

  const barColors = ['#0d7c72', '#1e86b4', '#35b9a9'];
  const barLabels = ['Municipios', 'Inmuebles', 'Jornadas operativas'];
  const datasets = [
    rows.map(r => Number(r.municipios_visitados_mes || 0)),
    rows.map(r => Number(r.inmuebles_atendidos_mes || 0)),
    rows.map(r => Number(r.jornadas_codigos_unicos_mes || 0))
  ];

  const svg = buildGroupedBarSvg({ width, height, periods, datasets, labels: barLabels, colors: barColors, yMax: max * 1.12, selectedPeriod: state.period });
  const note = `<div style="margin-top:10px;font-size:${isModal ? '.85rem' : '.76rem'};color:#5f8a84">Litros de aceite del último período seleccionado: <strong style="color:#0d7c72">${escapeHtml(fmtNum(selectedTotal()?.litros_aceite_recolectados_mes || 0, 2))}</strong>.</div>`;
  return svg + note;
}

function renderProductionSalesChart(isModal = false) {
  const rows = allTotals();
  if (!rows.length) return emptyChart('Sin períodos publicados todavía.');

  const periods = rows.map(r => r.periodo_clave);
  const series = [
    { id: 'produced', label: 'Jabones producidos', values: rows.map(r => Number(r.jabones_producidos_mes || 0)) },
    { id: 'sold', label: 'Jabones vendidos', values: rows.map(r => Number(r.jabones_vendidos_mes || 0)) },
    { id: 'income', label: 'Ingresos Q', values: rows.map(r => Number(r.ingresos_ventas_q_mes || 0)) }
  ];
  const width = isModal ? 900 : 560;
  const height = isModal ? 430 : 300;
  const yMax = Math.max(1, ...series.flatMap(s => s.values)) * 1.12;
  return buildMultiLineSvg({
    width,
    height,
    periods,
    series,
    yMax,
    formatter: v => fmtNum(v, 2),
    legendRight: true,
    selectedPeriod: state.period
  });
}

function buildMultiLineSvg({ width, height, periods, series, yMax, formatter, legendRight = false, selectedPeriod = '' }) {
  const padding = { top: 22, right: legendRight ? 190 : 24, bottom: 46, left: 56 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const colors = ['#0d7c72', '#1e86b4', '#35b9a9', '#8a6200', '#8f1c1c', '#5a6a82'];
  const xStep = periods.length > 1 ? plotW / (periods.length - 1) : 0;
  const y = value => padding.top + plotH - (clamp(value, 0, yMax) / yMax) * plotH;
  const x = idx => padding.left + (periods.length === 1 ? plotW / 2 : idx * xStep);
  const gridTicks = 4;

  const grid = Array.from({ length: gridTicks + 1 }, (_, i) => {
    const v = (yMax / gridTicks) * i;
    const yy = y(v);
    return `
      <line x1="${padding.left}" y1="${yy}" x2="${padding.left + plotW}" y2="${yy}" stroke="#deefec" stroke-width="1" />
      <text x="${padding.left - 10}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#5f8a84">${escapeHtml(formatter(v))}</text>
    `;
  }).join('');

  const lines = series.map((s, idx) => {
    const color = colors[idx % colors.length];
    const points = s.values.map((v, i) => v == null ? null : `${x(i)},${y(v)}`).filter(Boolean);
    if (!points.length) return '';
    const path = points.length === 1
      ? `M ${points[0]} L ${points[0]}`
      : `M ${points.join(' L ')}`;

    const dots = s.values.map((v, i) => {
      if (v == null) return '';
      const isSelected = String(periods[i]) === String(selectedPeriod);
      return `<circle cx="${x(i)}" cy="${y(v)}" r="${isSelected ? 5.5 : 4}" fill="${color}" stroke="#fff" stroke-width="${isSelected ? 2.5 : 1.8}" />`;
    }).join('');

    return `
      <path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
    `;
  }).join('');

  const labels = periods.map((p, i) => `
    <text x="${x(i)}" y="${height - 16}" text-anchor="middle" font-size="11" fill="#5f8a84">${escapeHtml(shortPeriodLabel(p))}</text>
  `).join('');

  const legend = series.map((s, idx) => {
    const color = colors[idx % colors.length];
    return `
      <g transform="translate(${width - padding.right + 18}, ${padding.top + idx * 24})">
        <line x1="0" y1="7" x2="18" y2="7" stroke="${color}" stroke-width="3" stroke-linecap="round"></line>
        <text x="26" y="11" font-size="12" fill="#23524f">${escapeHtml(s.label)}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="Tendencias del programa">
      <rect x="0" y="0" width="${width}" height="${height}" rx="14" fill="transparent"></rect>
      ${grid}
      <line x1="${padding.left}" y1="${padding.top + plotH}" x2="${padding.left + plotW}" y2="${padding.top + plotH}" stroke="#c9e3df" stroke-width="1.5" />
      ${lines}
      ${labels}
      ${legend}
    </svg>
  `;
}

function buildGroupedBarSvg({ width, height, periods, datasets, labels, colors, yMax, selectedPeriod = '' }) {
  const padding = { top: 22, right: 24, bottom: 48, left: 54 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const groups = periods.length;
  const groupW = plotW / Math.max(1, groups);
  const innerGap = 8;
  const barW = Math.max(10, (groupW - innerGap * (datasets.length + 1)) / datasets.length);
  const y = value => padding.top + plotH - (clamp(value, 0, yMax) / yMax) * plotH;

  const gridTicks = 4;
  const grid = Array.from({ length: gridTicks + 1 }, (_, i) => {
    const v = (yMax / gridTicks) * i;
    const yy = y(v);
    return `
      <line x1="${padding.left}" y1="${yy}" x2="${padding.left + plotW}" y2="${yy}" stroke="#deefec" stroke-width="1" />
      <text x="${padding.left - 10}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#5f8a84">${escapeHtml(fmtNum(v, 0))}</text>
    `;
  }).join('');

  const bars = periods.map((p, pi) => {
    const groupX = padding.left + pi * groupW;
    const isSelected = String(p) === String(selectedPeriod);
    const bg = isSelected ? `<rect x="${groupX + 2}" y="${padding.top}" width="${groupW - 4}" height="${plotH}" rx="10" fill="rgba(13,124,114,.05)"></rect>` : '';
    const colBars = datasets.map((ds, di) => {
      const val = Number(ds[pi] || 0);
      const h = Math.max(0, plotH - (y(val) - padding.top));
      const xx = groupX + innerGap + di * (barW + innerGap);
      const yy = y(val);
      return `<rect x="${xx}" y="${yy}" width="${barW}" height="${h}" rx="7" fill="${colors[di]}" opacity="${isSelected ? 1 : .88}"></rect>`;
    }).join('');
    const label = `<text x="${groupX + groupW/2}" y="${height - 16}" text-anchor="middle" font-size="11" fill="#5f8a84">${escapeHtml(shortPeriodLabel(p))}</text>`;
    return bg + colBars + label;
  }).join('');

  const legend = labels.map((label, i) => `
    <g transform="translate(${padding.left + i * 170}, ${height - 6})">
      <rect x="0" y="-10" width="12" height="12" rx="3" fill="${colors[i]}"></rect>
      <text x="18" y="0" font-size="12" fill="#23524f">${escapeHtml(label)}</text>
    </g>
  `).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="Cobertura del programa">
      ${grid}
      <line x1="${padding.left}" y1="${padding.top + plotH}" x2="${padding.left + plotW}" y2="${padding.top + plotH}" stroke="#c9e3df" stroke-width="1.5" />
      ${bars}
      ${legend}
    </svg>
  `;
}

function bindZoomTargets() {
  const kpiModal = document.getElementById('kpiModal');
  const modal = document.getElementById('modalOverlay');
  if (kpiModal) kpiModal.addEventListener('click', e => { if (e.target === kpiModal) closeKpiModalDirect(); });
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModalDirect(); });
}

function openKpiModal(indicatorId) {
  const row = selectedStrategic().find(r => String(r.indicator_id) === String(indicatorId));
  if (!row) return;
  const series = indicatorSeries(indicatorId);
  const ui = statusUi(row.estatus);

  document.getElementById('kpiModalTitle').textContent = row.indicador_nombre;
  document.getElementById('kpiModalSub').textContent = `${periodLabel(state.period)} · ${ui.label} · ${modelLabel(row.modelo_medicion)}`;

  const body = `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:18px">
      <div style="padding:14px 16px;border:1px solid #deefec;border-radius:14px;background:#f8fcfb">
        <div style="font-size:.75rem;color:#5f8a84;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Valor del período</div>
        <div style="font-family:var(--font-mono);font-size:1.7rem;color:#0d2d2c;margin-top:6px">${escapeHtml(String(row.modelo_medicion) === 'monthly_recurrent' ? `${fmtNum(row.valor_mes,0)} / ${fmtNum(row.meta_mes,0)}` : fmtNum(row.valor_mes,2))}</div>
      </div>
      <div style="padding:14px 16px;border:1px solid #deefec;border-radius:14px;background:#f8fcfb">
        <div style="font-size:.75rem;color:#5f8a84;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Acumulado / meta</div>
        <div style="font-family:var(--font-mono);font-size:1.7rem;color:#0d2d2c;margin-top:6px">${escapeHtml(String(row.modelo_medicion) === 'monthly_recurrent' ? `${fmtNum(row.meses_cumplidos,0)}/${fmtNum(row.meta_anual,0)}` : `${fmtNum(row.valor_acumulado,2)} / ${fmtNum(row.meta_anual,2)}`)}</div>
      </div>
    </div>
    <div style="margin-bottom:16px;padding:14px 16px;border:1px solid #deefec;border-radius:14px;background:#fff">
      <div style="font-size:.82rem;color:#23524f;line-height:1.7"><strong>Lectura metodológica:</strong> ${escapeHtml(row.nota_metodologica || 'Sin nota metodológica cargada.')}</div>
    </div>
    ${buildMultiLineSvg({
      width: 880,
      height: 390,
      periods: series.map(r => r.periodo_clave),
      series: [{
        id: indicatorId,
        label: row.indicador_nombre,
        values: series.map(r => String(r.modelo_medicion) === 'monthly_recurrent'
          ? clamp(Number(r.meses_cumplidos || 0) / Math.max(1, Number(r.meses_transcurridos || r.mes_num || 1)), 0, 1.25)
          : clamp(Number(r.pct_vs_esperado || 0), 0, 1.25))
      }],
      yMax: 1.25,
      formatter: v => `${Math.round(v * 100)}%`,
      legendRight: false,
      selectedPeriod: state.period
    })}
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px">
      <div style="padding:12px;border-radius:12px;background:#f4fbfa;border:1px solid #deefec"><small style="display:block;color:#5f8a84">Meta anual</small><strong style="font-family:var(--font-mono)">${escapeHtml(fmtNum(row.meta_anual, 2))}</strong></div>
      <div style="padding:12px;border-radius:12px;background:#f4fbfa;border:1px solid #deefec"><small style="display:block;color:#5f8a84">Esperado al corte</small><strong style="font-family:var(--font-mono)">${escapeHtml(fmtNum(row.esperado_al_corte, 2))}</strong></div>
      <div style="padding:12px;border-radius:12px;background:#f4fbfa;border:1px solid #deefec"><small style="display:block;color:#5f8a84">% meta anual</small><strong style="font-family:var(--font-mono)">${escapeHtml(fmtPct(row.pct_meta_anual))}</strong></div>
      <div style="padding:12px;border-radius:12px;background:#f4fbfa;border:1px solid #deefec"><small style="display:block;color:#5f8a84">% vs esperado</small><strong style="font-family:var(--font-mono)">${escapeHtml(fmtPct(row.pct_vs_esperado))}</strong></div>
    </div>
  `;

  document.getElementById('kpiModalBody').innerHTML = body;
  document.getElementById('kpiModal').classList.add('open');
}

function openChartModal(title, sub, html) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalSub').textContent = sub;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
}

window.closeKpiModal = function (e) {
  if (!e || e.target === document.getElementById('kpiModal')) closeKpiModalDirect();
};
window.closeKpiModalDirect = function () {
  document.getElementById('kpiModal').classList.remove('open');
};
window.closeModal = function (e) {
  if (!e || e.target === document.getElementById('modalOverlay')) closeModalDirect();
};
window.closeModalDirect = function () {
  document.getElementById('modalOverlay').classList.remove('open');
};

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

function setLoading(isVisible, message = '') {
  const el = document.getElementById('loadingState');
  if (!el) return;
  el.style.display = isVisible ? 'flex' : 'none';
  if (message) {
    el.innerHTML = `<div class="spinner"></div><span>${escapeHtml(message)}</span>`;
  }
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

function sortByPeriod(a, b) {
  return String(a.periodo_clave || '').localeCompare(String(b.periodo_clave || ''));
}

function unique(arr) {
  return [...new Set(arr)];
}

function isTruthy(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'sí', 'si', 'yes', 'y'].includes(String(value || '').trim().toLowerCase());
}

function fmtNum(value, digits = 2) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(n);
}

function fmtPct(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(n);
}

function selectedMonthNumber() {
  return periodToMonth(state.period);
}

function periodToMonth(period) {
  const parts = String(period || '').split('-');
  return Number(parts[1] || 0);
}

function periodLabel(period) {
  const p = String(period || '');
  if (!p.includes('-')) return p;
  const [year, month] = p.split('-');
  const idx = Number(month) - 1;
  return `${MONTH_SHORT[idx] || month} ${year}`;
}

function shortPeriodLabel(period) {
  const p = String(period || '');
  if (!p.includes('-')) return p;
  const [, month] = p.split('-');
  return MONTH_SHORT[Number(month) - 1] || p;
}

function modelLabel(model) {
  const m = String(model || '');
  if (m === 'monthly_recurrent') return 'Cumplimiento mensual recurrente';
  if (m === 'annual_cumulative_linear') return 'Acumulado anual lineal';
  return m || 'Sin modelo';
}

function humanizeId(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
}

function statusUi(status) {
  return STATUS_UI[String(status || 'gris').toLowerCase()] || STATUS_UI.gris;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, Number(n || 0)));
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;');
}

function emptyChart(message) {
  return `<div class="chart-empty"><strong>Sin datos suficientes</strong>${escapeHtml(message)}</div>`;
}
