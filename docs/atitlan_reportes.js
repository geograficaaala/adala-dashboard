/* ═══════════════════════════════════════════════════════════════════
   ATITLÁN RECICLA — GENERADOR DE INFORMES  v3.0
   Boot limpio — todo autocontenido, sin dependencias externas
═══════════════════════════════════════════════════════════════════ */
'use strict';

const INF_PATHS = {
  totalMes:          './data/total_mes.csv',
  zonaMes:           './data/zona_mes.csv',
  territorioMes:     './data/territorio_mes.csv',
  materialesResumen: './data/materiales_resumen_mes.csv',
};

const infData = { total:[], zona:[], territorio:[], matResumen:[], periods:[], loaded:false };

/* ── Utilidades ─────────────────────────────────────────────────── */
function infSN(v){ const n=parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n)?0:n; }
function infFmt(v){ return infSN(v).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function infFmtI(v){ return Math.round(infSN(v)).toLocaleString('es-GT'); }
function infQ(v){ return 'Q\u00a0'+infFmt(v); }
function infEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const ML={ 1:'ENE',2:'FEB',3:'MAR',4:'ABR',5:'MAY',6:'JUN',7:'JUL',8:'AGO',9:'SEP',10:'OCT',11:'NOV',12:'DIC' };
const MN={ 1:'enero',2:'febrero',3:'marzo',4:'abril',5:'mayo',6:'junio',7:'julio',8:'agosto',9:'septiembre',10:'octubre',11:'noviembre',12:'diciembre' };

function pKey(a,m){ return String(a)+'_'+String(m).padStart(2,'0'); }
function pLabel(a,m){ return (ML[+m]||String(m))+' '+a; }

/* ── CSV ─────────────────────────────────────────────────────────── */
function parseCsvI(text){
  const rows=[]; let row=[], val='', q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], nx=text[i+1];
    if(ch==='"'){ if(q&&nx==='"'){val+='"';i++;}else q=!q; }
    else if(ch===','&&!q){ row.push(val); val=''; }
    else if((ch==='\n'||ch==='\r')&&!q){
      if(ch==='\r'&&nx==='\n')i++;
      row.push(val); rows.push(row); row=[]; val='';
    } else val+=ch;
  }
  if(val||row.length){ row.push(val); rows.push(row); }
  const clean=rows.filter(r=>r.some(c=>String(c).trim()!==''));
  if(!clean.length) return [];
  const hdr=clean[0].map(h=>String(h).trim());
  return clean.slice(1).map(cells=>{ const o={}; hdr.forEach((h,i)=>o[h]=cells[i]??''); return o; });
}

async function fetchI(path){
  try{
    const r=await fetch(path+'?v='+Date.now(),{cache:'no-store'});
    if(!r.ok) return [];
    return parseCsvI(await r.text());
  }catch(e){ console.warn('fetchI error',path,e); return []; }
}

/* ── Filtros ─────────────────────────────────────────────────────── */
function byPeriod(rows,anio,mes){
  return rows.filter(r=>
    String(r.anio)===String(anio) &&
    (String(r.mes_num)===String(mes) || String(r.mes)===ML[+mes])
  );
}
function getTotal(anio,mes){
  return byPeriod(infData.total,anio,mes).find(r=>String(r.zona||'').toUpperCase()==='TOTAL')||null;
}
function getZonas(anio,mes){
  return byPeriod(infData.zona,anio,mes)
    .filter(r=>String(r.zona||'').toUpperCase()!=='TOTAL'&&infSN(r.total_materiales_qq)>0)
    .sort((a,b)=>infSN(b.total_materiales_qq)-infSN(a.total_materiales_qq));
}
function getTerrs(anio,mes){
  return byPeriod(infData.territorio,anio,mes)
    .filter(r=>infSN(r.total_materiales_qq)>0)
    .sort((a,b)=>infSN(b.total_materiales_qq)-infSN(a.total_materiales_qq));
}
function getMats(anio,mes){
  const rows=byPeriod(infData.matResumen,anio,mes);
  const map={};
  rows.forEach(r=>{
    const m=String(r.material||'').trim(); if(!m) return;
    if(!map[m]) map[m]={material:m,cant:0,ing:0};
    map[m].cant+=infSN(r.cantidad);
    map[m].ing+=infSN(r.ingreso_total_venta);
  });
  return Object.values(map).filter(r=>r.cant>0).sort((a,b)=>b.cant-a.cant);
}

