import { defaultState, storageAreas } from "./data.js";
import {
  buildAlerts,
  buildFefoQueue,
  formatCurrency,
  getColdChainSummary,
  getComplianceSummary,
  getDashboardMetrics,
  groupInventoryByProduct,
  lotTableToCsv,
  parseDate,
  simulatePowerOutage
} from "./logic.js";

const STORAGE_KEY = "los-churuguaros-fefo-state-v1";
const root = document.querySelector("#app");

const tabs = [
  { id: "dashboard", label: "Tablero general" },
  { id: "inventory", label: "Inventario" },
  { id: "fefo", label: "FEFO" },
  { id: "cold", label: "Cadena de frio" },
  { id: "compliance", label: "Cumplimiento" },
  { id: "suppliers", label: "Proveedores" },
  { id: "traceability", label: "Trazabilidad" }
];

let appState = loadState();
let uiState = {
  activeTab: "dashboard",
  simulatorResult: null
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return deepClone(defaultState);
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...deepClone(defaultState),
      ...parsed
    };
  } catch (error) {
    console.error("No se pudo recuperar el estado guardado.", error);
    return deepClone(defaultState);
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateInputValue(value) {
  return parseDate(value).toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const nextDate = parseDate(dateValue);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badgeForStatus(status) {
  const map = {
    estable: ["success", "Estable"],
    alerta: ["warning", "Alerta"],
    critico: ["danger", "Critico"],
    vencido: ["danger", "Vencido"],
    aprobado: ["success", "Aprobado"],
    "en-observacion": ["warning", "En observacion"],
    pendiente: ["warning", "Pendiente"],
    "en progreso": ["info", "En progreso"],
    completada: ["success", "Completada"],
    "alto cumplimiento": ["success", "Alto cumplimiento"],
    "cumplimiento vigilado": ["warning", "Cumplimiento vigilado"],
    "riesgo regulatorio": ["danger", "Riesgo regulatorio"],
    bajo: ["success", "Bajo"],
    medio: ["warning", "Medio"],
    alto: ["danger", "Alto"],
    "en-riesgo": ["danger", "En riesgo"],
    bloqueado: ["danger", "Bloqueado"]
  };

  const [variant, label] = map[status] ?? ["dark", status];
  return `<span class="badge ${variant}">${escapeHtml(label)}</span>`;
}

function downloadFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function upsertTask(task) {
  appState.tasks = [task, ...appState.tasks];
  saveState();
}

function addTraceability(action, lotId, notes) {
  appState.traceability.unshift({
    id: createId("trz"),
    lotId,
    action,
    timestamp: new Date().toISOString(),
    actor: appState.business.manager,
    notes
  });
}

function renderApp() {
  const metrics = getDashboardMetrics(appState);
  const alerts = buildAlerts(appState);
  const inventory = groupInventoryByProduct(appState);
  const fefoQueue = buildFefoQueue(appState);
  const coldChain = getColdChainSummary(appState);
  const compliance = getComplianceSummary(appState);

  root.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <small>Sistema integral FEFO</small>
          <h1>${escapeHtml(appState.business.name)}</h1>
          <p>${escapeHtml(appState.business.branch)}</p>
        </div>

        <div class="sidebar-card">
          <strong>Contexto sanitario VE</strong>
          <p class="small muted">
            Inventario por lotes, control de cadena de frio, trazabilidad y cumplimiento documental
            bajo el contexto del Reglamento General de Alimentos y Buenas Practicas.
          </p>
        </div>

        <nav class="nav">
          ${tabs
            .map(
              (tab) => `
                <button class="${uiState.activeTab === tab.id ? "active" : ""}" data-tab="${tab.id}">
                  ${escapeHtml(tab.label)}
                </button>
              `
            )
            .join("")}
        </nav>

        <div class="sidebar-card">
          <strong>Novedad operativa</strong>
          <p class="small muted">
            El simulador de contingencia electrica recalcula impacto sanitario y prioridad FEFO por
            area afectada, pensado para operaciones reales como Los Churuguaros.
          </p>
        </div>
      </aside>

      <main class="main">
        ${renderHeader(metrics)}
        ${renderCurrentTab({ metrics, alerts, inventory, fefoQueue, coldChain, compliance })}
      </main>
    </div>
  `;
}

function renderHeader(metrics) {
  return `
    <section class="header">
      <div>
        <h2>Operacion central de Los Churuguaros</h2>
        <p>
          FEFO activo, trazabilidad por lote y controles sanitarios en una sola consola.
          Fecha operativa: ${escapeHtml(appState.configuration.today)}.
        </p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" data-action="export-fefo">Exportar FEFO CSV</button>
        <button class="btn-secondary" data-action="reset-data">Restaurar datos demo</button>
        <span class="badge ${metrics.complianceScore >= 90 ? "success" : metrics.complianceScore >= 75 ? "warning" : "danger"}">
          Cumplimiento ${metrics.complianceScore}%
        </span>
      </div>
    </section>
  `;
}

function renderCurrentTab(context) {
  switch (uiState.activeTab) {
    case "inventory":
      return renderInventoryTab(context.inventory);
    case "fefo":
      return renderFefoTab(context.fefoQueue);
    case "cold":
      return renderColdChainTab(context.coldChain);
    case "compliance":
      return renderComplianceTab(context.compliance);
    case "suppliers":
      return renderSuppliersTab();
    case "traceability":
      return renderTraceabilityTab();
    case "dashboard":
    default:
      return renderDashboardTab(context.metrics, context.alerts, context.fefoQueue);
  }
}

function renderDashboardTab(metrics, alerts, fefoQueue) {
  const criticalQueue = fefoQueue.filter((lot) => lot.priorityBand !== "rutina").slice(0, 5);
  const powerEvents = appState.powerEvents.slice(0, 3);

  return `
    <section class="grid metrics">
      <article class="card metric-card">
        <h4>Valor de inventario</h4>
        <div class="metric-value">${formatCurrency(metrics.stockValue)}</div>
        <p class="muted small">Margen estimado: ${formatCurrency(metrics.estimatedGrossMargin)}</p>
      </article>
      <article class="card metric-card">
        <h4>Lotes proximos a vencer</h4>
        <div class="metric-value">${metrics.nearExpiryLots}</div>
        <p class="muted small">${metrics.expiredLots} lote(s) ya vencidos.</p>
      </article>
      <article class="card metric-card">
        <h4>Alertas activas</h4>
        <div class="metric-value">${metrics.activeAlerts}</div>
        <p class="muted small">Incluye FEFO, frio y documental.</p>
      </article>
      <article class="card metric-card">
        <h4>Areas en riesgo de frio</h4>
        <div class="metric-value">${metrics.coldChainAreasAtRisk}</div>
        <p class="muted small">${metrics.lowStockProducts} producto(s) bajo stock minimo.</p>
      </article>
    </section>

    <section class="split" style="margin-top: 18px;">
      <div class="grid">
        <article class="card">
          <div class="section-title">
            <h3>Alertas priorizadas</h3>
            ${badgeForStatus(
              alerts.length > 6 ? "alto" : alerts.length > 3 ? "medio" : "bajo"
            )}
          </div>
          <div class="list">
            ${
              alerts.length
                ? alerts
                    .slice(0, 7)
                    .map(
                      (alert) => `
                        <div class="alert ${escapeHtml(alert.severity)}">
                          <strong>${escapeHtml(alert.title)}</strong>
                          <span class="small">${escapeHtml(alert.detail)}</span>
                        </div>
                      `
                    )
                    .join("")
                : '<div class="empty">No hay alertas activas.</div>'
            }
          </div>
        </article>

        <article class="card">
          <div class="section-title">
            <h3>Cola operativa FEFO</h3>
            <span class="badge info">Prioridad diaria</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Lote</th>
                  <th>Producto</th>
                  <th>Vence</th>
                  <th>Riesgo</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                ${criticalQueue
                  .map(
                    (lot) => `
                      <tr>
                        <td>#${lot.fefoRank}</td>
                        <td>${escapeHtml(lot.lotCode)}</td>
                        <td>${escapeHtml(lot.productName)}</td>
                        <td>${lot.daysToExpire} dia(s)</td>
                        <td>${badgeForStatus(lot.status)}</td>
                        <td>
                          <button class="btn-secondary small" data-action="rescue-lot" data-lot-id="${lot.id}">
                            Crear tarea
                          </button>
                        </td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <div class="grid">
        <article class="card">
          <div class="section-title">
            <h3>Tareas activas</h3>
            <span class="badge dark">${appState.tasks.length} total</span>
          </div>
          <div class="list">
            ${appState.tasks
              .slice(0, 6)
              .map(
                (task) => `
                  <div class="list-item">
                    <div class="row between">
                      <strong>${escapeHtml(task.title)}</strong>
                      ${badgeForStatus(task.status === "en progreso" ? "en progreso" : task.status)}
                    </div>
                    <div class="row">
                      <span class="pill">${escapeHtml(task.type)}</span>
                      <span class="pill">Prioridad ${escapeHtml(task.priority)}</span>
                      <span class="pill">Vence ${escapeHtml(task.dueDate)}</span>
                    </div>
                    <div class="row" style="margin-top: 10px;">
                      <button class="btn-secondary small" data-action="advance-task" data-task-id="${task.id}">
                        Avanzar estado
                      </button>
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>

        <article class="card">
          <div class="section-title">
            <h3>Bitacora de contingencias electricas</h3>
            <span class="badge info">${appState.powerEvents.length} evento(s)</span>
          </div>
          <div class="list">
            ${powerEvents
              .map(
                (event) => `
                  <div class="list-item">
                    <strong>${escapeHtml(event.affectedAreaId)}</strong>
                    <span class="small muted">
                      ${escapeHtml(event.startedAt)} | ${event.minutes} min | Generador:
                      ${event.generatorActivated ? "si" : "no"}
                    </span>
                    <span class="small">${escapeHtml(event.notes)}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderInventoryTab(inventory) {
  const lots = buildFefoQueue(appState);

  return `
    <section class="grid two">
      <article class="card">
        <div class="section-title">
          <h3>Inventario consolidado por producto</h3>
          <span class="badge info">${inventory.length} referencias</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Cobertura</th>
                <th>Riesgo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${inventory
                .map(
                  (item) => `
                    <tr>
                      <td>
                        <strong>${escapeHtml(item.name)}</strong>
                        <div class="small muted">${escapeHtml(item.category)}</div>
                      </td>
                      <td>${item.totalQuantity} ${escapeHtml(item.unit)}</td>
                      <td>${item.estimatedCoverageDays.toFixed(1)} dias</td>
                      <td>${item.atRiskLots} lote(s) en seguimiento</td>
                      <td>
                        ${
                          item.belowMinStock
                            ? badgeForStatus("medio")
                            : item.overStock
                              ? badgeForStatus("warning")
                              : badgeForStatus("estable")
                        }
                      </td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <div class="section-title">
          <h3>Recepcion de lote</h3>
          <span class="badge dark">Trazabilidad automatica</span>
        </div>
        <form data-form="lot">
          <div class="form-grid">
            <label>
              Producto
              <select name="productId" required>
                ${appState.products
                  .map(
                    (product) => `
                      <option value="${product.id}">${escapeHtml(product.name)}</option>
                    `
                  )
                  .join("")}
              </select>
            </label>
            <label>
              Proveedor
              <select name="supplierId" required>
                ${appState.suppliers
                  .map(
                    (supplier) => `
                      <option value="${supplier.id}">${escapeHtml(supplier.name)}</option>
                    `
                  )
                  .join("")}
              </select>
            </label>
            <label>
              Codigo de lote
              <input name="lotCode" placeholder="LC-0605-X" required />
            </label>
            <label>
              Cantidad
              <input type="number" step="0.1" min="0.1" name="quantity" required />
            </label>
            <label>
              Costo unitario
              <input type="number" step="0.01" min="0" name="cost" required />
            </label>
            <label>
              Precio de venta
              <input type="number" step="0.01" min="0" name="salePrice" required />
            </label>
            <label>
              Recepcion
              <input type="date" name="receivedAt" value="${escapeHtml(appState.configuration.today)}" required />
            </label>
            <label>
              Vencimiento
              <input type="date" name="expiresAt" value="${escapeHtml(addDays(appState.configuration.today, 10))}" required />
            </label>
            <label>
              Area de almacenamiento
              <select name="storageAreaId" required>
                ${storageAreas
                  .map(
                    (area) => `
                      <option value="${area.id}">${escapeHtml(area.name)}</option>
                    `
                  )
                  .join("")}
              </select>
            </label>
            <label>
              Ultima temperatura registrada
              <input type="number" step="0.1" name="lastTempC" value="4" required />
            </label>
            <label>
              Estatus sanitario
              <select name="sanitaryStatus">
                <option value="aprobado">Aprobado</option>
                <option value="en-observacion">En observacion</option>
              </select>
            </label>
            <label>
              Etiqueta completa
              <select name="labelComplete">
                <option value="true">Si</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          <button class="btn" type="submit">Registrar lote</button>
        </form>
      </article>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="section-title">
        <h3>Detalle de lotes</h3>
        <span class="badge info">${lots.length} lote(s)</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Lote</th>
              <th>Producto</th>
              <th>Proveedor</th>
              <th>Area</th>
              <th>Cantidad</th>
              <th>Vence</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${lots
              .map(
                (lot) => `
                  <tr>
                    <td>${escapeHtml(lot.lotCode)}</td>
                    <td>${escapeHtml(lot.productName)}</td>
                    <td>${escapeHtml(lot.supplierName)}</td>
                    <td>${escapeHtml(lot.storageAreaName)}</td>
                    <td>${lot.quantity}</td>
                    <td>${escapeHtml(lot.expiresAt)} (${lot.daysToExpire} dias)</td>
                    <td>${badgeForStatus(lot.status)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderFefoTab(fefoQueue) {
  return `
    <section class="grid two">
      <article class="card">
        <div class="section-title">
          <h3>Motor FEFO de despacho</h3>
          <span class="badge dark">First Expired, First Out</span>
        </div>
        <p class="muted small">
          La cola prioriza primero la fecha de caducidad y luego el riesgo sanitario, la temperatura,
          el etiquetado y la rotacion esperada.
        </p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Lote</th>
                <th>Producto</th>
                <th>Dias</th>
                <th>Puntaje</th>
                <th>Prioridad</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              ${fefoQueue
                .map(
                  (lot) => `
                    <tr>
                      <td>#${lot.fefoRank}</td>
                      <td>${escapeHtml(lot.lotCode)}</td>
                      <td>${escapeHtml(lot.productName)}</td>
                      <td>${lot.daysToExpire}</td>
                      <td>${lot.riskScore}</td>
                      <td>${badgeForStatus(lot.priorityBand)}</td>
                      <td>
                        <button class="btn-secondary small" data-action="rescue-lot" data-lot-id="${lot.id}">
                          Activar rescate
                        </button>
                      </td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <div class="section-title">
          <h3>Rescate comercial inteligente</h3>
          <span class="badge info">Novedad del sistema</span>
        </div>
        <div class="list">
          ${fefoQueue
            .filter((lot) => lot.priorityBand !== "rutina")
            .slice(0, 4)
            .map(
              (lot) => `
                <div class="list-item ${lot.priorityBand === "prioridad-maxima" ? "risk-high" : "risk-medium"}">
                  <strong>${escapeHtml(lot.productName)} | ${escapeHtml(lot.lotCode)}</strong>
                  <span class="small muted">
                    Vence en ${lot.daysToExpire} dias, riesgo ${lot.riskScore}, cobertura ${lot.demandWindow.toFixed(1)} dias.
                  </span>
                  <span class="small">${escapeHtml(lot.recommendation)}</span>
                </div>
              `
            )
            .join("")}
        </div>
        <p class="footer-note">
          El rescate comercial propone promociones controladas, cambio de frente de venta, bloqueo
          preventivo o cuarentena segun la combinacion de FEFO y riesgo sanitario.
        </p>
      </article>
    </section>
  `;
}

function renderColdChainTab(coldChain) {
  return `
    <section class="grid two">
      <article class="card">
        <div class="section-title">
          <h3>Monitoreo de cadena de frio</h3>
          ${badgeForStatus(coldChain.activeAreasAtRisk ? "en-riesgo" : "estable")}
        </div>
        <div class="grid two">
          ${coldChain.areas
            .map(
              (area) => `
                <div class="list-item ${area.operationalStatus === "en-riesgo" ? "risk-high" : "risk-low"}">
                  <div class="row between">
                    <strong>${escapeHtml(area.name)}</strong>
                    ${badgeForStatus(area.operationalStatus)}
                  </div>
                  <div class="small muted">Objetivo ${area.targetMin}C a ${area.targetMax}C</div>
                  <div class="pill-grid" style="margin-top: 10px;">
                    <span class="pill">Ultima temp: ${area.latestTempC ?? "N/A"}C</span>
                    <span class="pill">Humedad: ${area.latestHumidity ?? "N/A"}%</span>
                    <span class="pill">Desviaciones: ${area.deviations}</span>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="card">
        <div class="section-title">
          <h3>Registrar lectura termica</h3>
          <span class="badge dark">Actualiza lotes del area</span>
        </div>
        <form data-form="temperature">
          <div class="form-grid">
            <label>
              Area
              <select name="storageAreaId" required>
                ${storageAreas
                  .map(
                    (area) => `
                      <option value="${area.id}">${escapeHtml(area.name)}</option>
                    `
                  )
                  .join("")}
              </select>
            </label>
            <label>
              Temperatura (C)
              <input name="tempC" type="number" step="0.1" required />
            </label>
            <label>
              Humedad %
              <input name="humidity" type="number" min="0" max="100" value="65" required />
            </label>
          </div>
          <button class="btn" type="submit">Registrar lectura</button>
        </form>
      </article>
    </section>

    <section class="grid two" style="margin-top: 18px;">
      <article class="card">
        <div class="section-title">
          <h3>Simulador de contingencia electrica</h3>
          <span class="badge info">Riesgo sanitario + FEFO</span>
        </div>
        <form data-form="outage">
          <div class="form-grid">
            <label>
              Area afectada
              <select name="affectedAreaId" required>
                ${storageAreas
                  .map(
                    (area) => `
                      <option value="${area.id}">${escapeHtml(area.name)}</option>
                    `
                  )
                  .join("")}
              </select>
            </label>
            <label>
              Duracion (min)
              <input type="number" name="minutes" min="1" value="45" required />
            </label>
            <label>
              Temperatura ambiente
              <input type="number" name="ambientTempC" min="18" max="40" value="29" required />
            </label>
            <label>
              Generador activado
              <select name="generatorActivated">
                <option value="false">No</option>
                <option value="true">Si</option>
              </select>
            </label>
          </div>
          <div class="row">
            <button class="btn" type="submit">Simular contingencia</button>
          </div>
        </form>
      </article>

      <article class="card">
        <div class="section-title">
          <h3>Resultado de simulacion</h3>
          <span class="badge dark">Guardado opcional</span>
        </div>
        ${renderSimulationResult()}
      </article>
    </section>
  `;
}

function renderSimulationResult() {
  if (!uiState.simulatorResult) {
    return '<div class="empty">Ejecuta una simulacion para ver lotes afectados, temperatura proyectada y acciones recomendadas.</div>';
  }

  const result = uiState.simulatorResult;
  return `
    <div class="list">
      <div class="list-item">
        <strong>${escapeHtml(result.areaName)}</strong>
        <span class="small muted">
          ${result.minutes} min | Generador: ${result.generatorActivated ? "si" : "no"} |
          Cantidad afectada: ${result.affectedQuantity}
        </span>
        <span class="small">${escapeHtml(result.summary)}</span>
      </div>
      ${result.impactedLots
        .slice(0, 6)
        .map(
          (lot) => `
            <div class="list-item ${lot.riskLevel === "alto" ? "risk-high" : lot.riskLevel === "medio" ? "risk-medium" : "risk-low"}">
              <strong>${escapeHtml(lot.productName)} | ${escapeHtml(lot.lotCode)}</strong>
              <span class="small muted">
                Temp. proyectada ${lot.predictedTemp}C | vence en ${lot.daysToExpire} dias
              </span>
              <span class="small">${escapeHtml(lot.action)}</span>
            </div>
          `
        )
        .join("")}
      <button class="btn" data-action="save-simulation">Guardar evento y crear tareas</button>
    </div>
  `;
}

function renderComplianceTab(compliance) {
  return `
    <section class="grid two">
      <article class="card">
        <div class="section-title">
          <h3>Radar de cumplimiento sanitario</h3>
          ${badgeForStatus(compliance.status)}
        </div>
        <div class="grid metrics">
          <div class="list-item">
            <strong>Puntaje total</strong>
            <div class="metric-value">${compliance.score}%</div>
          </div>
          <div class="list-item">
            <strong>Permisos por vencer</strong>
            <div class="metric-value">${compliance.expiringPermits.length}</div>
          </div>
        </div>
        <div class="list" style="margin-top: 16px;">
          ${compliance.rules
            .map(
              (rule) => `
                <div class="list-item">
                  <strong>${escapeHtml(rule.title)}</strong>
                  <span class="small muted">${escapeHtml(rule.reference)}</span>
                  <span class="small">${escapeHtml(rule.description)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>

      <article class="card">
        <div class="section-title">
          <h3>Documentos y vencimientos</h3>
          <span class="badge info">Gestion documental</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Responsable</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              ${compliance.permits
                .map(
                  (permit) => `
                    <tr>
                      <td>${escapeHtml(permit.name)}</td>
                      <td>${escapeHtml(permit.owner)}</td>
                      <td>${escapeHtml(permit.expiresAt)}</td>
                      <td>${badgeForStatus(permit.daysToExpire <= 7 ? "alto" : permit.daysToExpire <= 30 ? "medio" : "estable")}</td>
                      <td>
                        <button class="btn-secondary small" data-action="renew-permit" data-permit-id="${permit.id}">
                          Renovar +90 dias
                        </button>
                      </td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <p class="footer-note">
          Los rangos y criterios deben ajustarse a la ficha tecnica del fabricante, exigencias de la
          autoridad sanitaria competente y practicas internas auditables.
        </p>
      </article>
    </section>
  `;
}

function renderSuppliersTab() {
  const supplierCards = appState.suppliers.map((supplier) => {
    const supplierLots = appState.lots.filter((lot) => lot.supplierId === supplier.id);
    const incompleteLots = supplierLots.filter((lot) => !lot.labelComplete).length;

    return `
      <div class="list-item ${supplier.riskLevel === "alto" ? "risk-high" : supplier.riskLevel === "medio" ? "risk-medium" : "risk-low"}">
        <div class="row between">
          <strong>${escapeHtml(supplier.name)}</strong>
          ${badgeForStatus(supplier.riskLevel)}
        </div>
        <span class="small muted">
          Registro sanitario ${escapeHtml(supplier.sanitaryRegistry)} | ${escapeHtml(supplier.contact)}
        </span>
        <div class="pill-grid" style="margin-top: 10px;">
          <span class="pill">Lotes activos: ${supplierLots.length}</span>
          <span class="pill">Etiquetas incompletas: ${incompleteLots}</span>
          <span class="pill">Cadena de frio certificada: ${supplier.coldChainCertified ? "si" : "no"}</span>
        </div>
      </div>
    `;
  });

  return `
    <section class="grid two">
      <article class="card">
        <div class="section-title">
          <h3>Mapa de proveedores</h3>
          <span class="badge dark">${appState.suppliers.length} proveedor(es)</span>
        </div>
        <div class="list">${supplierCards.join("")}</div>
      </article>

      <article class="card">
        <div class="section-title">
          <h3>Checklist de recepcion</h3>
          <span class="badge info">Buenas practicas</span>
        </div>
        <div class="list">
          <div class="list-item"><strong>1. Validar temperatura de recepcion</strong><span class="small">Registrar temperatura real del lote antes de su ingreso.</span></div>
          <div class="list-item"><strong>2. Revisar rotulado en castellano</strong><span class="small">Debe incluir lote, vencimiento, conservacion y origen.</span></div>
          <div class="list-item"><strong>3. Confirmar registro/documentacion</strong><span class="small">Permiso del proveedor y soporte sanitario disponible para inspeccion.</span></div>
          <div class="list-item"><strong>4. Ubicar por FEFO desde el ingreso</strong><span class="small">El lote con menor vida util va primero en el frente de venta o despacho.</span></div>
        </div>
      </article>
    </section>
  `;
}

function renderTraceabilityTab() {
  const traceRows = appState.traceability.slice(0, 12);

  return `
    <section class="grid two">
      <article class="card">
        <div class="section-title">
          <h3>Bitacora de trazabilidad</h3>
          <span class="badge info">${appState.traceability.length} evento(s)</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Lote</th>
                <th>Accion</th>
                <th>Responsable</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              ${traceRows
                .map((entry) => {
                  const lot = appState.lots.find((item) => item.id === entry.lotId);
                  return `
                    <tr>
                      <td>${escapeHtml(entry.timestamp)}</td>
                      <td>${escapeHtml(lot?.lotCode ?? "N/A")}</td>
                      <td>${escapeHtml(entry.action)}</td>
                      <td>${escapeHtml(entry.actor)}</td>
                      <td>${escapeHtml(entry.notes)}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <div class="section-title">
          <h3>Registrar evento manual</h3>
          <span class="badge dark">Auditoria interna</span>
        </div>
        <form data-form="traceability">
          <div class="form-grid">
            <label>
              Lote
              <select name="lotId" required>
                ${appState.lots
                  .map(
                    (lot) => `
                      <option value="${lot.id}">${escapeHtml(lot.lotCode)}</option>
                    `
                  )
                  .join("")}
              </select>
            </label>
            <label>
              Tipo de evento
              <select name="action" required>
                <option value="recepcion">Recepcion</option>
                <option value="movimiento">Movimiento</option>
                <option value="inspeccion">Inspeccion</option>
                <option value="despacho">Despacho</option>
                <option value="cuarentena">Cuarentena</option>
              </select>
            </label>
            <label>
              Nota
              <textarea name="notes" placeholder="Detalle de la operacion..." required></textarea>
            </label>
          </div>
          <button class="btn" type="submit">Guardar evento</button>
        </form>
      </article>
    </section>
  `;
}

function handleClick(event) {
  const trigger = event.target.closest("[data-tab], [data-action]");
  if (!trigger) {
    return;
  }

  const { tab, action } = trigger.dataset;

  if (tab) {
    uiState.activeTab = tab;
    renderApp();
    return;
  }

  if (action === "export-fefo") {
    downloadFile("los-churuguaros-fefo.csv", lotTableToCsv(buildFefoQueue(appState)), "text/csv");
    return;
  }

  if (action === "reset-data") {
    appState = deepClone(defaultState);
    uiState.simulatorResult = null;
    saveState();
    renderApp();
    return;
  }

  if (action === "advance-task") {
    const taskId = trigger.dataset.taskId;
    appState.tasks = appState.tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }
      const nextStatus =
        task.status === "pendiente"
          ? "en progreso"
          : task.status === "en progreso"
            ? "completada"
            : "completada";
      return { ...task, status: nextStatus };
    });
    saveState();
    renderApp();
    return;
  }

  if (action === "renew-permit") {
    const permitId = trigger.dataset.permitId;
    appState.permits = appState.permits.map((permit) =>
      permit.id === permitId ? { ...permit, expiresAt: addDays(permit.expiresAt, 90) } : permit
    );
    saveState();
    renderApp();
    return;
  }

  if (action === "rescue-lot") {
    const lotId = trigger.dataset.lotId;
    const lot = buildFefoQueue(appState).find((item) => item.id === lotId);
    if (lot) {
      upsertTask({
        id: createId("task"),
        title: `Rescate comercial FEFO para ${lot.lotCode}`,
        type: "rescate",
        priority: lot.priorityBand === "prioridad-maxima" ? "alta" : "media",
        dueDate: appState.configuration.today,
        status: "pendiente"
      });
      addTraceability("movimiento", lot.id, "Tarea de rescate comercial creada desde el tablero FEFO.");
      saveState();
      renderApp();
    }
    return;
  }

  if (action === "save-simulation" && uiState.simulatorResult) {
    const result = uiState.simulatorResult;
    appState.powerEvents.unshift({
      id: createId("power"),
      startedAt: new Date().toISOString(),
      minutes: result.minutes,
      affectedAreaId: storageAreas.find((area) => area.name === result.areaName)?.id ?? "desconocida",
      generatorActivated: result.generatorActivated,
      notes: result.summary
    });

    result.impactedLots
      .filter((lot) => lot.riskLevel !== "bajo")
      .forEach((lot) => {
        upsertTask({
          id: createId("task"),
          title: `Contingencia electrica: revisar ${lot.lotCode}`,
          type: "contingencia",
          priority: lot.riskLevel === "alto" ? "alta" : "media",
          dueDate: appState.configuration.today,
          status: "pendiente"
        });
        addTraceability("inspeccion", lot.lotId, `Evento electrico guardado. ${lot.action}`);
      });

    saveState();
    renderApp();
  }
}

function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formType = form.dataset.form;
  const formData = new FormData(form);

  if (formType === "lot") {
    const newLot = {
      id: createId("lot"),
      productId: formData.get("productId"),
      supplierId: formData.get("supplierId"),
      lotCode: String(formData.get("lotCode")).trim(),
      quantity: Number(formData.get("quantity")),
      cost: Number(formData.get("cost")),
      salePrice: Number(formData.get("salePrice")),
      receivedAt: formData.get("receivedAt"),
      expiresAt: formData.get("expiresAt"),
      storageAreaId: formData.get("storageAreaId"),
      sanitaryStatus: formData.get("sanitaryStatus"),
      labelComplete: formData.get("labelComplete") === "true",
      lastTempC: Number(formData.get("lastTempC"))
    };

    appState.lots.unshift(newLot);
    addTraceability(
      "recepcion",
      newLot.id,
      `Recepcion de lote ${newLot.lotCode}. Cantidad ${newLot.quantity}.`
    );

    if (!newLot.labelComplete || newLot.sanitaryStatus === "en-observacion") {
      upsertTask({
        id: createId("task"),
        title: `Revisar aprobacion sanitaria de ${newLot.lotCode}`,
        type: "sanidad",
        priority: "alta",
        dueDate: appState.configuration.today,
        status: "pendiente"
      });
    }

    saveState();
    form.reset();
    renderApp();
    return;
  }

  if (formType === "temperature") {
    const storageAreaId = String(formData.get("storageAreaId"));
    const tempC = Number(formData.get("tempC"));
    const humidity = Number(formData.get("humidity"));
    const area = storageAreas.find((item) => item.id === storageAreaId);

    appState.temperatureLogs.unshift({
      id: createId("temp"),
      storageAreaId,
      recordedAt: new Date().toISOString(),
      tempC,
      humidity,
      status: tempC > (area?.criticalMax ?? appState.configuration.refrigerationLimit) ? "desviacion" : "ok"
    });

    appState.lots = appState.lots.map((lot) =>
      lot.storageAreaId === storageAreaId ? { ...lot, lastTempC: tempC } : lot
    );

    if (tempC > (area?.criticalMax ?? appState.configuration.refrigerationLimit)) {
      upsertTask({
        id: createId("task"),
        title: `Corregir desviacion termica en ${area?.name ?? storageAreaId}`,
        type: "cadena-frio",
        priority: "alta",
        dueDate: appState.configuration.today,
        status: "pendiente"
      });
    }

    saveState();
    form.reset();
    renderApp();
    return;
  }

  if (formType === "outage") {
    uiState.simulatorResult = simulatePowerOutage(appState, {
      affectedAreaId: String(formData.get("affectedAreaId")),
      minutes: Number(formData.get("minutes")),
      ambientTempC: Number(formData.get("ambientTempC")),
      generatorActivated: formData.get("generatorActivated") === "true"
    });
    renderApp();
    return;
  }

  if (formType === "traceability") {
    const lotId = String(formData.get("lotId"));
    const action = String(formData.get("action"));
    const notes = String(formData.get("notes")).trim();
    addTraceability(action, lotId, notes);
    saveState();
    form.reset();
    renderApp();
  }
}

root.addEventListener("click", handleClick);
root.addEventListener("submit", handleSubmit);

renderApp();
