/* ═══════════════════════════════════════════════════════════════════════
   ATITLÁN RECICLA — GENERADOR DE INFORMES / MEMORIAS
   Versión 2.0  |  Coordina carga de datos, selección de período y
   generación de un documento HTML imprimible fiel a la plantilla docx.
═══════════════════════════════════════════════════════════════════════ */

'use strict';

/* ── Rutas de datos ─────────────────────────────────────────────────── */
const INF_PATHS = {
  totalMes:         './data/total_mes.csv',
  zonaMes:          './data/zona_mes.csv',
  territorioMes:    './data/territorio_mes.csv',
  materialesResumen:'./data/materiales_resumen_mes.csv',
  materialesRaw:    './data/materiales_detalle.csv',
};

/* ── Estado global del generador ────────────────────────────────────── */
let infData = {
  total: [], zona: [], territorio: [], matResumen: [], matRaw: [],
  periods: [], loaded: false
};

/* ══════════════════════════════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════════════════════════════ */
function infSafeNum(v){ const n=parseFloat(String(v).replace(/,/g,'')); return isNaN(n)?0:n; }
function infFmt(v){ return infSafeNum(v).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function infFmtInt(v){ return Math.round(infSafeNum(v)).toLocaleString('es-GT'); }
function infFmtQ(v){ return 'Q\u00a0'+infFmt(v); }
function infFmtPct(v){ return (infSafeNum(v)*100).toFixed(1)+'%'; }
function infEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const MES_NOMBRES = {
  1:'enero',2:'febrero',3:'marzo',4:'abril',5:'mayo',6:'junio',
  7:'julio',8:'agosto',9:'septiembre',10:'octubre',11:'noviembre',12:'diciembre'
};
const MES_LABELS = {
  1:'ENE',2:'FEB',3:'MAR',4:'ABR',5:'MAY',6:'JUN',
  7:'JUL',8:'AGO',9:'SEP',10:'OCT',11:'NOV',12:'DIC'
};

function infPeriodLabel(anio, mes){ return (MES_LABELS[+mes]||mes)+' '+anio; }
function infPeriodKey(anio, mes){ return String(anio)+'_'+String(mes).padStart(2,'0'); }

/* ── CSV parser ────────────────────────────────────────────────────── */
function infParseCsv(text){
  const rows=[]; let row=[], val='', q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], nx=text[i+1];
    if(ch==='"'){ if(q&&nx==='"'){val+='"';i++;}else q=!q; }
    else if(ch===','&&!q){ row.push(val); val=''; }
    else if((ch==='\n'||ch==='\r')&&!q){
      if(ch==='\r'&&nx==='\n') i++;
      row.push(val); rows.push(row); row=[]; val='';
    } else val+=ch;
  }
  if(val.length||row.length){row.push(val);rows.push(row);}
  const clean=rows.filter(r=>r.some(c=>String(c).trim()!==''));
  if(!clean.length) return [];
  const headers=clean[0].map(h=>String(h).trim());
  return clean.slice(1).map(cells=>{
    const o={};
    headers.forEach((h,i)=>o[h]=cells[i]??'');
    return o;
  });
}

async function infFetchCsv(path, required=true){
  try{
    const res=await fetch(path+'?v='+Date.now(),{cache:'no-store'});
    if(!res.ok){ if(required) throw new Error('No se pudo cargar '+path); return []; }
    return infParseCsv(await res.text());
  }catch(err){ if(required) throw err; return []; }
}

/* ── Filtros de datos ──────────────────────────────────────────────── */
function infFilterPeriod(rows, anio, mes){
  return rows.filter(r=>
    String(r.anio)===String(anio) &&
    (String(r.mes_num)===String(mes) || String(r.mes)===MES_LABELS[+mes])
  );
}

function infGetTotal(anio, mes){
  const rows = infFilterPeriod(infData.total, anio, mes).filter(r=>
    String(r.zona||r.ZONA||'').toUpperCase()==='TOTAL'
  );
  return rows[0] || null;
}

function infGetZonas(anio, mes){
  return infFilterPeriod(infData.zona, anio, mes)
    .filter(r=>String(r.zona||'').toUpperCase()!=='TOTAL')
    .sort((a,b)=>infSafeNum(b.total_materiales_qq)-infSafeNum(a.total_materiales_qq));
}

function infGetTerritorios(anio, mes){
  return infFilterPeriod(infData.territorio, anio, mes)
    .filter(r=>infSafeNum(r.total_materiales_qq)>0)
    .sort((a,b)=>infSafeNum(b.total_materiales_qq)-infSafeNum(a.total_materiales_qq));
}