/* ── Carga de datos ─────────────────────────────────────────────── */
async function infLoadData(){
  const [tot,zon,ter,mat]=await Promise.all([
    fetchI(INF_PATHS.totalMes),
    fetchI(INF_PATHS.zonaMes),
    fetchI(INF_PATHS.territorioMes),
    fetchI(INF_PATHS.materialesResumen),
  ]);
  const isAR=r=>String(r.programa||'').includes('atitlan');
  infData.total      = tot.filter(isAR);
  infData.zona       = zon.filter(isAR);
  infData.territorio = ter.filter(isAR);
  infData.matResumen = mat.filter(isAR);

  const seen=new Set();
  infData.periods=infData.total
    .filter(r=>String(r.zona||'').toUpperCase()==='TOTAL'&&infSN(r.mujeres_activas)>0)
    .map(r=>({anio:+r.anio,mes:+r.mes_num,key:pKey(r.anio,r.mes_num),label:pLabel(r.anio,r.mes_num)}))
    .filter(p=>{ if(seen.has(p.key)) return false; seen.add(p.key); return true; })
    .sort((a,b)=>a.anio!==b.anio?a.anio-b.anio:a.mes-b.mes);
  infData.loaded=true;
}

/* ── Leer formulario ────────────────────────────────────────────── */
function getFormVals(){
  const sel=document.getElementById('infPeriodSel');
  const parts=(sel&&sel.value||'2026_01').split('_');
  return {
    anio:+parts[0]||2026,
    mes:+parts[1]||1,
    lugar:document.getElementById('infLugar').value||'Panajachel, Sololá',
    fecha:document.getElementById('infFecha').value||new Date().toLocaleDateString('es-GT',{day:'2-digit',month:'long',year:'numeric'}),
    hora:document.getElementById('infHora').value||'09:00 horas',
    tipo:document.getElementById('infTipoDoc').value||'memoria',
  };
}

