const PATHS = {
  total: './data/fortalecimiento_municipal/total_mes.csv',
  indicadores: './data/fortalecimiento_municipal/institucional_indicadores.csv',
  temas: './data/fortalecimiento_municipal/capacitaciones_tema_mes.csv',
  municipios: './data/fortalecimiento_municipal/capacitaciones_municipio_mes.csv',
  asistencias: './data/fortalecimiento_municipal/asistencias_sector_mes.csv',
  estudios: './data/fortalecimiento_municipal/estudios_sector_mes.csv',
  reuniones: './data/fortalecimiento_municipal/reuniones_tipo_mes.csv',
  calidad: './data/fortalecimiento_municipal/calidad_datos_mes.csv',
  detalleCap: './data/fortalecimiento_municipal/detalle_capacitaciones.csv',
  detalleAsis: './data/fortalecimiento_municipal/detalle_asistencias.csv',
  detalleEst: './data/fortalecimiento_municipal/detalle_estudios.csv',
  detallePirdes: './data/fortalecimiento_municipal/detalle_pirdes.csv',
  detalleReu: './data/fortalecimiento_municipal/detalle_reuniones.csv',
  metadata: './data/fortalecimiento_municipal/metadata_publicacion.csv'
};

const PRIMARY_INDICATORS = [
  'municipios_capacitacion_nucleo',
  'personas_capacitadas_nucleo',
  'asistencias_priorizadas_proxy',
  'estudios_rs_comercial_mercados',
  'pirdes_implementados',
  'reuniones_codema',
  'mesas_tecnicas_departamentales'
];

const DETAIL_CONFIG = {
  capacitaciones: {
    label: 'Capacitaciones',
    path: 'detalleCap',
    columns: ['fecha', 'tipo_actividad', 'participantes_totales', 'n_tecnicos', 'n_operarios', 'n_otro_personal', 'municipios', 'temas_nucleo', 'estado_fila_norm']
  },
  asistencias: {
    label: 'Asistencias',
    path: 'detalleAsis',
    columns: ['fecha', 'municipio', 'proyecto_nombre', 'tipo_asistencia', 'linea_enfoque', 'sectores', 'es_nueva_asistencia', 'cuenta_indicador_asistencia']
  },
  estudios: {
    label: 'Estudios',
    path: 'detalleEst',
    columns: ['fecha', 'municipio', 'tipo_estudio', 'estado_estudio', 'sectores', 'se_finalizo_mes', 'es_rs_comercial_mercados']
  },
  pirdes: {
    label: 'PIRDES',
    path: 'detallePirdes',
    columns: ['fecha', 'municipio', 'estado_pirdes', 'implementado_mes', 'participantes_totales', 'n_tecnicos', 'n_operarios']
  },
  reuniones: {
    label: 'Reuniones',
    path: 'detalleReu',
    columns: ['fecha', 'tipo_reunion', 'tema_principal', 'instituciones_participantes', 'is_codema', 'is_mesa_dep', 'is_mesa_municipal', 'municipios']
  }
};

let state = {
  data: null,
  selectedPeriod: '',
  selectedIndicator: 'personas_capacitadas_nucleo',
  detailTab: 'capacitaciones'
};

document.addEventListener('DOMContentLoaded', bootstrap);

async function bootstrap(){
  try{
    const data = await loadAll();
    const periods = unique(data.total.map(r => r.periodo)).sort();
    state.data = data;
    state.selectedPeriod = periods.at(-1) || '';
    state.selectedIndicator = PRIMARY_INDICATORS.includes('personas_capacitadas_nucleo') ? 'personas_capacitadas_nucleo' : PRIMARY_INDICATORS[0];
    buildControls();
    renderAll();
  }catch(err){
    console.error(err);
    document.body.innerHTML = `<div class="wrap"><div class="card panel"><h2>No se pudo cargar el dashboard</h2><p class="sub">Revisa que los CSV estén publicados en <strong>docs/data/fortalecimiento_municipal/</strong>.</p><div class="empty" style="margin-top:12px">${escapeHtml(err.message || String(err))}</div></div></div>`;
  }
}

