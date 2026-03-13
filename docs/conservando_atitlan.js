const DATA_PATHS = {
  total: './data/conservando_atitlan/total_mes.csv',
  indicadores: './data/conservando_atitlan/institucional_indicadores.csv',
  jornadas: './data/conservando_atitlan/jornadas_detalle.csv',
  produccion: './data/conservando_atitlan/produccion_detalle.csv',
  ventas: './data/conservando_atitlan/ventas_detalle.csv',
  actividades: './data/conservando_atitlan/actividades_detalle.csv',
};

const INDICATOR_ORDER = ['jornadas', 'aceite_litros', 'agua_protegida_litros', 'jabones_producidos'];
const INDICATOR_COLORS = {
  jornadas: '#2d8a52',
  aceite_litros: '#1a547a',
  agua_protegida_litros: '#7a5500',
  jabones_producidos: '#8f1c1c',
  esperado: '#6b7280',
};

const state = {
  datasets: null,
  selectedPeriod: null,
  latestPeriod: null,
  chart: null,
};

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    document.getElementById('statusLabel').textContent = 'Error';
    document.getElementById('detailTables').innerHTML = `<div class="empty">No fue posible cargar los datos del programa.</div>`;
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

  normalizeTotal(total);
  normalizeIndicadores(indicadores);
  normalizeDetailRows(jornadas);
  normalizeDetailRows(produccion);
  normalizeDetailRows(ventas);
  normalizeDetailRows(actividades);

  state.datasets = { total, indicadores, jornadas, produccion, ventas, actividades };

  const periods = total
    .filter((row) => row.has_any_data)
    .slice()
    .sort((a, b) => (a.anio - b.anio) || (a.mes_num - b.mes_num));

  if (!periods.length) {
    document.getElementById('statusLabel').textContent = 'Sin datos';
    document.getElementById('kpiSection').innerHTML = '<article class="card kpi-card"><div class="kpi-label">Sin datos publicados</div><div class="kpi-sub">Aún no hay períodos válidos para mostrar.</div></article>';
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
  monthSelect.innerHTML = periods.slice().reverse().map((row) =>
    `<option value="${escapeHtml(row.periodo)}">${escapeHtml(formatPeriodLabel(row))}</option>`
  ).join('');
  monthSelect.value = state.selectedPeriod;
  monthSelect.addEventListener('change', (event) => {
    state.selectedPeriod = event.target.value;
    renderAll();
  });
}

function renderAll() {
  const current = getCurrentRow();
  if (!current) return;

  document.getElementById('currentPeriod').textContent = formatPeriodLabel(current);
  document.getElementById('latestPeriod').textContent = formatPeriodLabel(getLatestRow());
  document.getElementById('latestPeriodBox').textContent = formatPeriodLabel(getLatestRow());
  document.getElementById('lastUpdate').textContent = formatDateTime(current._submission_time);
  document.getElementById('coverageStat').textContent = `${formatNumber(current.inmuebles_atendidos_mes)} inmuebles`;

  renderKpis(current);
  renderProgress(current);
  renderTrendChart();
  renderDiagnostic(current);
  renderDetailTables(current.periodo);
}

function renderKpis(current) {
  const rows = state.datasets.indicadores
    .filter((row) => row.periodo === current.periodo)
    .sort((a, b) => INDICATOR_ORDER.indexOf(a.indicador_id) - INDICATOR_ORDER.indexOf(b.indicador_id));

  const container = document.getElementById('kpiSection');
  container.innerHTML = rows.map((row) => {
    const status = statusClass(row.pct_vs_esperado);
    return `
      <article class="card kpi-card">
        <div class="kpi-label">
          <span>${escapeHtml(row.indicador_nombre)}</span>
          <span class="badge ${status.className}">${escapeHtml(status.label)}</span>
        </div>
        <div class="kpi-value mono">${escapeHtml(formatUnitCompact(row.valor_mes, row.unidad))}</div>
        <div class="kpi-sub">${escapeHtml(formatUnit(row.valor_mes, row.unidad))} en el mes · ${escapeHtml(formatUnit(row.valor_acumulado, row.unidad))} acumulados</div>
        <div class="kpi-meta">
          <div><span>Meta anual</span><strong>${escapeHtml(formatUnit(row.meta_anual, row.unidad))}</strong></div>
          <div><span>Esperado al corte</span><strong>${escapeHtml(formatUnit(row.meta_esperada_corte, row.unidad))}</strong></div>
          <div><span>Avance anual</span><strong>${escapeHtml(formatPercent(row.pct_avance_anual))}</strong></div>
          <div><span>Vs esperado</span><strong>${escapeHtml(formatPercent(row.pct_vs_esperado))}</strong></div>
        </div>
      </article>
    `;
  }).join('');
}

