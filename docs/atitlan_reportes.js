const REPORT_DATA_PATH = "./data/total_mes.csv";
const MONTHS_ES = {
  1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo", 6: "junio",
  7: "julio", 8: "agosto", 9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"
};
const MONTHS_ES_UPPER = {
  1: "ENERO", 2: "FEBRERO", 3: "MARZO", 4: "ABRIL", 5: "MAYO", 6: "JUNIO",
  7: "JULIO", 8: "AGOSTO", 9: "SEPTIEMBRE", 10: "OCTUBRE", 11: "NOVIEMBRE", 12: "DICIEMBRE"
};
const MONTHLY_METAS = {
  total_materiales_qq: 1630,
  pet_qq: 153,
  vidrio_total_qq: 1018,
  ingreso_bruto_total: 40727,
  ingreso_bruto_lideresas: 36655,
  ingreso_bruto_municipalidad: 4073,
  ingreso_diario_lideresa: 135,
  pct_participacion_actividades: 0.75,
  pct_participacion_comercializacion: 0.60,
  lideresas_inscritas_meta_anual: 61,
  ingreso_surusic_mensual: 6110
};

const MEMORIA_PARTICIPANTES = [
  ["Natalia Lombardi", "CBC"],
  ["Caroline Poussart", "SOCODEVI"],
  ["Kristel Dorión", "MARCAS MUNDIALES"],
  ["Pep Tarifa", "R4S"],
  ["Anna D’Apolito", "AALA"],
  ["Darlyn Salguero", "AALA"],
  ["María Luz Sandoval", "AALA"]
];

const INFORME_MENSUAL_ACTIONS = [
  "Coordinación y preparación de papelería necesaria requerida por INGECOP, habiendo elaborado plan operativo anual 2026 e informe del año 2025, correspondiente de cada comité, comisiones y consejo de administración de la Cooperativa Atitlán Recicla.",
  "Seguimiento a los diagnósticos técnicos de las socias de la cooperativa para la priorización de mejoras de microcentros de acopio, como parte de las mejoras operativas y dignificación de trabajo.",
  "Elaboración de POA 2026 de la cooperativa Atitlán Recicla.",
  "Apoyo en el análisis de la búsqueda de camión para la mejora operativa y logística de recolección y comercialización de la cooperativa.",
  "Coordinaciones técnicas con municipalidades para fortalecer la entrega de materiales reciclables y la ruta de comercialización.",
  "Seguimiento a la elaboración y mejora de herramientas de sistematización de datos y procesos administrativos y contables."
];

const INFORME_MENSUAL_RETOS = [
  ["R1", "Involucramiento de las municipalidades en las actividades de Atitlán Recicla, específicamente en la entrega de materiales reciclables."],
  ["S1", "Acercamiento a las municipalidades para fortalecer los acuerdos existentes dentro de los convenios o para promover nuevos convenios."],
  ["R2", "Aumentar la participación de las socias en actividades varias y de comercialización."],
  ["S2", "Seguimiento a las estrategias de cada zona para la mejora de la participación de las socias en los procesos de comercialización y actividades varias."],
  ["R3", "Aumento del volumen de materiales reciclables."],
  ["S3", "Seguimiento al acompañamiento municipal y de mujeres en las diferentes zonas de gestión, visitas domiciliares, a negocios y comercios."],
  ["R5", "Mejora del sistema de recolección o transporte para eficientar la apertura con nuevos mercados y reducir costos operativos."],
  ["S5", "Cotización de camión y visitas a predios con mecánico para encontrar el vehículo idóneo."],
  ["R6", "Avanzar en la construcción del centro de acopio para la semitransformación de plástico."],
  ["S6", "Seguimiento a la entrega de materiales por AMSCLAE y actualización de planos técnicos."],
  ["R7", "Equipo técnico fortalecido en el uso de las nuevas herramientas para la recolección e ingreso de datos mensuales que responden a indicadores."],
  ["S7", "Facilitar los procesos para que el equipo se familiarice con la herramienta y practique su uso."],
  ["R8", "Mejora continua en la sistematización de los procesos administrativos y contables."],
  ["S8", "Apoyo en el diseño y puesta en marcha de la herramienta para sistematización contable y administrativa de la cooperativa Atitlán Recicla."]
];

const INFORME_MENSUAL_CAMBIOS = [
  "Aplicación de nuevas herramientas.",
  "Mejora en la sistematización de datos de materiales reciclables y socias.",
  "Fortalecimiento de procesos operativos y de coordinación con actores clave para la recolección y comercialización."
];

const INFORME_MENSUAL_LECCIONES = [
  "Es importante la actualización y revisión de los formatos, puesto que facilita el análisis de avances y la toma de decisiones y estrategias, como medidas correctivas.",
  "Es importante el trabajo conjunto de mujeres y promotoras para el alcance de las metas mensuales.",
  "Mantener comunicación con el equipo técnico para evaluar los alcances y redireccionar acciones y estrategias es importante para el aumento y mejora de los resultados planteados en los indicadores mensuales.",
  "Es necesario dar seguimiento a los convenios con municipalidades para lograr una mejor sinergia que permita aumentar la colecta y comercialización de materiales reciclables.",
  "Son importantes las coordinaciones interinstitucionales responsables, que lleven a resultados precisos y visibles."
];

