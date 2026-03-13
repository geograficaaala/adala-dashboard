const DATA_PATHS = {
  total: './data/conservando_atitlan/total_mes.csv',
  indicadores: './data/conservando_atitlan/institucional_indicadores.csv',
  jornadas: './data/conservando_atitlan/jornadas_detalle.csv',
  produccion: './data/conservando_atitlan/produccion_detalle.csv',
  ventas: './data/conservando_atitlan/ventas_detalle.csv',
  actividades: './data/conservando_atitlan/actividades_detalle.csv',
};

const TREND_OPTIONS = [
  { id: 'jornadas_mes', label: 'Jornadas de recolección', kind: 'total' },
  { id: 'aceite_litros_mes', label: 'Aceite recolectado', kind: 'total' },
  { id: 'agua_protegida_mes', label: 'Agua protegida', kind: 'total' },
  { id: 'jabones_producidos_mes', label: 'Jabones producidos', kind: 'total' },
  { id: 'ingresos_mes', label: 'Ingresos por ventas', kind: 'total' },
];

const INDICATOR_META = {
  jornadas: { label: 'Jornadas', unit: 'jornadas' },
  aceite_litros: { label: 'Aceite recolectado', unit: 'litros' },
  agua_protegida_litros: { label: 'Agua protegida', unit: 'litros' },
  jabones_producidos: { label: 'Jabones producidos', unit: 'unidades' },
};

let state = {
  datasets: {},
  selectedPeriod: null,
  selectedTrend: 'aceite_litros_mes',
  latestPeriod: null,
  chart: null,
};

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    document.getElementById('statusLabel').textContent = 'Error';
    document.getElementById('kpis').innerHTML = `<article class="card kpi"><div class="label">Error</div><div class="sub">No fue posible cargar los archivos publicados del programa.</div></article>`;
  });
});

