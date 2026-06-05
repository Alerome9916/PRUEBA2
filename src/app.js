import {
  BATCH_STATUS,
  DEFAULT_TODAY,
  MOVEMENT_TYPES,
  VENEZUELA_COMPLIANCE_AREAS,
  addAudit,
  allocateFefo,
  applySaleFefo,
  buildSeedData,
  createAlertFeed,
  daysBetween,
  exportInventoryCsv,
  formatDate,
  getBatch,
  getBatchStatus,
  getColdChainBreaches,
  getInventoryByProduct,
  getInventorySummary,
  getProduct,
  getSmartFefoRecommendations,
  getSupplier,
  money,
  roundKg,
  validateBatchCompliance
} from "./domain.js";

const STORAGE_KEY = "los-churuguaros-system-v1";
const modules = [
  ["dashboard", "Panel"],
  ["inventario", "Inventario FEFO"],
  ["productos", "Productos"],
  ["lotes", "Lotes y caducidad"],
  ["compras", "Compras"],
  ["ventas", "Ventas"],
  ["proveedores", "Proveedores"],
  ["mermas", "Mermas"],
  ["frio", "Cadena de frio"],
  ["normativa", "Normativa VE"],
  ["reportes", "Reportes"],
  ["auditoria", "Auditoria"]
];

let state = loadState();
let activeModule = "dashboard";
let operationalDate = localStorage.getItem("los-churuguaros-operational-date") || DEFAULT_TODAY;

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

render();

document.addEventListener("click", (event) => {
  const navButton = event.target.closest("[data-module]");
  if (navButton) {
    activeModule = navButton.dataset.module;
    render();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const { action, id } = actionButton.dataset;
  if (action === "reset-demo") {
    state = buildSeedData();
    persist("Sistema reiniciado con datos de demostracion.");
    render();
  }
  if (action === "export-csv") {
    downloadText("inventario-los-churuguaros.csv", exportInventoryCsv(state, operationalDate));
    showToast("Reporte CSV generado.");
  }
  if (action === "export-json") {
    downloadText("respaldo-los-churuguaros.json", JSON.stringify(state, null, 2));
    showToast("Respaldo JSON generado.");
  }
  if (action === "quarantine") {
    setBatchStatus(id, BATCH_STATUS.QUARANTINED, "Lote enviado a cuarentena");
  }
  if (action === "release") {
    setBatchStatus(id, BATCH_STATUS.AVAILABLE, "Lote liberado para venta");
  }
  if (action === "copy-route") {
    navigator.clipboard?.writeText(actionButton.dataset.route || "");
    showToast("Ruta FEFO copiada para el operador.");
  }
  if (action === "preview-sale") {
    previewSale();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  event.preventDefault();

  if (form.id === "product-form") addProduct(form);
  if (form.id === "supplier-form") addSupplier(form);
  if (form.id === "batch-form") addBatch(form);
  if (form.id === "sale-form") registerSale(form);
  if (form.id === "waste-form") registerWaste(form);
  if (form.id === "temp-form") registerTemperature(form);
  if (form.id === "compliance-form") addComplianceTask(form);
});

document.addEventListener("change", (event) => {
  if (event.target.id === "operational-date") {
    operationalDate = event.target.value || DEFAULT_TODAY;
    localStorage.setItem("los-churuguaros-operational-date", operationalDate);
    render();
  }

  if (event.target.matches("[data-task-status]")) {
    const task = state.complianceTasks.find((item) => item.id === event.target.dataset.taskStatus);
    if (task) {
      task.status = event.target.value;
      addAudit(state, "Cumplimiento", "Estatus normativo actualizado", "normativa", task.title);
      persist("Tarea normativa actualizada.");
      render();
    }
  }
});

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : buildSeedData();
  } catch {
    return buildSeedData();
  }
}

function persist(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (message) showToast(message);
}

