const DATA_PATHS = {
  total: './data/conservando_atitlan/total_mes.csv',
  indicadores: './data/conservando_atitlan/institucional_indicadores.csv',
  jornadas: './data/conservando_atitlan/jornadas_detalle.csv',
  produccion: './data/conservando_atitlan/produccion_detalle.csv',
  ventas: './data/conservando_atitlan/ventas_detalle.csv',
  actividades: './data/conservando_atitlan/actividades_detalle.csv',
};

const CHART_MODES = [
  { id: 'pct_acumulado', label: 'Avance acumulado vs esperado (%)' },
  { id: 'valor_mes', label: 'Valores mensuales por indicador' },
];

const state = {
  datasets: {},
  selectedPeriod: null,
  latestPeriod: null,
  chartMode: CHART_MODES[0].id,
  chart: null,
};

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    document.getElementById('statusLabel').textContent = 'Error';
    document.getElementById('kpis').innerHTML = `
      <article class="card kpi">
        <div class="label">No se pudo cargar el dashboard</div>
        <div class="sub">${escapeHtml(error.message || 'Error desconocido')}</div>
      </article>`;
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
    [
      'anio','mes_num','jornadas_mes','aceite_litros_mes','agua_protegida_mes','inmuebles_atendidos_mes',
      'hotel_producidos_mes','tocador_producidos_mes','jabones_producidos_mes','hotel_vendidos_mes','tocador_vendidos_mes',
      'ingresos_mes','actividades_mes','meta_anual_jornadas','meta_anual_aceite','meta_anual_agua','meta_anual_jabones',
      'jornadas_acum','aceite_litros_acum','agua_protegida_acum','jabones_producidos_acum','meta_esperada_jornadas',
      'meta_esperada_aceite','meta_esperada_agua','meta_esperada_jabones','pct_avance_anual_jornadas','pct_avance_anual_aceite',
      'pct_avance_anual_agua','pct_avance_anual_jabones','pct_vs_esperado_jornadas','pct_vs_esperado_aceite',
      'pct_vs_esperado_agua','pct_vs_esperado_jabones'
    ].forEach((key) => row[key] = toNumber(row[key]));
    row.has_any_data = parseBoolean(row.has_any_data);
    row.es_ultimo_mes_con_datos = parseBoolean(row.es_ultimo_mes_con_datos);
  });

  indicadores.forEach((row) => {
    ['anio','mes_num','valor_mes','valor_acumulado','meta_anual','meta_esperada_corte','pct_avance_anual','pct_vs_esperado']
      .forEach((key) => row[key] = toNumber(row[key]));
    row.es_ultimo_mes_con_datos = parseBoolean(row.es_ultimo_mes_con_datos);
  });

  [jornadas, produccion, ventas, actividades].forEach((rows) => {
    rows.forEach((row) => {
      row.anio = toNumber(row.anio);
      row.mes_num = toNumber(row.mes_num);
    });
  });

  const periods = total
    .filter((row) => row.has_any_data)
    .slice()
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
  monthSelect.innerHTML = periods.slice().reverse().map((row) =>
    `<option value="${escapeHtml(row.periodo)}">${escapeHtml(formatPeriodLabel(row))}</option>`
  ).join('');
  monthSelect.value = state.selectedPeriod;
  monthSelect.addEventListener('change', (event) => {
    state.selectedPeriod = event.target.value;
    renderAll();
  });

  const chartModeSelect = document.getElementById('chartModeSelect');
  chartModeSelect.innerHTML = CHART_MODES.map((row) =>
    `<option value="${escapeHtml(row.id)}">${escapeHtml(row.label)}</option>`
  ).join('');
  chartModeSelect.value = state.chartMode;
  chartModeSelect.addEventListener('change', (event) => {
    state.chartMode = event.target.value;
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
      sub: `${formatNumber(current.jornadas_acum)} acumuladas de ${formatNumber(current.meta_anual_jornadas)}`,
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
    .sort((a, b) => indicatorOrder(a.indicador_id) - indicatorOrder(b.indicador_id));

  document.getElementById('progressList').innerHTML = rows.map((row) => {
    const tone = statusClass(row.pct_vs_esperado);
    const barWidth = Math.max(0, Math.min(100, (row.pct_avance_anual || 0) * 100));
    return `
      <div class="progress-card">
        <div class="progress-top">
          <div>
            <div class="progress-title">${escapeHtml(row.indicador_nombre)}</div>
            <div class="progress-meta">${escapeHtml(formatUnit(row.valor_mes, row.unidad))} en el mes · ${escapeHtml(formatUnit(row.valor_acumulado, row.unidad))} acumulados</div>
          </div>
          <span class="badge ${tone.className}">${escapeHtml(tone.label)}</span>
        </div>
        <div class="bar"><span style="width:${barWidth}%"></span></div>
        <div class="progress-stats">
          <div><span class="muted">Meta anual</span><strong>${escapeHtml(formatUnit(row.meta_anual, row.unidad))}</strong></div>
          <div><span class="muted">Esperado al corte</span><strong>${escapeHtml(formatUnit(row.meta_esperada_corte, row.unidad))}</strong></div>
          <div><span class="muted">% vs esperado</span><strong>${formatPercent(row.pct_vs_esperado)}</strong></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTrendChart() {
  const totalRows = state.datasets.total
    .filter((row) => row.has_any_data)
    .slice()
    .sort((a, b) => (a.anio - b.anio) || (a.mes_num - b.mes_num));

  const current = getCurrentRow();
  const ctx = document.getElementById('trendChart');
  const mode = state.chartMode;

  if (state.chart) state.chart.destroy();

  if (mode === 'pct_acumulado') {
    document.getElementById('trendSubtitle').textContent = 'Comparación del avance acumulado de los cuatro indicadores frente al ritmo esperado del año.';

    const labels = totalRows.map((row) => formatPeriodLabel(row));
    const selectedIndex = totalRows.findIndex((row) => row.periodo === state.selectedPeriod);
    const expectedSeries = totalRows.map((row) => (row.meta_esperada_jornadas && row.meta_anual_jornadas)
      ? (row.meta_esperada_jornadas / row.meta_anual_jornadas) * 100
      : ((row.mes_num / 12) * 100));

    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          buildLineDataset('Jornadas', totalRows.map((r) => r.pct_avance_anual_jornadas * 100), '#1e6b3f', selectedIndex),
          buildLineDataset('Aceite', totalRows.map((r) => r.pct_avance_anual_aceite * 100), '#1b587e', selectedIndex),
          buildLineDataset('Agua protegida', totalRows.map((r) => r.pct_avance_anual_agua * 100), '#8b6100', selectedIndex),
          buildLineDataset('Jabones', totalRows.map((r) => r.pct_avance_anual_jabones * 100), '#9b2f2f', selectedIndex),
          {
            label: 'Esperado al corte',
            data: expectedSeries,
            borderColor: '#6c757d',
            backgroundColor: 'rgba(108,117,125,.15)',
            borderDash: [8, 6],
            pointRadius: 0,
            pointHoverRadius: 0,
            borderWidth: 2,
            tension: 0,
          }
        ]
      },
      options: chartOptions('% de meta anual', (value) => `${formatNumber(value)}%`)
    });
    return;
  }

  document.getElementById('trendSubtitle').textContent = `Comparación mensual del período seleccionado (${formatPeriodLabel(current)} visible en tablas y KPIs).`;
  const labels = totalRows.map((row) => formatPeriodLabel(row));
  const selectedIndex = totalRows.findIndex((row) => row.periodo === state.selectedPeriod);

  state.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        buildBarDataset('Jornadas', totalRows.map((r) => r.jornadas_mes), 'rgba(30,107,63,.82)', selectedIndex),
        buildBarDataset('Jabones producidos', totalRows.map((r) => r.jabones_producidos_mes), 'rgba(27,88,126,.62)', selectedIndex),
        {
          type: 'line',
          label: 'Aceite recolectado (L)',
          data: totalRows.map((r) => r.aceite_litros_mes),
          borderColor: '#8b6100',
          backgroundColor: 'rgba(139,97,0,.15)',
          borderWidth: 3,
          tension: .25,
          yAxisID: 'y1'
        },
        {
          type: 'line',
          label: 'Agua protegida (L)',
          data: totalRows.map((r) => r.agua_protegida_mes),
          borderColor: '#9b2f2f',
          backgroundColor: 'rgba(155,47,47,.12)',
          borderWidth: 3,
          tension: .25,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatNumber(context.parsed.y)}`,
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#5f735f' } },
        y: {
          beginAtZero: true,
          ticks: { color: '#5f735f' },
          grid: { color: 'rgba(26,35,26,.07)' },
          title: { display: true, text: 'Jornadas / jabones' }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#5f735f' },
          title: { display: true, text: 'Litros' }
        }
      }
    }
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

function indicatorOrder(id) {
  return ['jornadas', 'aceite_litros', 'agua_protegida_litros', 'jabones_producidos'].indexOf(id);
}

function buildLineDataset(label, data, color, selectedIndex) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 3,
    tension: .25,
    fill: false,
    pointRadius: data.map((_, index) => index === selectedIndex ? 5 : 3),
    pointHoverRadius: 6,
  };
}

function buildBarDataset(label, data, color, selectedIndex) {
  return {
    label,
    data,
    backgroundColor: data.map((_, index) => index === selectedIndex ? color.replace('.62', '.92').replace('.82', '.96') : color),
    borderRadius: 8,
  };
}

function chartOptions(yTitle, tooltipFormatter) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${tooltipFormatter(context.parsed.y)}`,
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
        title: { display: true, text: yTitle },
      },
    },
  };
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
  const label = unit === 'litros' ? ' L' : unit === 'unidades' ? '' : unit === 'jornadas' ? '' : '';
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