function renderProgress(current) {
  const rows = state.datasets.indicadores
    .filter((row) => row.periodo === current.periodo)
    .sort((a, b) => INDICATOR_ORDER.indexOf(a.indicador_id) - INDICATOR_ORDER.indexOf(b.indicador_id));

  document.getElementById('progressList').innerHTML = rows.map((row) => {
    const status = statusClass(row.pct_vs_esperado);
    const width = clamp((row.pct_avance_anual || 0) * 100, 0, 100);
    return `
      <div class="progress-card">
        <div class="progress-head">
          <div>
            <div class="progress-title">${escapeHtml(row.indicador_nombre)}</div>
            <div class="progress-sub">${escapeHtml(formatUnit(row.valor_acumulado, row.unidad))} acumulados al corte</div>
          </div>
          <span class="badge ${status.className}">${escapeHtml(status.label)}</span>
        </div>
        <div class="bar"><span style="width:${width}%"></span></div>
        <div class="progress-stats">
          <div><span>Meta anual</span><strong>${escapeHtml(formatUnit(row.meta_anual, row.unidad))}</strong></div>
          <div><span>Esperado</span><strong>${escapeHtml(formatUnit(row.meta_esperada_corte, row.unidad))}</strong></div>
          <div><span>% vs esperado</span><strong>${escapeHtml(formatPercent(row.pct_vs_esperado))}</strong></div>
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

  const selectedIndex = rows.findIndex((row) => row.periodo === state.selectedPeriod);
  const ctx = document.getElementById('trendChart');
  if (state.chart) state.chart.destroy();

  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map((row) => formatPeriodLabel(row)),
      datasets: [
        buildLineDataset('Jornadas', rows.map((r) => percent(r.pct_avance_anual_jornadas)), INDICATOR_COLORS.jornadas, selectedIndex),
        buildLineDataset('Aceite recolectado', rows.map((r) => percent(r.pct_avance_anual_aceite)), INDICATOR_COLORS.aceite_litros, selectedIndex),
        buildLineDataset('Agua protegida', rows.map((r) => percent(r.pct_avance_anual_agua)), INDICATOR_COLORS.agua_protegida_litros, selectedIndex),
        buildLineDataset('Jabones producidos', rows.map((r) => percent(r.pct_avance_anual_jabones)), INDICATOR_COLORS.jabones_producidos, selectedIndex),
        {
          label: 'Esperado al corte',
          data: rows.map((r) => percent((r.mes_num || 0) / 12)),
          borderColor: INDICATOR_COLORS.esperado,
          backgroundColor: 'rgba(107,114,128,.08)',
          borderDash: [8, 6],
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 2,
          tension: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            padding: 18,
            color: '#344d34',
            font: { family: 'DM Sans', size: 12, weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatNumber(context.parsed.y, 1)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#5c7a5c', font: { family: 'DM Sans', size: 11 } },
          grid: { display: false },
          border: { color: '#d7e2d7' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#5c7a5c',
            callback: (value) => `${formatNumber(value, 0)}%`,
            font: { family: 'DM Sans', size: 11 }
          },
          grid: { color: 'rgba(205,218,205,.6)' },
          border: { color: '#d7e2d7' },
          title: {
            display: true,
            text: '% de meta anual',
            color: '#344d34',
            font: { family: 'DM Sans', size: 12, weight: '700' }
          }
        }
      }
    }
  });
}

function renderDiagnostic(current) {
  const rows = state.datasets.indicadores
    .filter((row) => row.periodo === current.periodo)
    .sort((a, b) => INDICATOR_ORDER.indexOf(a.indicador_id) - INDICATOR_ORDER.indexOf(b.indicador_id));

  const best = rows.slice().sort((a, b) => (b.pct_vs_esperado || 0) - (a.pct_vs_esperado || 0))[0];
  const worst = rows.slice().sort((a, b) => (a.pct_vs_esperado || 0) - (b.pct_vs_esperado || 0))[0];
  const currentSales = (current.hotel_vendidos_mes || 0) + (current.tocador_vendidos_mes || 0);

  document.getElementById('diagnosticSection').innerHTML = `
    <article class="card diagnostic-card">
      <div class="diagnostic-kicker">Indicador más adelantado</div>
      <div class="diagnostic-value">${escapeHtml(best ? best.indicador_nombre : '—')}</div>
      <div class="diagnostic-copy">${best ? `${formatPercent(best.pct_vs_esperado)} del ritmo esperado al corte.` : 'Sin datos suficientes.'}</div>
    </article>
    <article class="card diagnostic-card">
      <div class="diagnostic-kicker">Indicador con mayor rezago</div>
      <div class="diagnostic-value">${escapeHtml(worst ? worst.indicador_nombre : '—')}</div>
      <div class="diagnostic-copy">${worst ? `${formatPercent(worst.pct_vs_esperado)} del ritmo esperado al corte.` : 'Sin datos suficientes.'}</div>
    </article>
    <article class="card diagnostic-card">
      <div class="diagnostic-kicker">Actividad comercial del mes</div>
      <div class="diagnostic-value mono">${escapeHtml(formatCurrency(current.ingresos_mes || 0))}</div>
      <div class="diagnostic-copy">${escapeHtml(formatNumber(currentSales))} jabones vendidos y ${escapeHtml(formatNumber(current.actividades_mes || 0))} actividades complementarias registradas.</div>
    </article>
  `;
}

function renderDetailTables(periodo) {
  const blocks = [
    {
      title: 'Jornadas del período',
      rows: state.datasets.jornadas.filter((row) => row.periodo === periodo),
      columns: [
        ['fecha_jornada', 'Fecha'],
        ['municipios_visitados_texto', 'Municipios visitados'],
        ['num_municipios_visitados', 'N.º municipios'],
        ['inmuebles_atendidos', 'Inmuebles atendidos'],
        ['litros_aceite_jornada', 'Aceite (L)'],
        ['agua_protegida_jornada', 'Agua protegida (L)'],
      ]
    },
    {
      title: 'Producción del período',
      rows: state.datasets.produccion.filter((row) => row.periodo === periodo),
      columns: [
        ['fecha_produccion', 'Fecha'],
        ['codigo_lote', 'Lote'],
        ['litros_aceite_utilizados', 'Aceite usado (L)'],
        ['hotel_producidos', 'Hotel'],
        ['tocador_producidos', 'Tocador'],
        ['jabones_oficiales_lote', 'Total oficial'],
      ]
    },
    {
      title: 'Ventas del período',
      rows: state.datasets.ventas.filter((row) => row.periodo === periodo),
      columns: [
        ['fecha_venta', 'Fecha'],
        ['tipo_cliente', 'Tipo de cliente'],
        ['cliente_nombre', 'Cliente'],
        ['hotel_vendidos', 'Hotel'],
        ['tocador_vendidos', 'Tocador'],
        ['total_venta', 'Ingreso total'],
      ]
    },
    {
      title: 'Actividades complementarias',
      rows: state.datasets.actividades.filter((row) => row.periodo === periodo),
      columns: [
        ['fecha_actividad', 'Fecha'],
        ['tipo_actividad', 'Tipo'],
        ['cantidad_actividad', 'Cantidad'],
        ['municipio_actividad', 'Municipio'],
        ['descripcion_actividad', 'Descripción'],
      ]
    }
  ];

  document.getElementById('detailTables').innerHTML = blocks.map((block) => renderTableBlock(block.title, block.rows, block.columns)).join('');
}

function renderTableBlock(title, rows, columns) {
  if (!rows.length) {
    return `
      <div style="margin-top:18px">
        <div class="panel-title" style="margin-bottom:10px">${escapeHtml(title)}</div>
        <div class="table-wrap"><div class="empty">Sin registros para este período.</div></div>
      </div>
    `;
  }

  const header = columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('');
  const body = rows.map((row) => {
    return `<tr>${columns.map(([key]) => `<td>${escapeHtml(formatCell(row[key], key))}</td>`).join('')}</tr>`;
  }).join('');

  return `
    <div style="margin-top:18px">
      <div class="panel-title" style="margin-bottom:10px">${escapeHtml(title)}</div>
      <div class="table-wrap">
        <table>
          <thead><tr>${header}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>
  `;
}

function buildLineDataset(label, data, color, selectedIndex) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 3,
    tension: .25,
    pointRadius: data.map((_, index) => index === selectedIndex ? 5 : 2.5),
    pointHoverRadius: data.map((_, index) => index === selectedIndex ? 6 : 4),
    pointBorderWidth: 2,
    pointBackgroundColor: data.map((_, index) => index === selectedIndex ? '#ffffff' : color),
    pointBorderColor: color,
    fill: false,
  };
}

function getCurrentRow() {
  return state.datasets.total.find((row) => row.periodo === state.selectedPeriod) || null;
}

function getLatestRow() {
  return state.datasets.total.find((row) => row.periodo === state.latestPeriod) || state.datasets.total[0];
}

function normalizeTotal(rows) {
  const numericFields = [
    'anio','mes_num','jornadas_mes','aceite_litros_mes','agua_protegida_mes','inmuebles_atendidos_mes',
    'hotel_producidos_mes','tocador_producidos_mes','jabones_producidos_mes','hotel_vendidos_mes','tocador_vendidos_mes',
    'ingresos_mes','actividades_mes','meta_anual_jornadas','meta_anual_aceite','meta_anual_agua','meta_anual_jabones',
    'jornadas_acum','aceite_litros_acum','agua_protegida_acum','jabones_producidos_acum','meta_esperada_jornadas',
    'meta_esperada_aceite','meta_esperada_agua','meta_esperada_jabones','pct_avance_anual_jornadas','pct_avance_anual_aceite',
    'pct_avance_anual_agua','pct_avance_anual_jabones','pct_vs_esperado_jornadas','pct_vs_esperado_aceite','pct_vs_esperado_agua',
    'pct_vs_esperado_jabones'
  ];
  rows.forEach((row) => {
    numericFields.forEach((key) => row[key] = toNumber(row[key]));
    row.has_any_data = parseBoolean(row.has_any_data);
    row.es_ultimo_mes_con_datos = parseBoolean(row.es_ultimo_mes_con_datos);
  });
}

function normalizeIndicadores(rows) {
  const numericFields = ['anio','mes_num','valor_mes','valor_acumulado','meta_anual','meta_esperada_corte','pct_avance_anual','pct_vs_esperado'];
  rows.forEach((row) => {
    numericFields.forEach((key) => row[key] = toNumber(row[key]));
    row.es_ultimo_mes_con_datos = parseBoolean(row.es_ultimo_mes_con_datos);
  });
}

function normalizeDetailRows(rows) {
  rows.forEach((row) => {
    row.anio = toNumber(row.anio);
    row.mes_num = toNumber(row.mes_num);
  });
}

async function fetchCsv(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar ${path} (${response.status})`);
  const text = await response.text();
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

function formatPeriodLabel(row) {
  return `${row.mes || ''} ${row.anio || ''}`.trim();
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatNumber(value, decimals = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('es-GT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(number);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${formatNumber(number * 100, 1)}%`;
}

function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 2 }).format(number);
}

function formatUnit(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (unit === 'litros') return `${formatNumber(number)} L`;
  if (unit === 'jornadas') return `${formatNumber(number)} jornadas`;
  if (unit === 'unidades') return `${formatNumber(number)} unidades`;
  return formatNumber(number);
}

function formatUnitCompact(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (unit === 'litros') return `${formatNumber(number)} L`;
  if (unit === 'jornadas') return formatNumber(number);
  if (unit === 'unidades') return formatNumber(number);
  return formatNumber(number);
}

function formatCell(value, key) {
  if (value == null || value === '') return '—';
  const numericKeys = [
    'num_municipios_visitados','inmuebles_atendidos','litros_aceite_jornada','agua_protegida_jornada','litros_aceite_utilizados',
    'hotel_producidos','tocador_producidos','jabones_oficiales_lote','hotel_vendidos','tocador_vendidos','cantidad_actividad'
  ];
  if (key === 'total_venta') return formatCurrency(value);
  if (numericKeys.includes(key)) return formatNumber(value);
  return String(value);
}

function toNumber(value) {
  if (value == null || value === '') return NaN;
  const normalized = String(value).replace(/,/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'yes', 'si', 'sí'].includes(normalized);
}

function statusClass(value) {
  const ratio = Number(value);
  if (!Number.isFinite(ratio)) return { className: 'mid', label: 'Sin referencia' };
  if (ratio >= 1) return { className: 'ok', label: 'Adelantado' };
  if (ratio >= 0.75) return { className: 'mid', label: 'En seguimiento' };
  return { className: 'bad', label: 'Con rezago' };
}

function percent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number * 100 : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
