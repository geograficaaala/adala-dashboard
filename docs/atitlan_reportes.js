(() => {
  const DATA_TOTAL = "./data/total_mes.csv";
  const DATA_ZONA = "./data/zona_mes.csv";
  const DATA_TERRITORIO = "./data/territorio_mes.csv";
  const LOGO_PATH = "./logosatitlan.png";

  const MONTHS_ES = [
    "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const MONTHS_CORTO = [
    "", "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
    "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
  ];

  const els = {
    reportType: document.getElementById("reportType"),
    monthSelect: document.getElementById("monthSelect"),
    placeInput: document.getElementById("placeInput"),
    meetingDateInput: document.getElementById("meetingDateInput"),
    meetingTimeInput: document.getElementById("meetingTimeInput"),
    responsableInput: document.getElementById("responsableInput"),
    summaryInput: document.getElementById("summaryInput"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnWord: document.getElementById("btnWord"),
    btnPdf: document.getElementById("btnPdf"),
    reportPreview: document.getElementById("reportPreview")
  };

  let state = {
    totalMes: [],
    zonaMes: [],
    territorioMes: [],
    charts: []
  };

  function parseCSV(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data || []),
        error: reject
      });
    });
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function fmtInt(v) {
    return Math.round(num(v)).toLocaleString("es-GT");
  }

  function fmtDec(v, digits = 2) {
    return num(v).toLocaleString("es-GT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function fmtMoney(v) {
    return "Q " + num(v).toLocaleString("es-GT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function pct(v, digits = 1) {
    return (num(v) * 100).toLocaleString("es-GT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }) + "%";
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatLongDate(isoDate) {
    if (!isoDate) return "";
    const d = new Date(isoDate + "T12:00:00");
    const day = d.getDate();
    const month = MONTHS_ES[d.getMonth() + 1];
    const year = d.getFullYear();
    return `${day} de ${month} de ${year}`;
  }

  function sortPeriods(rows) {
    return [...rows].sort((a, b) => {
      const ay = num(a.anio), by = num(b.anio);
      const am = num(a.mes_num), bm = num(b.mes_num);
      return ay === by ? am - bm : ay - by;
    });
  }

  function getAtitlanRows(rows) {
    return rows.filter(r => (r.programa || "").trim().toLowerCase() === "atitlan_recicla");
  }

  function getTotalRows() {
    return sortPeriods(
      getAtitlanRows(state.totalMes).filter(r => (r.zona || "").toUpperCase() === "TOTAL")
    );
  }

  function populatePeriods() {
    const rows = getTotalRows();
    const opts = rows.map(r => {
      const value = `${r.anio}-${String(r.mes_num).padStart(2, "0")}`;
      const text = `${MONTHS_ES[num(r.mes_num)].toUpperCase()} ${r.anio}`;
      return `<option value="${value}">${text}</option>`;
    }).join("");
    els.monthSelect.innerHTML = opts;

    if (rows.length) {
      const last = rows[rows.length - 1];
      els.monthSelect.value = `${last.anio}-${String(last.mes_num).padStart(2, "0")}`;
    }
  }

  function getSelectedPeriod() {
    const value = els.monthSelect.value || "";
    const [anioStr, mesStr] = value.split("-");
    return { anio: num(anioStr), mes_num: num(mesStr) };
  }

  function getCurrentRow() {
    const { anio, mes_num } = getSelectedPeriod();
    return getTotalRows().find(r => num(r.anio) === anio && num(r.mes_num) === mes_num) || null;
  }

  function getMonthlySeries(limitToPeriod = true) {
    const { anio, mes_num } = getSelectedPeriod();
    return getTotalRows().filter(r => {
      if (num(r.anio) !== anio) return false;
      if (!limitToPeriod) return true;
      return num(r.mes_num) <= mes_num;
    });
  }

  function getZonaRows() {
    const { anio, mes_num } = getSelectedPeriod();
    return sortPeriods(
      getAtitlanRows(state.zonaMes).filter(r => num(r.anio) === anio && num(r.mes_num) === mes_num)
    );
  }

  function getTerritorioRows() {
    const { anio, mes_num } = getSelectedPeriod();
    return getAtitlanRows(state.territorioMes).filter(r => num(r.anio) === anio && num(r.mes_num) === mes_num);
  }

  function cleanCharts() {
    state.charts.forEach(c => {
      try { c.destroy(); } catch (_) {}
    });
    state.charts = [];
  }

  function buildInterpretation(current, monthlySeries) {
    const idx = monthlySeries.findIndex(r => num(r.mes_num) === num(current.mes_num));
    const prev = idx > 0 ? monthlySeries[idx - 1] : null;

    const totalMaterial = num(current.total_materiales_qq);
    const pet = num(current.pet_qq);
    const vidrio = num(current.vidrio_total_qq);
    const ingresoTerritorio = num(current.ingreso_neto_total_territorio);
    const mujeresActivas = num(current.mujeres_activas);
    const mujeresComer = num(current.mujeres_comercializacion);

    let trendText = "";
    if (prev) {
      const deltaMat = totalMaterial - num(prev.total_materiales_qq);
      const deltaIng = ingresoTerritorio - num(prev.ingreso_neto_total_territorio);
      const matTxt = deltaMat > 0
        ? `un incremento de ${fmtDec(deltaMat)} qq en materiales recuperados respecto al mes anterior`
        : deltaMat < 0
          ? `una disminución de ${fmtDec(Math.abs(deltaMat))} qq en materiales recuperados respecto al mes anterior`
          : `un comportamiento estable en materiales recuperados respecto al mes anterior`;

      const ingTxt = deltaIng > 0
        ? `y un aumento de ${fmtMoney(deltaIng)} en el ingreso neto territorial`
        : deltaIng < 0
          ? `y una reducción de ${fmtMoney(Math.abs(deltaIng))} en el ingreso neto territorial`
          : `y estabilidad en el ingreso neto territorial`;

      trendText = `${matTxt}, ${ingTxt}.`;
    } else {
      trendText = `al ser el primer período disponible del año, este mes funciona como línea base para el seguimiento.`;
    }

    return `
      <p>${els.summaryInput.value.trim()}</p>
      <p>En el mes de ${MONTHS_ES[num(current.mes_num)]} de ${current.anio}, el programa registró <strong>${fmtDec(totalMaterial)}</strong> quintales de materiales recuperados en total, de los cuales <strong>${fmtDec(pet)}</strong> correspondieron a PET y <strong>${fmtDec(vidrio)}</strong> a vidrio. Asimismo, se reportó un ingreso neto total en el territorio de <strong>${fmtMoney(ingresoTerritorio)}</strong>.</p>
      <p>La participación mensual mostró un promedio de <strong>${fmtDec(mujeresActivas)}</strong> mujeres activas y <strong>${fmtDec(mujeresComer)}</strong> mujeres involucradas en comercialización. En términos de lectura ejecutiva, el período presenta ${trendText}</p>
    `;
  }

  function topTerritoriosTable(rows) {
    const top = [...rows]
      .sort((a, b) => num(b.total_materiales_qq) - num(a.total_materiales_qq))
      .slice(0, 8);

    const body = top.map(r => `
      <tr>
        <td>${escapeHtml(r.territorio || "")}</td>
        <td>${escapeHtml(r.zona || "")}</td>
        <td style="text-align:right">${fmtDec(r.total_materiales_qq)}</td>
        <td style="text-align:right">${fmtMoney(r.ingreso_neto_total_territorio)}</td>
      </tr>
    `).join("");

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
        <tbody>${body}</tbody>
      </table>
    `;
  }

  function zonasTable(rows) {
    const body = rows.map(r => `
      <tr>
        <td>${escapeHtml(r.zona || "")}</td>
        <td style="text-align:right">${fmtDec(r.mujeres_activas)}</td>
        <td style="text-align:right">${fmtDec(r.mujeres_comercializacion)}</td>
        <td style="text-align:right">${fmtDec(r.total_materiales_qq)}</td>
        <td style="text-align:right">${fmtMoney(r.ingreso_neto_total_territorio)}</td>
      </tr>
    `).join("");

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
        <tbody>${body}</tbody>
      </table>
    `;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function reportHeader(title, subtitle = "") {
    return `
      <div class="doc-header">
        <img class="logo" src="${LOGO_PATH}" alt="Logos Atitlán" />
      </div>
      <div class="doc-title">${title}</div>
      ${subtitle ? `<p style="text-align:center; margin-bottom:16pt;"><strong>${subtitle}</strong></p>` : ""}
    `;
  }

  function renderGerencia(current, monthlySeries, zonas, territorios) {
    const monthName = MONTHS_ES[num(current.mes_num)];
    const title = `INFORME MENSUAL DE GERENCIA - ATITLÁN RECICLA`;
    const subtitle = `${monthName.toUpperCase()} ${current.anio}`;

    els.reportPreview.innerHTML = `
      ${reportHeader(title, subtitle)}

      <p><strong>Lugar:</strong> ${escapeHtml(els.placeInput.value)}</p>
      <p><strong>Fecha:</strong> ${escapeHtml(formatLongDate(els.meetingDateInput.value || todayISO()))}</p>
      <p><strong>Responsable:</strong> ${escapeHtml(els.responsableInput.value)}</p>

      <p class="section-title">I. Resumen ejecutivo</p>
      ${buildInterpretation(current, monthlySeries)}

      <p class="section-title">II. Resultados principales del mes</p>
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Mujeres activas</td><td style="text-align:right">${fmtDec(current.mujeres_activas)}</td></tr>
          <tr><td>Mujeres en actividades</td><td style="text-align:right">${fmtDec(current.mujeres_actividades)}</td></tr>
          <tr><td>Mujeres en comercialización</td><td style="text-align:right">${fmtDec(current.mujeres_comercializacion)}</td></tr>
          <tr><td>Mujeres inscritas total</td><td style="text-align:right">${fmtInt(current.mujeres_inscritas_total)}</td></tr>
          <tr><td>Total materiales recuperados (qq)</td><td style="text-align:right">${fmtDec(current.total_materiales_qq)}</td></tr>
          <tr><td>PET (qq)</td><td style="text-align:right">${fmtDec(current.pet_qq)}</td></tr>
          <tr><td>Vidrio total (qq)</td><td style="text-align:right">${fmtDec(current.vidrio_total_qq)}</td></tr>
          <tr><td>Ingreso bruto total</td><td style="text-align:right">${fmtMoney(current.ingreso_bruto_total)}</td></tr>
          <tr><td>Ingreso neto territorial</td><td style="text-align:right">${fmtMoney(current.ingreso_neto_total_territorio)}</td></tr>
          <tr><td>Ingreso neto cooperativa</td><td style="text-align:right">${fmtMoney(current.ingreso_neto_cooperativa)}</td></tr>
        </tbody>
      </table>

      <div class="chart-block">
        <div class="chart-title">Gráfica 1. Materiales recuperados por mes (qq)</div>
        <canvas id="chartGerencia1" width="680" height="280"></canvas>
      </div>

      <div class="chart-block">
        <div class="chart-title">Gráfica 2. Ingreso neto territorial por mes</div>
        <canvas id="chartGerencia2" width="680" height="280"></canvas>
      </div>

      <p class="section-title">III. Resultados por zona</p>
      ${zonasTable(zonas)}

      <p class="section-title">IV. Territorios destacados del mes</p>
      ${topTerritoriosTable(territorios)}

      <p class="section-title">V. Observaciones</p>
      <p>El presente formato mantiene la estructura del informe mensual con salida automatizada a partir de los datos consolidados del dashboard, dejando fuera las fotografías para su incorporación manual posterior.</p>

      <div class="signature-block">
        <p><strong>${escapeHtml(els.responsableInput.value)}</strong></p>
        <p>Atitlán Recicla</p>
      </div>
    `;

    renderGerenciaCharts(monthlySeries);
  }

  function renderMemoria(current, monthlySeries, zonas, territorios) {
    const monthName = MONTHS_ES[num(current.mes_num)];
    const title = `MEMORIA DE REUNIÓN DE AVANCES - ATITLÁN RECICLA`;
    const subtitle = `${monthName.toUpperCase()} ${current.anio}`;

    els.reportPreview.innerHTML = `
      ${reportHeader(title, subtitle)}

      <p><strong>Lugar:</strong> ${escapeHtml(els.placeInput.value)}</p>
      <p><strong>Fecha:</strong> ${escapeHtml(formatLongDate(els.meetingDateInput.value || todayISO()))}</p>
      <p><strong>Hora:</strong> ${escapeHtml(els.meetingTimeInput.value)}</p>

      <p class="section-title">1. Objetivo de la reunión</p>
      <p>Dar seguimiento a los avances del programa Atitlán Recicla correspondientes al mes de ${monthName} de ${current.anio}, revisando la participación de lideresas, la recuperación y comercialización de materiales reciclables, así como la evolución de los ingresos generados en el territorio.</p>

      <p class="section-title">2. Principales resultados presentados</p>
      <ul>
        <li>Promedio mensual de mujeres activas: <strong>${fmtDec(current.mujeres_activas)}</strong>.</li>
        <li>Promedio mensual de mujeres involucradas en comercialización: <strong>${fmtDec(current.mujeres_comercializacion)}</strong>.</li>
        <li>Total de materiales recuperados: <strong>${fmtDec(current.total_materiales_qq)}</strong> qq.</li>
        <li>Ingreso neto total del territorio: <strong>${fmtMoney(current.ingreso_neto_total_territorio)}</strong>.</li>
        <li>Ingreso neto de cooperativa: <strong>${fmtMoney(current.ingreso_neto_cooperativa)}</strong>.</li>
      </ul>

      <div class="chart-block">
        <div class="chart-title">Gráfica 1. Participación mensual de mujeres</div>
        <canvas id="chartMemoria1" width="680" height="290"></canvas>
      </div>

      <div class="chart-block">
        <div class="chart-title">Gráfica 2. PET y vidrio recuperados por mes</div>
        <canvas id="chartMemoria2" width="680" height="290"></canvas>
      </div>

      <div class="page-break"></div>

      <p class="section-title">3. Análisis e interpretación</p>
      ${buildInterpretation(current, monthlySeries)}

      <p class="section-title">4. Resultados por zona</p>
      ${zonasTable(zonas)}

      <p class="section-title">5. Territorios con mayor recuperación reportada</p>
      ${topTerritoriosTable(territorios)}

      <p class="section-title">6. Acuerdos y seguimiento</p>
      <p>Se acuerda mantener el monitoreo mensual de la recuperación de materiales, fortalecer el seguimiento a la participación de lideresas y continuar la revisión periódica de ingresos generados en el territorio, con el fin de sostener la trazabilidad de resultados y la toma de decisiones operativas.</p>

      <div class="signature-block">
        <p><strong>${escapeHtml(els.responsableInput.value)}</strong></p>
        <p>Atitlán Recicla</p>
      </div>
    `;

    renderMemoriaCharts(monthlySeries);
  }

  function renderGerenciaCharts(series) {
    cleanCharts();

    const labels = series.map(r => MONTHS_CORTO[num(r.mes_num)]);
    const materials = series.map(r => num(r.total_materiales_qq));
    const netTerritory = series.map(r => num(r.ingreso_neto_total_territorio));

    const c1 = new Chart(document.getElementById("chartGerencia1").getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Materiales recuperados (qq)",
          data: materials,
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });

    const c2 = new Chart(document.getElementById("chartGerencia2").getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Ingreso neto territorial",
          data: netTerritory,
          tension: 0.2,
          fill: false,
          borderWidth: 2
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });

    state.charts.push(c1, c2);
  }

  function renderMemoriaCharts(series) {
    cleanCharts();

    const labels = series.map(r => MONTHS_CORTO[num(r.mes_num)]);
    const activas = series.map(r => num(r.mujeres_activas));
    const comerc = series.map(r => num(r.mujeres_comercializacion));
    const pet = series.map(r => num(r.pet_qq));
    const vidrio = series.map(r => num(r.vidrio_total_qq));

    const c1 = new Chart(document.getElementById("chartMemoria1").getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Mujeres activas", data: activas, borderWidth: 1 },
          { label: "Mujeres en comercialización", data: comerc, borderWidth: 1 }
        ]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });

    const c2 = new Chart(document.getElementById("chartMemoria2").getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "PET (qq)", data: pet, borderWidth: 1 },
          { label: "Vidrio total (qq)", data: vidrio, borderWidth: 1 }
        ]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });

    state.charts.push(c1, c2);
  }

  function buildReport() {
    const current = getCurrentRow();
    if (!current) {
      els.reportPreview.innerHTML = `<p>No se encontró información para el período seleccionado.</p>`;
      return;
    }

    const monthlySeries = getMonthlySeries(true);
    const zonas = getZonaRows();
    const territorios = getTerritorioRows();

    if (els.reportType.value === "gerencia") {
      renderGerencia(current, monthlySeries, zonas, territorios);
    } else {
      renderMemoria(current, monthlySeries, zonas, territorios);
    }
  }

  function exportWord() {
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Informe Atitlán Recicla</title>
        <style>
          body{
            font-family:"Times New Roman", Times, serif;
            font-size:12pt;
            line-height:1.15;
            color:#111;
          }
          p{ text-align:justify; margin:0 0 9pt 0; }
          table{ width:100%; border-collapse:collapse; margin:10pt 0 14pt; font-size:11pt; }
          th,td{ border:1px solid #444; padding:6px 7px; vertical-align:top; }
          th{ background:#f3f4f6; text-align:center; font-weight:700; }
          .doc-header{ display:flex; justify-content:space-between; align-items:flex-start; gap:18px; margin-bottom:18px; }
          .doc-header img.logo{ width:260px; }
          .doc-title{ text-align:center; font-weight:700; text-transform:uppercase; margin:20px 0 18px; font-size:12pt; }
          .section-title{ font-weight:700; text-transform:uppercase; margin:14pt 0 8pt; text-align:left; }
          .chart-block{ margin:14pt 0 14pt; text-align:center; page-break-inside:avoid; }
          .chart-title{ font-weight:700; margin-bottom:8pt; text-align:center; }
          .signature-block{ margin-top:28pt; }
          ul{ margin:0 0 10pt 18pt; padding:0; }
          li{ margin:0 0 4pt 0; text-align:justify; }
        </style>
      </head>
      <body>${els.reportPreview.innerHTML}</body>
      </html>
    `;

    const blob = window.htmlDocx.asBlob(content);
    const { anio, mes_num } = getSelectedPeriod();
    const tipo = els.reportType.value === "gerencia" ? "informe_gerencia" : "memoria_avances";
    saveAs(blob, `${tipo}_atitlan_recicla_${anio}_${String(mes_num).padStart(2, "0")}.docx`);
  }

  function exportPdf() {
    window.print();
  }

  async function init() {
    try {
      state.totalMes = await parseCSV(DATA_TOTAL);
      state.zonaMes = await parseCSV(DATA_ZONA);
      state.territorioMes = await parseCSV(DATA_TERRITORIO);

      populatePeriods();

      if (!els.meetingDateInput.value) {
        els.meetingDateInput.value = todayISO();
      }

      els.btnRefresh.addEventListener("click", buildReport);
      els.reportType.addEventListener("change", buildReport);
      els.monthSelect.addEventListener("change", buildReport);
      els.btnWord.addEventListener("click", exportWord);
      els.btnPdf.addEventListener("click", exportPdf);

      buildReport();
    } catch (err) {
      console.error(err);
      els.reportPreview.innerHTML = `
        <p><strong>Error cargando datos.</strong></p>
        <p>Verifica que existan estos archivos:</p>
        <ul>
          <li>docs/data/total_mes.csv</li>
          <li>docs/data/zona_mes.csv</li>
          <li>docs/data/territorio_mes.csv</li>
          <li>docs/logosatitlan.png</li>
        </ul>
      `;
    }
  }

  init();
})();
