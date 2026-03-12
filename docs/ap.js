const DATA_PATHS = {
  indicadores: "./data/institucional_indicadores.csv",
  total: "./data/total_mes.csv",
  zona: "./data/zona_mes.csv",
  materiales: "./data/materiales_resumen_mes.csv",
};

const APP_TITLE = "Dashboard institucional ADALA";
const APP_SUBTITLE = "Piloto inicial · Atitlán Recicla";

document.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch((error) => {
    console.error(error);
    renderFatalError(error);
  });
});

async function bootstrap() {
  injectStyles();

  const root = document.getElementById("app");
  if (!root) throw new Error('No existe el contenedor con id="app".');

  root.innerHTML = `
    <div class="adala-shell">
      <header class="adala-header">
        <div>
          <div class="adala-badge">ADALA · Dashboard</div>
          <h1>${APP_TITLE}</h1>
          <p>${APP_SUBTITLE}</p>
        </div>
        <div class="adala-header-meta">
          <div class="meta-card">
            <span class="meta-label">Estado</span>
            <strong id="status-pill">Cargando datos…</strong>
          </div>
          <div class="meta-card">
            <span class="meta-label">Fuente</span>
            <strong>GitHub Pages</strong>
          </div>
        </div>
      </header>

      <section class="adala-toolbar">
        <div class="filter-group">
          <label for="yearSelect">Año</label>
          <select id="yearSelect"></select>
        </div>

        <div class="filter-group">
          <label for="indicatorSelect">Indicador</label>
          <select id="indicatorSelect"></select>
        </div>

        <div class="filter-group filter-group-wide">
          <label>Último período</label>
          <div id="periodBadge" class="period-badge">—</div>
        </div>
      </section>

      <section id="summarySection" class="kpi-grid"></section>

      <section class="panel-grid">
        <article class="panel panel-lg">
          <div class="panel-head">
            <div>
              <h2>Evolución mensual</h2>
              <p id="chartSubtitle">Cargando serie…</p>
            </div>
          </div>
          <div id="chartPanel"></div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>Avance contra meta</h2>
              <p>Último período reportado</p>
            </div>
          </div>
          <div id="progressPanel"></div>
        </article>
      </section>

      <section class="panel-grid">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>Resumen por zona</h2>
              <p>Valores del último período</p>
            </div>
          </div>
          <div id="zonePanel"></div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>Materiales del último período</h2>
              <p>Detalle agregado por material</p>
            </div>
          </div>
          <div id="materialsPanel"></div>
        </article>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Indicadores institucionales</h2>
            <p>Base normalizada para arquitectura multi-programa</p>
          </div>
        </div>
        <div id="tablePanel"></div>
      </section>
    </div>
  `;

  const datasets = await loadAllData();
  const state = buildState(datasets);

  bindControls(state);
  renderAll(state);

  const statusPill = document.getElementById("status-pill");
  statusPill.textContent = "Datos cargados";
}

async function loadAllData() {
  const [indicadores, total, zona, materiales] = await Promise.all([
    fetchCsv(DATA_PATHS.indicadores),
    fetchCsv(DATA_PATHS.total),
    fetchCsv(DATA_PATHS.zona),
    fetchCsv(DATA_PATHS.materiales),
  ]);

  return {
    indicadores: indicadores.map(normalizeIndicadorRow),
    total: total.map(normalizeGenericRow),
    zona: zona.map(normalizeGenericRow),
    materiales: materiales.map(normalizeGenericRow),
  };
}

function buildState(datasets) {
  const years = uniqueSorted(
    datasets.indicadores.map((r) => r.anio).filter((v) => Number.isFinite(v))
  );

  const indicadorOptions = datasets.indicadores
    .map((r) => ({
      indicador_id: r.indicador_id,
      indicador_nombre: r.indicador_nombre,
    }))
    .filter((v) => v.indicador_id && v.indicador_nombre)
    .filter(
      (item, index, arr) =>
        index === arr.findIndex((x) => x.indicador_id === item.indicador_id)
    )
    .sort((a, b) => a.indicador_nombre.localeCompare(b.indicador_nombre, "es"));

  const latest = getLatestPeriod(datasets.indicadores);

  return {
    datasets,
    years,
    indicadorOptions,
    selectedYear: latest?.anio ?? years[years.length - 1] ?? null,
    selectedIndicatorId:
      indicadorOptions.find((x) => x.indicador_id === "materiales_generales")?.indicador_id ??
      indicadorOptions[0]?.indicador_id ??
      null,
    latestPeriod: latest,
  };
}