async function loadAll(){
  const [total, indicadores, temas, municipios, asistencias, estudios, reuniones, calidad, detalleCap, detalleAsis, detalleEst, detallePirdes, detalleReu, metadata] = await Promise.all([
    fetchCsv(PATHS.total, true),
    fetchCsv(PATHS.indicadores, true),
    fetchCsv(PATHS.temas, false),
    fetchCsv(PATHS.municipios, false),
    fetchCsv(PATHS.asistencias, false),
    fetchCsv(PATHS.estudios, false),
    fetchCsv(PATHS.reuniones, false),
    fetchCsv(PATHS.calidad, false),
    fetchCsv(PATHS.detalleCap, false),
    fetchCsv(PATHS.detalleAsis, false),
    fetchCsv(PATHS.detalleEst, false),
    fetchCsv(PATHS.detallePirdes, false),
    fetchCsv(PATHS.detalleReu, false),
    fetchCsv(PATHS.metadata, false)
  ]);
  return {
    total: total.map(normalizeRow),
    indicadores: indicadores.map(normalizeRow),
    temas: temas.map(normalizeRow),
    municipios: municipios.map(normalizeRow),
    asistencias: asistencias.map(normalizeRow),
    estudios: estudios.map(normalizeRow),
    reuniones: reuniones.map(normalizeRow),
    calidad: calidad.map(normalizeRow),
    detalleCap: detalleCap.map(normalizeRow),
    detalleAsis: detalleAsis.map(normalizeRow),
    detalleEst: detalleEst.map(normalizeRow),
    detallePirdes: detallePirdes.map(normalizeRow),
    detalleReu: detalleReu.map(normalizeRow),
    metadata: metadata.map(normalizeRow)
  };
}

function buildControls(){
  const periodSelect = document.getElementById('periodSelect');
  const indicatorSelect = document.getElementById('indicatorSelect');
  const periods = unique(state.data.total.map(r => r.periodo)).sort();
  periodSelect.innerHTML = periods.map(p => `<option value="${p}">${periodLabel(p)}</option>`).join('');
  periodSelect.value = state.selectedPeriod;
  const primaryRows = state.data.indicadores
    .filter(r => r.categoria === 'primario')
    .filter((r, i, arr) => arr.findIndex(x => x.indicador_id === r.indicador_id) === i)
    .sort((a,b) => (a.orden_dashboard || 0) - (b.orden_dashboard || 0));
  indicatorSelect.innerHTML = primaryRows.map(r => `<option value="${r.indicador_id}">${escapeHtml(r.indicador_nombre)}</option>`).join('');
  indicatorSelect.value = state.selectedIndicator;
  periodSelect.addEventListener('change', () => { state.selectedPeriod = periodSelect.value; renderAll(); });
  indicatorSelect.addEventListener('change', () => { state.selectedIndicator = indicatorSelect.value; renderAll(); });
}

function renderAll(){
  renderHero();
  renderKpis();
  renderTrend();
  renderSemaforo();
  renderSupport();
  renderTemaChart();
  renderMunicipioChart();
  renderAsistenciaChart();
  renderEstudioChart();
  renderReunionChart();
  renderQuality();
  renderNotes();
  renderDiagnostic();
  renderDetailTabs();
  renderDetailTable();
}

function selectedTotal(){
  return state.data.total.find(r => r.periodo === state.selectedPeriod) || null;
}

function selectedIndicators(){
  return state.data.indicadores
    .filter(r => r.periodo === state.selectedPeriod && r.categoria === 'primario')
    .sort((a,b) => (a.orden_dashboard || 0) - (b.orden_dashboard || 0));
}