async function bootstrap() {
  const [total, indicadores, jornadas, produccion, ventas, actividades] = await Promise.all([
    fetchCsv(DATA_PATHS.total),
    fetchCsv(DATA_PATHS.indicadores),
    fetchCsv(DATA_PATHS.jornadas),
    fetchCsv(DATA_PATHS.produccion),
    fetchCsv(DATA_PATHS.ventas),
    fetchCsv(DATA_PATHS.actividades),
  ]);

  state.datasets = { total, indicadores, jornadas, produccion, ventas, actividades };

  total.forEach((row) => {
    row.anio = toNumber(row.anio);
    row.mes_num = toNumber(row.mes_num);
    row.jornadas_mes = toNumber(row.jornadas_mes);
    row.aceite_litros_mes = toNumber(row.aceite_litros_mes);
    row.agua_protegida_mes = toNumber(row.agua_protegida_mes);
    row.inmuebles_atendidos_mes = toNumber(row.inmuebles_atendidos_mes);
    row.hotel_producidos_mes = toNumber(row.hotel_producidos_mes);
    row.tocador_producidos_mes = toNumber(row.tocador_producidos_mes);
    row.jabones_producidos_mes = toNumber(row.jabones_producidos_mes);
    row.hotel_vendidos_mes = toNumber(row.hotel_vendidos_mes);
    row.tocador_vendidos_mes = toNumber(row.tocador_vendidos_mes);
    row.ingresos_mes = toNumber(row.ingresos_mes);
    row.actividades_mes = toNumber(row.actividades_mes);
    row.jornadas_acum = toNumber(row.jornadas_acum);
    row.aceite_litros_acum = toNumber(row.aceite_litros_acum);
    row.agua_protegida_acum = toNumber(row.agua_protegida_acum);
    row.jabones_producidos_acum = toNumber(row.jabones_producidos_acum);
    row.meta_anual_jornadas = toNumber(row.meta_anual_jornadas);
    row.meta_anual_aceite = toNumber(row.meta_anual_aceite);
    row.meta_anual_agua = toNumber(row.meta_anual_agua);
    row.meta_anual_jabones = toNumber(row.meta_anual_jabones);
    row.meta_esperada_jornadas = toNumber(row.meta_esperada_jornadas);
    row.meta_esperada_aceite = toNumber(row.meta_esperada_aceite);
    row.meta_esperada_agua = toNumber(row.meta_esperada_agua);
    row.meta_esperada_jabones = toNumber(row.meta_esperada_jabones);
    row.pct_avance_anual_jornadas = toNumber(row.pct_avance_anual_jornadas);
    row.pct_avance_anual_aceite = toNumber(row.pct_avance_anual_aceite);
    row.pct_avance_anual_agua = toNumber(row.pct_avance_anual_agua);
    row.pct_avance_anual_jabones = toNumber(row.pct_avance_anual_jabones);
    row.pct_vs_esperado_jornadas = toNumber(row.pct_vs_esperado_jornadas);
    row.pct_vs_esperado_aceite = toNumber(row.pct_vs_esperado_aceite);
    row.pct_vs_esperado_agua = toNumber(row.pct_vs_esperado_agua);
    row.pct_vs_esperado_jabones = toNumber(row.pct_vs_esperado_jabones);
    row.has_any_data = parseBoolean(row.has_any_data);
    row.es_ultimo_mes_con_datos = parseBoolean(row.es_ultimo_mes_con_datos);
  });

  indicadores.forEach((row) => {
    row.anio = toNumber(row.anio);
    row.mes_num = toNumber(row.mes_num);
    row.valor_mes = toNumber(row.valor_mes);
    row.valor_acumulado = toNumber(row.valor_acumulado);
    row.meta_anual = toNumber(row.meta_anual);
    row.meta_esperada_corte = toNumber(row.meta_esperada_corte);
    row.pct_avance_anual = toNumber(row.pct_avance_anual);
    row.pct_vs_esperado = toNumber(row.pct_vs_esperado);
    row.es_ultimo_mes_con_datos = parseBoolean(row.es_ultimo_mes_con_datos);
  });

  for (const rows of [jornadas, produccion, ventas, actividades]) {
    rows.forEach((row) => {
      row.anio = toNumber(row.anio);
      row.mes_num = toNumber(row.mes_num);
    });
  }

  const periods = total
    .filter((row) => row.has_any_data)
    .sort((a, b) => (a.anio - b.anio) || (a.mes_num - b.mes_num));

  if (!periods.length) {
    document.getElementById('statusLabel').textContent = 'Sin datos';
    document.getElementById('kpis').innerHTML = `<article class="card kpi"><div class="label">Sin datos publicados</div><div class="sub">Aún no hay períodos válidos para mostrar.</div></article>`;
    return;
  }

  state.latestPeriod = periods[periods.length - 1].periodo;
  state.selectedPeriod = state.latestPeriod;

  bindControls(periods);
  document.getElementById('statusLabel').textContent = 'Operativo';
  renderAll();
}