function bindControls(state) {
  const yearSelect = document.getElementById("yearSelect");
  const indicatorSelect = document.getElementById("indicatorSelect");

  yearSelect.innerHTML = state.years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  if (state.selectedYear != null) yearSelect.value = String(state.selectedYear);

  indicatorSelect.innerHTML = state.indicadorOptions
    .map(
      (item) =>
        `<option value="${escapeHtml(item.indicador_id)}">${escapeHtml(
          item.indicador_nombre
        )}</option>`
    )
    .join("");
  if (state.selectedIndicatorId) indicatorSelect.value = state.selectedIndicatorId;

  yearSelect.addEventListener("change", (event) => {
    state.selectedYear = Number(event.target.value);
    renderAll(state);
  });

  indicatorSelect.addEventListener("change", (event) => {
    state.selectedIndicatorId = event.target.value;
    renderAll(state);
  });
}

function renderAll(state) {
  renderPeriodBadge(state);
  renderKpis(state);
  renderChart(state);
  renderProgress(state);
  renderZoneTable(state);
  renderMaterialsTable(state);
  renderInstitutionalTable(state);
}

function renderPeriodBadge(state) {
  const latest = state.latestPeriod;
  const badge = document.getElementById("periodBadge");
  if (!latest) {
    badge.textContent = "Sin período";
    return;
  }
  badge.textContent = `${latest.mes || "—"} ${latest.anio || ""}`.trim();
}

function renderKpis(state) {
  const targetIds = [
    "materiales_generales",
    "pet",
    "vidrio",
    "ingreso_bruto_total",
  ];

  const latestRows = getRowsForPeriod(
    state.datasets.indicadores,
    state.latestPeriod?.anio,
    state.latestPeriod?.mes_num
  );

  const container = document.getElementById("summarySection");
  container.innerHTML = "";

  targetIds.forEach((id) => {
    const row = latestRows.find((r) => r.indicador_id === id);

    const card = document.createElement("article");
    card.className = "kpi-card";

    if (!row) {
      card.innerHTML = `
        <span class="kpi-label">${id}</span>
        <strong class="kpi-value">—</strong>
        <span class="kpi-meta">Sin datos</span>
      `;
      container.appendChild(card);
      return;
    }

    const deltaText = buildDeltaText(row.valor, row.meta_mensual, row.unidad);
    const deltaClass = buildDeltaClass(row.valor, row.meta_mensual);

    card.innerHTML = `
      <span class="kpi-label">${escapeHtml(row.indicador_nombre)}</span>
      <strong class="kpi-value">${escapeHtml(formatValue(row.valor, row.unidad))}</strong>
      <span class="kpi-meta ${deltaClass}">
        ${escapeHtml(deltaText)}
      </span>
    `;

    container.appendChild(card);
  });
}

function renderChart(state) {
  const panel = document.getElementById("chartPanel");
  const subtitle = document.getElementById("chartSubtitle");

  const rows = state.datasets.indicadores
    .filter((r) => r.indicador_id === state.selectedIndicatorId)
    .filter((r) => state.selectedYear == null || r.anio === state.selectedYear)
    .sort(sortByPeriod);

  const indicador = state.indicadorOptions.find(
    (x) => x.indicador_id === state.selectedIndicatorId
  );

  subtitle.textContent = indicador
    ? `${indicador.indicador_nombre} · ${state.selectedYear ?? "Todos los años"}`
    : "Serie mensual";

  if (!rows.length) {
    panel.innerHTML = emptyState("No hay datos para ese indicador y año.");
    return;
  }

  const labels = rows.map((r) => `${r.mes} ${r.anio}`);
  const values = rows.map((r) => safeNumber(r.valor));
  const metas = rows.map((r) => safeNumber(r.meta_mensual));

  panel.innerHTML = `
    <div class="chart-wrap">
      ${renderLineChartSvg(labels, values, metas)}
    </div>
    <div class="chart-legend">
      <span><i class="legend-dot legend-primary"></i> Valor</span>
      <span><i class="legend-dot legend-secondary"></i> Meta</span>
    </div>
  `;
}