function renderHero(){
  const total = selectedTotal();
  const meta = state.data.metadata[0] || {};
  const periods = unique(state.data.total.map(r => r.periodo)).sort();
  document.getElementById('heroPeriod').textContent = total ? `${total.mes_nombre} ${total.anio}` : '—';
  document.getElementById('heroRange').textContent = total ? `${formatDate(total.fecha_min_periodo)} → ${formatDate(total.fecha_max_periodo)}` : 'Sin rango';
  document.getElementById('heroMonths').textContent = String(periods.length || 0);
  document.getElementById('heroUpdate').textContent = meta.fecha_max_global ? formatPeriodRange(meta.fecha_min_global, meta.fecha_max_global) : 'Publicación activa';
  document.getElementById('heroNotes').textContent = 'Cohorte calculada desde fechas por fila';

  const chips = [
    `Períodos: ${meta.periodos_detectados || periods.join(' | ')}`,
    `Usa encabezado como fuente de período: ${String(meta.usa_encabezado_como_fuente_periodo) === 'true' ? 'Sí' : 'No'}`,
    `Última cohorte: ${periodLabel(state.selectedPeriod)}`
  ];
  document.getElementById('heroChips').innerHTML = chips.map(c => `<span class="chip">${escapeHtml(c)}</span>`).join('');
}

function renderKpis(){
  const rows = selectedIndicators();
  const el = document.getElementById('kpiGrid');
  if(!rows.length){ el.innerHTML = emptyBlock('No hay indicadores para el período seleccionado.'); return; }

  // Historical data for sparklines: all periods for each indicator
  const allPeriods = unique(state.data.indicadores.map(r => r.periodo)).sort();

  el.innerHTML = rows.map(r => {
    const cls = colorClass(r.semaforo);
    const pctCohorte = Number(r.pct_cohorte || 0);
    const pctAnual   = Number(r.pct_meta_anual || 0);
    const barW       = Math.max(0, Math.min(100, pctCohorte * 100));
    const anualW     = Math.max(0, Math.min(100, pctAnual * 100));

    // Spark: accumulated value over all periods for this indicator
    const hist = allPeriods.map(p => {
      const row = state.data.indicadores.find(x => x.indicador_id === r.indicador_id && x.periodo === p);
      return row ? Number(row.valor_acumulado || 0) : null;
    }).filter(v => v !== null);
    const spark = kpiSparkline(hist, cls);

    // Gap vs meta cohorte (how many units over/under)
    const gap = Number(r.valor_acumulado || 0) - Number(r.meta_cohorte || 0);
    const gapLabel = gap === 0 ? 'exacto'
      : gap > 0 ? `+${fmtNum(gap)} sobre meta`
      : `${fmtNum(gap)} bajo meta`;
    const gapCls = gap >= 0 ? 'green' : (gap > -(Number(r.meta_cohorte||0)*0.2) ? 'yellow' : 'red');

    // Contribution: what % of annual goal is already done
    const annualDone = Math.round(pctAnual * 100);

    return `
      <article class="card kpi-card ${cls}" style="padding:18px 16px 14px;cursor:pointer"
        onclick="document.getElementById('indicatorSelect').value='${r.indicador_id}';state.selectedIndicator='${r.indicador_id}';renderTrend();"
        title="Clic para ver tendencia de este indicador">
        <div class="kpi-top">
          <div class="kpi-label">${escapeHtml(r.indicador_nombre)}</div>
          <span class="chip ${cls}">${semaforoLabel(r.semaforo)}</span>
        </div>

        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin:10px 0 4px">
          <div>
            <div style="font-family:var(--font-mono);font-size:1.9rem;font-weight:500;line-height:1;letter-spacing:-.02em;color:var(--text)">${fmtNum(r.valor_acumulado)}</div>
            <div style="font-size:.72rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:3px">${escapeHtml(r.unidad || '')} acumulados</div>
          </div>
          <div style="flex-shrink:0">${spark}</div>
        </div>

        <div style="margin:10px 0 6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:.71rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Avance cohorte</span>
            <span style="font-family:var(--font-mono);font-size:.88rem;font-weight:500;color:var(--text)">${fmtPct(r.pct_cohorte)}</span>
          </div>
          <div class="progress" style="height:6px;margin-top:0">
            <span style="display:block;height:100%;border-radius:999px;width:${barW}%;background:linear-gradient(90deg,${cls==='green'?'var(--green-mid),#45c687':cls==='yellow'?'#b88a00,#e0b423':cls==='red'?'#c94747,#ea7b7b':'var(--sky),var(--blue-mid)'});transition:width .7s cubic-bezier(.4,0,.2,1)"></span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px">
          <div style="padding:7px 9px;border-radius:9px;background:var(--surface);border:1px solid var(--line-soft)">
            <div style="font-size:.67rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em">Este mes</div>
            <div style="font-family:var(--font-mono);font-size:.96rem;font-weight:500;color:var(--text);margin-top:2px">${fmtNum(r.valor_mes)} <span style="font-size:.7rem;color:var(--muted)">${escapeHtml(r.unidad||'')}</span></div>
          </div>
          <div style="padding:7px 9px;border-radius:9px;background:var(--surface);border:1px solid var(--line-soft)">
            <div style="font-size:.67rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em">Meta cohorte</div>
            <div style="font-family:var(--font-mono);font-size:.96rem;font-weight:500;color:var(--text);margin-top:2px">${fmtNum(r.meta_cohorte)} <span style="font-size:.7rem;color:var(--muted)">${escapeHtml(r.unidad||'')}</span></div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px;padding-top:8px;border-top:1px solid var(--line-soft)">
          <span style="font-size:.75rem;color:var(--${gapCls==='green'?'green':'gold'}${gapCls==='red'?'':''};font-weight:700" class="kpi-gap-${gapCls}">${escapeHtml(gapLabel)}</span>
          <span style="font-size:.72rem;color:var(--muted)">${annualDone}% meta anual</span>
        </div>
      </article>
    `;
  }).join('');
}