function bindControls(periods) {
  const monthSelect = document.getElementById('monthSelect');
  monthSelect.innerHTML = periods
    .slice()
    .reverse()
    .map((row) => `<option value="${escapeHtml(row.periodo)}">${escapeHtml(formatPeriodLabel(row))}</option>`)
    .join('');
  monthSelect.value = state.selectedPeriod;
  monthSelect.addEventListener('change', (event) => {
    state.selectedPeriod = event.target.value;
    renderAll();
  });

  const trendSelect = document.getElementById('trendSelect');
  trendSelect.innerHTML = TREND_OPTIONS
    .map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`)
    .join('');
  trendSelect.value = state.selectedTrend;
  trendSelect.addEventListener('change', (event) => {
    state.selectedTrend = event.target.value;
    renderTrendChart();
  });
}

function renderAll() {
  const current = getCurrentRow();
  if (!current) return;

  document.getElementById('currentPeriod').textContent = formatPeriodLabel(current);
  const latest = state.datasets.total.find((row) => row.periodo === state.latestPeriod);
  document.getElementById('latestPeriod').textContent = latest ? formatPeriodLabel(latest) : '—';
  document.getElementById('lastUpdate').textContent = formatDateTime(current._submission_time);

  renderKpis(current);
  renderProgress(current);
  renderTrendChart();
  renderDiagnostic(current);
  renderDetailTables(current.periodo);
}

function renderKpis(current) {
  const cards = [
    {
      label: 'Jornadas del mes',
      value: formatNumber(current.jornadas_mes),
      sub: `${formatNumber(current.jornadas_acum)} acumuladas en 2026`,
      pct: current.pct_vs_esperado_jornadas,
    },
    {
      label: 'Aceite recolectado',
      value: `${formatNumber(current.aceite_litros_mes)} L`,
      sub: `${formatNumber(current.aceite_litros_acum)} L acumulados`,
      pct: current.pct_vs_esperado_aceite,
    },
    {
      label: 'Agua protegida',
      value: `${formatNumber(current.agua_protegida_mes)} L`,
      sub: `${formatNumber(current.agua_protegida_acum)} L acumulados`,
      pct: current.pct_vs_esperado_agua,
    },
    {
      label: 'Jabones producidos',
      value: formatNumber(current.jabones_producidos_mes),
      sub: `${formatNumber(current.jabones_producidos_acum)} acumulados`,
      pct: current.pct_vs_esperado_jabones,
    },
  ];

  document.getElementById('kpis').innerHTML = cards.map((card) => {
    const tone = statusClass(card.pct);
    return `
      <article class="card kpi">
        <div class="label">${escapeHtml(card.label)}</div>
        <div class="value mono">${escapeHtml(card.value)}</div>
        <div class="sub">${escapeHtml(card.sub)}</div>
        <div style="margin-top:12px"><span class="badge ${tone.className}">${escapeHtml(tone.label)}</span></div>
      </article>
    `;
  }).join('');
}

function renderProgress(current) {
  const rows = state.datasets.indicadores
    .filter((row) => row.periodo === current.periodo)
    .sort((a, b) => {
      const order = ['jornadas', 'aceite_litros', 'agua_protegida_litros', 'jabones_producidos'];
      return order.indexOf(a.indicador_id) - order.indexOf(b.indicador_id);
    });

  document.getElementById('progressList').innerHTML = rows.map((row) => {
    const tone = statusClass(row.pct_vs_esperado);
    const barWidth = Math.max(0, Math.min(100, (row.pct_avance_anual || 0) * 100));
    return `
      <div class="progress-card">
        <div class="progress-top">
          <div>
            <div class="progress-title">${escapeHtml(row.indicador_nombre)}</div>
            <div class="progress-meta">${escapeHtml(formatUnit(row.valor_acumulado, row.unidad))} acumulados</div>
          </div>
          <span class="badge ${tone.className}">${escapeHtml(tone.label)}</span>
        </div>
        <div class="bar"><span style="width:${barWidth}%"></span></div>
        <div class="progress-stats">
          <div><span class="muted">Meta anual</span><strong>${escapeHtml(formatUnit(row.meta_anual, row.unidad))}</strong></div>
          <div><span class="muted">Esperado al corte</span><strong>${escapeHtml(formatUnit(row.meta_esperada_corte, row.unidad))}</strong></div>
          <div><span class="muted">% contra esperado</span><strong>${formatPercent(row.pct_vs_esperado)}</strong></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTrendChart() {
  const rows = state.datasets.total
    .filter((row) => row.has_any_data)
    .slice()
    .sort((a, b) => (a.anio - b.anio) || (a.mes_num - b.mes_num));

  const selected = TREND_OPTIONS.find((option) => option.id === state.selectedTrend) || TREND_OPTIONS[0];
  document.getElementById('trendSubtitle').textContent = `${selected.label} por mes en 2026.`;

  const labels = rows.map((row) => formatPeriodLabel(row));
  const values = rows.map((row) => toNumber(row[selected.id]));
  const latestIndex = rows.findIndex((row) => row.periodo === state.selectedPeriod);

  if (state.chart) state.chart.destroy();
  state.chart = new Chart(document.getElementById('trendChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: selected.label,
        data: values,
        backgroundColor: labels.map((_, index) => index === latestIndex ? 'rgba(30,107,63,0.85)' : 'rgba(27,88,126,0.35)'),
        borderRadius: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${selected.label}: ${formatNumber(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#5f735f' },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#5f735f' },
          grid: { color: 'rgba(26,35,26,.07)' },
        },
      },
    },
  });
}