/* ══════════════════════════════════════════════════════════════════
   GENERADOR DEL DOCUMENTO
══════════════════════════════════════════════════════════════════ */
function buildDoc(v){
  const {anio,mes,lugar,fecha,hora,tipo}=v;
  const tot=getTotal(anio,mes);
  const zonas=getZonas(anio,mes);
  const terrs=getTerrs(anio,mes);
  const mats=getMats(anio,mes);
  const mesN=MN[mes]||String(mes);
  const pl=pLabel(anio,mes);
  const esMem=tipo==='memoria';
  const titulo=esMem?'MEMORIA DE REUNIÓN DE AVANCES — ATITLÁN RECICLA':'INFORME MENSUAL DE INDICADORES — ATITLÁN RECICLA';

  const kv=k=>tot?infFmt(tot[k]):'—';
  const kq=k=>tot?infQ(tot[k]):'—';
  const mujeresAct=kv('mujeres_activas');
  const mujeresCom=kv('mujeres_comercializacion');
  const mujInsc=tot?infFmtI(tot.mujeres_inscritas_total):'—';
  const totalMat=kv('total_materiales_qq');
  const petQq=kv('pet_qq');
  const vidrioQq=kv('vidrio_total_qq');
  const ingNetoTerr=kq('ingreso_neto_total_territorio');
  const ingNetoCoop=kq('ingreso_neto_cooperativa');
  const ingBruto=kq('ingreso_bruto_total');
  const ingNeto=kq('ingreso_neto_lideresas');
  const ingDiario=kq('ingreso_diario_lideresa');
  const horasTrab=kv('horas_trabajadas_lideresas');

  /* Análisis */
  function analisis(){
    if(!tot) return '<p>Sin datos disponibles para el período seleccionado.</p>';
    const matVal=infSN(tot.total_materiales_qq);
    const incVal=infSN(tot.ingreso_neto_total_territorio);
    const topZona=zonas[0];
    const prevMes=mes>1?mes-1:12, prevAnio=mes>1?anio:anio-1;
    const prevTot=getTotal(prevAnio,prevMes);
    const prevMat=prevTot?infSN(prevTot.total_materiales_qq):null;
    const prevInc=prevTot?infSN(prevTot.ingreso_neto_total_territorio):null;
    const matTrend=prevMat!=null?(matVal>=prevMat?'incremento':'descenso'):null;
    const matDiff=prevMat!=null?Math.abs(matVal-prevMat).toFixed(1):null;
    const incTrend=prevInc!=null?(incVal>=prevInc?'incremento':'descenso'):null;
    const incDiff=prevInc!=null?infQ(Math.abs(incVal-prevInc)):null;

    const p1=`Durante el período reportado, Atitlán Recicla continuó con las acciones de recuperación y comercialización de materiales reciclables en los territorios priorizados. El presente informe resume los principales resultados cuantitativos del mes de <strong>${mesN} de ${anio}</strong> con base en los datos consolidados del sistema de monitoreo.`;
    const p2=`En el mes de ${mesN} de ${anio}, el programa registró <strong>${totalMat}</strong> quintales de materiales recuperados, de los cuales <strong>${petQq} qq</strong> correspondieron a PET y <strong>${vidrioQq} qq</strong> a vidrio. El ingreso neto total en el territorio fue de <strong>${ingNetoTerr}</strong>.`;
    let p3=`La participación mensual mostró un promedio de <strong>${mujeresAct}</strong> mujeres activas y <strong>${mujeresCom}</strong> mujeres involucradas en comercialización.`;
    if(matTrend){
      p3+=` Los materiales recuperados registraron un <strong>${matTrend} de ${matDiff} qq</strong> respecto al mes anterior`;
      if(incTrend) p3+=`, y el ingreso neto territorial presentó un ${incTrend} de <strong>${incDiff}</strong>`;
      p3+='.';
    } else {
      p3+=` Al ser el primer período disponible del año, este mes funciona como línea base para el seguimiento del programa.`;
    }
    if(topZona) p3+=` La zona con mayor volumen fue <strong>${infEsc(topZona.zona)}</strong> con <strong>${infFmt(topZona.total_materiales_qq)} qq</strong>.`;
    return `<p>${p1}</p><p>${p2}</p><p>${p3}</p>`;
  }

  /* Tablas */
  function tbl(headers,rows,cls){
    if(!rows.length) return '<p><em>Sin datos para este período.</em></p>';
    const th=headers.map(h=>`<th>${h}</th>`).join('');
    const tr=rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${cls&&cls[i]||''}">${c}</td>`).join('')}</tr>`).join('');
    return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
  }
  const zonaTable=()=>tbl(
    ['Zona','Mujeres activas','Mujeres en comercialización','Total materiales (qq)','Ingreso neto territorial'],
    zonas.map(z=>[infEsc(z.zona),infFmt(z.mujeres_activas),infFmt(z.mujeres_comercializacion),infFmt(z.total_materiales_qq),infQ(z.ingreso_neto_total_territorio)]),
    ['','num','num','num','num']
  );
  const terrTable=()=>tbl(
    ['Territorio','Zona','Total materiales (qq)','Ingreso neto territorial'],
    terrs.slice(0,8).map(t=>[infEsc(t.territorio),infEsc(t.zona),infFmt(t.total_materiales_qq),infQ(t.ingreso_neto_total_territorio)]),
    ['','','num','num']
  );
  const matsTable=()=>{
    const total=mats.reduce((s,m)=>s+m.cant,0)||1;
    return tbl(
      ['Material','Cantidad (qq / uds)','% del total','Ingreso venta'],
      mats.slice(0,12).map(m=>[infEsc(m.material),infFmt(m.cant),(m.cant/total*100).toFixed(1)+'%',infQ(m.ing)]),
      ['','num','num','num']
    );
  };
  const finTable=()=>{
    if(!tot) return '<p><em>Sin datos.</em></p>';
    return tbl(
      ['Indicador financiero','Valor'],
      [
        ['Ingreso bruto total',ingBruto],
        ['Ingreso neto total territorio',ingNetoTerr],
        ['Ingreso neto lideresas',ingNeto],
        ['Ingreso neto cooperativa',ingNetoCoop],
        ['Ingreso diario por lideresa',ingDiario],
        ['Horas trabajadas lideresas',horasTrab+' hrs'],
      ],
      ['','num']
    );
  };

  /* SVG barras horizontales */
  function svgBars(items,lk,v1k,c1,v2k,c2,leg){
    if(!items.length) return '';
    const W=620,bH=20,gap=5,padL=125,padR=105,padT=26,padB=6;
    const allV=items.flatMap(r=>[infSN(r[v1k]),v2k?infSN(r[v2k]):0]);
    const maxV=Math.max(...allV,1);
    const step=v2k?bH*2+gap+9:bH+gap+4;
    const H=padT+items.length*step+padB;
    let out=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto">`;
    out+=`<rect x="${padL}" y="5" width="10" height="9" fill="${c1}"/><text x="${padL+13}" y="14" font-size="8.5" font-family="Arial,sans-serif" fill="#333">${leg[0]}</text>`;
    if(v2k) out+=`<rect x="${padL+120}" y="5" width="10" height="9" fill="${c2}"/><text x="${padL+133}" y="14" font-size="8.5" font-family="Arial,sans-serif" fill="#333">${leg[1]}</text>`;
    items.forEach((r,i)=>{
      const y=padT+i*step;
      const v1=infSN(r[v1k]),v2=v2k?infSN(r[v2k]):0;
      const b1=Math.max(2,Math.round(v1/maxV*(W-padL-padR)));
      out+=`<text x="${padL-4}" y="${y+bH/2+3.5}" text-anchor="end" font-size="9" font-family="Arial,sans-serif" fill="#2c472c" font-weight="700">${infEsc(r[lk])}</text>`;
      out+=`<rect x="${padL}" y="${y}" width="${W-padL-padR}" height="${bH-1}" rx="3" fill="#e6f0e6"/>`;
      out+=`<rect x="${padL}" y="${y}" width="${b1}" height="${bH-1}" rx="3" fill="${c1}"/>`;
      out+=`<text x="${padL+b1+4}" y="${y+bH/2+3}" font-size="8.5" font-family="monospace" fill="#444">${infFmt(v1)}</text>`;
      if(v2k){
        const y2=y+bH+4,b2=Math.max(2,Math.round(v2/maxV*(W-padL-padR)));
        out+=`<rect x="${padL}" y="${y2}" width="${W-padL-padR}" height="${bH-1}" rx="3" fill="#eef0f8"/>`;
        out+=`<rect x="${padL}" y="${y2}" width="${b2}" height="${bH-1}" rx="3" fill="${c2}"/>`;
        out+=`<text x="${padL+b2+4}" y="${y2+bH/2+3}" font-size="8.5" font-family="monospace" fill="#444">${infFmt(v2)}</text>`;
      }
    });
    return out+'</svg>';
  }

  const chartPart=svgBars(zonas,'zona','mujeres_activas','#195f33','mujeres_comercializacion','#1a527a',['Mujeres activas','En comercialización']);
  const chartPV  =svgBars(zonas,'zona','pet_qq','#0c7070','vidrio_total_qq','#795200',['PET (qq)','Vidrio (qq)']);
  const chartMat =svgBars(zonas,'zona','total_materiales_qq','#267a46',null,null,['Materiales recuperados (qq)']);

  const bullets=tot?`<ul>
    <li>Promedio mensual de mujeres activas: <strong>${mujeresAct}</strong>.</li>
    <li>Promedio mensual de mujeres en comercialización: <strong>${mujeresCom}</strong>.</li>
    <li>Mujeres inscritas en el programa: <strong>${mujInsc}</strong>.</li>
    <li>Total de materiales recuperados: <strong>${totalMat} qq</strong>.</li>
    <li>PET recuperado: <strong>${petQq} qq</strong>.</li>
    <li>Vidrio recuperado: <strong>${vidrioQq} qq</strong>.</li>
    <li>Ingreso neto total del territorio: <strong>${ingNetoTerr}</strong>.</li>
    <li>Ingreso neto de cooperativa: <strong>${ingNetoCoop}</strong>.</li>
    <li>Ingreso diario por lideresa: <strong>${ingDiario}</strong>.</li>
  </ul>`:'<p><em>Sin datos para el período seleccionado.</em></p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${infEsc(titulo)} · ${infEsc(pl)}</title>
<style>
  @page{size:letter portrait;margin:2cm 2.2cm 2cm 2.2cm}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Times New Roman",Times,serif;font-size:11.5pt;line-height:1.45;color:#111;background:#fff}
  p{text-align:justify;margin:0 0 7pt}
  ul{margin:0 0 9pt 22pt}li{margin:0 0 4pt;text-align:justify}
  table{width:100%;border-collapse:collapse;margin:9pt 0 13pt;font-size:10.5pt}
  th,td{border:1px solid #555;padding:5px 7px;vertical-align:top}
  th{background:#e3ede3;text-align:center;font-weight:700;font-size:10pt}
  td.num{text-align:right;font-family:"Courier New",monospace;font-size:10pt}
  .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px;padding-bottom:10px;border-bottom:2.5px solid #195f33}
  .hdr img{max-width:255px;max-height:72px;object-fit:contain}
  .hdr-r{text-align:right;font-size:9.5pt;color:#444;line-height:1.6}
  .hdr-r strong{color:#195f33;font-size:10pt;display:block}
  .dtitle{text-align:center;font-weight:700;text-transform:uppercase;margin:13pt 0 3pt;font-size:12.5pt;letter-spacing:.03em}
  .dsub{text-align:center;font-weight:700;color:#195f33;font-size:11.5pt;margin-bottom:12pt}
  .meta p{margin:2pt 0}
  .sec{font-weight:700;text-transform:uppercase;font-size:10.5pt;letter-spacing:.04em;color:#195f33;margin:13pt 0 7pt;padding-bottom:3pt;border-bottom:1.5px solid #195f33}
  .kg{display:grid;grid-template-columns:repeat(3,1fr);gap:6pt;margin:8pt 0 12pt}
  .kpi{border:1.5px solid #b8d8b8;border-radius:4pt;padding:6pt 8pt;background:#f2faf2}
  .kpi small{display:block;font-size:7.5pt;color:#555;margin-bottom:2pt;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.04em}
  .kpi strong{display:block;font-size:12pt;color:#195f33;font-family:"Courier New",monospace}
  .cb{margin:10pt 0 12pt;page-break-inside:avoid}
  .ct{font-weight:700;font-size:10pt;font-family:Arial,sans-serif;color:#333;margin-bottom:5pt}
  .pb{page-break-after:always}
  .sig{margin-top:28pt;padding-top:11pt;border-top:1px solid #ccc}
  .sig p{margin:2pt 0}
  .foot{margin-top:18pt;padding-top:6pt;border-top:1px solid #ddd;font-size:8pt;color:#777;text-align:center;font-family:Arial,sans-serif}
  @media screen{body{background:#f0f0f0}.pg{background:#fff;max-width:820px;margin:0 auto;padding:2cm 2.4cm;box-shadow:0 4px 28px rgba(0,0,0,.15)}}
  @media print{.pg{padding:0}}
</style>
</head>
<body>
<div class="pg">

<div class="hdr">
  <img src="./logosatitlan.png" alt="Logos Atitlán Recicla">
  <div class="hdr-r">
    <strong>Atitlán Recicla</strong>
    Programa de Reciclaje Comunitario<br>
    Cuenca del Lago de Atitlán, Sololá<br>
    <span style="color:#195f33;font-weight:700">${infEsc(pl.toUpperCase())}</span>
  </div>
</div>

<div class="dtitle">${infEsc(titulo)}</div>
<div class="dsub">${infEsc(pl.toUpperCase())}</div>

<div class="meta">
  <p><strong>Lugar:</strong> ${infEsc(lugar)}</p>
  <p><strong>Fecha:</strong> ${infEsc(fecha)}</p>
  <p><strong>Hora:</strong> ${infEsc(hora)}</p>
</div>

<p class="sec">1. Objetivo de la reunión</p>
<p>Dar seguimiento a los avances del programa Atitlán Recicla correspondientes al mes de ${mesN} de ${anio}, revisando la participación de lideresas, la recuperación y comercialización de materiales reciclables, así como la evolución de los ingresos generados en el territorio.</p>

<p class="sec">2. Principales resultados presentados</p>
${bullets}
<div class="kg">
  <div class="kpi"><small>Mujeres activas (prom.)</small><strong>${mujeresAct}</strong></div>
  <div class="kpi"><small>Mujeres comercialización</small><strong>${mujeresCom}</strong></div>
  <div class="kpi"><small>Mujeres inscritas</small><strong>${mujInsc}</strong></div>
  <div class="kpi"><small>Total materiales (qq)</small><strong>${totalMat}</strong></div>
  <div class="kpi"><small>PET (qq)</small><strong>${petQq}</strong></div>
  <div class="kpi"><small>Vidrio (qq)</small><strong>${vidrioQq}</strong></div>
  <div class="kpi"><small>Ingreso neto territorial</small><strong>${ingNetoTerr}</strong></div>
  <div class="kpi"><small>Ingreso neto cooperativa</small><strong>${ingNetoCoop}</strong></div>
  <div class="kpi"><small>Ingreso diario lideresa</small><strong>${ingDiario}</strong></div>
</div>

<div class="cb"><div class="ct">Gráfica 1. Participación mensual de mujeres por zona · ${infEsc(pl)}</div>${chartPart||'<p><em>Sin datos de zonas.</em></p>'}</div>
<div class="cb"><div class="ct">Gráfica 2. PET y vidrio recuperados por zona (qq) · ${infEsc(pl)}</div>${chartPV||'<p><em>Sin datos de zonas.</em></p>'}</div>

<div class="pb"></div>

<p class="sec">3. Análisis e interpretación</p>
${analisis()}

<p class="sec">4. Resultados por zona</p>
${zonaTable()}
<div class="cb"><div class="ct">Gráfica 3. Total de materiales recuperados por zona (qq) · ${infEsc(pl)}</div>${chartMat||'<p><em>Sin datos de zonas.</em></p>'}</div>

<p class="sec">5. Territorios con mayor recuperación reportada</p>
${terrTable()}

<p class="sec">6. Detalle de materiales recuperados</p>
${matsTable()}

<p class="sec">7. Resumen financiero del período</p>
${finTable()}

<p class="sec">${esMem?'8. Acuerdos y seguimiento':'8. Conclusiones y seguimiento'}</p>
<p>Se acuerda mantener el monitoreo mensual de la recuperación de materiales, fortalecer el seguimiento a la participación de lideresas y continuar la revisión periódica de ingresos generados en el territorio, con el fin de sostener la trazabilidad de resultados y la toma de decisiones operativas.</p>

<div class="sig">
  <p><strong>Equipo Atitlán Recicla</strong></p>
  <p>Asociación para el Avance de las Comunidades del Lago de Atitlán (AALA)</p>
  <p style="font-size:9pt;color:#666;margin-top:5pt">Generado el ${new Date().toLocaleDateString('es-GT',{day:'2-digit',month:'long',year:'numeric'})}</p>
</div>
<div class="foot">Atitlán Recicla · AALA · Sistema de Monitoreo Interno</div>

</div>
</body>
</html>`;
}

/* ── Preview y controles UI ──────────────────────────────────────── */
function infUpdatePreview(){
  const vals=getFormVals();
  const iframe=document.getElementById('infPreview');
  if(iframe) iframe.srcdoc=buildDoc(vals);
  const sel=document.getElementById('infPeriodSel');
  const lbl=document.getElementById('previewPeriodLabel');
  if(sel&&lbl){ const o=sel.options[sel.selectedIndex]; if(o) lbl.textContent=o.text; }
}

function infSetTipo(val,btn){
  document.getElementById('infTipoDoc').value=val;
  document.querySelectorAll('.tipo-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  infUpdatePreview();
}

function infPrint(){
  const win=window.open('','_blank','width=920,height=750');
  win.document.open();
  win.document.write(buildDoc(getFormVals()));
  win.document.close();
  win.onload=function(){ win.focus(); win.print(); };
}

function infDownloadHtml(){
  const v=getFormVals();
  const fname=`informe_atitlanrecicla_${v.anio}_${(ML[v.mes]||'').toLowerCase()}.html`;
  const blob=new Blob([buildDoc(v)],{type:'text/html;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}

/* ── BOOT ────────────────────────────────────────────────────────── */
async function infInit(){
  const statusEl=document.getElementById('infStatus');
  const formEl=document.getElementById('infForm');

  statusEl.style.display='';
  statusEl.textContent='Cargando datos…';

  try {
    await infLoadData();

    if(!infData.periods.length){
      statusEl.style.background='#fce6e6';
      statusEl.style.color='#881818';
      statusEl.style.borderColor='rgba(136,24,24,.2)';
      statusEl.innerHTML='⚠ No hay períodos con datos. Verifica que los CSV estén en <strong>docs/data/</strong>';
      return;
    }

    const sel=document.getElementById('infPeriodSel');
    sel.innerHTML=infData.periods
      .map(p=>`<option value="${p.key}">${p.label.toUpperCase()}</option>`)
      .join('');
    sel.value=infData.periods[infData.periods.length-1].key;

    document.getElementById('infFecha').value=
      new Date().toLocaleDateString('es-GT',{day:'2-digit',month:'long',year:'numeric'});

    statusEl.style.display='none';
    formEl.style.display='';

    sel.addEventListener('change', infUpdatePreview);
    document.getElementById('infLugar').addEventListener('input', infUpdatePreview);
    document.getElementById('infFecha').addEventListener('input', infUpdatePreview);
    document.getElementById('infHora').addEventListener('input', infUpdatePreview);

    infUpdatePreview();

  } catch(err) {
    statusEl.style.background='#fce6e6';
    statusEl.style.color='#881818';
    statusEl.innerHTML='⚠ Error al cargar datos: '+infEsc(err.message||String(err));
    console.error('[infInit]',err);
  }
}