function kpiSparkline(values, cls){
  if(!values || values.length < 2) return '';
  const w = 72, h = 36;
  const maxV = Math.max(...values, 0.001);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / maxV) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = cls === 'green' ? '#1d9e68' : cls === 'yellow' ? '#d0a000' : cls === 'red' ? '#d15b5b' : '#38b6e8';
  const fillPts = `0,${h} ${pts} ${w},${h}`;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;overflow:visible">
    <defs><linearGradient id="sg_${cls}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity=".25"/>
      <stop offset="100%" stop-color="${color}" stop-opacity=".02"/>
    </linearGradient></defs>
    <polygon points="${fillPts}" fill="url(#sg_${cls})"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${pts.split(' ').at(-1).split(',')[0]}" cy="${pts.split(' ').at(-1).split(',')[1]}" r="3" fill="${color}"/>
  </svg>`;
}

function renderTrend(){
  const indicatorId = state.selectedIndicator;
  const rows = state.data.indicadores
    .filter(r => r.indicador_id === indicatorId && r.categoria === 'primario')
    .sort((a,b) => String(a.periodo).localeCompare(String(b.periodo)));
  const label = rows[0]?.indicador_nombre || 'Indicador';
  const svg = lineChart(rows, {
    xKey: 'periodo',
    series: [
      { key: 'valor_acumulado', label: 'Acumulado', color: '#2575cc' },
      { key: 'meta_cohorte', label: 'Meta cohorte', color: '#38b6e8', dashed: true }
    ],
    title: label,
    formatter: v => fmtNum(v)
  });
  document.getElementById('trendChart').innerHTML = svg || emptyBlock('Sin datos para el indicador seleccionado.');
}

function renderSemaforo(){
  const rows = selectedIndicators();
  const el = document.getElementById('semaforoBoard');
  if(!rows.length){ el.innerHTML = emptyBlock('Sin datos.'); return; }
  el.innerHTML = rows.map(r => {
    const cls = colorClass(r.semaforo);
    return `
      <div class="note" style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px">
        <div>
          <div style="font-weight:700;color:var(--text)">${escapeHtml(r.indicador_nombre)}</div>
          <div style="font-size:.82rem;color:var(--muted)">${fmtNum(r.valor_acumulado)} / ${fmtNum(r.meta_cohorte)} en cohorte</div>
        </div>
        <span class="badge ${cls}">${semaforoLabel(r.semaforo)}</span>
      </div>
    `;
  }).join('');
}

function renderSupport(){
  const t = selectedTotal();
  const cards = t ? [
    ['Eventos de capacitación', t.eventos_capacitacion_mes],
    ['Personas capacitadas', t.personas_capacitadas_total_mes],
    ['Asistencias nuevas', t.asistencias_nuevas_total_mes],
    ['Estudios finalizados', t.estudios_finalizados_total_mes],
    ['PIRDES implementados', t.pirdes_implementados_mes],
    ['Reuniones totales', t.reuniones_totales_mes],
    ['Técnicos capacitados', t.tecnicos_capacitados_mes],
    ['Otro personal capacitado', t.otro_personal_capacitado_mes]
  ] : [];
  document.getElementById('supportGrid').innerHTML = cards.map(([k,v]) => `
    <div class="card support-card"><div class="k">${escapeHtml(k)}</div><div class="v">${fmtNum(v)}</div></div>
  `).join('') || emptyBlock('Sin producción disponible para el período.');
}

function renderTemaChart(){
  const rows = state.data.temas.filter(r => r.periodo === state.selectedPeriod).sort((a,b)=>(b.personas||0)-(a.personas||0));
  document.getElementById('temaChart').innerHTML = groupedBarChart(rows, {
    labelKey: 'tema',
    valueKeys: [
      { key: 'personas', label: 'Personas', color: '#2575cc' },
      { key: 'eventos', label: 'Eventos', color: '#38b6e8' }
    ],
    truncate: 36
  }) || emptyBlock('No hay capacitaciones registradas en este período.');
}

function renderMunicipioChart(){
  const rows = state.data.municipios.filter(r => r.periodo === state.selectedPeriod && truthy(r.capacitacion_nucleo));
  document.getElementById('municipioChart').innerHTML = simpleBarChart(rows, {
    labelKey: 'municipio',
    valueKey: 'eventos',
    color: '#2575cc',
    formatter: v => fmtNum(v),
    truncate: 28
  }) || emptyBlock('No hay municipios núcleo capturados en este período.');
}

function renderAsistenciaChart(){
  const rows = state.data.asistencias.filter(r => r.periodo === state.selectedPeriod).sort((a,b)=>(b.asistencia_indicador||0)-(a.asistencia_indicador||0));
  document.getElementById('asistenciaChart').innerHTML = groupedBarChart(rows, {
    labelKey: 'sector',
    valueKeys: [
      { key: 'asistencia_indicador', label: 'Cuenta indicador', color: '#1d9e68' },
      { key: 'nuevas_asistencias', label: 'Nuevas', color: '#38b6e8' }
    ],
    truncate: 28
  }) || emptyBlock('No hay asistencias registradas en este período.');
}

function renderEstudioChart(){
  const rows = state.data.estudios.filter(r => r.periodo === state.selectedPeriod).sort((a,b)=>(b.estudios||0)-(a.estudios||0));
  document.getElementById('estudioChart').innerHTML = groupedBarChart(rows, {
    labelKey: 'sector',
    valueKeys: [
      { key: 'estudios', label: 'Registrados', color: '#2575cc' },
      { key: 'estudios_finalizados', label: 'Finalizados', color: '#1d9e68' }
    ],
    truncate: 24
  }) || emptyBlock('No hay estudios registrados en este período.');
}

function renderReunionChart(){
  const rows = state.data.reuniones.filter(r => r.periodo === state.selectedPeriod).sort((a,b)=>(b.reuniones||0)-(a.reuniones||0));
  document.getElementById('reunionChart').innerHTML = simpleBarChart(rows, {
    labelKey: 'tipo_reunion',
    valueKey: 'reuniones',
    color: '#2575cc',
    formatter: v => fmtNum(v),
    truncate: 32
  }) || emptyBlock('No hay reuniones registradas en este período.');
}

function renderQuality(){
  const rows = state.data.calidad.filter(r => r.periodo === state.selectedPeriod);
  const el = document.getElementById('qualityCards');
  if(!rows.length){ el.innerHTML = emptyBlock('No hay datos de calidad para este período.'); return; }
  el.innerHTML = `<div class="quality-grid">${rows.map(r => `
    <div class="quality-card">
      <div class="module">${escapeHtml(r.modulo)}</div>
      <div class="metric">${fmtNum(r.filas_validas)}</div>
      <div class="subline">Filas válidas de ${fmtNum(r.filas_con_fecha)} con fecha</div>
      <div class="subline">Incompletas: ${fmtNum(r.filas_estado_incompleto)} · Municipio faltante: ${fmtNum(r.filas_alerta_municipio_missing)}</div>
    </div>
  `).join('')}</div>`;
}

function renderNotes(){
  const meta = state.data.metadata[0] || {};
  const notes = [meta.nota_capacitaciones, meta.nota_asistencias_codede, meta.nota_temas_nucleo].filter(Boolean);
  document.getElementById('noteList').innerHTML = notes.map(n => `<div class="note">${escapeHtml(n)}</div>`).join('') || emptyBlock('Sin notas publicadas.');
}

function renderDiagnostic(){
  const rows = selectedIndicators();
  const total = selectedTotal();
  const best = [...rows].sort((a,b)=>(b.pct_cohorte||0)-(a.pct_cohorte||0))[0];
  const worst = [...rows].sort((a,b)=>(a.pct_cohorte||0)-(b.pct_cohorte||0))[0];
  const notes = [];
  if(total){
    notes.push(`En ${periodLabel(state.selectedPeriod)} se registraron ${fmtNum(total.reuniones_totales_mes)} reuniones, ${fmtNum(total.asistencias_nuevas_total_mes)} asistencias nuevas y ${fmtNum(total.personas_capacitadas_total_mes)} personas capacitadas.`);
  }
  if(best){ notes.push(`El indicador más adelantado de la cohorte es ${best.indicador_nombre.toLowerCase()} con ${fmtPct(best.pct_cohorte)} de la meta de cohorte.`); }
  if(worst){ notes.push(`El mayor rezago visible está en ${worst.indicador_nombre.toLowerCase()}, con ${fmtPct(worst.pct_cohorte)} respecto a la meta de cohorte.`); }
  if(total && Number(total.municipios_capacitacion_nucleo_mes || 0) === 0 && Number(total.personas_capacitadas_nucleo_mes || 0) > 0){
    notes.push('Hay personas capacitadas núcleo sin municipio capturado en todas las filas del período; el tablero sí cuenta la actividad, pero no inventa municipios.');
  }
  document.getElementById('diagnosticList').innerHTML = notes.map(n => `<div class="note">${escapeHtml(n)}</div>`).join('') || emptyBlock('Sin diagnóstico disponible.');
}

function renderDetailTabs(){
  const tabsEl = document.getElementById('detailTabs');
  tabsEl.innerHTML = Object.entries(DETAIL_CONFIG).map(([key,cfg]) => `
    <button class="tab-btn ${state.detailTab === key ? 'active' : ''}" data-tab="${key}">${cfg.label}</button>
  `).join('');
  tabsEl.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    state.detailTab = btn.dataset.tab;
    renderDetailTabs();
    renderDetailTable();
  }));
}

function renderDetailTable(){
  const cfg = DETAIL_CONFIG[state.detailTab];
  const rows = (state.data[cfg.path] || []).filter(r => r.periodo === state.selectedPeriod && truthy(r.registro_valido)).slice(0, 12);
  const el = document.getElementById('detailTable');
  if(!rows.length){ el.innerHTML = emptyBlock(`No hay filas válidas en ${cfg.label.toLowerCase()} para este período.`); return; }
  const headers = cfg.columns;
  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map(h => `<th>${escapeHtml(prettyHeader(h))}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map(r => `<tr>${headers.map(h => `<td>${escapeHtml(formatCell(r[h]))}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function fetchCsv(path, required=true){
  try{
    const res = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
    if(!res.ok){
      if(required) throw new Error(`No se pudo cargar ${path}`);
      return [];
    }
    const text = await res.text();
    return parseCsv(text);
  }catch(err){
    if(required) throw err;
    return [];
  }
}

function parseCsv(text){
  const rows=[]; let row=[], val='', q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], next=text[i+1];
    if(ch==='"'){
      if(q && next==='"'){ val+='"'; i++; }
      else q=!q;
    }else if(ch===',' && !q){
      row.push(val); val='';
    }else if((ch==='\n' || ch==='\r') && !q){
      if(ch==='\r' && next==='\n') i++;
      row.push(val); rows.push(row); row=[]; val='';
    }else{ val+=ch; }
  }
  if(val.length || row.length){ row.push(val); rows.push(row); }
  const clean=rows.filter(r=>r.some(c=>String(c).trim()!==''));
  if(!clean.length) return [];
  const headers=clean[0].map(h=>String(h).trim());
  return clean.slice(1).map(cells=>{
    const out={};
    headers.forEach((h,i)=> out[h] = cells[i] ?? '');
    return out;
  });
}