function renderProgress(state) {
  const panel = document.getElementById("progressPanel");
  const rows = getRowsForPeriod(
    state.datasets.indicadores,
    state.latestPeriod?.anio,
    state.latestPeriod?.mes_num
  ).filter((r) => Number.isFinite(r.meta_mensual));

  if (!rows.length) {
    panel.innerHTML = emptyState("No hay metas mensuales disponibles.");
    return;
  }

  panel.innerHTML = rows
    .map((row) => {
      const ratio =
        row.meta_mensual && row.meta_mensual !== 0
          ? Math.max(0, Math.min((row.valor / row.meta_mensual) * 100, 140))
          : 0;

      return `
        <div class="progress-item">
          <div class="progress-head">
            <strong>${escapeHtml(row.indicador_nombre)}</strong>
            <span>${escapeHtml(formatValue(row.valor, row.unidad))} / ${escapeHtml(
              formatValue(row.meta_mensual, row.unidad)
            )}</span>
          </div>
          <div class="progress-bar">
            <span style="width:${ratio}%"></span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderZoneTable(state) {
  const panel = document.getElementById("zonePanel");
  const latest = state.latestPeriod;

  const rows = state.datasets.zona
    .filter((r) => r.anio === latest?.anio && r.mes_num === latest?.mes_num)
    .sort((a, b) => String(a.zona || "").localeCompare(String(b.zona || ""), "es"));

  if (!rows.length) {
    panel.innerHTML = emptyState("No hay datos por zona para el último período.");
    return;
  }

  const preferredCols = [
    "zona",
    "territorios_reportados",
    "total_materiales_qq",
    "pet_qq",
    "vidrio_total_qq",
    "ingreso_bruto_total",
  ];

  panel.innerHTML = renderTable(rows, preferredCols, {
    zona: "Zona",
    territorios_reportados: "Territorios",
    total_materiales_qq: "Materiales qq",
    pet_qq: "PET qq",
    vidrio_total_qq: "Vidrio qq",
    ingreso_bruto_total: "Ingreso bruto",
  });
}

function renderMaterialsTable(state) {
  const panel = document.getElementById("materialsPanel");
  const latest = state.latestPeriod;

  const rows = state.datasets.materiales
    .filter((r) => r.anio === latest?.anio && r.mes_num === latest?.mes_num)
    .sort((a, b) => safeNumber(b.cantidad) - safeNumber(a.cantidad));

  if (!rows.length) {
    panel.innerHTML = emptyState("No hay materiales para el último período.");
    return;
  }

  const grouped = aggregateRows(rows, ["material"], {
    cantidad: "sum",
    ingreso_total_venta: "sum",
    ingreso_cooperativa: "sum",
  }).sort((a, b) => safeNumber(b.cantidad) - safeNumber(a.cantidad));

  panel.innerHTML = renderTable(grouped, ["material", "cantidad", "ingreso_total_venta", "ingreso_cooperativa"], {
    material: "Material",
    cantidad: "Cantidad",
    ingreso_total_venta: "Ingreso venta",
    ingreso_cooperativa: "Ingreso coop.",
  });
}

function renderInstitutionalTable(state) {
  const panel = document.getElementById("tablePanel");

  const rows = state.datasets.indicadores
    .filter((r) => state.selectedYear == null || r.anio === state.selectedYear)
    .sort(sortByPeriod);

  if (!rows.length) {
    panel.innerHTML = emptyState("No hay indicadores institucionales.");
    return;
  }

  panel.innerHTML = renderTable(
    rows,
    [
      "programa_id",
      "programa_nombre",
      "anio",
      "mes_num",
      "mes",
      "nivel_agregacion",
      "territorio",
      "indicador_nombre",
      "valor",
      "meta_mensual",
      "unidad",
      "fuente",
    ],
    {
      programa_id: "Programa ID",
      programa_nombre: "Programa",
      anio: "Año",
      mes_num: "Mes #",
      mes: "Mes",
      nivel_agregacion: "Nivel",
      territorio: "Territorio",
      indicador_nombre: "Indicador",
      valor: "Valor",
      meta_mensual: "Meta",
      unidad: "Unidad",
      fuente: "Fuente",
    }
  );
}

function getRowsForPeriod(rows, anio, mes_num) {
  return rows.filter((r) => r.anio === anio && r.mes_num === mes_num);
}

function getLatestPeriod(rows) {
  const valid = rows.filter(
    (r) => Number.isFinite(r.anio) && Number.isFinite(r.mes_num)
  );
  if (!valid.length) return null;

  const last = [...valid].sort(sortByPeriod).at(-1);
  return {
    anio: last.anio,
    mes_num: last.mes_num,
    mes: last.mes,
  };
}

function sortByPeriod(a, b) {
  if (a.anio !== b.anio) return safeNumber(a.anio) - safeNumber(b.anio);
  return safeNumber(a.mes_num) - safeNumber(b.mes_num);
}

function normalizeIndicadorRow(row) {
  return {
    ...row,
    anio: toNumber(row.anio),
    mes_num: toNumber(row.mes_num),
    valor: toNumber(row.valor),
    meta_mensual: toNumber(row.meta_mensual),
  };
}

function normalizeGenericRow(row) {
  const output = { ...row };
  for (const [key, value] of Object.entries(output)) {
    if (["anio", "mes_num"].includes(key)) {
      output[key] = toNumber(value);
      continue;
    }
    if (looksNumeric(value)) {
      output[key] = toNumber(value);
    }
  }
  return output;
}

async function fetchCsv(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url}. Asegúrate de publicar los CSV dentro de docs/data/.`);
  }
  const text = await response.text();
  return parseCsv(text);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  const cleanRows = rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
  if (!cleanRows.length) return [];

  const headers = cleanRows[0].map((h) => String(h).trim());
  return cleanRows.slice(1).map((cells) => {
    const out = {};
    headers.forEach((header, index) => {
      out[header] = cells[index] ?? "";
    });
    return out;
  });
}

