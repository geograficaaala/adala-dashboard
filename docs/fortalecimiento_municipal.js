const DATA_PATHS = {
  total: './data/fortalecimiento_municipal/total_mes.csv',
  indicadores: './data/fortalecimiento_municipal/institucional_indicadores.csv',
  capacitaciones: './data/fortalecimiento_municipal/capacitaciones_detalle.csv',
  asistencias: './data/fortalecimiento_municipal/asistencias_detalle.csv',
  estudios: './data/fortalecimiento_municipal/estudios_detalle.csv',
  pirds: './data/fortalecimiento_municipal/pirds_detalle.csv',
  reuniones: './data/fortalecimiento_municipal/reuniones_detalle.csv',
};

const INDICATORS = [
  {
    id: 'municipios_capacitados',
    name: 'Municipios capacitados',
    month: 'municipios_capacitados_mes',
    accum: 'municipios_capacitados_acum',
    meta: 'meta_anual_municipios_capacitados',
    expected: 'municipios_capacitados_esperado',
    pctMeta: 'municipios_capacitados_pct_meta',
    pctExpected: 'municipios_capacitados_pct_esperado',
    color: '#2d8a52',
  },
  {
    id: 'personas_capacitadas',
    name: 'Personas capacitadas',
    month: 'personas_capacitadas_mes',
    accum: 'personas_capacitadas_acum',
    meta: 'meta_anual_personas_capacitadas',
    expected: 'personas_capacitadas_esperado',
    pctMeta: 'personas_capacitadas_pct_meta',
    pctExpected: 'personas_capacitadas_pct_esperado',
    color: '#1a547a',
  },
  {
    id: 'asistencias_tecnicas',
    name: 'Asistencias técnicas',
    month: 'asistencias_tecnicas_mes',
    accum: 'asistencias_tecnicas_acum',
    meta: 'meta_anual_asistencias_tecnicas',
    expected: 'asistencias_tecnicas_esperado',
    pctMeta: 'asistencias_tecnicas_pct_meta',
    pctExpected: 'asistencias_tecnicas_pct_esperado',
    color: '#7a5500',
  },
  {
    id: 'estudios_caracterizacion',
    name: 'Estudios de caracterización',
    month: 'estudios_caracterizacion_mes',
    accum: 'estudios_caracterizacion_acum',
    meta: 'meta_anual_estudios_caracterizacion',
    expected: 'estudios_caracterizacion_esperado',
    pctMeta: 'estudios_caracterizacion_pct_meta',
    pctExpected: 'estudios_caracterizacion_pct_esperado',
    color: '#8f1c1c',
  },
  {
    id: 'pirds_implementados',
    name: 'PIRDES implementados',
    month: 'pirds_implementados_mes',
    accum: 'pirds_implementados_acum',
    meta: 'meta_anual_pirds_implementados',
    expected: 'pirds_implementados_esperado',
    pctMeta: 'pirds_implementados_pct_meta',
    pctExpected: 'pirds_implementados_pct_esperado',
    color: '#6a3da3',
  },
];

const state = {
  datasets: null,
  selectedPeriod: null,
  latestPeriod: null,
  chart: null,
};

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    const statusLabel = document.getElementById('statusLabel');
    if (statusLabel) statusLabel.textContent = 'Error al cargar';
    document.getElementById('detailTables').innerHTML = `<div class="empty">No fue posible cargar los datos publicados del programa.</div>`;
  });
});