const INFORME_MENSUAL_CONCLUSIONES = [
  "Es importante que el equipo técnico cuente con las herramientas de sistematización y recursos necesarios para brindar acompañamiento a las mujeres en las actividades operativas de recolección y comercialización.",
  "Es importante continuar motivando a las mujeres para que participen en la colecta de materiales reciclables y en las diferentes actividades programadas.",
  "El acercamiento de las promotoras con las socias y definir metas en conjunto es importante para el cumplimiento de indicadores mensuales.",
  "Controlar y asegurar el buen funcionamiento de los centros de acopio es importante para la correcta operación de manejo y disposición final.",
  "Retomar el acercamiento con municipalidades es importante para fortalecer los acuerdos establecidos."
];

const MEMORIA_GENERALIDADES = [
  "Se presentaron los resultados de los indicadores Atitlán Recicla del período seleccionado y se compartió el análisis comparativo respecto del mes anterior.",
  "Se reiteró la necesidad de sostener el acompañamiento técnico y comercial para asegurar mayor volumen de materiales, mejores precios y más participación de las socias.",
  "Se destacó la importancia de fortalecer la coordinación con municipalidades y otros aliados para consolidar la operación y mejorar la respuesta territorial.",
  "Se señaló que el dashboard permitirá visualizar de forma más rápida el desempeño mensual, apoyar la toma de decisiones y dar seguimiento más ordenado a los indicadores."
];

let reportRows = [];
let currentContext = null;

document.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch((error) => {
    console.error(error);
    const root = document.getElementById("previewRoot");
    if (root) {
      root.innerHTML = `<div class="page"><div class="doc-preview"><h2>Error</h2><p>No se pudo cargar el generador de informes.</p><p>${escapeHtml(error.message || String(error))}</p></div></div>`;
    }
  });
});

async function bootstrap() {
  reportRows = (await fetchCsv(REPORT_DATA_PATH))
    .map(normalizeRow)
    .filter((row) => row && row.anio && row.mes_num && hasUsefulActivity(row))
    .sort((a, b) => (a.anio - b.anio) || (a.mes_num - b.mes_num));

  populatePeriods();
  bindEvents();
  renderPreview();
}

function bindEvents() {
  document.getElementById("refreshBtn").addEventListener("click", renderPreview);
  document.getElementById("reportType").addEventListener("change", renderPreview);
  document.getElementById("periodSelect").addEventListener("change", renderPreview);
  document.getElementById("reporterName").addEventListener("input", renderPreview);
  document.getElementById("reporterRole").addEventListener("input", renderPreview);
  document.getElementById("pdfBtn").addEventListener("click", () => window.print());
  document.getElementById("wordBtn").addEventListener("click", exportWordDoc);
}

function populatePeriods() {
  const select = document.getElementById("periodSelect");
  select.innerHTML = reportRows.map((row) => {
    const key = periodKey(row);
    const label = periodLabel(row);
    return `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`;
  }).join("");

  if (reportRows.length) {
    select.value = periodKey(reportRows[reportRows.length - 1]);
  }
}