function render() {
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand__mark">LC</span>
        <div>
          <strong>${state.business.name}</strong>
          <small>Inventario FEFO + Caducidad</small>
        </div>
      </div>
      <nav class="nav">
        ${modules
          .map(
            ([id, label]) =>
              `<button class="${id === activeModule ? "active" : ""}" data-module="${id}">${label}</button>`
          )
          .join("")}
      </nav>
      <div class="sidebar-card">
        <label for="operational-date">Fecha operativa</label>
        <input id="operational-date" type="date" value="${operationalDate}" />
        <p>La caducidad y FEFO se calculan con esta fecha.</p>
      </div>
    </aside>
    <main class="content">
      ${renderHeader()}
      ${renderModule(activeModule)}
    </main>
  `;
}

function renderHeader() {
  const summary = getInventorySummary(state, operationalDate);
  const alerts = createAlertFeed(state, operationalDate);
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Sistema integral charcutero</p>
        <h1>${moduleTitle(activeModule)}</h1>
      </div>
      <div class="topbar__actions">
        <span class="pill pill--danger">${alerts.filter((alert) => alert.severity === "danger").length} criticas</span>
        <span class="pill">${summary.totalAvailableKg} kg aptos</span>
        <button class="ghost" data-action="reset-demo">Reiniciar demo</button>
      </div>
    </header>
  `;
}

function renderModule(moduleId) {
  const renderers = {
    dashboard: renderDashboard,
    inventario: renderInventory,
    productos: renderProducts,
    lotes: renderBatches,
    compras: renderPurchases,
    ventas: renderSales,
    proveedores: renderSuppliers,
    mermas: renderWaste,
    frio: renderColdChain,
    normativa: renderCompliance,
    reportes: renderReports,
    auditoria: renderAudit
  };
  return renderers[moduleId]();
}

function renderDashboard() {
  const summary = getInventorySummary(state, operationalDate);
  const alerts = createAlertFeed(state, operationalDate);
  const recommendations = getSmartFefoRecommendations(state, operationalDate).slice(0, 5);
  return `
    <section class="grid kpi-grid">
      ${kpi("Inventario apto", `${summary.totalAvailableKg} kg`, "Lotes vendibles bajo FEFO")}
      ${kpi("Bloqueado", `${summary.totalBlockedKg} kg`, "Vencido, cuarentena o retiro")}
      ${kpi("Valor al costo", `Bs ${formatMoney(summary.valuationCostBs)}`, "Solo inventario apto")}
      ${kpi("Vence en 7 dias", `${summary.expiring7DaysKg} kg`, "Debe priorizarse")}
    </section>
    <section class="two-columns">
      <article class="card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Alertas operativas</p>
            <h2>Semaforo de riesgo</h2>
          </div>
          <span class="pill">${alerts.length} eventos</span>
        </div>
        <div class="stack">
          ${alerts.length ? alerts.slice(0, 8).map(renderAlert).join("") : emptyState("Sin alertas activas.")}
        </div>
      </article>
      <article class="card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Novedad Los Churuguaros</p>
            <h2>Radar FEFO inteligente</h2>
          </div>
          <span class="pill pill--info">riesgo + ruta</span>
        </div>
        <div class="stack">
          ${recommendations.map(renderRecommendation).join("")}
        </div>
      </article>
    </section>
    <section class="card">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Vista por producto</p>
          <h2>Disponibilidad y punto minimo</h2>
        </div>
      </div>
      ${renderInventoryBars(summary.byProduct)}
    </section>
  `;
}

function renderInventory() {
  const products = getInventoryByProduct(state, operationalDate);
  const rows = products
    .map(
      (item) => `
        <tr>
          <td><strong>${item.product.name}</strong><small>${item.product.sku}</small></td>
          <td>${item.availableKg} kg</td>
          <td>${item.blockedKg} kg</td>
          <td>${item.minStockKg} kg</td>
          <td>${item.nextExpiryAt || "Sin lote"}${item.nextExpiryDays !== null ? `<small>${item.nextExpiryDays} dias</small>` : ""}</td>
          <td>Bs ${formatMoney(item.valuationRetailBs)}</td>
          <td><span class="pill ${item.availableKg < item.minStockKg ? "pill--danger" : "pill--success"}">${item.availableKg < item.minStockKg ? "Comprar" : "OK"}</span></td>
        </tr>
      `
    )
    .join("");

  return `
    <section class="card">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Inventario FEFO</p>
          <h2>Existencias por producto</h2>
        </div>
        <button data-action="export-csv">Exportar CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Producto</th><th>Apto</th><th>Bloqueado</th><th>Minimo</th><th>Proximo venc.</th><th>Valor venta</th><th>Estado</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
    <section class="card">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Cola de despacho</p>
          <h2>Lotes ordenados por FEFO</h2>
        </div>
      </div>
      ${renderBatchTable(state.batches, true)}
    </section>
  `;
}

