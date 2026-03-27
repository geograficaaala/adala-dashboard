const DATA_PATHS = {
  total: "./data/fortalecimiento_municipal/total_mes.csv",
  indicadores: "./data/fortalecimiento_municipal/institucional_indicadores.csv",
  metadata: "./data/fortalecimiento_municipal/metadata_publicacion.csv",
  calidad: "./data/fortalecimiento_municipal/calidad_datos_mes.csv",
  temas: "./data/fortalecimiento_municipal/capacitaciones_tema_mes.csv",
  municipios: "./data/fortalecimiento_municipal/capacitaciones_municipio_mes.csv",
  asistencias: "./data/fortalecimiento_municipal/asistencias_sector_mes.csv",
  estudios: "./data/fortalecimiento_municipal/estudios_sector_mes.csv",
  reuniones: "./data/fortalecimiento_municipal/reuniones_tipo_mes.csv",
  detalle_capacitaciones: "./data/fortalecimiento_municipal/detalle_capacitaciones.csv",
  detalle_asistencias: "./data/fortalecimiento_municipal/detalle_asistencias.csv",
  detalle_estudios: "./data/fortalecimiento_municipal/detalle_estudios.csv",
  detalle_pirdes: "./data/fortalecimiento_municipal/detalle_pirdes.csv",
  detalle_reuniones: "./data/fortalecimiento_municipal/detalle_reuniones.csv",
};

const DETAIL_CONFIG = {
  detalle_capacitaciones: {
    label: "Capacitaciones",
    columns: ["fecha", "tipo_actividad", "tema_homologado", "personas_total", "municipios_texto", "observaciones"],
  },
  detalle_asistencias: {
    label: "Asistencias",
    columns: ["fecha", "sector_homologado", "tipo_actividad", "asistencia_indicador", "nueva_asistencia", "observaciones"],
  },
  detalle_estudios: {
    label: "Estudios",
    columns: ["fecha", "sector_homologado", "tipo_actividad", "estudio_finalizado", "es_estudio_rs_comercial_mercados", "observaciones"],
  },
  detalle_pirdes: {
    label: "PIRDES",
    columns: ["fecha", "municipio", "implementado_indicador", "tipo_actividad", "observaciones"],
  },
  detalle_reuniones: {
    label: "Reuniones",
    columns: ["fecha", "tipo_reunion_homologado", "tipo_actividad", "codema_indicador", "mesa_departamental_indicador", "observaciones"],
  },
};

const state = {
  data: {},
  years: [],
  periods: [],
  indicators: [],
  selectedYear: null,
  selectedPeriod: null,
  selectedIndicatorId: null,
  detailTab: "detalle_capacitaciones",
};

document.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch((error) => {
    console.error(error);
    renderFatalError(error);
  });
});

async function bootstrap() {
  const [
    total,
    indicadores,
    metadata,
    calidad,
    temas,
    municipios,
    asistencias,
    estudios,
    reuniones,
    detalleCapacitaciones,
    detalleAsistencias,
    detalleEstudios,
    detallePirdes,
    detalleReuniones,
  ] = await Promise.all([
    fetchCsv(DATA_PATHS.total),
    fetchCsv(DATA_PATHS.indicadores),
    fetchCsv(DATA_PATHS.metadata),
    fetchCsv(DATA_PATHS.calidad),
    fetchCsv(DATA_PATHS.temas),
    fetchCsv(DATA_PATHS.municipios),
    fetchCsv(DATA_PATHS.asistencias),
    fetchCsv(DATA_PATHS.estudios),
    fetchCsv(DATA_PATHS.reuniones),
    fetchCsv(DATA_PATHS.detalle_capacitaciones),
    fetchCsv(DATA_PATHS.detalle_asistencias),
    fetchCsv(DATA_PATHS.detalle_estudios),
    fetchCsv(DATA_PATHS.detalle_pirdes),
    fetchCsv(DATA_PATHS.detalle_reuniones),
  ]);

  state.data = {
    total: total.map(normalizeRow).sort(sortByPeriod),
    indicadores: indicadores.map(normalizeRow).sort(sortByPeriodThenOrder),
    metadata: metadata.map(normalizeRow),
    calidad: calidad.map(normalizeRow).sort(sortByPeriod),
    temas: temas.map(normalizeRow).sort(sortByPeriod),
    municipios: municipios.map(normalizeRow).sort(sortByPeriod),
    asistencias: asistencias.map(normalizeRow).sort(sortByPeriod),
    estudios: estudios.map(normalizeRow).sort(sortByPeriod),
    reuniones: reuniones.map(normalizeRow).sort(sortByPeriod),
    detalle_capacitaciones: detalleCapacitaciones.map(normalizeRow),
    detalle_asistencias: detalleAsistencias.map(normalizeRow),
    detalle_estudios: detalleEstudios.map(normalizeRow),
    detalle_pirdes: detallePirdes.map(normalizeRow),
    detalle_reuniones: detalleReuniones.map(normalizeRow),
  };

  state.periods = unique(state.data.total.map((row) => row.periodo)).sort();
  state.years = unique(state.data.total.map((row) => row.anio).filter(Number.isFinite)).sort((a, b) => a - b);
  state.indicators = buildIndicatorOptions();

  const latest = latestTotalRow();
  state.selectedYear = latest?.anio ?? state.years[state.years.length - 1] ?? null;
  state.selectedPeriod = latest?.periodo ?? state.periods[state.periods.length - 1] ?? null;
  state.selectedIndicatorId =
    state.indicators.find((item) => item.indicador_id === "personas_capacitadas_nucleo")?.indicador_id ||
    state.indicators[0]?.indicador_id ||
    null;

  bindControls();
  renderAll();
}