function aggregateRows(rows, groupKeys, aggregations) {
  const map = new Map();

  rows.forEach((row) => {
    const key = groupKeys.map((k) => String(row[k] ?? "")).join("||");
    if (!map.has(key)) {
      const base = {};
      groupKeys.forEach((k) => {
        base[k] = row[k];
      });
      Object.keys(aggregations).forEach((k) => {
        base[k] = 0;
      });
      map.set(key, base);
    }

    const target = map.get(key);
    Object.entries(aggregations).forEach(([field, op]) => {
      if (op === "sum") target[field] += safeNumber(row[field]);
    });
  });

  return [...map.values()];
}

function renderTable(rows, columns, labels = {}) {
  const header = columns
    .map((col) => `<th>${escapeHtml(labels[col] || prettifyLabel(col))}</th>`)
    .join("");

  const body = rows
    .map((row) => {
      const cells = columns
        .map((col) => `<td>${escapeHtml(formatCell(row[col], col))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
    <div class="table-wrap">
      <table class="adala-table">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderLineChartSvg(labels, values, metas) {
  const width = 900;
  const height = 320;
  const padding = 32;

  const allValues = [...values, ...metas].filter(Number.isFinite);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const x = (i) => padding + (i * (width - padding * 2)) / Math.max(labels.length - 1, 1);
  const y = (v) => height - padding - ((v - min) / range) * (height - padding * 2);

  const valuePoints = values
    .map((v, i) => (Number.isFinite(v) ? `${x(i)},${y(v)}` : null))
    .filter(Boolean)
    .join(" ");

  const metaPoints = metas
    .map((v, i) => (Number.isFinite(v) ? `${x(i)},${y(v)}` : null))
    .filter(Boolean)
    .join(" ");

  const xLabels = labels
    .map(
      (label, i) => `
        <text x="${x(i)}" y="${height - 8}" text-anchor="middle" class="axis-label">
          ${escapeHtml(shortLabel(label))}
        </text>
      `
    )
    .join("");

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = min + ((4 - i) / 4) * range;
    const yPos = padding + (i * (height - padding * 2)) / 4;
    return `
      <g>
        <line x1="${padding}" x2="${width - padding}" y1="${yPos}" y2="${yPos}" class="grid-line" />
        <text x="8" y="${yPos + 4}" class="axis-label">${escapeHtml(compactNumber(value))}</text>
      </g>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="adala-chart" role="img" aria-label="Gráfico de evolución mensual">
      ${yTicks}
      <polyline points="${metaPoints}" class="line-secondary" />
      <polyline points="${valuePoints}" class="line-primary" />
      ${xLabels}
    </svg>
  `;
}

function buildDeltaText(valor, meta, unidad) {
  if (!Number.isFinite(meta)) return "Sin meta mensual";
  const diff = valor - meta;

  if (unidad === "proporción") {
    return `${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(1)} pts vs meta`;
  }

  return `${diff >= 0 ? "+" : ""}${compactNumber(diff)} vs meta`;
}

function buildDeltaClass(valor, meta) {
  if (!Number.isFinite(meta)) return "neutral";
  return valor >= meta ? "positive" : "negative";
}

function formatCell(value, key) {
  if (value == null || value === "") return "—";

  if (typeof value === "number") {
    if (key.includes("ingreso") || key.includes("gtq")) {
      return formatCurrency(value);
    }
    if (key.startsWith("pct_")) {
      return formatPercent(value);
    }
    return formatNumber(value);
  }

  return String(value);
}

function formatValue(value, unidad = "") {
  if (!Number.isFinite(value)) return "—";
  if (unidad === "GTQ" || unidad === "GTQ/día") return formatCurrency(value);
  if (unidad === "proporción") return formatPercent(value);
  return `${formatNumber(value)}${unidad ? ` ${unidad}` : ""}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-GT", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function compactNumber(value) {
  return new Intl.NumberFormat("es-GT", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  return new Intl.NumberFormat("es-GT", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function shortLabel(label) {
  return label.length > 10 ? label.slice(0, 10) + "…" : label;
}

function prettifyLabel(key) {
  return String(key).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function looksNumeric(value) {
  if (value == null) return false;
  const s = String(value).trim();
  return s !== "" && !Number.isNaN(Number(s));
}

function toNumber(value) {
  if (value == null || value === "") return NaN;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderFatalError(error) {
  const root = document.getElementById("app");
  if (!root) return;

  injectStyles();
  root.innerHTML = `
    <div class="adala-shell">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>No se pudo cargar el dashboard</h2>
            <p>Revisa que los CSV publicados estén dentro de <strong>docs/data/</strong>.</p>
          </div>
        </div>
        <div class="error-box">${escapeHtml(error.message || String(error))}</div>
      </section>
    </div>
  `;
}

function injectStyles() {
  if (document.getElementById("adala-styles")) return;

  const style = document.createElement("style");
  style.id = "adala-styles";
  style.textContent = `
    :root{
      --bg:#f4f7fb;
      --surface:#ffffff;
      --text:#0f172a;
      --muted:#64748b;
      --line:#e2e8f0;
      --primary:#2563eb;
      --primary-soft:#dbeafe;
      --success:#15803d;
      --danger:#b91c1c;
      --shadow:0 12px 40px rgba(15, 23, 42, .08);
      --radius:22px;
    }

    *{box-sizing:border-box}
    body{
      margin:0;
      font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:linear-gradient(180deg,#f8fbff 0%, var(--bg) 100%);
      color:var(--text);
    }

    .adala-shell{
      max-width:1280px;
      margin:0 auto;
      padding:32px 20px 48px;
    }

    .adala-header{
      display:flex;
      justify-content:space-between;
      gap:24px;
      align-items:flex-start;
      margin-bottom:24px;
    }

    .adala-header h1{
      margin:8px 0 8px;
      font-size:2rem;
      line-height:1.1;
    }

    .adala-header p{
      margin:0;
      color:var(--muted);
      font-size:1rem;
    }

    .adala-badge{
      display:inline-flex;
      padding:8px 12px;
      border-radius:999px;
      background:var(--primary-soft);
      color:var(--primary);
      font-weight:700;
      font-size:.8rem;
      letter-spacing:.02em;
    }

    .adala-header-meta{
      display:flex;
      gap:12px;
      flex-wrap:wrap;
      justify-content:flex-end;
    }

    .meta-card{
      background:var(--surface);
      border:1px solid var(--line);
      border-radius:18px;
      padding:14px 16px;
      min-width:140px;
      box-shadow:var(--shadow);
    }

    .meta-label{
      display:block;
      font-size:.78rem;
      color:var(--muted);
      margin-bottom:6px;
    }

    .adala-toolbar{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:16px;
      margin-bottom:24px;
    }

    .filter-group{
      background:var(--surface);
      border:1px solid var(--line);
      border-radius:18px;
      padding:14px 16px;
      box-shadow:var(--shadow);
    }

    .filter-group label{
      display:block;
      font-size:.82rem;
      color:var(--muted);
      margin-bottom:8px;
      font-weight:600;
    }

    .filter-group select{
      width:100%;
      border:1px solid var(--line);
      border-radius:12px;
      padding:12px 14px;
      background:#fff;
      color:var(--text);
      font-size:.95rem;
    }

    .filter-group-wide{
      display:flex;
      flex-direction:column;
      justify-content:center;
    }

    .period-badge{
      display:inline-flex;
      align-items:center;
      min-height:46px;
      padding:10px 14px;
      border-radius:12px;
      background:#0f172a;
      color:#fff;
      font-weight:700;
      width:fit-content;
    }

    .kpi-grid{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:16px;
      margin-bottom:24px;
    }

    .kpi-card,
    .panel{
      background:var(--surface);
      border:1px solid var(--line);
      border-radius:var(--radius);
      box-shadow:var(--shadow);
    }

    .kpi-card{
      padding:18px 18px 20px;
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .kpi-label{
      color:var(--muted);
      font-size:.9rem;
      min-height:38px;
    }

    .kpi-value{
      font-size:1.6rem;
      line-height:1.1;
      letter-spacing:-.02em;
    }

    .kpi-meta{
      font-size:.88rem;
      font-weight:700;
    }

    .kpi-meta.positive{color:var(--success)}
    .kpi-meta.negative{color:var(--danger)}
    .kpi-meta.neutral{color:var(--muted)}

    .panel-grid{
      display:grid;
      grid-template-columns:1.6fr 1fr;
      gap:16px;
      margin-bottom:16px;
    }

    .panel{
      padding:18px;
      overflow:hidden;
    }

    .panel-lg{min-height:420px}

    .panel-head{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:12px;
      margin-bottom:16px;
    }

    .panel-head h2{
      margin:0 0 4px;
      font-size:1.08rem;
    }

    .panel-head p{
      margin:0;
      color:var(--muted);
      font-size:.9rem;
    }

    .chart-wrap{
      width:100%;
      overflow-x:auto;
      padding-top:8px;
    }

    .adala-chart{
      width:100%;
      min-width:720px;
      height:auto;
      display:block;
    }

    .grid-line{
      stroke:#e5edf7;
      stroke-width:1;
    }

    .axis-label{
      fill:#64748b;
      font-size:11px;
    }

    .line-primary{
      fill:none;
      stroke:#2563eb;
      stroke-width:4;
      stroke-linecap:round;
      stroke-linejoin:round;
    }

    .line-secondary{
      fill:none;
      stroke:#94a3b8;
      stroke-width:3;
      stroke-dasharray:7 6;
      stroke-linecap:round;
      stroke-linejoin:round;
    }

    .chart-legend{
      display:flex;
      gap:18px;
      flex-wrap:wrap;
      margin-top:12px;
      color:var(--muted);
      font-size:.9rem;
    }

    .legend-dot{
      display:inline-block;
      width:10px;
      height:10px;
      border-radius:999px;
      margin-right:8px;
    }

    .legend-primary{background:#2563eb}
    .legend-secondary{background:#94a3b8}

    .progress-item{
      margin-bottom:16px;
    }

    .progress-head{
      display:flex;
      justify-content:space-between;
      gap:12px;
      margin-bottom:8px;
      font-size:.92rem;
    }

    .progress-head span{
      color:var(--muted);
      text-align:right;
    }

    .progress-bar{
      height:12px;
      background:#eef2f7;
      border-radius:999px;
      overflow:hidden;
    }

    .progress-bar span{
      display:block;
      height:100%;
      border-radius:999px;
      background:linear-gradient(90deg,#2563eb 0%, #60a5fa 100%);
    }

    .table-wrap{
      overflow:auto;
      border:1px solid var(--line);
      border-radius:18px;
    }

    .adala-table{
      width:100%;
      border-collapse:collapse;
      min-width:720px;
      background:#fff;
    }

    .adala-table thead th{
      position:sticky;
      top:0;
      background:#f8fafc;
      color:#334155;
      font-size:.8rem;
      text-transform:uppercase;
      letter-spacing:.03em;
    }

    .adala-table th,
    .adala-table td{
      padding:12px 14px;
      border-bottom:1px solid var(--line);
      text-align:left;
      white-space:nowrap;
      font-size:.92rem;
    }

    .adala-table tbody tr:hover{
      background:#f8fbff;
    }

    .empty-state,
    .error-box{
      padding:18px;
      border:1px dashed #cbd5e1;
      border-radius:16px;
      color:var(--muted);
      background:#f8fafc;
    }

    .error-box{
      color:#991b1b;
      background:#fef2f2;
      border-color:#fecaca;
    }

    @media (max-width: 980px){
      .adala-header,
      .panel-grid{
        grid-template-columns:1fr;
        display:grid;
      }

      .adala-toolbar,
      .kpi-grid{
        grid-template-columns:1fr;
      }

      .adala-header-meta{
        justify-content:flex-start;
      }
    }
  `;
  document.head.appendChild(style);
}