function renderProducts() {
  return `
    <section class="two-columns two-columns--forms">
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Maestro</p><h2>Productos</h2></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>SKU</th><th>Producto</th><th>Categoria</th><th>Temp.</th><th>Precio</th><th>Registro</th></tr></thead>
            <tbody>
              ${state.products
                .map(
                  (product) => `
                    <tr>
                      <td>${product.sku}</td>
                      <td><strong>${product.name}</strong><small>${product.storage}</small></td>
                      <td>${product.category}</td>
                      <td>${product.temperatureMinC}-${product.temperatureMaxC} C</td>
                      <td>Bs ${formatMoney(product.priceBs)}</td>
                      <td>${product.sanitaryRegistry || "<span class='pill pill--danger'>pendiente</span>"}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Alta rapida</p><h2>Nuevo producto</h2></div></div>
        <form id="product-form" class="form-grid">
          ${input("sku", "SKU", "LC-CHA-099", "text", true)}
          ${input("name", "Nombre", "Salchichon artesanal", "text", true)}
          ${input("category", "Categoria", "Embutidos", "text", true)}
          ${input("shelfLifeDays", "Vida util (dias)", "30", "number", true)}
          ${input("minStockKg", "Stock minimo kg", "10", "number", true)}
          ${input("costBs", "Costo Bs/kg", "80", "number", true)}
          ${input("priceBs", "Precio Bs/kg", "130", "number", true)}
          ${input("temperatureMinC", "Temp. min C", "0", "number", true)}
          ${input("temperatureMaxC", "Temp. max C", "5", "number", true)}
          ${input("sanitaryRegistry", "Registro sanitario/ficha", "RS-MPPS-...", "text", false)}
          <button class="full">Guardar producto</button>
        </form>
      </article>
    </section>
  `;
}

function renderBatches() {
  return `
    <section class="two-columns two-columns--forms">
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Caducidad</p><h2>Lotes activos y bloqueados</h2></div></div>
        ${renderBatchTable(state.batches)}
      </article>
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Recepcion</p><h2>Nuevo lote</h2></div></div>
        ${batchForm()}
      </article>
    </section>
  `;
}

function renderPurchases() {
  return `
    <section class="card">
      <div class="section-heading">
        <div><p class="eyebrow">Compras</p><h2>Recepciones con checklist sanitario/fiscal</h2></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Proveedor</th><th>Factura</th><th>Total</th><th>Checklist</th><th>Recibido por</th></tr></thead>
          <tbody>
            ${state.purchases
              .map((purchase) => {
                const supplier = getSupplier(state, purchase.supplierId);
                const checklist = purchase.checklist || {};
                const ok = Object.values(checklist).every(Boolean);
                return `
                  <tr>
                    <td>${purchase.date}</td>
                    <td>${supplier?.name || purchase.supplierId}</td>
                    <td>${purchase.invoice}</td>
                    <td>Bs ${formatMoney(purchase.totalBs)}</td>
                    <td><span class="pill ${ok ? "pill--success" : "pill--danger"}">${ok ? "Completo" : "Revisar"}</span></td>
                    <td>${purchase.receivedBy}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="card">
      <p>Para registrar una compra nueva use el modulo <strong>Lotes y caducidad</strong>; cada recepcion crea lote, compra, trazabilidad y auditoria.</p>
    </section>
  `;
}

function renderSales() {
  return `
    <section class="two-columns two-columns--forms">
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Despacho</p><h2>Venta con asignacion FEFO</h2></div></div>
        <form id="sale-form" class="form-grid">
          ${input("customer", "Cliente", "Venta mostrador", "text", true)}
          ${input("operator", "Operador", "Caja 1", "text", true)}
          <label>Producto
            <select name="productId" required>${productOptions()}</select>
          </label>
          ${input("quantityKg", "Cantidad kg", "1.5", "number", true, "0.001")}
          <button type="button" class="secondary" data-action="preview-sale">Previsualizar FEFO</button>
          <button>Registrar venta</button>
        </form>
        <div id="sale-preview" class="preview"></div>
      </article>
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Ventas recientes</p><h2>Trazabilidad de salida</h2></div></div>
        <div class="stack">
          ${state.sales
            .slice(0, 8)
            .map(
              (sale) => `
                <div class="timeline-item">
                  <strong>${sale.date} - ${sale.customer}</strong>
                  <p>Bs ${formatMoney(sale.totalBs)} · ${sale.operator}</p>
                  <small>${sale.items
                    .flatMap((item) => item.allocations.map((allocation) => `${allocation.lotCode || allocation.batchId}: ${allocation.quantityKg} kg`))
                    .join(" | ")}</small>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderSuppliers() {
  return `
    <section class="two-columns two-columns--forms">
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Proveedores</p><h2>Control documental</h2></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Proveedor</th><th>RIF</th><th>Permiso</th><th>Telefono</th><th>Lead time</th><th>Score</th></tr></thead>
            <tbody>
              ${state.suppliers
                .map(
                  (supplier) => `
                    <tr>
                      <td><strong>${supplier.name}</strong></td>
                      <td>${supplier.rif}</td>
                      <td>${supplier.sanitaryPermit || "<span class='pill pill--danger'>pendiente</span>"}</td>
                      <td>${supplier.phone}</td>
                      <td>${supplier.leadTimeDays} dias</td>
                      <td><span class="pill ${supplier.score >= 90 ? "pill--success" : "pill--info"}">${supplier.score}/100</span></td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Alta rapida</p><h2>Nuevo proveedor</h2></div></div>
        <form id="supplier-form" class="form-grid">
          ${input("name", "Nombre", "Proveedor local", "text", true)}
          ${input("rif", "RIF", "J-00000000-0", "text", true)}
          ${input("phone", "Telefono", "0412-0000000", "text", true)}
          ${input("sanitaryPermit", "Permiso sanitario", "PS-...", "text", false)}
          ${input("leadTimeDays", "Lead time dias", "2", "number", true)}
          ${input("score", "Score", "90", "number", true)}
          <button class="full">Guardar proveedor</button>
        </form>
      </article>
    </section>
  `;
}

function renderWaste() {
  const selectableBatches = state.batches.filter((batch) => Number(batch.remainingKg) > 0);
  return `
    <section class="two-columns two-columns--forms">
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Merma y decomiso</p><h2>Registro controlado</h2></div></div>
        <form id="waste-form" class="form-grid">
          <label>Lote
            <select name="batchId" required>
              ${selectableBatches
                .map((batch) => {
                  const product = getProduct(state, batch.productId);
                  return `<option value="${batch.id}">${product?.name} · ${batch.lotCode} · ${batch.remainingKg} kg</option>`;
                })
                .join("")}
            </select>
          </label>
          ${input("quantityKg", "Cantidad kg", "0.5", "number", true, "0.001")}
          ${input("reason", "Motivo", "Vencimiento / merma por corte", "text", true)}
          ${input("disposition", "Disposicion", "Separado para decomiso interno", "text", true)}
          ${input("authorizedBy", "Autorizado por", "Responsable de calidad", "text", true)}
          <button class="full">Registrar merma</button>
        </form>
      </article>
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Historial</p><h2>Ultimos eventos</h2></div></div>
        <div class="stack">
          ${state.waste
            .map((item) => {
              const product = getProduct(state, item.productId);
              return `<div class="timeline-item"><strong>${item.date} · ${product?.name || item.productId}</strong><p>${item.quantityKg} kg · ${item.reason}</p><small>${item.disposition} · ${item.authorizedBy}</small></div>`;
            })
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderColdChain() {
  const breaches = getColdChainBreaches(state);
  return `
    <section class="two-columns two-columns--forms">
      <article class="card">
        <div class="section-heading">
          <div><p class="eyebrow">Cadena de frio</p><h2>Bitacora de temperatura</h2></div>
          <span class="pill ${breaches.length ? "pill--danger" : "pill--success"}">${breaches.length} desviaciones</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Fecha/hora</th><th>Equipo</th><th>Temp.</th><th>Humedad</th><th>Responsable</th><th>Notas</th></tr></thead>
            <tbody>
              ${state.coldChainLogs
                .map(
                  (log) => `
                    <tr>
                      <td>${log.dateTime.replace("T", " ")}</td>
                      <td>${log.equipment}</td>
                      <td>${log.temperatureC} C</td>
                      <td>${log.humidityPct}%</td>
                      <td>${log.recordedBy}</td>
                      <td>${log.notes}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Nuevo registro</p><h2>Control por turno</h2></div></div>
        <form id="temp-form" class="form-grid">
          ${input("equipment", "Equipo", "Nevera 1", "text", true)}
          ${input("temperatureC", "Temperatura C", "3.5", "number", true, "0.1")}
          ${input("humidityPct", "Humedad %", "70", "number", true, "0.1")}
          ${input("recordedBy", "Registrado por", "Turno tarde", "text", true)}
          ${input("notes", "Notas / accion correctiva", "Normal", "text", true)}
          <button class="full">Guardar temperatura</button>
        </form>
      </article>
    </section>
  `;
}

function renderCompliance() {
  return `
    <section class="two-columns">
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Venezuela</p><h2>Matriz sanitaria, fiscal y de rotulado</h2></div></div>
        <div class="accordion-list">
          ${VENEZUELA_COMPLIANCE_AREAS.map(
            (area) => `
              <details open>
                <summary>${area.name}</summary>
                <ul>${area.items.map((item) => `<li>${item}</li>`).join("")}</ul>
              </details>
            `
          ).join("")}
        </div>
        <p class="note">La matriz ayuda a operar con controles exigibles en Venezuela; la validacion legal final debe mantenerse con asesoria sanitaria/fiscal vigente.</p>
      </article>
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Plan de accion</p><h2>Vencimientos documentales</h2></div></div>
        <div class="stack">
          ${state.complianceTasks
            .map(
              (task) => `
                <div class="timeline-item">
                  <strong>${task.title}</strong>
                  <p>${task.owner} · vence ${task.dueDate} · evidencia: ${task.evidence}</p>
                  <select data-task-status="${task.id}">
                    ${["pendiente", "en_progreso", "completado"].map((status) => `<option value="${status}" ${task.status === status ? "selected" : ""}>${status}</option>`).join("")}
                  </select>
                </div>
              `
            )
            .join("")}
        </div>
        <hr />
        <form id="compliance-form" class="form-grid">
          ${input("title", "Nueva tarea", "Actualizar carnet de manipulacion", "text", true)}
          ${input("owner", "Responsable", "Gerencia", "text", true)}
          ${input("dueDate", "Vence", operationalDate, "date", true)}
          ${input("evidence", "Evidencia", "Carpeta de cumplimiento", "text", true)}
          <label>Area
            <select name="area">${VENEZUELA_COMPLIANCE_AREAS.map((area) => `<option value="${area.id}">${area.name}</option>`).join("")}</select>
          </label>
          <button class="full">Agregar tarea</button>
        </form>
      </article>
    </section>
  `;
}

function renderReports() {
  const summary = getInventorySummary(state, operationalDate);
  const complianceIssues = state.batches.flatMap((batch) => validateBatchCompliance(state, batch).issues);
  return `
    <section class="grid kpi-grid">
      ${kpi("Valor venta", `Bs ${formatMoney(summary.valuationRetailBs)}`, "Inventario apto")}
      ${kpi("Margen potencial", `Bs ${formatMoney(summary.valuationRetailBs - summary.valuationCostBs)}`, "Venta - costo")}
      ${kpi("Kg vencidos", `${summary.expiredKg} kg`, "No vendibles")}
      ${kpi("Hallazgos", complianceIssues.length, "Documentos/lotes por revisar")}
    </section>
    <section class="two-columns">
      <article class="card">
        <div class="section-heading">
          <div><p class="eyebrow">Exportacion</p><h2>Reportes gerenciales</h2></div>
        </div>
        <div class="button-row">
          <button data-action="export-csv">Inventario CSV</button>
          <button class="secondary" data-action="export-json">Respaldo JSON</button>
        </div>
        <p>El CSV incluye lote, proveedor, fecha de recepcion, vencimiento, dias restantes, estado FEFO y costo.</p>
      </article>
      <article class="card">
        <div class="section-heading"><div><p class="eyebrow">Cumplimiento</p><h2>Hallazgos automaticos</h2></div></div>
        <div class="stack">
          ${state.batches
            .map((batch) => {
              const validation = validateBatchCompliance(state, batch);
              if (validation.ok) return "";
              const product = getProduct(state, batch.productId);
              return `<div class="alert alert--warning"><strong>${product?.name} · ${batch.lotCode}</strong><p>${validation.issues.join(" ")}</p></div>`;
            })
            .join("") || emptyState("Sin hallazgos documentales.")}
        </div>
      </article>
    </section>
  `;
}

function renderAudit() {
  return `
    <section class="card">
      <div class="section-heading"><div><p class="eyebrow">Auditoria</p><h2>Bitacora inalterable local</h2></div></div>
      <div class="stack">
        ${state.audits
          .map(
            (item) => `
              <div class="timeline-item">
                <strong>${new Date(item.dateTime).toLocaleString("es-VE")} · ${item.action}</strong>
                <p>${item.actor} · ${item.entity}</p>
                <small>${item.details}</small>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderBatchTable(batches, fefoOnly = false) {
  const rows = [...batches]
    .sort((a, b) => {
      const statusA = getBatchStatus(a, operationalDate);
      const statusB = getBatchStatus(b, operationalDate);
      if (fefoOnly && statusA.canSell !== statusB.canSell) return statusA.canSell ? -1 : 1;
      return new Date(a.expiresAt) - new Date(b.expiresAt);
    })
    .map((batch) => {
      const product = getProduct(state, batch.productId);
      const supplier = getSupplier(state, batch.supplierId);
      const health = getBatchStatus(batch, operationalDate);
      return `
        <tr>
          <td><strong>${batch.lotCode}</strong><small>${batch.location}</small></td>
          <td>${product?.name || batch.productId}<small>${supplier?.name || ""}</small></td>
          <td>${batch.receivedAt}</td>
          <td>${batch.expiresAt}<small>${health.daysToExpire} dias</small></td>
          <td>${batch.remainingKg} / ${batch.initialKg} kg</td>
          <td><span class="pill pill--${health.severity}">${health.label}</span></td>
          <td class="table-actions">
            ${
              batch.status === BATCH_STATUS.QUARANTINED
                ? `<button class="secondary" data-action="release" data-id="${batch.id}">Liberar</button>`
                : `<button class="ghost" data-action="quarantine" data-id="${batch.id}">Cuarentena</button>`
            }
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Lote</th><th>Producto</th><th>Recepcion</th><th>Vence</th><th>Kg</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderInventoryBars(items) {
  return `
    <div class="bars">
      ${items
        .map((item) => {
          const pct = Math.min(100, Math.round((item.availableKg / Math.max(item.minStockKg, 1)) * 100));
          return `
            <div class="bar-row">
              <div><strong>${item.product.name}</strong><small>${item.availableKg} kg aptos · minimo ${item.minStockKg} kg</small></div>
              <div class="bar"><span style="width:${pct}%"></span></div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderAlert(alert) {
  return `<div class="alert alert--${alert.severity}"><strong>${alert.title}</strong><p>${alert.message}</p><small>${alert.action}</small></div>`;
}

function renderRecommendation(item) {
  return `
    <div class="recommendation">
      <div class="risk" style="--score:${item.riskScore}%">${item.riskScore}</div>
      <div>
        <strong>${item.product?.name || item.batch.productId} · ${item.batch.lotCode}</strong>
        <p>${item.recommendation}</p>
        <small>${item.pickRoute} · Valor riesgo Bs ${formatMoney(item.valueAtRisk)}</small>
      </div>
      <button class="ghost" data-action="copy-route" data-route="${escapeAttr(item.voicePrompt)}">Copiar voz</button>
    </div>
  `;
}

function batchForm() {
  return `
    <form id="batch-form" class="form-grid">
      <label>Producto <select name="productId" required>${productOptions()}</select></label>
      <label>Proveedor <select name="supplierId" required>${supplierOptions()}</select></label>
      ${input("lotCode", "Codigo de lote", "LOTE-260605", "text", true)}
      ${input("receivedAt", "Fecha recepcion", operationalDate, "date", true)}
      ${input("manufacturedAt", "Fecha elaboracion", operationalDate, "date", true)}
      ${input("expiresAt", "Fecha vencimiento", operationalDate, "date", true)}
      ${input("initialKg", "Cantidad kg", "10", "number", true, "0.001")}
      ${input("costBs", "Costo Bs/kg", "100", "number", true, "0.01")}
      ${input("invoice", "Factura SENIAT", "FAC-000000", "text", true)}
      ${input("location", "Ubicacion", "Nevera 1 / Bandeja C", "text", true)}
      ${input("receivingTempC", "Temp. recepcion C", "3", "number", true, "0.1")}
      ${input("notes", "Notas", "Empaque integro", "text", false)}
      <button class="full">Registrar lote y compra</button>
    </form>
  `;
}

function addProduct(form) {
  const data = formData(form);
  state.products.push({
    id: `prod-${slug(data.name)}-${Date.now()}`,
    sku: data.sku,
    name: data.name,
    category: data.category,
    unit: "kg",
    shelfLifeDays: Number(data.shelfLifeDays),
    minStockKg: Number(data.minStockKg),
    costBs: Number(data.costBs),
    priceBs: Number(data.priceBs),
    temperatureMinC: Number(data.temperatureMinC),
    temperatureMaxC: Number(data.temperatureMaxC),
    sanitaryRegistry: data.sanitaryRegistry,
    storage: `Refrigerado entre ${data.temperatureMinC} C y ${data.temperatureMaxC} C`
  });
  addAudit(state, "Maestro", "Producto creado", "producto", data.name);
  persist("Producto agregado.");
  render();
}

function addSupplier(form) {
  const data = formData(form);
  state.suppliers.push({
    id: `sup-${slug(data.name)}-${Date.now()}`,
    name: data.name,
    rif: data.rif,
    phone: data.phone,
    sanitaryPermit: data.sanitaryPermit,
    leadTimeDays: Number(data.leadTimeDays),
    score: Number(data.score)
  });
  addAudit(state, "Maestro", "Proveedor creado", "proveedor", data.name);
  persist("Proveedor agregado.");
  render();
}

function addBatch(form) {
  const data = formData(form);
  const product = getProduct(state, data.productId);
  const supplier = getSupplier(state, data.supplierId);
  const quantityKg = Number(data.initialKg);
  const costBs = Number(data.costBs);
  const batch = {
    id: `lot-${slug(data.lotCode)}-${Date.now()}`,
    productId: data.productId,
    supplierId: data.supplierId,
    lotCode: data.lotCode,
    receivedAt: data.receivedAt,
    manufacturedAt: data.manufacturedAt,
    expiresAt: data.expiresAt,
    initialKg: quantityKg,
    remainingKg: quantityKg,
    costBs,
    invoice: data.invoice,
    status: BATCH_STATUS.AVAILABLE,
    location: data.location,
    receivingTempC: Number(data.receivingTempC),
    notes: data.notes
  };
  state.batches.unshift(batch);
  state.purchases.unshift({
    id: `pur-${Date.now()}`,
    date: data.receivedAt,
    supplierId: data.supplierId,
    invoice: data.invoice,
    totalBs: money(quantityKg * costBs),
    receivedBy: "Recepcion",
    checklist: {
      coldChainOk: Number(data.receivingTempC) <= Number(product?.temperatureMaxC ?? 5),
      labelOk: Boolean(data.lotCode && data.expiresAt),
      invoiceOk: Boolean(data.invoice),
      sensoryOk: true
    }
  });
  addAudit(state, "Recepcion", "Lote recibido", MOVEMENT_TYPES.PURCHASE, `${product?.name} de ${supplier?.name}.`);
  persist("Lote y compra registrados.");
  render();
}

function registerSale(form) {
  const data = formData(form);
  const response = applySaleFefo(
    state,
    {
      date: operationalDate,
      customer: data.customer,
      operator: data.operator,
      items: [{ productId: data.productId, quantityKg: Number(data.quantityKg) }]
    },
    operationalDate
  );
  if (!response.ok) {
    showToast(response.message, true);
    previewSale();
    return;
  }
  persist("Venta registrada con FEFO.");
  render();
}

function registerWaste(form) {
  const data = formData(form);
  const batch = getBatch(state, data.batchId);
  const quantityKg = Number(data.quantityKg);
  if (!batch || quantityKg <= 0 || quantityKg > Number(batch.remainingKg)) {
    showToast("Cantidad de merma invalida para el lote.", true);
    return;
  }
  batch.remainingKg = roundKg(Number(batch.remainingKg) - quantityKg);
  if (batch.remainingKg <= 0) batch.status = BATCH_STATUS.DEPLETED;
  state.waste.unshift({
    id: `waste-${Date.now()}`,
    date: operationalDate,
    batchId: batch.id,
    productId: batch.productId,
    quantityKg,
    reason: data.reason,
    disposition: data.disposition,
    authorizedBy: data.authorizedBy
  });
  addAudit(state, data.authorizedBy, "Merma registrada", MOVEMENT_TYPES.WASTE, `${batch.lotCode}: ${quantityKg} kg.`);
  persist("Merma registrada y stock descontado.");
  render();
}

function registerTemperature(form) {
  const data = formData(form);
  state.coldChainLogs.unshift({
    id: `temp-${Date.now()}`,
    dateTime: new Date().toISOString().slice(0, 16),
    equipment: data.equipment,
    temperatureC: Number(data.temperatureC),
    humidityPct: Number(data.humidityPct),
    recordedBy: data.recordedBy,
    notes: data.notes
  });
  addAudit(state, data.recordedBy, "Temperatura registrada", "cadena_frio", `${data.equipment}: ${data.temperatureC} C.`);
  persist("Temperatura registrada.");
  render();
}

function addComplianceTask(form) {
  const data = formData(form);
  state.complianceTasks.unshift({
    id: `comp-${Date.now()}`,
    area: data.area,
    title: data.title,
    dueDate: data.dueDate,
    owner: data.owner,
    status: "pendiente",
    evidence: data.evidence
  });
  addAudit(state, data.owner, "Tarea normativa creada", "normativa", data.title);
  persist("Tarea normativa agregada.");
  render();
}

function setBatchStatus(batchId, status, auditAction) {
  const batch = getBatch(state, batchId);
  if (!batch) return;
  batch.status = status;
  addAudit(state, "Calidad", auditAction, MOVEMENT_TYPES.QUARANTINE, `${batch.lotCode} -> ${status}.`);
  persist(auditAction);
  render();
}

function previewSale() {
  const form = document.querySelector("#sale-form");
  const target = document.querySelector("#sale-preview");
  if (!form || !target) return;
  const data = formData(form);
  const preview = allocateFefo(state, [{ productId: data.productId, quantityKg: Number(data.quantityKg) }], operationalDate);
  target.innerHTML = `
    <h3>Previsualizacion FEFO</h3>
    ${
      preview.allocations[0]?.allocations
        .map(
          (allocation) => `
            <div class="allocation">
              <strong>${allocation.lotCode}</strong>
              <span>${allocation.quantityKg} kg</span>
              <small>Vence ${allocation.expiresAt} · ${allocation.location}</small>
            </div>
          `
        )
        .join("") || emptyState("No hay lotes aptos.")
    }
    ${
      preview.shortages.length
        ? `<div class="alert alert--danger"><strong>Faltante</strong><p>${preview.shortages.map((item) => `${item.productName}: ${item.missingKg} kg`).join(", ")}</p></div>`
        : `<div class="alert alert--success"><strong>Despacho completo</strong><p>Total estimado Bs ${formatMoney(preview.totalBs)}</p></div>`
    }
  `;
}

function moduleTitle(id) {
  return modules.find(([moduleId]) => moduleId === id)?.[1] || "Sistema";
}

function input(name, label, placeholder, type = "text", required = false, step = "1") {
  return `
    <label>${label}
      <input name="${name}" type="${type}" placeholder="${placeholder}" ${type === "date" ? `value="${placeholder}"` : ""} ${type === "number" ? `step="${step}"` : ""} ${required ? "required" : ""} />
    </label>
  `;
}

function productOptions() {
  return state.products.map((product) => `<option value="${product.id}">${product.name}</option>`).join("");
}

function supplierOptions() {
  return state.suppliers.map((supplier) => `<option value="${supplier.id}">${supplier.name}</option>`).join("");
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatMoney(value) {
  return money(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function kpi(title, value, caption) {
  return `<article class="kpi"><span>${title}</span><strong>${value}</strong><small>${caption}</small></article>`;
}

function emptyState(message) {
  return `<div class="empty">${message}</div>`;
}

function escapeAttr(value) {
  return String(value).replaceAll('"', "&quot;");
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = `toast toast--visible ${isError ? "toast--error" : ""}`;
  setTimeout(() => {
    toast.className = "toast";
  }, 2600);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