function infGetMateriales(anio, mes){
  // aggregate by material from resumen
  const rows = infFilterPeriod(infData.matResumen, anio, mes);
  const map={};
  rows.forEach(r=>{
    const mat=String(r.material||'').trim(); if(!mat) return;
    if(!map[mat]) map[mat]={material:mat, cantidad:0, ingreso:0};
    map[mat].cantidad+=infSafeNum(r.cantidad);
    map[mat].ingreso+=infSafeNum(r.ingreso_total_venta);
  });
  return Object.values(map).filter(r=>r.cantidad>0).sort((a,b)=>b.cantidad-a.cantidad);
}

/* ══════════════════════════════════════════════════════════════════════
   CARGA INICIAL
══════════════════════════════════════════════════════════════════════ */
async function infLoadData(){
  const [total,zona,territorio,matResumen,matRaw] = await Promise.all([
    infFetchCsv(INF_PATHS.totalMes, true),
    infFetchCsv(INF_PATHS.zonaMes, true),
    infFetchCsv(INF_PATHS.territorioMes, true),
    infFetchCsv(INF_PATHS.materialesResumen, false),
    infFetchCsv(INF_PATHS.materialesRaw, false),
  ]);

  infData.total       = total.filter(r=>String(r.programa||'').includes('atitlan'));
  infData.zona        = zona.filter(r=>String(r.programa||'').includes('atitlan'));
  infData.territorio  = territorio.filter(r=>String(r.programa||'').includes('atitlan'));
  infData.matResumen  = matResumen.filter(r=>String(r.programa||'').includes('atitlan'));
  infData.matRaw      = matRaw.filter(r=>String(r.programa||'').includes('atitlan'));

  // Build sorted period list from total rows
  const seen=new Set();
  infData.periods = infData.total
    .filter(r=>String(r.zona||'').toUpperCase()==='TOTAL' && infSafeNum(r.mujeres_activas)>0)
    .map(r=>({ anio:+r.anio, mes:+r.mes_num, label:infPeriodLabel(r.anio,r.mes_num), key:infPeriodKey(r.anio,r.mes_num) }))
    .filter(p=>{ if(seen.has(p.key)) return false; seen.add(p.key); return true; })
    .sort((a,b)=> a.anio!==b.anio ? a.anio-b.anio : a.mes-b.mes );

  infData.loaded=true;
}

