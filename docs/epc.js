const DATA_ROOT = './data/educando_para_conservar';

const FILES = {
  totalMes: `${DATA_ROOT}/total_mes.csv`,
  indicadores: `${DATA_ROOT}/institucional_indicadores.csv`,
  centros: `${DATA_ROOT}/centros_detalle.csv`,
  campo: `${DATA_ROOT}/actividades_campo_detalle.csv`,
  diplomado: `${DATA_ROOT}/diplomado_detalle.csv`,
  coord: `${DATA_ROOT}/coordinacion_detalle.csv`,
};

const INDICATOR_DEFS = [
  ['docentes_capacitados','Docentes capacitados'],
  ['centros_cobertura','Centros educativos alcanzados'],
  ['estudiantes_epc','Estudiantes beneficiados EPC'],
  ['estudiantes_campo','Estudiantes en actividades de campo'],
  ['actividades_campo','Actividades de campo ejecutadas'],
  ['jovenes_formados','Jóvenes formados'],
  ['propuestas_juveniles','Propuestas juveniles'],
  ['capitales_semilla','Capitales semilla'],
];

const FIELD_TYPE_DEFS = [
  ['campana_reforestacion','Reforestación'],
  ['monitoreo_reforestacion','Monitoreo'],
  ['manejo_tul','Tul'],
  ['feria_ambiental','Ferias'],
  ['huerto_escolar','Huertos'],
  ['gira_educativa','Giras'],
  ['mural_pedagogico','Murales'],
  ['centro_acopio_escolar','Centros de acopio'],
  ['campana_limpieza_escolar','Limpiezas'],
  ['proyecto_gestion_ambiental','Proyectos']
];

const state = {
  totalMes: [],
  indicadores: [],
  centros: [],
  campo: [],
  diplomado: [],
  coord: [],
  selectedPeriod: null,
  chartMode: 'oficial',
  chart: null,
};

const $ = (sel) => document.querySelector(sel);
const fmt = (n, digits = 0) => {
  const num = Number(n || 0);
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(num);
};
const fmtPct = (n) => `${fmt(n, 1)}%`;
const pctClass = (v) => v >= 100 ? 'good' : v >= 80 ? 'warn' : 'bad';
const safeText = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

function parseCsv(url){
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: 'greedy',
      complete: (res) => resolve(res.data || []),
      error: reject
    });
  });
}

function castNumbers(rows){
  return rows.map(r => {
    const out = { ...r };
    Object.keys(out).forEach(k => {
      if (out[k] === '') return;
      const num = Number(String(out[k]).replace(/,/g,''));
      if (!Number.isNaN(num) && String(out[k]).trim() !== '') out[k] = num;
    });
    return out;
  });
}

function getLatestRow(){
  return state.totalMes.find(r => String(r.is_latest_data_month).toLowerCase() === 'true') || state.totalMes[state.totalMes.length - 1];
}

function fillPeriodSelect(){
  const sel = $('#periodSelect');
  sel.innerHTML = '';
  state.totalMes.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.periodo_clave;
    opt.textContent = `${safeText(r.mes_label)} ${safeText(r.anio_reportado)}`;
    sel.appendChild(opt);
  });
  const latest = getLatestRow();
  state.selectedPeriod = state.selectedPeriod || (latest ? latest.periodo_clave : null);
  sel.value = state.selectedPeriod || '';
  sel.addEventListener('change', () => {
    state.selectedPeriod = sel.value;
    render();
  });
  $('#chartMode').addEventListener('change', (e) => {
    state.chartMode = e.target.value;
    renderChart();
  });
}

function rowForPeriod(){
  return state.totalMes.find(r => r.periodo_clave === state.selectedPeriod) || getLatestRow();
}

function indicatorLatestMap(){
  const map = {};
  state.indicadores.forEach(r => { map[r.indicator_id] = r; });
  return map;
}