function normalizeRow(row){
  const out={};
  Object.entries(row).forEach(([k,v]) => {
    const s = String(v ?? '').trim();
    if(s === '') out[k] = '';
    else if(s === 'True' || s === 'true') out[k] = true;
    else if(s === 'False' || s === 'false') out[k] = false;
    else if(!Number.isNaN(Number(s)) && /^-?\d+(\.\d+)?$/.test(s)) out[k] = Number(s);
    else out[k] = s;
  });
  return out;
}

function lineChart(rows, {xKey, series, formatter}){
  if(!rows.length) return '';
  const width = 760, height = 320, m = {t: 18, r: 22, b: 46, l: 52};
  const plotW = width - m.l - m.r, plotH = height - m.t - m.b;
  const maxY = Math.max(1, ...rows.flatMap(r => series.map(s => Number(r[s.key] || 0))));
  const points = rows.map((r, i) => ({ x: m.l + (rows.length === 1 ? plotW/2 : (i * plotW / (rows.length - 1))), label: periodLabel(r[xKey]), raw: r }));
  const grid = [0,.25,.5,.75,1].map(p => {
    const y = m.t + plotH - (plotH * p);
    const value = maxY * p;
    return `<line x1="${m.l}" y1="${y}" x2="${m.l+plotW}" y2="${y}" stroke="rgba(102,133,170,.22)"/><text x="${m.l-10}" y="${y+4}" text-anchor="end" fill="#6685aa" font-size="11">${escapeHtml(formatter(value))}</text>`;
  }).join('');
  const seriesSvg = series.map(s => {
    const pts = points.map(p => {
      const y = m.t + plotH - ((Number(p.raw[s.key] || 0) / maxY) * plotH);
      return {x:p.x, y, v:Number(p.raw[s.key] || 0)};
    });
    const path = pts.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');
    const dash = s.dashed ? 'stroke-dasharray="6 6"' : '';
    const circles = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${s.color}" opacity="0.95"/>`).join('');
    return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="3" ${dash}/>${circles}`;
  }).join('');
  const labels = points.map(p => `<text x="${p.x}" y="${height-18}" text-anchor="middle" fill="#6685aa" font-size="11">${escapeHtml(p.label)}</text>`).join('');
  const legend = `<div class="chart-legend">${series.map(s => `<div class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${escapeHtml(s.label)}</div>`).join('')}</div>`;
  return `<svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img">${grid}${seriesSvg}${labels}</svg>${legend}`;
}

function simpleBarChart(rows, {labelKey, valueKey, color, formatter, truncate=26}){
  if(!rows.length) return '';
  const maxV = Math.max(1, ...rows.map(r => Number(r[valueKey] || 0)));
  const items = rows.map(r => {
    const v = Number(r[valueKey] || 0);
    const pct = (v / maxV) * 100;
    return `
      <div style="display:grid;grid-template-columns:180px 1fr auto;gap:12px;align-items:center;margin:10px 0">
        <div style="font-size:.86rem;color:var(--text-2);font-weight:600">${escapeHtml(shorten(r[labelKey], truncate))}</div>
        <div class="progress" style="margin-top:0;height:11px"><div class="bar" style="width:${pct}%;background:linear-gradient(90deg,${color},#8fd5ff)"></div></div>
        <div style="font-weight:800;color:var(--text)">${escapeHtml(formatter(v))}</div>
      </div>
    `;
  }).join('');
  return `<div>${items}</div>`;
}

function groupedBarChart(rows, {labelKey, valueKeys, truncate=26}){
  if(!rows.length) return '';
  const maxV = Math.max(1, ...rows.flatMap(r => valueKeys.map(vk => Number(r[vk.key] || 0))));
  const items = rows.map(r => `
    <div style="padding:10px 0;border-bottom:1px solid var(--line-soft)">
      <div style="font-size:.86rem;font-weight:700;color:var(--text)">${escapeHtml(shorten(r[labelKey], truncate))}</div>
      <div style="display:grid;gap:8px;margin-top:8px">
        ${valueKeys.map(vk => {
          const v = Number(r[vk.key] || 0);
          const pct = (v / maxV) * 100;
          return `<div style="display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:center"><div style="font-size:.78rem;color:var(--muted);font-weight:700">${escapeHtml(vk.label)}</div><div class="progress" style="margin-top:0;height:10px"><div class="bar" style="width:${pct}%;background:linear-gradient(90deg,${vk.color},#9adfff)"></div></div><div style="font-weight:800">${fmtNum(v)}</div></div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
  return `<div>${items}</div>`;
}

function colorClass(v){
  const s = String(v || '').toLowerCase();
  if(s === 'green' || s === 'ok') return 'green';
  if(s === 'yellow' || s === 'amber') return 'yellow';
  if(s === 'red') return 'red';
  return 'muted';
}
function semaforoLabel(v){
  const s = colorClass(v);
  return {green:'En ruta', yellow:'Atención', red:'Rezago', muted:'Sin meta activa'}[s] || 'Sin dato';
}
function prettyHeader(key){
  return String(key || '').replace(/_/g, ' ');
}
function formatCell(v){
  if(v === true) return 'Sí';
  if(v === false) return 'No';
  if(v === '' || v == null) return '—';
  if(typeof v === 'number') return fmtNum(v);
  if(/^\d{4}-\d{2}-\d{2}/.test(String(v))) return formatDate(String(v).slice(0,10));
  return String(v);
}
function periodLabel(periodo){
  const row = state.data?.total?.find(r => r.periodo === periodo);
  return row ? `${row.mes_nombre} ${row.anio}` : String(periodo || '');
}
function fmtNum(v){
  const n = Number(v || 0);
  if(Number.isInteger(n)) return new Intl.NumberFormat('es-GT').format(n);
  return new Intl.NumberFormat('es-GT', {maximumFractionDigits: 1}).format(n);
}
function fmtPct(v){
  return `${new Intl.NumberFormat('es-GT', {style:'percent', maximumFractionDigits:0}).format(Number(v || 0))}`;
}
function formatDate(s){
  if(!s) return '—';
  const d = new Date(`${String(s).slice(0,10)}T00:00:00`);
  return isNaN(d) ? String(s) : new Intl.DateTimeFormat('es-GT', {day:'2-digit', month:'short', year:'numeric'}).format(d);
}
function formatPeriodRange(min,max){
  return `${String(min || '').slice(0,7)} → ${String(max || '').slice(0,7)}`;
}
function unique(arr){ return [...new Set(arr.filter(Boolean))]; }
function shorten(v, n){ const s=String(v || ''); return s.length>n ? `${s.slice(0,n-1)}…` : s; }
function emptyBlock(msg){ return `<div class="empty">${escapeHtml(msg)}</div>`; }
function escapeHtml(str){ return String(str ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function truthy(v){ return v === true || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'sí' || String(v).toLowerCase() === 'si'; }