function buildIndicatorOptions() {
  return state.data.indicadores
    .filter((row) => row.categoria === "primario")
    .map((row) => ({
      indicador_id: row.indicador_id,
      indicador_nombre: row.indicador_nombre,
      orden_dashboard: Number(row.orden_dashboard || 999),
    }))
    .filter(
      (item, index, arr) =>
        item.indicador_id &&
        index === arr.findIndex((other) => other.indicador_id === item.indicador_id)
    )
    .sort((a, b) => a.orden_dashboard - b.orden_dashboard);
}

function bindControls() {
  const yearSelect = document.getElementById("yearSelect");
  const periodSelect = document.getElementById("periodSelect");
  const indicatorSelect = document.getElementById("indicatorSelect");

  renderSelectOptions();

  yearSelect.addEventListener("change", (event) => {
    state.selectedYear = Number(event.target.value);
    const availablePeriods = periodsForYear(state.selectedYear);
    if (!availablePeriods.includes(state.selectedPeriod)) {
      state.selectedPeriod = availablePeriods[availablePeriods.length - 1] ?? null;
    }
    renderSelectOptions();
    renderAll();
  });

  periodSelect.addEventListener("change", (event) => {
    state.selectedPeriod = event.target.value;
    renderAll();
  });

  indicatorSelect.addEventListener("change", (event) => {
    state.selectedIndicatorId = event.target.value;
    renderAll();
  });
}

function renderSelectOptions() {
  const yearSelect = document.getElementById("yearSelect");
  const periodSelect = document.getElementById("periodSelect");
  const indicatorSelect = document.getElementById("indicatorSelect");

  yearSelect.innerHTML = state.years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  if (state.selectedYear != null) {
    yearSelect.value = String(state.selectedYear);
  }

  const availablePeriods = periodsForYear(state.selectedYear);
  periodSelect.innerHTML = availablePeriods
    .map((period) => `<option value="${escapeHtml(period)}">${escapeHtml(periodLabel(period))}</option>`)
    .join("");
  if (state.selectedPeriod && availablePeriods.includes(state.selectedPeriod)) {
    periodSelect.value = state.selectedPeriod;
  }

  indicatorSelect.innerHTML = state.indicators
    .map(
      (item) =>
        `<option value="${escapeHtml(item.indicador_id)}">${escapeHtml(item.indicador_nombre)}</option>`
    )
    .join("");
  if (state.selectedIndicatorId) {
    indicatorSelect.value = state.selectedIndicatorId;
  }
}

function renderAll() {
  renderHeaderStatus();
  renderHero();
  renderNarrative();
  renderKpis();
  renderGapChart();
  renderTrendChart();
  renderTemaChart();
  renderMunicipioChart();
  renderAsistenciaChart();
  renderEstudioChart();
  renderReunionChart();
  renderQuality();
  renderDetailTabs();
  renderDetailTable();
  document.getElementById("periodReadout").textContent = periodLabel(state.selectedPeriod);
}