function renderTop(latest){
  $('#heroLatest').textContent = `${safeText(latest?.mes_label)} ${safeText(latest?.anio_reportado)}`;
  $('#heroLatestSub').textContent = latest ? `Período clave ${latest.periodo_clave}` : 'Sin datos';
  $('#statusTop').textContent = latest ? `Último dato real: ${latest.mes_label} ${latest.anio_reportado}` : 'Sin datos';
  $('#statusPeriod').textContent = latest ? `Mes seleccionado: ${rowForPeriod().mes_label} ${rowForPeriod().anio_reportado}` : 'Sin datos';
}

function kpiCard(ind){
  const cls = pctClass(Number(ind.pct_vs_esperado || 0));
  return `
    <article class="kpi">
      <div class="label">${ind.indicator_label}</div>
      <div class="value">${fmt(ind.valor_acumulado)}</div>
      <div class="sub">Meta anual ${fmt(ind.meta_anual)} · Mes ${fmt(ind.valor_mes)}</div>
      <div class="meta">
        <span class="chip ${cls}">Vs esperado: ${fmtPct(ind.pct_vs_esperado || 0)}</span>
        <span class="chip neutral">Meta anual: ${fmtPct(ind.pct_meta_anual || 0)}</span>
      </div>
    </article>
  `;
}

function renderKpis(){
  const map = indicatorLatestMap();
  const ids = ['docentes_capacitados','centros_cobertura','estudiantes_epc','estudiantes_campo','actividades_campo','jovenes_formados','propuestas_juveniles','capitales_semilla'];
  $('#kpiGrid').innerHTML = ids.map(id => map[id] ? kpiCard(map[id]) : '').join('');
}

function progressRow(label, acum, meta, pctMeta){
  return `
    <div class="metric-row">
      <div class="name">${label}</div>
      <div class="num">${fmt(acum)} / ${fmt(meta)}</div>
      <div class="num">${fmtPct(pctMeta)}</div>
      <div class="bar"><span style="width:${Math.min(Number(pctMeta || 0), 140)}%"></span></div>
    </div>
  `;
}

function renderProgressAndDiagnostic(row){
  const items = [
    ['Docentes', row.docentes_capacitados_acum, row.meta_anual_docentes_capacitados, row.pct_docentes_meta],
    ['Centros', row.centros_cobertura_acum, row.meta_anual_centros_cobertura, row.pct_centros_meta],
    ['Estudiantes EPC', row.estudiantes_epc_acum, row.meta_anual_estudiantes_epc, row.pct_estudiantes_epc_meta],
    ['Estudiantes en campo', row.estudiantes_campo_acum, row.meta_anual_estudiantes_campo, row.pct_estudiantes_campo_meta],
    ['Actividades de campo', row.actividades_campo_acum, row.meta_anual_actividades_campo, row.pct_actividades_campo_meta],
    ['Jóvenes formados', row.jovenes_formados_total_corte_acum, row.meta_anual_jovenes_formados, row.pct_jovenes_formados_meta],
    ['Propuestas juveniles', row.propuestas_juveniles_total_corte_acum, row.meta_anual_propuestas_juveniles, row.pct_propuestas_juveniles_meta],
    ['Capitales semilla', row.capitales_semilla_total_corte_acum, row.meta_anual_capitales_semilla, row.pct_capitales_semilla_meta],
  ];
  $('#progressMain').innerHTML = items.map(([a,b,c,d]) => progressRow(a,b,c,d)).join('');

  const ratios = [
    row.pct_docentes_vs_esperado, row.pct_centros_vs_esperado, row.pct_estudiantes_epc_vs_esperado,
    row.pct_estudiantes_campo_vs_esperado, row.pct_actividades_campo_vs_esperado
  ].map(Number);
  const healthy = ratios.filter(v => v >= 100).length;
  const warning = ratios.filter(v => v >= 80 && v < 100).length;
  const delayed = ratios.filter(v => v < 80).length;

  const notes = [];
  if (Number(row.mes_num) < 6 && Number(row.jovenes_formados_total_corte_acum) === 0) {
    notes.push('El diplomado juvenil no aparece atrasado por sí solo en estos meses, porque su lógica oficial usa cortes de junio y octubre.');
  }
  if (Number(row.actividades_campo_ejecutadas_mes) === 0 && Number(row.mes_num) >= 3 && Number(row.mes_num) <= 10) {
    notes.push('En el mes seleccionado no se reportaron actividades de campo ejecutadas, aunque este componente tiene ventana activa de marzo a octubre.');
  }
  if (Number(row.docentes_nuevos_mes) > 0 || Number(row.estudiantes_nuevos_epc_mes) > 0) {
    notes.push('El programa sí reportó avance en cobertura educativa durante el período seleccionado.');
  }
  if (!notes.length) notes.push('No hay alertas críticas automáticas para este período, pero conviene revisar el detalle operativo.');

  $('#diagnosticBox').innerHTML = `
    <div style="display:grid;gap:10px">
      <div><strong>Indicadores sobre esperado:</strong> ${healthy}</div>
      <div><strong>En seguimiento:</strong> ${warning}</div>
      <div><strong>Rezago visible:</strong> ${delayed}</div>
      <div style="margin-top:6px;color:var(--text-2)">${notes.map(t => `• ${t}`).join('<br>')}</div>
    </div>
  `;
}

