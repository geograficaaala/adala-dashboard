const PATHS = {
  total: './data/educando_para_conservar/total_mes.csv',
  indicadores: './data/educando_para_conservar/institucional_indicadores.csv',
  metadata: './data/educando_para_conservar/metadata_publicacion.csv'
};

let state = {
  total: [],
  indicadores: [],
  metadata: [],
  period: ''
};

document.addEventListener('DOMContentLoaded', bootstrap);

async function bootstrap(){
  try{
    const [total, indicadores, metadata] = await Promise.all([
      fetchCsv(PATHS.total),
      fetchCsv(PATHS.indicadores),
      fetchCsv(PATHS.metadata)
    ]);

    state.total = total.map(normalizeRow).sort((a,b) => String(a.periodo_clave).localeCompare(String(b.periodo_clave)));
    state.indicadores = indicadores.map(normalizeRow);
    state.metadata = metadata.map(normalizeRow);

    const periods = [...new Set(state.total.map(r => String(r.periodo_clave)).filter(Boolean))];
    state.period = periods.at(-1) || '';

    buildControls();
    renderAll();
  }catch(err){
    console.error(err);
    document.body.innerHTML = `
      <div style="max-width:900px;margin:40px auto;padding:24px;font-family:system-ui">
        <h2>No se pudo cargar el dashboard EPC</h2>
        <p>Revisa que existan estos archivos:</p>
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

function buildControls(){
  const select = document.getElementById('periodSelect');
  const periods = [...new Set(state.total.map(r => String(r.periodo_clave)).filter(Boolean))];

  select.innerHTML = periods.map(p => `<option value="${p}">${periodLabel(p)}</option>`).join('');
  select.value = state.period;

  select.addEventListener('change', () => {
    state.period = select.value;
    renderAll();
  });
}

function renderAll(){
  renderKpis();
  renderIndicatorTable();
  renderNotes();
}

function selectedTotal(){
  return state.total.find(r => String(r.periodo_clave) === String(state.period)) || null;
}

function selectedIndicators(){
  return state.indicadores
    .filter(r => String(r.periodo_clave) === String(state.period))
    .sort((a,b) => Number(a.orden_dashboard || 0) - Number(b.orden_dashboard || 0));
}

function renderKpis(){
  const rows = selectedIndicators().filter(r => String(r.categoria) === 'estrategico');
  const el = document.getElementById('kpiGrid');

  if(!rows.length){
    el.innerHTML = `<div class="card">No hay datos para este período.</div>`;
    return;
  }

  el.innerHTML = rows.map(r => `
    <article class="card">
      <div class="kpi-title">${escapeHtml(r.indicador_nombre)}</div>
      <div class="kpi-value">${fmtNum(r.valor_acumulado)}</div>
      <div class="kpi-meta">
        Mes: ${fmtNum(r.valor_mes)}<br>
        Meta anual: ${fmtNum(r.meta_anual)}<br>
        Esperado al corte: ${fmtNum(r.esperado_al_corte)}
      </div>
      <span class="badge ${badgeClass(r.estatus)}">${escapeHtml(r.estatus || '—')}</span>
    </article>
  `).join('');
}

function renderIndicatorTable(){
  const rows = selectedIndicators();
  const tbody = document.getElementById('indicatorTable');

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="8">Sin datos para este período.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <strong>${escapeHtml(r.indicador_nombre)}</strong><br>
        <span class="small">${escapeHtml(r.modelo_medicion || '')}</span>
      </td>
      <td>${fmtNum(r.valor_mes)}</td>
      <td>${fmtNum(r.valor_acumulado)}</td>
      <td>${fmtNum(r.meta_anual)}</td>
      <td>${fmtNum(r.esperado_al_corte)}</td>
      <td>${fmtPct(r.pct_meta_anual)}</td>
      <td>${fmtPct(r.pct_vs_esperado)}</td>
      <td><span class="badge ${badgeClass(r.estatus)}">${escapeHtml(r.estatus || '—')}</span></td>
    </tr>
  `).join('');
}

function renderNotes(){
  const row = selectedTotal();
  const el = document.getElementById('notesBox');

  if(!row){
    el.textContent = 'Sin narrativa disponible.';
    return;
  }

  el.textContent =
`Logros:
${row.logros_texto || '—'}

Alertas:
${row.alertas_texto || '—'}

Fuente / criterio:
${row.fuente_texto || '—'}`;
}

function fetchCsv(url){
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

function normalizeRow(row){
  const out = {};
  for(const [k, v] of Object.entries(row)){
    const key = String(k || '').trim();
    const raw = typeof v === 'string' ? v.trim() : v;
    const num = Number(raw);

    if(raw === '' || raw === null || raw === undefined){
      out[key] = '';
    }else if(!Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(String(raw))){
      out[key] = num;
    }else{
      out[key] = raw;
    }
  }
  return out;
}

function fmtNum(v){
  const n = Number(v || 0);
  if(Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 1 }).format(n);
}

function fmtPct(v){
  const n = Number(v || 0);
  if(Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-GT', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(n);
}

function badgeClass(status){
  const s = String(status || '').toLowerCase();
  if(['verde','green'].includes(s)) return 'verde';
  if(['amarillo','yellow'].includes(s)) return 'amarillo';
  if(['rojo','red'].includes(s)) return 'rojo';
  if(['azul','blue'].includes(s)) return 'azul';
  return 'gris';
}

function periodLabel(period){
  const p = String(period || '');
  if(!p.includes('-')) return p;
  const [y,m] = p.split('-');
  const months = {
    '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio',
    '07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'
  };
  return `${months[m] || p} ${y}`;
}

function escapeHtml(value){
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