function renderDiagnostic(current) {
  const rows = state.datasets.indicadores.filter((row) => row.periodo === current.periodo);
  const weakest = rows.slice().sort((a, b) => (a.pct_vs_esperado || 0) - (b.pct_vs_esperado || 0))[0];
  const strongest = rows.slice().sort((a, b) => (b.pct_vs_esperado || 0) - (a.pct_vs_esperado || 0))[0];
  const salesUnits = toNumber(current.hotel_vendidos_mes) + toNumber(current.tocador_vendidos_mes);

  document.getElementById('diagnosticRow').innerHTML = `
    <article class="card mini">
      <h3>Diagnóstico del mes</h3>
      <strong>${escapeHtml(statusClass(average(rows.map((row) => row.pct_vs_esperado))).label)}</strong>
      <p>${escapeHtml(buildDiagnosticText(rows))}</p>
    </article>
    <article class="card mini">
      <h3>Mayor tracción</h3>
      <strong>${escapeHtml(strongest ? strongest.indicador_nombre : '—')}</strong>
      <p>${strongest ? `Va al ${formatPercent(strongest.pct_vs_esperado)} de lo esperado al corte.` : 'Sin datos.'}</p>
    </article>
    <article class="card mini">
      <h3>Capa operativa</h3>
      <strong>${formatNumber(salesUnits)} vendidos</strong>
      <p>${formatCurrency(current.ingresos_mes)} en ingresos y ${formatNumber(current.actividades_mes)} actividades complementarias en el período.</p>
    </article>
  `;
}

function renderDetailTables(periodo) {
  const jornadas = state.datasets.jornadas.filter((row) => row.periodo === periodo);
  const produccion = state.datasets.produccion.filter((row) => row.periodo === periodo);
  const ventas = state.datasets.ventas.filter((row) => row.periodo === periodo);
  const actividades = state.datasets.actividades.filter((row) => row.periodo === periodo);

  renderTable('jornadasTable', jornadas, [
    { key: 'fecha_jornada', label: 'Fecha', format: formatDate },
    { key: 'municipios_visitados_texto', label: 'Municipios visitados' },
    { key: 'num_municipios_visitados', label: '# municipios', format: formatNumber },
    { key: 'inmuebles_atendidos', label: 'Inmuebles atendidos', format: formatNumber },
    { key: 'litros_aceite_jornada', label: 'Aceite (L)', format: formatNumber },
    { key: 'agua_protegida_jornada', label: 'Agua protegida (L)', format: formatNumber },
    { key: 'observaciones_jornada', label: 'Observaciones' },
  ]);

  renderTable('produccionTable', produccion, [
    { key: 'fecha_produccion', label: 'Fecha', format: formatDate },
    { key: 'codigo_lote', label: 'Lote' },
    { key: 'litros_aceite_utilizados', label: 'Aceite usado (L)', format: formatNumber },
    { key: 'hotel_producidos', label: 'Hotel', format: formatNumber },
    { key: 'tocador_producidos', label: 'Tocador', format: formatNumber },
    { key: 'jabones_oficiales_lote', label: 'Total oficial', format: formatNumber },
    { key: 'observaciones_produccion', label: 'Observaciones' },
  ]);

  renderTable('ventasTable', ventas, [
    { key: 'fecha_venta', label: 'Fecha', format: formatDate },
    { key: 'tipo_cliente', label: 'Tipo cliente', format: titleCase },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'hotel_vendidos', label: 'Hotel vendidos', format: formatNumber },
    { key: 'precio_hotel_unit', label: 'Precio hotel', format: formatCurrency },
    { key: 'tocador_vendidos', label: 'Tocador vendidos', format: formatNumber },
    { key: 'precio_tocador_unit', label: 'Precio tocador', format: formatCurrency },
    { key: 'total_venta', label: 'Total venta', format: formatCurrency },
    { key: 'fuente_precio', label: 'Fuente precio', format: titleCase },
  ]);

  renderTable('actividadesTable', actividades, [
    { key: 'fecha_actividad', label: 'Fecha', format: formatDate },
    { key: 'tipo_actividad', label: 'Tipo', format: titleCase },
    { key: 'cantidad_actividad', label: 'Cantidad', format: formatNumber },
    { key: 'municipio_actividad', label: 'Municipio' },
    { key: 'descripcion_actividad', label: 'Descripción' },
  ]);
}