function destroyChart(){
  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }
}

function buildDatasets(mode){
  const rows = state.totalMes;
  const labels = rows.map(r => r.mes_label);
  if (mode === 'oficial') {
    $('#chartTitle').textContent = 'Avance acumulado vs meta anual (%)';
    $('#chartHint').textContent = 'Comparación acumulada de los indicadores oficiales en porcentaje de meta anual.';
    return {
      labels,
      datasets: [
        {label:'Docentes', data: rows.map(r => Number(r.pct_docentes_meta || 0)), borderWidth:2.5},
        {label:'Centros', data: rows.map(r => Number(r.pct_centros_meta || 0)), borderWidth:2.5},
        {label:'Estudiantes EPC', data: rows.map(r => Number(r.pct_estudiantes_epc_meta || 0)), borderWidth:2.5},
        {label:'Estudiantes campo', data: rows.map(r => Number(r.pct_estudiantes_campo_meta || 0)), borderWidth:2.5},
        {label:'Actividades de campo', data: rows.map(r => Number(r.pct_actividades_campo_meta || 0)), borderWidth:2.5},
      ]
    };
  }
  if (mode === 'diplomado') {
    $('#chartTitle').textContent = 'Diplomado juvenil · avance acumulado vs meta anual (%)';
    $('#chartHint').textContent = 'El diplomado usa cortes especiales de junio y octubre.';
    return {
      labels,
      datasets: [
        {label:'Jóvenes formados', data: rows.map(r => Number(r.pct_jovenes_formados_meta || 0)), borderWidth:2.5},
        {label:'Propuestas juveniles', data: rows.map(r => Number(r.pct_propuestas_juveniles_meta || 0)), borderWidth:2.5},
        {label:'Capitales semilla', data: rows.map(r => Number(r.pct_capitales_semilla_meta || 0)), borderWidth:2.5},
      ]
    };
  }
  $('#chartTitle').textContent = 'Subtipos de actividades de campo · avance acumulado vs meta anual (%)';
  $('#chartHint').textContent = 'Desagregación del componente de campo con metas específicas por tipo.';
  return {
    labels,
    datasets: FIELD_TYPE_DEFS.map(([key, label]) => ({
      label,
      data: rows.map(r => Number(r[`${key}_pct_meta`] || 0)),
      borderWidth:2
    }))
  };
}