/* ══════════════════════════════════════════════════════════════════════
   INIT — llamado desde HTML
══════════════════════════════════════════════════════════════════════ */
async function infInit(){
  const statusEl=document.getElementById('infStatus');
  const formEl=document.getElementById('infForm');

  try{
    statusEl.textContent='Cargando datos…';
    await infLoadData();

    if(!infData.periods.length){
      statusEl.innerHTML='<span style="color:#881818">No hay períodos con datos disponibles.</span>';
      return;
    }

    // Populate period selector
    const sel=document.getElementById('infPeriodSel');
    sel.innerHTML=infData.periods.map(p=>
      `<option value="${infEsc(p.key)}">${infEsc(p.label.toUpperCase())}</option>`
    ).join('');
    // Default to latest
    sel.value=infData.periods[infData.periods.length-1].key;

    statusEl.textContent='';
    formEl.style.display='';

    // Field listeners (period is bound in HTML boot after wrapping)
    document.getElementById('infLugar')?.addEventListener('input', infUpdatePreview);
    document.getElementById('infFecha')?.addEventListener('input', infUpdatePreview);
    document.getElementById('infHora')?.addEventListener('input', infUpdatePreview);

    infUpdatePreview();
  }catch(err){
    statusEl.innerHTML=`<span style="color:#881818">Error al cargar datos: ${infEsc(err.message)}</span>`;
    console.error(err);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   PREVIEW
══════════════════════════════════════════════════════════════════════ */
function infGetFormValues(){
  const sel=document.getElementById('infPeriodSel');
  const [anio,mes]=sel.value.split('_').map(Number);
  return {
    anio, mes,
    lugar: document.getElementById('infLugar').value||'Panajachel, Sololá',
    fecha: document.getElementById('infFecha').value||new Date().toLocaleDateString('es-GT',{day:'2-digit',month:'long',year:'numeric'}),
    hora:  document.getElementById('infHora').value||'09:00 horas',
    tipo:  document.getElementById('infTipoDoc').value||'memoria',
  };
}

function infUpdatePreview(){
  const vals=infGetFormValues();
  const html=infBuildDocument(vals);
  const iframe=document.getElementById('infPreview');
  iframe.srcdoc=html;
}

/* ══════════════════════════════════════════════════════════════════════
   GENERADOR PRINCIPAL DE DOCUMENTO
══════════════════════════════════════════════════════════════════════ */
function infBuildDocument({ anio, mes, lugar, fecha, hora, tipo }){
  const total      = infGetTotal(anio, mes);
  const zonas      = infGetZonas(anio, mes);
  const territorios= infGetTerritorios(anio, mes);
  const materiales = infGetMateriales(anio, mes);
  const mesNombre  = MES_NOMBRES[mes]||String(mes);
  const periodoLabel = (mesNombre.charAt(0).toUpperCase()+mesNombre.slice(1))+' '+anio;

  const esMem = tipo==='memoria';
  const titulo = esMem
    ? 'MEMORIA DE REUNIÓN DE AVANCES — ATITLÁN RECICLA'
    : 'INFORME MENSUAL DE INDICADORES — ATITLÁN RECICLA';

  /* KPIs principales */
  const mujeresActivas      = total ? infFmt(total.mujeres_activas) : '—';
  const mujeresCom          = total ? infFmt(total.mujeres_comercializacion) : '—';
  const totalMat            = total ? infFmt(total.total_materiales_qq) : '—';
  const petQq               = total ? infFmt(total.pet_qq) : '—';
  const vidrioQq            = total ? infFmt(total.vidrio_total_qq) : '—';
  const ingresoNetoTerr     = total ? infFmtQ(total.ingreso_neto_total_territorio) : '—';
  const ingresoNetoCoop     = total ? infFmtQ(total.ingreso_neto_cooperativa) : '—';
  const ingresoBruto        = total ? infFmtQ(total.ingreso_bruto_total) : '—';
  const ingresoNeto         = total ? infFmtQ(total.ingreso_neto_lideresas) : '—';
  const ingresoLideresa     = total ? infFmtQ(total.ingreso_diario_lideresa) : '—';
  const horasTrabajadas     = total ? infFmt(total.horas_trabajadas_lideresas) : '—';
  const mujInscritas        = total ? infFmtInt(total.mujeres_inscritas_total) : '—';

  /* Top territorios */
  const topTerr = territorios.slice(0, 8);

  /* ── Análisis ejecutivo automático ─────────────────────────────── */
  function buildAnalisis(){
    if(!total) return '<p>Sin datos disponibles para el período seleccionado.</p>';
    const matVal = infSafeNum(total.total_materiales_qq);
    const petVal = infSafeNum(total.pet_qq);
    const vidVal = infSafeNum(total.vidrio_total_qq);
    const incVal = infSafeNum(total.ingreso_neto_total_territorio);
    const actVal = infSafeNum(total.mujeres_activas);
    const comVal = infSafeNum(total.mujeres_comercializacion);

    // período previo comparación
    let prevRow=null;
    if(mes>1){
      prevRow=infGetTotal(anio,mes-1);
    } else {
      prevRow=infGetTotal(anio-1,12);
    }
    const prevMat = prevRow ? infSafeNum(prevRow.total_materiales_qq) : null;
    const prevInc = prevRow ? infSafeNum(prevRow.ingreso_neto_total_territorio) : null;
    const matTrend = prevMat ? (matVal>=prevMat ? 'incremento' : 'descenso') : null;
    const matDiff  = prevMat ? Math.abs(matVal-prevMat).toFixed(1) : null;
    const incTrend = prevInc ? (incVal>=prevInc ? 'incremento' : 'descenso') : null;
    const incDiff  = prevInc ? 'Q\u00a0'+infFmt(Math.abs(incVal-prevInc)) : null;

    const topZona  = zonas[0];
    const topTerrName = topTerr[0];

    let p1=`Durante el período reportado, Atitlán Recicla continuó con las acciones de recuperación y comercialización de materiales reciclables en los territorios priorizados, manteniendo la participación de lideresas, la recuperación de PET y vidrio, y la generación de ingresos en el territorio. El presente informe resume los principales resultados cuantitativos del mes de <strong>${mesNombre} de ${anio}</strong>, así como una lectura ejecutiva de su comportamiento con base en los datos consolidados del dashboard.`;

    let p2=`En el mes de ${mesNombre} de ${anio}, el programa registró <strong>${totalMat}</strong> quintales de materiales recuperados en total, de los cuales <strong>${petQq}</strong> correspondieron a PET y <strong>${vidrioQq}</strong> a vidrio. Asimismo, se reportó un ingreso neto total en el territorio de <strong>${ingresoNetoTerr}</strong>.`;

    let p3=`La participación mensual mostró un promedio de <strong>${mujeresActivas}</strong> mujeres activas y <strong>${mujeresCom}</strong> mujeres involucradas en comercialización.`;

    if(matTrend){
      p3+=` En términos de evolución mensual, los materiales recuperados registraron un <strong>${matTrend} de ${matDiff} qq</strong> respecto al mes anterior${incTrend?', y el ingreso neto territorial presentó un '+incTrend+' de <strong>'+incDiff+'</strong>':''}`;
    } else {
      p3+=` En términos de lectura ejecutiva, el período presenta al ser el primer período disponible del año, este mes funciona como línea base para el seguimiento.`;
    }
    p3+='.';

    if(topZona){
      p3+=` La zona con mayor volumen fue <strong>${infEsc(topZona.zona)}</strong> con <strong>${infFmt(topZona.total_materiales_qq)} qq</strong>.`;
    }

    return `<p>${p1}</p><p>${p2}</p><p>${p3}</p>`;
  }

  /* ── Acuerdos ────────────────────────────────────────────────────── */
  function buildAcuerdos(){
    return `<p>Se acuerda mantener el monitoreo mensual de la recuperación de materiales, fortalecer el seguimiento a la participación de lideresas y continuar la revisión periódica de ingresos generados en el territorio, con el fin de sostener la trazabilidad de resultados y la toma de decisiones operativas.</p>`;
  }

  /* ── Tabla de zonas ──────────────────────────────────────────────── */
  function buildZonaTable(){
    if(!zonas.length) return '<p><em>Sin datos de zona para este período.</em></p>';
    const rows=zonas.map(z=>`
      <tr>
        <td>${infEsc(z.zona)}</td>
        <td class="num">${infFmt(z.mujeres_activas)}</td>
        <td class="num">${infFmt(z.mujeres_comercializacion)}</td>
        <td class="num">${infFmt(z.total_materiales_qq)}</td>
        <td class="num">${infFmtQ(z.ingreso_neto_total_territorio)}</td>
      </tr>`).join('');
    return `
      <table>
        <thead>
          <tr>
            <th>Zona</th>
            <th>Mujeres activas</th>
            <th>Mujeres en comercialización</th>
            <th>Total materiales (qq)</th>
            <th>Ingreso neto territorial</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  /* ── Tabla territorios ───────────────────────────────────────────── */
  function buildTerritorioTable(){
    if(!topTerr.length) return '<p><em>Sin datos territoriales para este período.</em></p>';
    const rows=topTerr.map(t=>`
      <tr>
        <td>${infEsc(t.territorio)}</td>
        <td>${infEsc(t.zona)}</td>
        <td class="num">${infFmt(t.total_materiales_qq)}</td>
        <td class="num">${infFmtQ(t.ingreso_neto_total_territorio)}</td>
      </tr>`).join('');
    return `
      <table>
        <thead>
          <tr>
            <th>Territorio</th>
            <th>Zona</th>
            <th>Total materiales (qq)</th>
            <th>Ingreso neto territorial</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  /* ── Tabla materiales ────────────────────────────────────────────── */
  function buildMaterialesTable(){
    if(!materiales.length) return '<p><em>Sin detalle de materiales para este período.</em></p>';
    const totalMats=materiales.reduce((s,m)=>s+m.cantidad,0)||1;
    const rows=materiales.slice(0,12).map(m=>`
      <tr>
        <td>${infEsc(m.material)}</td>
        <td class="num">${infFmt(m.cantidad)}</td>
        <td class="num">${(m.cantidad/totalMats*100).toFixed(1)}%</td>
        <td class="num">${infFmtQ(m.ingreso)}</td>
      </tr>`).join('');
    return `
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Cantidad (qq / uds)</th>
            <th>% del total</th>
            <th>Ingreso venta</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  /* ── Tabla resumen financiero ────────────────────────────────────── */
  function buildFinancialTable(){
    if(!total) return '<p><em>Sin datos financieros para este período.</em></p>';
    return `
      <table>
        <thead>
          <tr><th>Indicador financiero</th><th>Valor</th></tr>
        </thead>
        <tbody>
          <tr><td>Ingreso bruto total</td><td class="num">${ingresoBruto}</td></tr>
          <tr><td>Ingreso neto total territorio</td><td class="num">${ingresoNetoTerr}</td></tr>
          <tr><td>Ingreso neto lideresas</td><td class="num">${ingresoNeto}</td></tr>
          <tr><td>Ingreso neto cooperativa</td><td class="num">${ingresoNetoCoop}</td></tr>
          <tr><td>Ingreso diario por lideresa</td><td class="num">${ingresoLideresa}</td></tr>
          <tr><td>Horas trabajadas lideresas</td><td class="num">${horasTrabajadas}</td></tr>
        </tbody>
      </table>`;
  }

  /* ── Gráfica SVG: barras de zonas ─────────────────────────────────── */
  function buildZonaChart(){
    if(!zonas.length) return '';
    const W=640, barH=28, gap=10, padL=115, padR=120, padT=10, padB=10;
    const H=padT+zonas.length*(barH+gap)-gap+padB;
    const maxVal=Math.max(...zonas.map(z=>infSafeNum(z.total_materiales_qq)))||1;
    const COLORS=['#195f33','#267a46','#3a9e62','#1a527a','#0c7070','#4a9060'];
    let bars='';
    zonas.forEach((z,i)=>{
      const val=infSafeNum(z.total_materiales_qq);
      const bw=Math.max(3,Math.round((val/maxVal)*(W-padL-padR)));
      const y=padT+i*(barH+gap);
      const col=COLORS[i%COLORS.length];
      bars+=`
        <text x="${padL-6}" y="${y+barH/2+4}" text-anchor="end" font-size="10" font-family="Arial,sans-serif" fill="#2c472c" font-weight="700">${infEsc(z.zona)}</text>
        <rect x="${padL}" y="${y+2}" width="${W-padL-padR}" height="${barH-4}" rx="4" fill="#e8f0e8"/>
        <rect x="${padL}" y="${y+2}" width="${bw}" height="${barH-4}" rx="4" fill="${col}"/>
        <text x="${padL+bw+6}" y="${y+barH/2+4}" font-size="10" font-family="monospace" fill="#2c472c" font-weight="700">${infFmt(val)} qq</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
  }

  /* ── Gráfica SVG: barras de participación ─────────────────────────── */
  function buildParticipacionChart(){
    if(!zonas.length) return '';
    const W=640, barH=22, gap=8, padL=115, padR=80, padT=10, padB=10;
    const H=padT+zonas.length*(barH+gap)*2-gap+padB+30;
    const maxVal=Math.max(...zonas.flatMap(z=>[infSafeNum(z.mujeres_activas),infSafeNum(z.mujeres_comercializacion)]))||1;
    const COLORS_A='#195f33', COLORS_C='#1a527a';
    let bars='', y=padT;
    // Legend
    bars+=`<rect x="${padL}" y="4" width="12" height="10" fill="${COLORS_A}"/>
           <text x="${padL+16}" y="13" font-size="9" font-family="Arial,sans-serif" fill="#333">Mujeres activas</text>
           <rect x="${padL+120}" y="4" width="12" height="10" fill="${COLORS_C}"/>
           <text x="${padL+136}" y="13" font-size="9" font-family="Arial,sans-serif" fill="#333">En comercialización</text>`;
    y=padT+20;
    zonas.forEach((z,i)=>{
      const va=infSafeNum(z.mujeres_activas), vc=infSafeNum(z.mujeres_comercializacion);
      const ba=Math.max(3,Math.round((va/maxVal)*(W-padL-padR)));
      const bc=Math.max(3,Math.round((vc/maxVal)*(W-padL-padR)));
      bars+=`
        <text x="${padL-6}" y="${y+barH/2+4}" text-anchor="end" font-size="10" font-family="Arial,sans-serif" fill="#2c472c" font-weight="700">${infEsc(z.zona)}</text>
        <rect x="${padL}" y="${y}" width="${ba}" height="${barH-4}" rx="3" fill="${COLORS_A}"/>
        <text x="${padL+ba+4}" y="${y+barH/2+1}" font-size="9" font-family="monospace" fill="#555">${infFmt(va)}</text>
        <rect x="${padL}" y="${y+barH+2}" width="${bc}" height="${barH-4}" rx="3" fill="${COLORS_C}"/>
        <text x="${padL+bc+4}" y="${y+barH*2-1}" font-size="9" font-family="monospace" fill="#555">${infFmt(vc)}</text>`;
      y+=barH*2+gap+10;
    });
    return `<svg viewBox="0 0 ${W} ${y+padB}" width="${W}" height="${y+padB}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
  }

  /* ── Gráfica SVG: PET y vidrio ────────────────────────────────────── */
  function buildPetVidrioChart(){
    if(!zonas.length) return '';
    const W=640, barH=24, gap=8, padL=115, padR=100, padT=10, padB=10;
    const H=padT+zonas.length*(barH+gap)*2-gap+padB+30;
    const maxVal=Math.max(...zonas.flatMap(z=>[infSafeNum(z.pet_qq),infSafeNum(z.vidrio_total_qq)]))||1;
    const COLORS_P='#0c7070', COLORS_V='#795200';
    let bars='', y=padT;
    bars+=`<rect x="${padL}" y="4" width="12" height="10" fill="${COLORS_P}"/>
           <text x="${padL+16}" y="13" font-size="9" font-family="Arial,sans-serif" fill="#333">PET (qq)</text>
           <rect x="${padL+90}" y="4" width="12" height="10" fill="${COLORS_V}"/>
           <text x="${padL+106}" y="13" font-size="9" font-family="Arial,sans-serif" fill="#333">Vidrio (qq)</text>`;
    y=padT+20;
    zonas.forEach(z=>{
      const vp=infSafeNum(z.pet_qq), vv=infSafeNum(z.vidrio_total_qq);
      const bp=Math.max(3,Math.round((vp/maxVal)*(W-padL-padR)));
      const bv=Math.max(3,Math.round((vv/maxVal)*(W-padL-padR)));
      bars+=`
        <text x="${padL-6}" y="${y+barH/2+4}" text-anchor="end" font-size="10" font-family="Arial,sans-serif" fill="#2c472c" font-weight="700">${infEsc(z.zona)}</text>
        <rect x="${padL}" y="${y}" width="${bp}" height="${barH-4}" rx="3" fill="${COLORS_P}"/>
        <text x="${padL+bp+4}" y="${y+barH/2+1}" font-size="9" font-family="monospace" fill="#555">${infFmt(vp)}</text>
        <rect x="${padL}" y="${y+barH+2}" width="${bv}" height="${barH-4}" rx="3" fill="${COLORS_V}"/>
        <text x="${padL+bv+4}" y="${y+barH*2-1}" font-size="9" font-family="monospace" fill="#555">${infFmt(vv)}</text>`;
      y+=barH*2+gap+10;
    });
    return `<svg viewBox="0 0 ${W} ${y+padB}" width="${W}" height="${y+padB}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
  }

  /* ═══════════════════════════════════════════════════════════════════
     HTML DEL DOCUMENTO COMPLETO
  ═══════════════════════════════════════════════════════════════════ */
  const logoPath = './logosatitlan.png';

  const resumen_bullets = total ? `
    <ul>
      <li>Promedio mensual de mujeres activas: <strong>${mujeresActivas}</strong>.</li>
      <li>Promedio mensual de mujeres involucradas en comercialización: <strong>${mujeresCom}</strong>.</li>
      <li>Mujeres inscritas en el programa: <strong>${mujInscritas}</strong>.</li>
      <li>Total de materiales recuperados: <strong>${totalMat}</strong> qq.</li>
      <li>PET recuperado: <strong>${petQq}</strong> qq.</li>
      <li>Vidrio recuperado: <strong>${vidrioQq}</strong> qq.</li>
      <li>Ingreso neto total del territorio: <strong>${ingresoNetoTerr}</strong>.</li>
      <li>Ingreso neto de cooperativa: <strong>${ingresoNetoCoop}</strong>.</li>
      <li>Ingreso diario por lideresa: <strong>${ingresoLideresa}</strong>.</li>
    </ul>` : '<p><em>Sin datos disponibles.</em></p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${infEsc(titulo)} · ${infEsc(periodoLabel)}</title>
<style>
  @page { size: letter portrait; margin: 2cm 2.2cm 2cm 2.2cm; }
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 11.5pt;
    line-height: 1.4;
    color: #111;
    background: #fff;
  }
  p { text-align: justify; margin: 0 0 8pt 0; }
  ul { margin: 0 0 10pt 22pt; padding: 0; }
  li { margin: 0 0 4pt 0; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 10pt 0 14pt; font-size: 10.5pt; }
  th, td { border: 1px solid #555; padding: 5px 7px; vertical-align: top; }
  th { background: #e8f0e8; text-align: center; font-weight: 700; font-size: 10pt; }
  td.num { text-align: right; font-family: "Courier New", Courier, monospace; font-size: 10pt; }

  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #195f33; }
  .doc-header img.logo { max-width: 260px; max-height: 80px; object-fit: contain; }
  .doc-header-info { text-align: right; font-size: 9.5pt; color: #444; line-height: 1.5; }
  .doc-header-info strong { color: #195f33; font-size: 10pt; }

  .doc-title { text-align: center; font-weight: 700; text-transform: uppercase; margin: 16pt 0 4pt; font-size: 13pt; color: #111; letter-spacing: .03em; }
  .doc-subtitle { text-align: center; font-weight: 700; font-size: 11.5pt; margin-bottom: 14pt; color: #195f33; }

  .meta-block { margin-bottom: 12pt; }
  .meta-block p { margin: 2pt 0; }

  .section-title { font-weight: 700; text-transform: uppercase; margin: 14pt 0 7pt; padding-bottom: 3pt; border-bottom: 1.5px solid #195f33; color: #195f33; font-size: 11pt; letter-spacing: .04em; }

  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin: 10pt 0 14pt; }
  .kpi-card { border: 1.5px solid #c5d9c5; border-radius: 5pt; padding: 8pt 10pt; background: #f4faf4; }
  .kpi-card small { display: block; font-size: 8.5pt; color: #444; margin-bottom: 2pt; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: .04em; }
  .kpi-card strong { display: block; font-size: 13pt; color: #195f33; font-family: "Courier New", Courier, monospace; line-height: 1.2; }

  .chart-block { margin: 12pt 0 14pt; page-break-inside: avoid; }
  .chart-title { font-weight: 700; margin-bottom: 7pt; font-size: 10.5pt; font-family: Arial, sans-serif; color: #333; }

  .page-break { page-break-after: always; }

  .signature-block { margin-top: 32pt; padding-top: 14pt; border-top: 1px solid #ccc; }
  .signature-block p { margin: 2pt 0; }

  .interp-box { margin: 10pt 0; padding: 9pt 12pt; background: #f0f7f0; border-left: 3pt solid #195f33; font-size: 10.5pt; font-family: Arial, sans-serif; line-height: 1.55; color: #222; }
  .interp-box strong { color: #195f33; }

  .footer { margin-top: 24pt; padding-top: 8pt; border-top: 1px solid #ccc; font-size: 8.5pt; color: #666; text-align: center; font-family: Arial, sans-serif; }

  @media print {
    .no-print { display: none !important; }
    body { background: #fff; }
  }
  @media screen {
    body { background: #f0f0f0; }
    .doc-page { background: #fff; max-width: 820px; margin: 0 auto; padding: 2.2cm 2.5cm; box-shadow: 0 4px 32px rgba(0,0,0,.15); }
  }
</style>
</head>
<body>
<div class="doc-page">

  <!-- ENCABEZADO -->
  <div class="doc-header">
    <img class="logo" src="${logoPath}" alt="Logos Atitlán Recicla — AALA">
    <div class="doc-header-info">
      <strong>Atitlán Recicla</strong><br>
      Programa de Reciclaje Comunitario<br>
      Cuenca del Lago de Atitlán, Sololá<br>
      <span style="color:#195f33;font-weight:700;">${infEsc(periodoLabel.toUpperCase())}</span>
    </div>
  </div>

  <!-- TÍTULO -->
  <div class="doc-title">${infEsc(titulo)}</div>
  <div class="doc-subtitle">${infEsc(periodoLabel.toUpperCase())}</div>

  <!-- METADATOS -->
  <div class="meta-block">
    <p><strong>Lugar:</strong> ${infEsc(lugar)}</p>
    <p><strong>Fecha:</strong> ${infEsc(fecha)}</p>
    <p><strong>Hora:</strong> ${infEsc(hora)}</p>
  </div>

  <!-- SECCIÓN 1: OBJETIVO -->
  <p class="section-title">1. Objetivo de la reunión</p>
  <p>Dar seguimiento a los avances del programa Atitlán Recicla correspondientes al mes de ${mesNombre} de ${anio}, revisando la participación de lideresas, la recuperación y comercialización de materiales reciclables, así como la evolución de los ingresos generados en el territorio.</p>

  <!-- SECCIÓN 2: PRINCIPALES RESULTADOS -->
  <p class="section-title">2. Principales resultados presentados</p>
  ${resumen_bullets}

  <!-- KPI GRID VISUAL -->
  <div class="kpi-grid">
    <div class="kpi-card"><small>Mujeres activas (prom.)</small><strong>${mujeresActivas}</strong></div>
    <div class="kpi-card"><small>Mujeres comercialización</small><strong>${mujeresCom}</strong></div>
    <div class="kpi-card"><small>Mujeres inscritas</small><strong>${mujInscritas}</strong></div>
    <div class="kpi-card"><small>Total materiales (qq)</small><strong>${totalMat}</strong></div>
    <div class="kpi-card"><small>PET recuperado (qq)</small><strong>${petQq}</strong></div>
    <div class="kpi-card"><small>Vidrio recuperado (qq)</small><strong>${vidrioQq}</strong></div>
    <div class="kpi-card"><small>Ingreso neto territorial</small><strong>${ingresoNetoTerr}</strong></div>
    <div class="kpi-card"><small>Ingreso neto cooperativa</small><strong>${ingresoNetoCoop}</strong></div>
    <div class="kpi-card"><small>Ingreso diario lideresa</small><strong>${ingresoLideresa}</strong></div>
  </div>

  <!-- GRÁFICA 1: PARTICIPACIÓN -->
  <div class="chart-block">
    <div class="chart-title">Gráfica 1. Participación mensual de mujeres por zona (${infEsc(periodoLabel)})</div>
    ${buildParticipacionChart()}
  </div>

  <!-- GRÁFICA 2: PET Y VIDRIO -->
  <div class="chart-block">
    <div class="chart-title">Gráfica 2. PET y vidrio recuperados por zona — en quintales (${infEsc(periodoLabel)})</div>
    ${buildPetVidrioChart()}
  </div>

  <div class="page-break"></div>

  <!-- SECCIÓN 3: ANÁLISIS -->
  <p class="section-title">3. Análisis e interpretación</p>
  ${buildAnalisis()}

  <!-- SECCIÓN 4: RESULTADOS POR ZONA -->
  <p class="section-title">4. Resultados por zona</p>
  ${buildZonaTable()}

  <div class="chart-block">
    <div class="chart-title">Gráfica 3. Total de materiales recuperados por zona — en quintales (${infEsc(periodoLabel)})</div>
    ${buildZonaChart()}
  </div>

  <!-- SECCIÓN 5: TERRITORIOS CON MAYOR RECUPERACIÓN -->
  <p class="section-title">5. Territorios con mayor recuperación reportada</p>
  ${buildTerritorioTable()}

  <!-- SECCIÓN 6: DETALLE DE MATERIALES -->
  <p class="section-title">6. Detalle de materiales recuperados</p>
  ${buildMaterialesTable()}

  <!-- SECCIÓN 7: RESUMEN FINANCIERO -->
  <p class="section-title">7. Resumen financiero del período</p>
  ${buildFinancialTable()}

  <!-- SECCIÓN 8: ACUERDOS -->
  <p class="section-title">${esMem ? '8. Acuerdos y seguimiento' : '8. Conclusiones y seguimiento'}</p>
  ${buildAcuerdos()}

  <!-- FIRMA -->
  <div class="signature-block">
    <p><strong>Equipo Atitlán Recicla</strong></p>
    <p>Atitlán Recicla — Asociación para el Avance de las Comunidades del Lago de Atitlán (AALA)</p>
    <p style="font-size:9.5pt;color:#555;margin-top:6pt;">Documento generado el ${new Date().toLocaleDateString('es-GT',{day:'2-digit',month:'long',year:'numeric'})}</p>
  </div>

  <div class="footer">
    Atitlán Recicla · AALA · Panajachel, Sololá · Dashboard generado automáticamente con datos del sistema de monitoreo interno
  </div>

</div>
</body>
</html>`;
}

/* ══════════════════════════════════════════════════════════════════════
   IMPRIMIR / DESCARGAR
══════════════════════════════════════════════════════════════════════ */
function infPrint(){
  const iframe=document.getElementById('infPreview');
  const vals=infGetFormValues();
  const html=infBuildDocument(vals);

  // Write to a new window for printing
  const win=window.open('','_blank','width=900,height=700');
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.addEventListener('load',()=>{ win.focus(); win.print(); });
}

function infDownloadHtml(){
  const vals=infGetFormValues();
  const html=infBuildDocument(vals);
  const mesLabel=MES_LABELS[vals.mes]||String(vals.mes);
  const filename=`informe_atitlanrecicla_${vals.anio}_${mesLabel.toLowerCase()}.html`;
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