function renderHeaderStatus() {
  const rows = currentIndicatorRows();
  const summary = summarizePortfolio(rows);
  const el = document.getElementById("heroStatus");
  el.className = `pill ${summary.status}`;
  el.textContent = summary.statusText;
}

function renderHero() {
  const total = currentTotal();
  const rows = currentIndicatorRows();
  const summary = summarizePortfolio(rows);
  const statusGap = summary.avgActual - summary.avgExpected;

  document.getElementById("heroStats").innerHTML = [
    {
      label: "Corte",
      value: periodLabel(state.selectedPeriod),
    },
    {
      label: "Avance anual promedio",
      value: fmtPct(summary.avgActual),
    },
    {
      label: "Esperado al corte",
      value: fmtPct(summary.avgExpected),
    },
    {
      label: "Brecha promedio",
      value: signedPctPoints(statusGap),
    },
  ]
    .map(
      (item) => `
        <div class="hero-stat">
          <small>${escapeHtml(item.label)}</small>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `
    )
    .join("");

  const miniItems = [
    {
      label: "Indicadores en ruta",
      value: `${summary.greenCount} de ${summary.total}`,
    },
    {
      label: "Aporte del mes",
      value: `${fmtNum(total?.valor_mes_total ?? sum(rows.map((row) => row.valor_mes)))} hitos`,
    },
    {
      label: "Personas capacitadas del mes",
      value: fmtNum(total?.personas_capacitadas_total_mes ?? 0),
    },
    {
      label: "Reuniones del mes",
      value: fmtNum(total?.reuniones_totales_mes ?? 0),
    },
    {
      label: "Asistencias nuevas del mes",
      value: fmtNum(total?.asistencias_nuevas_total_mes ?? 0),
    },
    {
      label: "Estudios finalizados acumulados",
      value: fmtNum(total?.estudios_finalizados_total_acum ?? 0),
    },
  ];

  document.getElementById("heroMiniList").innerHTML = miniItems
    .map(
      (item) => `
        <div class="mini-item">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `
    )
    .join("");
}

function renderNarrative() {
  const total = currentTotal();
  const rows = currentIndicatorRows();
  const summary = summarizePortfolio(rows);
  const best = [...rows].sort((a, b) => gapVsExpected(b) - gapVsExpected(a))[0];
  const worst = [...rows].sort((a, b) => gapVsExpected(a) - gapVsExpected(b))[0];

  const notes = [];
  notes.push(
    `Al corte de <strong>${escapeHtml(periodLabel(state.selectedPeriod))}</strong>, el programa acumula un avance promedio de <strong>${fmtPct(
      summary.avgActual
    )}</strong> frente a un esperado de <strong>${fmtPct(summary.avgExpected)}</strong>. La brecha promedio es <strong>${signedPctPoints(
      summary.avgActual - summary.avgExpected
    )}</strong>.`
  );

  if (total) {
    notes.push(
      `En el mes se registran <strong>${fmtNum(total.personas_capacitadas_total_mes)}</strong> personas capacitadas, <strong>${fmtNum(
        total.asistencias_nuevas_total_mes
      )}</strong> asistencias nuevas y <strong>${fmtNum(total.reuniones_totales_mes)}</strong> reuniones.`
    );
  }

  if (best) {
    notes.push(
      `El indicador más adelantado frente al ritmo esperado es <strong>${escapeHtml(
        best.indicador_nombre
      )}</strong>, con una brecha de <strong>${signedPctPoints(gapVsExpected(best))}</strong>.`
    );
  }

  if (worst) {
    notes.push(
      `La principal brecha visible está en <strong>${escapeHtml(
        worst.indicador_nombre
      )}</strong>, con una diferencia de <strong>${signedPctPoints(gapVsExpected(worst))}</strong> frente al esperado.`
    );
  }

  if (total && Number(total.personas_capacitadas_nucleo_mes || 0) > 0 && Number(total.municipios_capacitacion_nucleo_mes || 0) === 0) {
    notes.push(
      "El período sí registra actividad de capacitación núcleo, pero hay filas sin municipio capturado; el tablero suma personas y mantiene esa alerta solo como control de calidad."
    );
  }

  document.getElementById("narrativeNotes").innerHTML = notes
    .map((note) => `<div class="note">${note}</div>`)
    .join("");

  const summaryPills = [
    `${summary.greenCount} en ruta`,
    `${summary.yellowCount} en atención`,
    `${summary.redCount} con brecha`,
    `${fmtPct(summary.avgActual)} avance anual promedio`,
    `${fmtPct(summary.avgExpected)} esperado al corte`,
  ];

  document.getElementById("summaryPills").innerHTML = summaryPills
    .map((pill) => `<div class="summary-pill">${escapeHtml(pill)}</div>`)
    .join("");

  const meta = state.data.metadata[0] || {};
  const methodNotes = [meta.nota_capacitaciones, meta.nota_asistencias_codede, meta.nota_temas_nucleo]
    .filter(Boolean)
    .map((note) => `<div class="note">${escapeHtml(note)}</div>`)
    .join("");
  document.getElementById("methodNotes").innerHTML = methodNotes || emptyBlock("Sin notas metodológicas publicadas.");
}