function renderChart(){
  destroyChart();
  const ctx = document.getElementById('mainChart');
  const cfg = buildDatasets(state.chartMode);
  state.chart = new Chart(ctx, {
    type: 'line',
    data: cfg,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 110,
          ticks: { callback: (v) => `${v}%` },
          grid: { color: 'rgba(52,77,52,.08)' }
        },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 14, usePointStyle: true } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y,1)}%` } }
      },
      elements: { point: { radius: 3, hoverRadius: 5 }, line: { tension: .24 } }
    }
  });
}

function tableHtml(headers, rows){
  if (!rows.length) return `<div class="empty">No hay registros para el período seleccionado.</div>`;
  return `
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map(row => `<tr>${row.map(v => `<td>${safeText(v)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;
}

function filterByPeriod(rows){
  return rows.filter(r => r.periodo_clave === state.selectedPeriod);
}

function renderDetails(row){
  const centros = filterByPeriod(state.centros).slice(0, 8);
  $('#centrosWrap').innerHTML = tableHtml(
    ['Municipio','Centro','Docentes nuevos','Estudiantes nuevos EPC'],
    centros.map(r => [r.municipio_centro, r.centro_educativo, fmt(r.docentes_nuevos_capacitados), fmt(r.estudiantes_nuevos_epc)])
  );

  const campo = filterByPeriod(state.campo).slice(0, 8);
  $('#campoWrap').innerHTML = tableHtml(
    ['Municipio','Tipo','Estado','Estudiantes nuevos'],
    campo.map(r => [r.municipio_campo, r.tipo_actividad_campo, r.estado_actividad_campo, fmt(r.estudiantes_nuevos_campo)])
  );

  const dip = filterByPeriod(state.diplomado);
  const dipRows = dip.length ? dip.slice(0,8).map(r => [
    r.cohorte_operativa,
    r.tipo_movimiento_diplomado,
    fmt(r.jovenes_alcanzados_operativo),
    `${fmt(r.jovenes_formados_total_corte)} / ${fmt(r.propuestas_juveniles_total_corte)} / ${fmt(r.capitales_semilla_total_corte)}`
  ]) : [[
    '—',
    'Sin movimiento operativo o sin corte oficial para el período',
    '—',
    `${fmt(row.jovenes_formados_total_corte_acum)} / ${fmt(row.propuestas_juveniles_total_corte_acum)} / ${fmt(row.capitales_semilla_total_corte_acum)}`
  ]];
  $('#diplomadoWrap').innerHTML = tableHtml(
    ['Cohorte','Movimiento','Jóvenes operativos','Corte oficial J/P/C'],
    dipRows
  );

  const coord = filterByPeriod(state.coord).slice(0, 8);
  $('#coordWrap').innerHTML = tableHtml(
    ['Municipios','Tipo','Instituciones','Resultado'],
    coord.map(r => [r.municipios_coordinacion, r.tipo_coordinacion, r.instituciones_coordinacion, r.resultado_coordinacion])
  );
}

function render(){
  const row = rowForPeriod();
  if (!row) {
    $('#statusTop').textContent = 'No hay datos disponibles';
    return;
  }
  renderTop(getLatestRow());
  renderKpis();
  renderProgressAndDiagnostic(row);
  renderChart();
  renderDetails(row);
}

async function init(){
  try{
    const [totalMes, indicadores, centros, campo, diplomado, coord] = await Promise.all([
      parseCsv(FILES.totalMes),
      parseCsv(FILES.indicadores),
      parseCsv(FILES.centros),
      parseCsv(FILES.campo),
      parseCsv(FILES.diplomado),
      parseCsv(FILES.coord),
    ]);
    state.totalMes = castNumbers(totalMes).sort((a,b) => Number(a.mes_num) - Number(b.mes_num));
    state.indicadores = castNumbers(indicadores);
    state.centros = castNumbers(centros);
    state.campo = castNumbers(campo);
    state.diplomado = castNumbers(diplomado);
    state.coord = castNumbers(coord);
    fillPeriodSelect();
    render();
  }catch(err){
    console.error(err);
    $('#statusTop').textContent = 'Error al cargar datos';
    $('#statusPeriod').textContent = 'Revisa docs/data/educando_para_conservar/';
    document.querySelector('.wrap').insertAdjacentHTML('beforeend', `<div class="card section-card" style="margin-top:18px"><strong>Error:</strong> No se pudieron cargar los CSV publicados.</div>`);
  }
}

init();