async function fetchCsv(path) {
  const res = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar ${path}`);
  return parseCsv(await res.text());
}

function parseCsv(text) {
  const rows = []; let row = [], val = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"') {
      if (quoted && next === '"') { val += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(val); val = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(val); rows.push(row); row = []; val = "";
    } else {
      val += ch;
    }
  }
  if (val.length || row.length) { row.push(val); rows.push(row); }
  const clean = rows.filter(r => r.some(c => String(c).trim() !== ""));
  if (!clean.length) return [];
  const headers = clean[0].map(h => String(h).trim());
  return clean.slice(1).map(cells => {
    const out = {};
    headers.forEach((h, i) => out[h] = cells[i] ?? "");
    return out;
  });
}

function normalizeRow(row) {
  const out = { ...row };
  [
    "anio","mes_num","mujeres_activas","mujeres_actividades","mujeres_comercializacion",
    "mujeres_comercializacion_no_inscritas","ingreso_diario_lideresa","mujeres_inscritas_total",
    "mujeres_nuevas_inscritas","materiales_lideresas_qq","materiales_municipalidad_qq",
    "total_materiales_qq","ingreso_bruto_lideresas","gasto_transporte","pago_coop_lideresas",
    "ingreso_neto_lideresas","ingreso_bruto_municipalidad","pago_coop_municipalidad",
    "ingreso_neto_municipalidad","ingreso_bruto_total","ingreso_neto_total_territorio",
    "ingreso_neto_cooperativa","horas_trabajadas_lideresas","pet_qq","vidrio_cerveza_gronn_unid",
    "vidrio_vino_gronn_unid","vidrio_cerveza_surusic_unid","vidrio_vino_surusic_unid","vidrio_peso_qq",
    "vidrio_total_qq","ingreso_pet","ingreso_vidrio_peso","ingreso_vidrio_gronn","ingreso_vidrio_surusic",
    "pct_participacion_actividades","pct_participacion_comercializacion"
  ].forEach((key) => out[key] = toNum(out[key]));
  return out;
}

function renderPreview() {
  const type = document.getElementById("reportType").value;
  const selectedKey = document.getElementById("periodSelect").value;
  const row = reportRows.find((item) => periodKey(item) === selectedKey) || reportRows[reportRows.length - 1];
  if (!row) return;

  const prev = getPreviousRow(row);
  const reporterName = document.getElementById("reporterName").value.trim() || "Darlyn Salguero López";
  const reporterRole = document.getElementById("reporterRole").value.trim() || "Gerente Atitlán Recicla";
  currentContext = buildContext(row, prev, reporterName, reporterRole);

  const html = type === "memoria_reunion"
    ? buildMemoriaReunionHtml(currentContext)
    : buildInformeMensualHtml(currentContext);

  const root = document.getElementById("previewRoot");
  root.innerHTML = html;

  document.getElementById("previewTitle").textContent =
    type === "memoria_reunion" ? "Vista previa · Memoria de reunión" : "Vista previa · Informe mensual";
  document.getElementById("previewSub").textContent =
    `${periodLabel(row)} · Word y PDF listos desde esta pantalla.`;
}

function buildContext(row, prev, reporterName, reporterRole) {
  const yearRows = reportRows.filter((item) => item.anio === row.anio && item.mes_num <= row.mes_num);
  const monthName = MONTHS_ES[row.mes_num] || row.mes || "";
  const monthNameUpper = MONTHS_ES_UPPER[row.mes_num] || String(row.mes || "").toUpperCase();
  const prevMonthName = prev ? (MONTHS_ES[prev.mes_num] || prev.mes || "") : "el mes anterior";
  const nextMonth = row.mes_num === 12 ? 1 : row.mes_num + 1;
  const nextMonthYear = row.mes_num === 12 ? row.anio + 1 : row.anio;
  const afterNextMonth = nextMonth === 12 ? 1 : nextMonth + 1;
  const afterNextYear = nextMonth === 12 ? nextMonthYear + 1 : nextMonthYear;
  const qqToTm = (value) => safeDiv(value, 22);

  const totalAccum = sumBy(yearRows, "total_materiales_qq");
  const petAccum = sumBy(yearRows, "pet_qq");
  const vidrioAccum = sumBy(yearRows, "vidrio_total_qq");
  const ingresoBrutoAccum = sumBy(yearRows, "ingreso_bruto_total");
  const mujeresAccum = sumBy(yearRows, "ingreso_bruto_lideresas");
  const muniAccum = sumBy(yearRows, "ingreso_bruto_municipalidad");
  const surusicAccum = sumBy(yearRows, "ingreso_vidrio_surusic");

  const womenActivePct = row.pct_participacion_actividades;
  const womenCommercialPct = row.pct_participacion_comercializacion;
  const surusicUnits = toInt((row.vidrio_cerveza_surusic_unid || 0) + (row.vidrio_vino_surusic_unid || 0));
  const womenRegistered = toInt(row.mujeres_inscritas_total);

  return {
    row, prev, reporterName, reporterRole,
    periodKey: periodKey(row),
    periodLabel: periodLabel(row),
    monthName, monthNameUpper,
    year: row.anio,
    previousMonthName: prevMonthName,
    reportDateText: `25 de ${monthName} de ${row.anio}`,
    meetingDateText: `17 de ${MONTHS_ES[nextMonth]} de ${nextMonthYear}`,
    nextMeetingDateText: `21 de ${MONTHS_ES[afterNextMonth]} de ${afterNextYear}`,
    totalMaterialsQQ: row.total_materiales_qq || 0,
    totalMaterialsTM: qqToTm(row.total_materiales_qq || 0),
    totalMaterialsPrev: prev ? prev.total_materiales_qq || 0 : null,
    totalMaterialsDiff: prev ? (row.total_materiales_qq || 0) - (prev.total_materiales_qq || 0) : null,
    totalMaterialsAccum: totalAccum,
    totalMaterialsAnnualPct: safeDiv(totalAccum, MONTHLY_METAS.total_materiales_qq * 12),
    totalMaterialsMonthlyMeta: MONTHLY_METAS.total_materiales_qq,
    petQQ: row.pet_qq || 0,
    petTM: qqToTm(row.pet_qq || 0),
    petPrev: prev ? prev.pet_qq || 0 : null,
    petDiff: prev ? (row.pet_qq || 0) - (prev.pet_qq || 0) : null,
    petAccum,
    petAnnualPct: safeDiv(petAccum, MONTHLY_METAS.pet_qq * 12),
    petMonthlyMeta: MONTHLY_METAS.pet_qq,
    vidrioQQ: row.vidrio_total_qq || 0,
    vidrioTM: qqToTm(row.vidrio_total_qq || 0),
    vidrioPrev: prev ? prev.vidrio_total_qq || 0 : null,
    vidrioDiff: prev ? (row.vidrio_total_qq || 0) - (prev.vidrio_total_qq || 0) : null,
    vidrioAccum,
    vidrioAnnualPct: safeDiv(vidrioAccum, MONTHLY_METAS.vidrio_total_qq * 12),
    vidrioMonthlyMeta: MONTHLY_METAS.vidrio_total_qq,
    gronnUnits: toInt((row.vidrio_cerveza_gronn_unid || 0) + (row.vidrio_vino_gronn_unid || 0)),
    ingresoBrutoTotal: row.ingreso_bruto_total || 0,
    ingresoBrutoPrev: prev ? prev.ingreso_bruto_total || 0 : null,
    ingresoBrutoDiff: prev ? (row.ingreso_bruto_total || 0) - (prev.ingreso_bruto_total || 0) : null,
    ingresoBrutoAccum,
    ingresoBrutoAnnualPct: safeDiv(ingresoBrutoAccum, MONTHLY_METAS.ingreso_bruto_total * 12),
    ingresoBrutoMeta: MONTHLY_METAS.ingreso_bruto_total,
    ingresoBrutoMujeres: row.ingreso_bruto_lideresas || 0,
    ingresoBrutoMujeresPrev: prev ? prev.ingreso_bruto_lideresas || 0 : null,
    ingresoBrutoMujeresDiff: prev ? (row.ingreso_bruto_lideresas || 0) - (prev.ingreso_bruto_lideresas || 0) : null,
    ingresoBrutoMujeresAccum: mujeresAccum,
    ingresoBrutoMujeresMeta: MONTHLY_METAS.ingreso_bruto_lideresas,
    ingresoNetoMujeres: row.ingreso_neto_lideresas || 0,
    ingresoBrutoMunicipalidad: row.ingreso_bruto_municipalidad || 0,
    ingresoBrutoMunicipalidadPrev: prev ? prev.ingreso_bruto_municipalidad || 0 : null,
    ingresoBrutoMunicipalidadDiff: prev ? (row.ingreso_bruto_municipalidad || 0) - (prev.ingreso_bruto_municipalidad || 0) : null,
    ingresoBrutoMunicipalidadAccum: muniAccum,
    ingresoBrutoMunicipalidadMeta: MONTHLY_METAS.ingreso_bruto_municipalidad,
    ingresoDiarioLideresa: row.ingreso_diario_lideresa || 0,
    ingresoDiarioPrev: prev ? prev.ingreso_diario_lideresa || 0 : null,
    ingresoDiarioDiff: prev ? (row.ingreso_diario_lideresa || 0) - (prev.ingreso_diario_lideresa || 0) : null,
    ingresoDiarioMeta: MONTHLY_METAS.ingreso_diario_lideresa,
    womenParticipationActivities: womenActivePct || 0,
    womenParticipationActivitiesPrev: prev ? prev.pct_participacion_actividades || 0 : null,
    womenParticipationCommercial: womenCommercialPct || 0,
    womenParticipationCommercialPrev: prev ? prev.pct_participacion_comercializacion || 0 : null,
    womenParticipationActivitiesMeta: MONTHLY_METAS.pct_participacion_actividades,
    womenParticipationCommercialMeta: MONTHLY_METAS.pct_participacion_comercializacion,
    womenRegistered,
    womenRegisteredMeta: MONTHLY_METAS.lideresas_inscritas_meta_anual,
    ingresoSurusic: row.ingreso_vidrio_surusic || 0,
    ingresoSurusicPrev: prev ? prev.ingreso_vidrio_surusic || 0 : null,
    ingresoSurusicDiff: prev ? (row.ingreso_vidrio_surusic || 0) - (prev.ingreso_vidrio_surusic || 0) : null,
    ingresoSurusicAccum: surusicAccum,
    ingresoSurusicMeta: MONTHLY_METAS.ingreso_surusic_mensual,
    surusicUnits
  };
}

function buildInformeMensualHtml(ctx) {
  return `
    <div class="page">
      <div class="doc-preview" id="docContent">
        <h2 class="center">I. ALCANCE MENSUAL DE INDICADORES ${ctx.year}</h2>

        <table>
          <tr><td><strong>PERÍODO A INFORMAR:</strong></td><td>${ctx.monthNameUpper} ${ctx.year}</td></tr>
          <tr><td><strong>NOMBRE:</strong></td><td>${escapeHtml(ctx.reporterName)}</td></tr>
          <tr><td><strong>PUESTO:</strong></td><td>${escapeHtml(ctx.reporterRole)}</td></tr>
        </table>

        <table>
          <tr>
            <th style="width:8%">No.</th>
            <th style="width:52%">INDICADOR</th>
            <th style="width:20%">RESULTADOS</th>
            <th style="width:20%">RESULTADOS</th>
          </tr>
          <tr><td></td><td>Colectar 1,630 qq (74 TM) de materiales reciclables en general mensualmente.</td><td>Quintales</td><td>Toneladas</td></tr>
          <tr><td>1</td><td>Colectar 1,630 qq (74 TM) de materiales reciclables en general mensualmente.</td><td>${fmtNum(ctx.totalMaterialsQQ)}</td><td>${fmtNum(ctx.totalMaterialsTM)}</td></tr>
          <tr><td>2</td><td>Colecta de 153 qq (6.95 TM) de plástico PET al mes.</td><td>${fmtNum(ctx.petQQ)}</td><td>${fmtNum(ctx.petTM)}</td></tr>
          <tr><td>3</td><td>Colecta de 1,018 qq (46.26 TM) de vidrio al mes.</td><td>${fmtNum(ctx.vidrioQQ)}</td><td>${fmtNum(ctx.vidrioTM)}</td></tr>
          <tr><td>3.1</td><td>Colecta de botellas Gronn (control por unidad).</td><td colspan="2">${fmtInt(ctx.gronnUnits)} unidades</td></tr>
          <tr><td>4</td><td>Ingresos de Q.40,727.00 por comercialización de materiales reciclables en general brutos de mujeres y municipalidades.</td><td colspan="2">${fmtCurrency(ctx.ingresoBrutoTotal)}</td></tr>
          <tr><td>5</td><td>Ingresos brutos de Q.36,655.00 por comercialización de materiales reciclables en general de mujeres de las 4 zonas de gestión.</td><td colspan="2">${fmtCurrency(ctx.ingresoBrutoMujeres)}</td></tr>
          <tr><td>5.1</td><td>Ingresos netos por comercialización de materiales reciclables por mujeres.</td><td colspan="2">${fmtCurrency(ctx.ingresoNetoMujeres)}</td></tr>
          <tr><td>6</td><td>Generar ingresos brutos de Q.4,073.00 mensuales por comercialización de materiales reciclables en municipalidades.</td><td colspan="2">${fmtCurrency(ctx.ingresoBrutoMunicipalidad)}</td></tr>
          <tr><td>7</td><td>Ingresos medios diarios netos por lideresa de Q.135.00.</td><td colspan="2">${fmtCurrency(ctx.ingresoDiarioLideresa)}</td></tr>
          <tr><td>8</td><td>Participación activa de lideresas de al menos 75% en diferentes actividades.</td><td colspan="2">${fmtPercent(ctx.womenParticipationActivities)}</td></tr>
          <tr><td>8.1</td><td>Lideresas inscritas en la Cooperativa Integral de Comercialización Atitlán Recicla R.L.</td><td colspan="2">${fmtInt(ctx.womenRegistered)}</td></tr>
          <tr><td>9</td><td>Participación activa de lideresas de al menos 60% en actividades de comercialización y operaciones.</td><td colspan="2">${fmtPercent(ctx.womenParticipationCommercial)}</td></tr>
          <tr><td>10</td><td>Generar ingresos económicos de Q.6,110.00 mensuales por comercialización de productos de la marca SURUSIC.</td><td colspan="2">${fmtCurrency(ctx.ingresoSurusic)} (${fmtInt(ctx.surusicUnits)} unidades)</td></tr>
        </table>

        <h3>II. ACCIONES DE LA GERENTE</h3>
        <ul>${INFORME_MENSUAL_ACTIONS.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

        <h3>III. PRINCIPALES RETOS ENCONTRADOS Y SOLUCIÓN</h3>
        <table>
          ${INFORME_MENSUAL_RETOS.map(([code, text]) => `<tr><td style="width:12%"><strong>${code}</strong></td><td>${escapeHtml(text)}</td></tr>`).join("")}
        </table>

        <h3>IV. CAMBIOS OCURRIDOS DURANTE EL MES</h3>
        <ul>${INFORME_MENSUAL_CAMBIOS.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

        <h3>V. LECCIONES APRENDIDAS</h3>
        <ul>${INFORME_MENSUAL_LECCIONES.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

        <h3>VI. CONCLUSIONES</h3>
        <ul>${INFORME_MENSUAL_CONCLUSIONES.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

        <h3>VII. FOTOGRAFÍA</h3>
        <div class="photo-box">Espacio reservado para fotografías del período ${escapeHtml(ctx.monthName)} ${ctx.year}</div>
        <p class="small">Fecha de presentación de informe: ${escapeHtml(ctx.reportDateText)}.</p>

        <div class="signature-block">
          <span class="signature-line"></span>
          <p class="left"><strong>Empleada:</strong> ${escapeHtml(ctx.reporterName)}<br>${escapeHtml(ctx.reporterRole)}</p>
          <div class="spacer"></div>
          <span class="signature-line"></span>
          <p class="left"><strong>Supervisora:</strong> Cindy Karina Dionicio Tuj<br>Representante Legal</p>
        </div>
      </div>
    </div>
  `;
}

function buildMemoriaReunionHtml(ctx) {
  return `
    <div class="page">
      <div class="doc-preview" id="docContent">
        <h1>MEMORIA NO. ${ctx.row.mes_num + 1}</h1>
        <h2>REUNIÓN DE AVANCES ATITLÁN RECICLA</h2>
        <h2>ASOCIACIÓN AMIGOS DEL LAGO DE ATITLÁN</h2>
        <p class="center">${escapeHtml(ctx.meetingDateText.toUpperCase())}</p>

        <h3 class="center">AGENDA</h3>
        <table class="no-border">
          <tr><td>Apertura</td></tr>
          <tr><td>Presentación cuadro de avances</td></tr>
          <tr><td>Generalidades</td></tr>
        </table>

        <h3 class="center">PARTICIPANTES</h3>
        <table>
          ${MEMORIA_PARTICIPANTES.map(([name, org]) => `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(org)}</td></tr>`).join("")}
        </table>

        <h3 class="center">CUADRO DE AVANCES</h3>
        <p><strong>Período analizado:</strong> ${escapeHtml(ctx.periodLabel)}</p>

        <h3>DETALLE DE RESULTADOS</h3>

        <h4>1. MATERIALES RECICLABLES EN GENERAL RECOLECTADOS MENSUALMENTE</h4>
        <p>La meta mensual para la colecta de materiales en general es de ${fmtNum(ctx.totalMaterialsMonthlyMeta)} qq.</p>
        <p>En el mes de ${escapeHtml(ctx.monthName)} la colecta fue de ${fmtNum(ctx.totalMaterialsQQ)} qq. ${comparisonSentence(ctx.totalMaterialsDiff, ctx.previousMonthName, ctx.totalMaterialsPrev, "qq")} Al momento se ha alcanzado el ${fmtPercentRound(ctx.totalMaterialsAnnualPct)} de la meta anual propuesta.</p>

        <h4>2. PLÁSTICO PET RECOLECTADO MENSUALMENTE</h4>
        <p>La meta mensual de la colecta del plástico PET es de ${fmtNum(ctx.petMonthlyMeta)} qq.</p>
        <p>En el mes de ${escapeHtml(ctx.monthName)} se recolectaron ${fmtNum(ctx.petQQ)} qq de plástico PET. ${comparisonSentence(ctx.petDiff, ctx.previousMonthName, ctx.petPrev, "qq")} ${gapSentence(ctx.petQQ, ctx.petMonthlyMeta, "qq")} A la fecha se lleva alcanzado un ${fmtPercentRound(ctx.petAnnualPct)} de la meta anual.</p>

        <h4>3. VIDRIO RECOLECTADO MENSUALMENTE</h4>
        <p>En referencia a la colecta del vidrio, la meta mensual es de ${fmtNum(ctx.vidrioMonthlyMeta)} qq. En el mes de ${escapeHtml(ctx.monthName)} se colectaron ${fmtNum(ctx.vidrioQQ)} qq. ${comparisonSentence(ctx.vidrioDiff, ctx.previousMonthName, ctx.vidrioPrev, "qq")} A la fecha se ha alcanzado el ${fmtPercentRound(ctx.vidrioAnnualPct)} de la meta anual propuesta.</p>

        <h4>4. INGRESOS BRUTOS POR COMERCIALIZACIÓN DE MATERIALES RECICLABLES EN GENERAL DE MUJERES Y MUNICIPALIDADES</h4>
        <p>La meta mensual de ingresos brutos por comercialización de materiales reciclables en general de mujeres y municipalidades es de ${fmtCurrency(ctx.ingresoBrutoMeta)}. El ingreso registrado durante el mes de ${escapeHtml(ctx.monthName)} fue de ${fmtCurrency(ctx.ingresoBrutoTotal)}. ${comparisonSentence(ctx.ingresoBrutoDiff, ctx.previousMonthName, ctx.ingresoBrutoPrev, "GTQ")} Al momento se lleva alcanzado un ${fmtPercentRound(ctx.ingresoBrutoAnnualPct)} de la meta anual propuesta.</p>

        <h4>5. INGRESOS BRUTOS DE COMERCIALIZACIÓN POR MUJERES - MENSUALMENTE</h4>
        <p>La meta mensual de los ingresos brutos por comercialización de materiales reciclables en general por mujeres de las 4 zonas de gestión es de ${fmtCurrency(ctx.ingresoBrutoMujeresMeta)}.</p>
        <p>Durante el mes de ${escapeHtml(ctx.monthName)} el ingreso bruto por comercialización de mujeres fue de ${fmtCurrency(ctx.ingresoBrutoMujeres)}. ${comparisonSentence(ctx.ingresoBrutoMujeresDiff, ctx.previousMonthName, ctx.ingresoBrutoMujeresPrev, "GTQ")}</p>

        <h4>6. INGRESOS BRUTOS MENSUALES POR COMERCIALIZACIÓN DE MUNICIPALIDADES</h4>
        <p>La meta mensual de los ingresos brutos por comercialización de materiales reciclables en municipalidades es de ${fmtCurrency(ctx.ingresoBrutoMunicipalidadMeta)}. En ${escapeHtml(ctx.monthName)} se registraron ${fmtCurrency(ctx.ingresoBrutoMunicipalidad)}. ${comparisonSentence(ctx.ingresoBrutoMunicipalidadDiff, ctx.previousMonthName, ctx.ingresoBrutoMunicipalidadPrev, "GTQ")}</p>

        <h4>7. INGRESOS MEDIOS DIARIOS POR LIDERESAS</h4>
        <p>La meta de los ingresos medios diarios netos por lideresa es de ${fmtCurrency(ctx.ingresoDiarioMeta)}. Durante el mes de ${escapeHtml(ctx.monthName)} el ingreso medio diario de mujeres fue de ${fmtCurrency(ctx.ingresoDiarioLideresa)}. ${comparisonSentence(ctx.ingresoDiarioDiff, ctx.previousMonthName, ctx.ingresoDiarioPrev, "GTQ")}</p>

        <h4>8. PARTICIPACIÓN DE MUJERES EN ACTIVIDADES VARIAS</h4>
        <p>La meta mensual de participación activa de lideresas es de al menos un ${fmtPercent(ctx.womenParticipationActivitiesMeta)}. La meta alcanzada en el mes de ${escapeHtml(ctx.monthName)} fue de ${fmtPercent(ctx.womenParticipationActivities)}. ${comparisonSentencePercent(ctx.womenParticipationActivities, ctx.womenParticipationActivitiesPrev, ctx.previousMonthName)}</p>

        <h4>9. PARTICIPACIÓN DE MUJERES EN LAS JORNADAS DE COMERCIALIZACIÓN</h4>
        <p>La meta mensual en participación activa de lideresas en actividades de comercialización es de ${fmtPercent(ctx.womenParticipationCommercialMeta)}; en el mes de ${escapeHtml(ctx.monthName)} se registró ${fmtPercent(ctx.womenParticipationCommercial)}. ${comparisonSentencePercent(ctx.womenParticipationCommercial, ctx.womenParticipationCommercialPrev, ctx.previousMonthName)}</p>

        <h4>10. LIDERESAS INSCRITAS EN LA COOPERATIVA</h4>
        <p>Al mes de ${escapeHtml(ctx.monthName)} se registran ${fmtInt(ctx.womenRegistered)} socias en la Cooperativa Atitlán Recicla. El indicador anual de referencia es de ${fmtInt(ctx.womenRegisteredMeta)} mujeres inscritas.</p>

        <h4>11. INGRESOS ECONÓMICOS GENERADOS POR COMERCIALIZACIÓN DE PRODUCTOS SURUSIC</h4>
        <p>La meta mensual de comercialización de materiales con valor agregado de la marca SURUSIC es de ${fmtCurrency(ctx.ingresoSurusicMeta)}.</p>
        <p>El ingreso por la venta de productos de vidrio marca SURUSIC en el mes de ${escapeHtml(ctx.monthName)} fue de ${fmtCurrency(ctx.ingresoSurusic)} (${fmtInt(ctx.surusicUnits)} unidades). ${comparisonSentence(ctx.ingresoSurusicDiff, ctx.previousMonthName, ctx.ingresoSurusicPrev, "GTQ")} De enero al mes de ${escapeHtml(ctx.monthName)} el ingreso acumulado por comercialización de los productos SURUSIC ha sido de ${fmtCurrency(ctx.ingresoSurusicAccum)}.</p>

        <div class="page-break"></div>

        <h3>GENERALIDADES</h3>
        ${MEMORIA_GENERALIDADES.map(item => `<p>${escapeHtml(item)}</p>`).join("")}

        <h3>PRÓXIMA REUNIÓN DE AVANCES PROGRAMADA PARA:</h3>
        <p><strong>FECHA:</strong> ${escapeHtml(ctx.nextMeetingDateText)}</p>
        <p><strong>HORA:</strong> 9:00 a.m.</p>
        <p><strong>MODALIDAD:</strong> VIRTUAL / PLATAFORMA ZOOM</p>
      </div>
    </div>
  `;
}

function exportWordDoc() {
  const source = document.getElementById("docContent");
  if (!source || !currentContext) return;

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 20mm 18mm; }
          body, body * { font-family:"Times New Roman", Times, serif; font-size:12pt; line-height:1.15; color:#111; }
          p { text-align:justify; margin:0 0 8pt; }
          h1,h2,h3,h4 { margin:0 0 8pt; font-weight:700; text-align:center; }
          h1 { font-size:15pt; text-transform:uppercase; }
          h2 { font-size:13pt; text-transform:uppercase; }
          h3,h4 { font-size:12pt; text-align:left; text-transform:uppercase; }
          table { width:100%; border-collapse:collapse; margin:8pt 0 12pt; }
          th,td { border:1px solid #222; padding:6pt 7pt; vertical-align:top; }
          .no-border td,.no-border th { border:none; padding:2pt 4pt; }
          .center { text-align:center; }
          .left { text-align:left; }
          .spacer { height:12pt; }
          .signature-line { display:block; border-top:1px solid #111; margin:30pt 0 6pt; width:62%; }
          .photo-box { height:120pt; border:1px solid #999; display:flex; align-items:center; justify-content:center; text-align:center; color:#666; margin-bottom:10pt; }
          .page-break { break-before:page; page-break-before:always; }
        </style>
      </head>
      <body>${source.outerHTML}</body>
    </html>
  `;

  const filename = buildExportFilename();
  if (window.htmlDocx && typeof window.htmlDocx.asBlob === "function" && typeof saveAs === "function") {
    const blob = window.htmlDocx.asBlob(html);
    saveAs(blob, `${filename}.docx`);
    return;
  }

  const fallbackBlob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(fallbackBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildExportFilename() {
  const type = document.getElementById("reportType").value;
  const slugType = type === "memoria_reunion" ? "memoria-reunion" : "informe-mensual";
  return `atitlan-recicla-${slugType}-${currentContext.periodKey}`;
}

function getPreviousRow(row) {
  const index = reportRows.findIndex((item) => item.anio === row.anio && item.mes_num === row.mes_num);
  if (index <= 0) return null;
  return reportRows[index - 1];
}

function hasUsefulActivity(row) {
  return [
    row.total_materiales_qq, row.pet_qq, row.vidrio_total_qq,
    row.ingreso_bruto_total, row.ingreso_bruto_lideresas
  ].some((value) => toNum(value) > 0);
}

function periodKey(row) {
  return `${row.anio}-${String(row.mes_num).padStart(2, "0")}`;
}

function periodLabel(row) {
  return `${MONTHS_ES[row.mes_num] || row.mes || "mes"} ${row.anio}`;
}

function sumBy(rows, field) {
  return rows.reduce((acc, row) => acc + (toNum(row[field]) || 0), 0);
}

function safeDiv(num, den) {
  return !den ? 0 : num / den;
}

function toNum(value) {
  if (value === null || value === undefined || value === "") return 0;
  const clean = String(value).replace(/\s/g, "").replace(/,/g, "");
  const out = Number(clean);
  return Number.isFinite(out) ? out : 0;
}

function toInt(value) {
  return Math.round(toNum(value) || 0);
}

function fmtNum(value) {
  return new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toNum(value));
}

function fmtInt(value) {
  return new Intl.NumberFormat("es-GT", { maximumFractionDigits: 0 }).format(toInt(value));
}

function fmtCurrency(value) {
  return "Q." + new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toNum(value));
}

function fmtPercent(value) {
  return new Intl.NumberFormat("es-GT", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(toNum(value));
}

function fmtPercentRound(value) {
  return new Intl.NumberFormat("es-GT", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(toNum(value));
}

function comparisonSentence(diff, prevMonthName, prevValue, unit) {
  if (prevValue === null || prevValue === undefined) return "";
  const abs = Math.abs(toNum(diff));
  const prevText = unit === "GTQ" ? fmtCurrency(prevValue) : fmtNum(prevValue) + ` ${unit}`;
  const diffText = unit === "GTQ" ? fmtCurrency(abs) : fmtNum(abs) + ` ${unit}`;
  if (toNum(diff) > 0) {
    return `Comparado con ${prevMonthName}, donde se registró ${prevText}, hubo un alza de ${diffText}.`;
  }
  if (toNum(diff) < 0) {
    return `Comparado con ${prevMonthName}, donde se registró ${prevText}, hubo una baja de ${diffText}.`;
  }
  return `Comparado con ${prevMonthName}, se mantuvo el mismo valor de ${prevText}.`;
}

function comparisonSentencePercent(current, previous, prevMonthName) {
  if (previous === null || previous === undefined) return "";
  const diff = toNum(current) - toNum(previous);
  const abs = Math.abs(diff);
  if (diff > 0) return `Comparado con ${prevMonthName}, hubo un aumento de ${fmtPercent(abs)}.`;
  if (diff < 0) return `Comparado con ${prevMonthName}, hubo una baja de ${fmtPercent(abs)}.`;
  return `Comparado con ${prevMonthName}, el porcentaje se mantuvo sin cambios.`;
}

function gapSentence(current, target, unit) {
  const delta = toNum(target) - toNum(current);
  if (delta > 0) {
    return `Hicieron falta ${fmtNum(delta)} ${unit} para alcanzar la meta mensual.`;
  }
  if (delta < 0) {
    return `Se superó la meta mensual en ${fmtNum(Math.abs(delta))} ${unit}.`;
  }
  return "Se alcanzó exactamente la meta mensual.";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