function renderKpis() {
  const rows = currentIndicatorRows();
  const grid = document.getElementById("kpiGrid");

  if (!rows.length) {
    grid.innerHTML = emptyBlock("No hay indicadores primarios para el período seleccionado.");
    return;
  }

  grid.innerHTML = rows
    .map((row) => {
      const status = statusClass(row);
      const expected = expectedAnnualPct(row);
      const actual = Number(row.pct_meta_anual || 0);
      const gap = actual - expected;
      const fillWidth = clamp(actual, 0, 1.15) * 100;
      const markerLeft = clamp(expected, 0, 1) * 100;

      return `
        <article class="card kpi ${status}">
          <div class="kpi-top">
            <div>
              <div class="kpi-label">Indicador prioritario</div>
              <div class="kpi-name">${escapeHtml(row.indicador_nombre)}</div>
            </div>
            <span class="chip ${status}">${escapeHtml(statusLabel(status))}</span>
          </div>
          <div class="kpi-value">${fmtNum(row.valor_acumulado)} / ${fmtNum(row.meta_anual)}</div>
          <div class="kpi-meta"><strong>${fmtPct(actual)}</strong> de avance anual acumulado</div>
          <div class="kpi-meta">Esperado al corte: <strong>${fmtPct(expected)}</strong> · Brecha: <strong>${signedPctPoints(gap)}</strong></div>
          <div class="kpi-meta">Aporte del mes: <strong>+${fmtNum(row.valor_mes)}</strong> ${escapeHtml(row.unidad || "")}</div>
          <div class="progress-bullet ${status}">
            <span class="fill" style="width:${Math.min(fillWidth, 100)}%"></span>
            <span class="marker" style="left:calc(${markerLeft}% - 1px)"></span>
          </div>
          <div class="progress-labels">
            <span>Real <strong>${fmtPct(actual)}</strong></span>
            <span>Esperado <strong>${fmtPct(expected)}</strong></span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderGapChart() {
  const rows = currentIndicatorRows();
  const container = document.getElementById("gapChart");

  if (!rows.length) {
    container.innerHTML = emptyBlock("No hay datos para comparar brechas en este período.");
    return;
  }

  const ordered = [...rows].sort((a, b) => gapVsExpected(b) - gapVsExpected(a));
  const maxActual = Math.max(1, ...ordered.map((row) => Number(row.pct_meta_anual || 0)));
  const scaleMax = Math.max(1, maxActual, ...ordered.map((row) => expectedAnnualPct(row)));

  const items = ordered
    .map((row) => {
      const status = statusClass(row);
      const actual = Number(row.pct_meta_anual || 0);
      const expected = expectedAnnualPct(row);
      const actualPct = (actual / scaleMax) * 100;
      const expectedPct = (expected / scaleMax) * 100;
      return `
        <div class="bar-row">
          <div class="name">${escapeHtml(shorten(row.indicador_nombre, 44))}</div>
          <div class="progress-bullet ${status}">
            <span class="fill" style="width:${Math.min(actualPct, 100)}%"></span>
            <span class="marker" style="left:calc(${Math.min(expectedPct, 100)}% - 1px)"></span>
          </div>
          <div class="val">${fmtPct(actual)} · ${signedPctPoints(actual - expected)}</div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="bar-list">${items}</div>
    <div class="legend">
      <span><i style="background:linear-gradient(90deg,#38b6e8,#2575cc)"></i>Avance acumulado real</span>
      <span><i style="background:#0c1d3a;width:2px;height:14px;border-radius:2px"></i>Esperado al corte</span>
    </div>
  `;
}

function renderTrendChart() {
  const indicator = indicatorSeries(state.selectedIndicatorId);
  const target = state.indicators.find((item) => item.indicador_id === state.selectedIndicatorId);
  const subtitle = document.getElementById("trendSubtitle");
  subtitle.textContent = target
    ? `Evolución del indicador foco: ${target.indicador_nombre}.`
    : "Evolución acumulada y aporte del mes.";

  const container = document.getElementById("trendChart");
  if (!indicator.length) {
    container.innerHTML = emptyBlock("No hay serie disponible para el indicador foco.");
    return;
  }

  const width = 760;
  const height = 310;
  const margin = { top: 16, right: 24, bottom: 56, left: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(
    1,
    ...indicator.map((row) => Number(row.valor_acumulado || 0)),
    ...indicator.map((row) => Number(row.meta_cohorte || 0)),
    ...indicator.map((row) => Number(row.valor_mes || 0))
  );

  const points = indicator.map((row, index) => {
    const x =
      indicator.length === 1
        ? margin.left + plotWidth / 2
        : margin.left + (index * plotWidth) / (indicator.length - 1);
    const yActual = margin.top + plotHeight - (Number(row.valor_acumulado || 0) / maxValue) * plotHeight;
    const yExpected = margin.top + plotHeight - (Number(row.meta_cohorte || 0) / maxValue) * plotHeight;
    const barHeight = (Number(row.valor_mes || 0) / maxValue) * plotHeight;
    return { row, x, yActual, yExpected, barHeight };
  });

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((tick) => {
      const value = maxValue * tick;
      const y = margin.top + plotHeight - plotHeight * tick;
      return `
        <line x1="${margin.left}" y1="${y}" x2="${margin.left + plotWidth}" y2="${y}" stroke="rgba(102,133,170,.22)" />
        <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" fill="#6685aa" font-size="11">${escapeHtml(fmtNum(value))}</text>
      `;
    })
    .join("");

  const bars = points
    .map(
      (point) => `
        <rect x="${point.x - 14}" y="${margin.top + plotHeight - point.barHeight}" width="28" height="${point.barHeight}" rx="7" fill="rgba(56,182,232,.35)" />
      `
    )
    .join("");

  const expectedPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.yExpected}`).join(" ");
  const actualPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.yActual}`).join(" ");

  const labels = points
    .map(
      (point) => `
        <text x="${point.x}" y="${height - 22}" text-anchor="middle" fill="#6685aa" font-size="11">${escapeHtml(
          point.row.mes_nombre || point.row.periodo
        )}</text>
      `
    )
    .join("");

  const circles = points
    .map(
      (point) => `
        <circle cx="${point.x}" cy="${point.yActual}" r="4.5" fill="#2575cc" />
        <circle cx="${point.x}" cy="${point.yExpected}" r="4.5" fill="#1d9e68" />
      `
    )
    .join("");

  container.innerHTML = `
    <div class="chart-wrap">
      <div class="viz-wrap">
        <svg class="viz-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Serie temporal del indicador foco">
          ${grid}
          ${bars}
          <path d="${expectedPath}" fill="none" stroke="#1d9e68" stroke-width="3" stroke-dasharray="6 6" />
          <path d="${actualPath}" fill="none" stroke="#2575cc" stroke-width="3.5" />
          ${circles}
          ${labels}
        </svg>
      </div>
    </div>
    <div class="legend">
      <span><i style="background:#2575cc"></i>Acumulado real</span>
      <span><i style="background:#1d9e68"></i>Esperado acumulado</span>
      <span><i style="background:rgba(56,182,232,.55);height:10px"></i>Aporte del mes</span>
    </div>
  `;
}

function renderTemaChart() {
  const rows = state.data.temas
    .filter((row) => row.periodo === state.selectedPeriod)
    .sort((a, b) => Number(b.personas || 0) - Number(a.personas || 0));

  document.getElementById("temaChart").innerHTML = groupedBarList(rows, {
    labelKey: "tema",
    valueKeys: [
      { key: "personas", label: "Personas", color: "#2575cc" },
      { key: "eventos", label: "Eventos", color: "#38b6e8" },
    ],
    empty: "No hay capacitaciones registradas en este período.",
  });
}

function renderMunicipioChart() {
  const rows = state.data.municipios
    .filter((row) => row.periodo === state.selectedPeriod && truthy(row.capacitacion_nucleo))
    .sort((a, b) => Number(b.eventos || 0) - Number(a.eventos || 0));

  document.getElementById("municipioChart").innerHTML = simpleBarList(rows, {
    labelKey: "municipio",
    valueKey: "eventos",
    color: "#2575cc",
    empty: "No hay municipios núcleo capturados en este período.",
  });
}

function renderAsistenciaChart() {
  const rows = state.data.asistencias
    .filter((row) => row.periodo === state.selectedPeriod)
    .sort((a, b) => Number(b.asistencia_indicador || 0) - Number(a.asistencia_indicador || 0));

  document.getElementById("asistenciaChart").innerHTML = groupedBarList(rows, {
    labelKey: "sector",
    valueKeys: [
      { key: "asistencia_indicador", label: "Cuenta indicador", color: "#1d9e68" },
      { key: "nuevas_asistencias", label: "Nuevas", color: "#38b6e8" },
    ],
    empty: "No hay asistencias registradas en este período.",
  });
}

function renderEstudioChart() {
  const rows = state.data.estudios
    .filter((row) => row.periodo === state.selectedPeriod)
    .sort((a, b) => Number(b.estudios_finalizados || 0) - Number(a.estudios_finalizados || 0));

  document.getElementById("estudioChart").innerHTML = groupedBarList(rows, {
    labelKey: "sector",
    valueKeys: [
      { key: "estudios", label: "Registrados", color: "#2575cc" },
      { key: "estudios_finalizados", label: "Finalizados", color: "#1d9e68" },
    ],
    empty: "No hay estudios registrados en este período.",
  });
}

function renderReunionChart() {
  const rows = state.data.reuniones
    .filter((row) => row.periodo === state.selectedPeriod)
    .sort((a, b) => Number(b.reuniones || 0) - Number(a.reuniones || 0));

  document.getElementById("reunionChart").innerHTML = simpleBarList(rows, {
    labelKey: "tipo_reunion",
    valueKey: "reuniones",
    color: "#2575cc",
    empty: "No hay reuniones registradas en este período.",
  });
}

function renderQuality() {
  const rows = state.data.calidad.filter((row) => row.periodo === state.selectedPeriod);
  const container = document.getElementById("qualityCards");

  if (!rows.length) {
    container.innerHTML = emptyBlock("No hay datos de calidad para este período.");
    return;
  }

  container.innerHTML = `
    <div class="quality-grid">
      ${rows
        .map(
          (row) => `
            <div class="quality-card">
              <div class="module">${escapeHtml(row.modulo)}</div>
              <div class="metric">${fmtNum(row.filas_validas)}</div>
              <div class="subline">Filas válidas de ${fmtNum(row.filas_con_fecha)} con fecha</div>
              <div class="subline">Incompletas: ${fmtNum(row.filas_estado_incompleto)} · Municipio faltante: ${fmtNum(
                row.filas_alerta_municipio_missing
              )}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDetailTabs() {
  const el = document.getElementById("detailTabs");
  el.innerHTML = Object.entries(DETAIL_CONFIG)
    .map(
      ([key, config]) => `
        <button class="tab-btn ${state.detailTab === key ? "active" : ""}" data-tab="${key}">${escapeHtml(config.label)}</button>
      `
    )
    .join("");

  el.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.detailTab = button.dataset.tab;
      renderDetailTabs();
      renderDetailTable();
    });
  });
}

function renderDetailTable() {
  const config = DETAIL_CONFIG[state.detailTab];
  const rows = (state.data[state.detailTab] || [])
    .filter((row) => row.periodo === state.selectedPeriod && truthy(row.registro_valido))
    .slice(0, 12);

  const container = document.getElementById("detailTable");
  if (!rows.length) {
    container.innerHTML = emptyBlock(`No hay filas válidas en ${config.label.toLowerCase()} para este período.`);
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${config.columns.map((column) => `<th>${escapeHtml(prettyHeader(column))}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>${config.columns.map((column) => `<td>${escapeHtml(formatCell(row[column]))}</td>`).join("")}</tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function currentTotal() {
  return state.data.total.find((row) => row.periodo === state.selectedPeriod) || null;
}

function currentIndicatorRows() {
  return state.data.indicadores
    .filter(
      (row) =>
        row.periodo === state.selectedPeriod &&
        row.anio === state.selectedYear &&
        row.categoria === "primario"
    )
    .sort((a, b) => Number(a.orden_dashboard || 999) - Number(b.orden_dashboard || 999));
}

function indicatorSeries(indicadorId) {
  return state.data.indicadores
    .filter(
      (row) =>
        row.indicador_id === indicadorId &&
        row.anio === state.selectedYear &&
        row.categoria === "primario"
    )
    .sort((a, b) => Number(a.mes_num || 0) - Number(b.mes_num || 0));
}

function periodsForYear(year) {
  return state.data.total
    .filter((row) => row.anio === year)
    .map((row) => row.periodo)
    .sort();
}

function latestTotalRow() {
  return [...state.data.total].sort(sortByPeriod).slice(-1)[0] || null;
}

function summarizePortfolio(rows) {
  const metrics = rows.map((row) => ({ ...row, status: statusClass(row) }));
  const total = metrics.length || 1;
  const avgActual = avg(metrics.map((row) => Number(row.pct_meta_anual || 0)));
  const avgExpected = avg(metrics.map((row) => expectedAnnualPct(row)));
  const greenCount = metrics.filter((row) => row.status === "green").length;
  const yellowCount = metrics.filter((row) => row.status === "yellow").length;
  const redCount = metrics.filter((row) => row.status === "red").length;
  const status = portfolioStatus(avgActual, avgExpected);

  return {
    total: metrics.length,
    greenCount,
    yellowCount,
    redCount,
    avgActual,
    avgExpected,
    status,
    statusText: portfolioStatusLabel(status, avgActual, avgExpected),
  };
}

function expectedAnnualPct(row) {
  const metaAnual = Number(row.meta_anual || 0);
  if (metaAnual <= 0) return 0;
  if (Number(row.meta_cohorte || 0) > 0) {
    return Number(row.meta_cohorte || 0) / metaAnual;
  }
  return clamp(Number(row.cohorte_mes_indice || 0) / 12, 0, 1);
}

function gapVsExpected(row) {
  return Number(row.pct_meta_anual || 0) - expectedAnnualPct(row);
}

function statusClass(row) {
  const expected = expectedAnnualPct(row);
  const actual = Number(row.pct_meta_anual || 0);
  const metaAnual = Number(row.meta_anual || 0);

  if (metaAnual <= 0) return "muted";
  if (expected <= 0 && actual <= 0) return "muted";
  if (actual >= expected) return "green";
  if (expected > 0 && actual >= expected * 0.85) return "yellow";
  return "red";
}

function statusLabel(status) {
  return {
    green: "En ruta",
    yellow: "Atención",
    red: "Brecha",
    muted: "Sin meta",
  }[status] || "Sin dato";
}

function portfolioStatus(actual, expected) {
  if (actual >= expected) return "green";
  if (expected > 0 && actual >= expected * 0.85) return "yellow";
  return "red";
}

function portfolioStatusLabel(status, actual, expected) {
  const gap = actual - expected;
  if (status === "green") return `Programa adelantado ${signedPctPoints(gap)}`;
  if (status === "yellow") return `Programa cerca del corte ${signedPctPoints(gap)}`;
  return `Programa bajo esperado ${signedPctPoints(gap)}`;
}

function simpleBarList(rows, config) {
  if (!rows.length) {
    return emptyBlock(config.empty);
  }

  const maxValue = Math.max(1, ...rows.map((row) => Number(row[config.valueKey] || 0)));
  const items = rows
    .map((row) => {
      const value = Number(row[config.valueKey] || 0);
      const pct = (value / maxValue) * 100;
      return `
        <div class="bar-row">
          <div class="name">${escapeHtml(shorten(row[config.labelKey], 32))}</div>
          <div class="progress-bullet">
            <span class="fill" style="width:${pct}%;background:linear-gradient(90deg,${config.color},#8fd5ff)"></span>
          </div>
          <div class="val">${fmtNum(value)}</div>
        </div>
      `;
    })
    .join("");

  return `<div class="stack">${items}</div>`;
}

function groupedBarList(rows, config) {
  if (!rows.length) {
    return emptyBlock(config.empty);
  }

  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => config.valueKeys.map((item) => Number(row[item.key] || 0)))
  );

  const items = rows
    .map((row) => {
      const lines = config.valueKeys
        .map((item) => {
          const value = Number(row[item.key] || 0);
          const pct = (value / maxValue) * 100;
          return `
            <div class="bar-row" style="grid-template-columns:110px 1fr auto">
              <div class="name">${escapeHtml(item.label)}</div>
              <div class="progress-bullet">
                <span class="fill" style="width:${pct}%;background:linear-gradient(90deg,${item.color},#9adfff)"></span>
              </div>
              <div class="val">${fmtNum(value)}</div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="note">
          <div style="font-weight:700;color:var(--text);margin-bottom:8px">${escapeHtml(shorten(row[config.labelKey], 36))}</div>
          <div class="stack">${lines}</div>
        </div>
      `;
    })
    .join("");

  return `<div class="stack">${items}</div>`;
}

async function fetchCsv(path) {
  const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path}`);
  }
  const text = await response.text();
  return parseCsv(text);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  const clean = rows.filter((cells) => cells.some((cell) => String(cell).trim() !== ""));
  if (!clean.length) return [];

  const headers = clean[0].map((cell) => String(cell).trim());
  return clean.slice(1).map((cells) => {
    const result = {};
    headers.forEach((header, index) => {
      result[header] = cells[index] ?? "";
    });
    return result;
  });
}

function normalizeRow(row) {
  const output = {};
  Object.entries(row).forEach(([key, value]) => {
    const stringValue = String(value ?? "").trim();
    if (stringValue === "") {
      output[key] = "";
    } else if (stringValue === "True" || stringValue === "true") {
      output[key] = true;
    } else if (stringValue === "False" || stringValue === "false") {
      output[key] = false;
    } else if (/^-?\d+(\.\d+)?$/.test(stringValue)) {
      output[key] = Number(stringValue);
    } else {
      output[key] = stringValue;
    }
  });
  return output;
}

function renderFatalError(error) {
  const message = error?.message || "Error al cargar el dashboard.";
  document.body.innerHTML = `
    <div style="max-width:820px;margin:48px auto;padding:0 18px;font-family:Sora,system-ui,sans-serif">
      <div style="background:#fff;border:1px solid #ddeaf8;border-radius:18px;padding:24px;box-shadow:0 2px 12px rgba(10,35,80,.09)">
        <h1 style="font-family:Lora,Georgia,serif;font-size:2rem;margin-bottom:10px;color:#0c1d3a">No se pudo cargar el dashboard</h1>
        <p style="color:#2a4570;line-height:1.7;margin-bottom:12px">${escapeHtml(message)}</p>
        <p style="color:#6685aa;line-height:1.7">Verifica que los CSV existan en <code>docs/data/fortalecimiento_municipal/</code> y que el workflow haya publicado la última corrida.</p>
      </div>
    </div>
  `;
}

function sortByPeriod(a, b) {
  return String(a.periodo || "").localeCompare(String(b.periodo || ""));
}

function sortByPeriodThenOrder(a, b) {
  const periodCompare = sortByPeriod(a, b);
  if (periodCompare !== 0) return periodCompare;
  return Number(a.orden_dashboard || 999) - Number(b.orden_dashboard || 999);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== "" && value != null))];
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

function avg(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return sum(valid) / valid.length;
}

function sum(values) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0);
}

function truthy(value) {
  return value === true || ["true", "si", "sí", "1"].includes(String(value).toLowerCase());
}

function fmtNum(value) {
  const number = Number(value || 0);
  if (Number.isInteger(number)) {
    return new Intl.NumberFormat("es-GT").format(number);
  }
  return new Intl.NumberFormat("es-GT", { maximumFractionDigits: 1 }).format(number);
}

function fmtPct(value) {
  return new Intl.NumberFormat("es-GT", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function signedPctPoints(value) {
  const points = Number(value || 0) * 100;
  const formatted = new Intl.NumberFormat("es-GT", {
    maximumFractionDigits: 0,
    signDisplay: "always",
  }).format(points);
  return `${formatted} pts`;
}

function periodLabel(period) {
  const row = state.data.total.find((item) => item.periodo === period);
  return row ? `${row.mes_nombre} ${row.anio}` : String(period || "");
}

function prettyHeader(value) {
  return String(value || "").replace(/_/g, " ");
}

function formatCell(value) {
  if (value === "" || value == null) return "—";
  if (value === true) return "Sí";
  if (value === false) return "No";
  if (typeof value === "number") return fmtNum(value);
  return String(value);
}

function shorten(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function emptyBlock(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}