async function bootstrap() {
  const [total, indicadores, capacitaciones, asistencias, estudios, pirds, reuniones] = await Promise.all([
    fetchCsv(DATA_PATHS.total),
    fetchCsv(DATA_PATHS.indicadores),
    fetchCsv(DATA_PATHS.capacitaciones),
    fetchCsv(DATA_PATHS.asistencias),
    fetchCsv(DATA_PATHS.estudios),
    fetchCsv(DATA_PATHS.pirds),
    fetchCsv(DATA_PATHS.reuniones),
  ]);

  normalizeTotal(total);
  normalizeDetailRows(capacitaciones, ['participantes_total', 'participantes_tecnicos', 'participantes_operarios', 'participantes_otro']);
  normalizeDetailRows(asistencias, ['nueva_asistencia_flag']);
  normalizeDetailRows(estudios, ['estudio_finalizado_flag']);
  normalizeDetailRows(pirds, ['pirds_implementado_flag']);
  normalizeDetailRows(reuniones);

  state.datasets = { total, indicadores, capacitaciones, asistencias, estudios, pirds, reuniones };

  const periods = total.filter(row => row.has_any_data).sort(sortPeriods);
  if (!periods.length) {
    document.getElementById('statusLabel').textContent = 'Sin datos';
    document.getElementById('kpiSection').innerHTML = '<article class="card kpi-card"><div class="kpi-label">Sin datos publicados</div><div class="kpi-value">—</div><div class="footer-note">Aún no hay períodos válidos para mostrar.</div></article>';
    document.getElementById('detailTables').innerHTML = '<div class="empty">Aún no hay detalle operativo publicado.</div>';
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
  monthSelect.innerHTML = periods.slice().reverse().map(row => `<option value="${escapeHtml(row.periodo)}">${escapeHtml(formatPeriodLabel(row))}</option>`).join('');
  monthSelect.value = state.selectedPeriod;
  monthSelect.addEventListener('change', (event) => {
    state.selectedPeriod = event.target.value;
    renderAll();
  });
}

function renderAll() {
  const current = getCurrentRow();
  const latest = getLatestRow();
  if (!current || !latest) return;

  document.getElementById('currentPeriod').textContent = formatPeriodLabel(current);
  document.getElementById('selectedPeriodBox').textContent = formatPeriodLabel(current);
  document.getElementById('latestPeriod').textContent = formatPeriodLabel(latest);
  document.getElementById('latestPeriodBox').textContent = formatPeriodLabel(latest);
  document.getElementById('lastUpdate').textContent = formatDateTime(current._submission_time);
  document.getElementById('coverageStat').textContent = `${formatNumber(current.capacitaciones_mes)} actividades`; 

  renderKpis(current);
  renderProgress(current);
  renderMainChart();
  renderDiagnostic(current);
  renderSnapshot(current);
  renderDetailTables(current.periodo);
}

function renderKpis(current) {
  const container = document.getElementById('kpiSection');
  container.innerHTML = INDICATORS.map(ind => {
    const pctExpected = number(current[ind.pctExpected]);
    return `
      <article class="card kpi-card">
        <div class="kpi-label">${escapeHtml(ind.name)}</div>
        <div class="kpi-value">${formatNumber(current[ind.month])}</div>
        <div class="kpi-badge ${statusClass(pctExpected)}">${statusText(pctExpected)}</div>
        <div class="kpi-meta">
          <div class="kpi-meta-item"><span class="small">Acumulado</span><span class="strong">${formatNumber(current[ind.accum])}</span></div>
          <div class="kpi-meta-item"><span class="small">Meta</span><span class="strong">${formatNumber(current[ind.meta])}</span></div>
          <div class="kpi-meta-item"><span class="small">Esperado</span><span class="strong">${formatNumber(current[ind.expected], 1)}</span></div>
        </div>
      </article>`;
  }).join('');
}

function renderProgress(current) {
  const container = document.getElementById('progressList');
  container.innerHTML = INDICATORS.map(ind => {
    const pctMeta = number(current[ind.pctMeta]);
    const pctExpected = number(current[ind.pctExpected]);
    return `
      <div class="progress-item">
        <div class="progress-top">
          <div class="progress-name">${escapeHtml(ind.name)}</div>
          <div class="progress-num">${formatNumber(current[ind.accum])} / ${formatNumber(current[ind.meta])}</div>
        </div>
        <div class="bar"><span style="width:${Math.min(pctMeta, 140)}%; background:${ind.color}"></span></div>
        <div class="bar-meta">
          <span>Avance anual: ${formatNumber(pctMeta, 1)}%</span>
          <span>Vs esperado: ${formatNumber(pctExpected, 1)}%</span>
        </div>
      </div>`;
  }).join('');
}

function renderMainChart() {
  const rows = state.datasets.total.filter(row => row.has_any_data).sort(sortPeriods);
  const labels = rows.map(formatPeriodLabel);
  const datasets = INDICATORS.map(ind => ({
    label: ind.name,
    data: rows.map(row => clamp(number(row[ind.pctMeta]), 0, 180)),
    borderColor: ind.color,
    backgroundColor: ind.color,
    borderWidth: 2.5,
    pointRadius: rows.map(row => row.periodo === state.selectedPeriod ? 4 : 2),
    pointHoverRadius: 5,
    fill: false,
    tension: 0.25,
  }));

  datasets.push({
    label: 'Esperado al corte',
    data: rows.map(row => clamp(number(row.fraccion_anual_esperada) * 100, 0, 180)),
    borderColor: '#6b7280',
    backgroundColor: '#6b7280',
    borderDash: [7, 6],
    borderWidth: 2,
    pointRadius: 0,
    fill: false,
    tension: 0,
  });

  const ctx = document.getElementById('mainChart');
  if (state.chart) state.chart.destroy();
  state.chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 10, padding: 16 } },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatNumber(context.parsed.y, 1)}%`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#4b5f4b' } },
        y: {
          beginAtZero: true,
          suggestedMax: 120,
          ticks: { callback: (value) => `${value}%`, color: '#4b5f4b' },
          grid: { color: 'rgba(55,85,55,.10)' },
          title: { display: true, text: '% de meta anual', color: '#4b5f4b', font: { weight: '600' } }
        }
      }
    }
  });
}

function renderDiagnostic(current) {
  const good = [];
  const watch = [];
  const alert = [];
  INDICATORS.forEach(ind => {
    const pctExpected = number(current[ind.pctExpected]);
    const entry = {
      title: ind.name,
      text: `${formatNumber(current[ind.accum])} acumulado de ${formatNumber(current[ind.meta])} meta anual.`
    };
    if (pctExpected >= 100) good.push(entry);
    else if (pctExpected >= 75) watch.push(entry);
    else alert.push(entry);
  });

  const items = [];
  if (good.length) items.push(...good.map(item => renderDiagItem('Buen desempeño', `${item.title}: ${item.text}`)));
  if (watch.length) items.push(...watch.map(item => renderDiagItem('Seguimiento requerido', `${item.title}: ${item.text}`)));
  if (alert.length) items.push(...alert.map(item => renderDiagItem('Rezago', `${item.title}: ${item.text}`)));
  document.getElementById('diagnosticList').innerHTML = items.join('') || '<div class="empty">Sin observaciones para este período.</div>';
}

function renderSnapshot(current) {
  const items = [
    renderDiagItem('Capacitaciones del mes', `${formatNumber(current.capacitaciones_mes)} actividades y ${formatNumber(current.personas_capacitadas_mes)} participantes reportados.`),
    renderDiagItem('Cobertura municipal del mes', `${formatNumber(current.municipios_capacitados_mes)} municipios alcanzados en el período.`),
    renderDiagItem('Asistencia técnica', `${formatNumber(current.asistencias_tecnicas_mes)} nuevas asistencias técnicas reportadas.`),
    renderDiagItem('Residuos y planificación', `${formatNumber(current.estudios_caracterizacion_mes)} estudios finalizados y ${formatNumber(current.pirds_implementados_mes)} PIRDES implementados en el mes.`),
  ];
  document.getElementById('snapshotList').innerHTML = items.join('');
}

function renderDetailTables(periodo) {
  const data = state.datasets;
  const caps = data.capacitaciones.filter(row => row.periodo === periodo);
  const asis = data.asistencias.filter(row => row.periodo === periodo);
  const est = data.estudios.filter(row => row.periodo === periodo);
  const pirds = data.pirds.filter(row => row.periodo === periodo);
  const reu = data.reuniones.filter(row => row.periodo === periodo);

  const sections = [
    detailCard('Capacitaciones', `${caps.length} registros`, caps, [
      ['Fecha', 'fecha_capacitacion'],
      ['Municipios', 'municipios_capacitacion'],
      ['Temas', 'temas_capacitacion'],
      ['Participantes', 'participantes_total'],
    ]),
    detailCard('Asistencias técnicas', `${asis.length} registros`, asis, [
      ['Fecha', 'fecha_asistencia'],
      ['Municipio', 'municipio_asistencia'],
      ['Proyecto', 'nombre_corto_proyecto'],
      ['Etapa', 'etapa_proyecto'],
    ]),
    detailCard('Estudios de caracterización', `${est.length} registros`, est, [
      ['Fecha', 'fecha_estudio'],
      ['Municipio', 'municipio_estudio'],
      ['Sector', 'sector_estudio'],
      ['Estado', 'estado_estudio'],
    ]),
    detailCard('PIRDES', `${pirds.length} registros`, pirds, [
      ['Fecha', 'fecha_pirds'],
      ['Municipio', 'municipio_pirds'],
      ['Estado', 'estado_pirds'],
      ['Implementado', 'pirds_implementado_mes'],
    ]),
    detailCard('Reuniones y mesas', `${reu.length} registros`, reu, [
      ['Fecha', 'fecha_reunion'],
      ['Tipo', 'tipo_reunion'],
      ['Municipios', 'municipios_reunion'],
      ['Tema', 'tema_reunion'],
    ]),
  ];

  document.getElementById('detailTables').innerHTML = sections.join('');
}

function detailCard(title, countLabel, rows, columns) {
  let body = '<div class="empty">Sin registros para este período.</div>';
  if (rows.length) {
    const head = `<thead><tr>${columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead>`;
    const bodyRows = rows.slice(0, 6).map(row => `<tr>${columns.map(([, key]) => `<td>${escapeHtml(displayValue(row[key]))}</td>`).join('')}</tr>`).join('');
    body = `<table>${head}<tbody>${bodyRows}</tbody></table>`;
  }
  return `
    <article class="card detail-card">
      <div class="detail-top">
        <div class="detail-title">${escapeHtml(title)}</div>
        <div class="detail-count">${escapeHtml(countLabel)}</div>
      </div>
      ${body}
    </article>`;
}

function renderDiagItem(title, text) {
  return `<div class="diag-item"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></div>`;
}

async function fetchCsv(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
  const text = await response.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  return parsed.data;
}

function normalizeTotal(rows) {
  rows.forEach(row => {
    row.anio = number(row.anio_reportado);
    row.mes_num = number(row.mes_num);
    row.periodo = row.periodo_clave || `${row.anio}-${String(row.mes_num).padStart(2, '0')}`;
    row.has_any_data = INDICATORS.some(ind => number(row[ind.month]) > 0) || number(row.reuniones_mes) > 0;
    INDICATORS.forEach(ind => {
      row[ind.month] = number(row[ind.month]);
      row[ind.accum] = number(row[ind.accum]);
      row[ind.meta] = number(row[ind.meta]);
      row[ind.expected] = number(row[ind.expected]);
      row[ind.pctMeta] = number(row[ind.pctMeta]);
      row[ind.pctExpected] = number(row[ind.pctExpected]);
    });
    row.capacitaciones_mes = number(row.capacitaciones_mes);
    row.reuniones_mes = number(row.reuniones_mes);
    row.fraccion_anual_esperada = number(row.fraccion_anual_esperada);
  });
}

function normalizeDetailRows(rows, numberCols = []) {
  rows.forEach(row => {
    row.periodo = row.periodo_clave || `${number(row.anio_reportado)}-${String(number(row.mes_num)).padStart(2, '0')}`;
    numberCols.forEach(col => row[col] = number(row[col]));
  });
}

function getCurrentRow() {
  return state.datasets.total.find(row => row.periodo === state.selectedPeriod) || null;
}

function getLatestRow() {
  return state.datasets.total.find(row => row.periodo === state.latestPeriod) || null;
}

function sortPeriods(a, b) {
  return (a.anio - b.anio) || (a.mes_num - b.mes_num);
}

function formatPeriodLabel(row) {
  const label = row.mes_label || monthName(row.mes_num);
  return `${label} ${row.anio || row.anio_reportado || ''}`.trim();
}

function monthName(num) {
  return ({1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'})[Number(num)] || 'Mes';
}

function statusClass(pctExpected) {
  if (pctExpected >= 100) return 'status-good';
  if (pctExpected >= 75) return 'status-watch';
  return 'status-alert';
}

function statusText(pctExpected) {
  if (pctExpected >= 100) return 'En línea o adelantado';
  if (pctExpected >= 75) return 'Requiere seguimiento';
  return 'Rezago frente al corte';
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return displayValue(value);
  return new Intl.DateTimeFormat('es-GT', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatNumber(value, decimals = 0) {
  const num = number(value);
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(num);
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return formatNumber(value);
  return String(value);
}

function number(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