function renderTable(targetId, rows, columns) {
  const container = document.getElementById(targetId);
  if (!rows.length) {
    container.innerHTML = `<div class="empty">No hay registros para el mes seleccionado.</div>`;
    return;
  }

  const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rows.map((row) => {
    const cells = columns.map((column) => {
      const raw = row[column.key];
      const text = column.format ? column.format(raw) : fallbackText(raw);
      return `<td>${escapeHtml(text)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  container.innerHTML = `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

async function fetchCsv(path) {
  const response = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  const text = await response.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) console.warn(path, parsed.errors);
  return parsed.data;
}

function getCurrentRow() {
  return state.datasets.total.find((row) => row.periodo === state.selectedPeriod) || null;
}

function formatPeriodLabel(row) {
  return `${fallbackText(row.mes)} ${fallbackText(row.anio)}`.trim();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallbackText(value);
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(date);
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallbackText(value);
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatNumber(value) {
  const n = toNumber(value);
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 }).format(n);
}

function formatCurrency(value) {
  const n = toNumber(value);
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 2 }).format(n);
}

function formatPercent(value) {
  const n = toNumber(value) * 100;
  return `${new Intl.NumberFormat('es-GT', { maximumFractionDigits: 1 }).format(n)}%`;
}

function formatUnit(value, unit) {
  const label = unit === 'unidades' ? '' : unit === 'jornadas' ? '' : unit === 'litros' ? ' L' : '';
  return `${formatNumber(value)}${label}`.trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function fallbackText(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function titleCase(value) {
  const text = fallbackText(value);
  if (text === '—') return text;
  return text.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function average(values) {
  const valid = values.filter((x) => Number.isFinite(x));
  if (!valid.length) return 0;
  return valid.reduce((sum, x) => sum + x, 0) / valid.length;
}

function buildDiagnosticText(rows) {
  if (!rows.length) return 'No hay suficientes datos para interpretar el período.';
  const avg = average(rows.map((row) => row.pct_vs_esperado));
  if (avg >= 1) return 'El programa va en línea o por encima de la meta esperada al corte.';
  if (avg >= 0.75) return 'El programa muestra avance, pero todavía está por debajo del ritmo esperado anual.';
  return 'El programa requiere acelerar el ritmo operativo para acercarse a la meta esperada al corte.';
}

function statusClass(value) {
  const pct = toNumber(value);
  if (pct >= 1) return { className: 'ok', label: 'En línea o adelantado' };
  if (pct >= 0.75) return { className: 'mid', label: 'Requiere empuje' };
  return { className: 'bad', label: 'Rezago' };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
