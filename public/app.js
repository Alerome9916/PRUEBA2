import {
  BUSINESS,
  PRODUCT_CATEGORIES,
  STORAGE_ZONES,
  VENEZUELAN_COMPLIANCE,
  allocateSaleFefo,
  buildTraceabilityReport,
  cloneSeedData,
  createSale,
  daysUntilExpiration,
  formatDate,
  getChuruguarosRadar,
  getComplianceScore,
  getExpirationAlerts,
  getLotStatus,
  getLotStatusLabel,
  getStockByProduct,
  getTemperatureIncidents,
  roundMoney,
  roundQuantity,
  sortLotsFefo
} from "../src/domain/charcuteria-core.js";

const STORAGE_KEY = "los-churuguaros-fefo-state-v1";
const OPERATIONAL_DATE = formatDate(new Date());

let state = loadState();
let currentDate = OPERATIONAL_DATE;

const $ = (selector) => document.querySelector(selector);

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return cloneSeedData();

  try {
    return JSON.parse(stored);
  } catch {
    return cloneSeedData();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `${BUSINESS.currency} ${roundMoney(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 2800);
}

function productById(id) {
  return state.products.find((product) => product.id === id);
}

function supplierById(id) {
  return state.suppliers.find((supplier) => supplier.id === id);
}

function lotById(id) {
  return state.lots.find((lot) => lot.id === id);
}

function render() {
  persist();
  renderSelects();
  renderDashboard();
  renderInventory();
  renderLots();
  renderSales();
  renderReorder();
  renderAlerts();
  renderTraceability();
  renderTemperatures();
  renderSanitation();
  renderCompliance();
  renderLabels();
  renderRadar();
}

function renderSelects() {
  const productOptions = state.products
    .map((product) => `<option value="${product.id}">${escapeHtml(product.name)} (${product.unit})</option>`)
    .join("");

  $("#saleProductSelect").innerHTML = productOptions;
  $("#purchaseProductSelect").innerHTML = productOptions;
  $("#supplierSelect").innerHTML = state.suppliers
    .map((supplier) => `<option value="${supplier.id}">${escapeHtml(supplier.name)}</option>`)
    .join("");
  $("#traceLotSelect").innerHTML = sortLotsFefo(state.lots)
    .map((lot) => `<option value="${lot.id}">${lot.id} - ${escapeHtml(productById(lot.productId)?.name)}</option>`)
    .join("");

  const categoryFilter = $("#categoryFilter");
  if (categoryFilter.options.length === 0) {
    categoryFilter.innerHTML = [
      '<option value="">Todas las categorias</option>',
      ...PRODUCT_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`)
    ].join("");
  }
}

function renderDashboard() {
  const stock = getStockByProduct(state.products, state.lots);
  const alerts = getExpirationAlerts(state.products, state.lots, currentDate);
  const incidents = getTemperatureIncidents(state.temperatureLogs);
  const compliance = getComplianceScore(state, currentDate);
  const totalStock = stock.reduce((sum, item) => sum + Number(item.stock), 0);
  const stockValue = state.lots.reduce((sum, lot) => {
    const product = productById(lot.productId);
    return sum + Number(lot.quantity) * Number(product?.price ?? 0);
  }, 0);

  $("#kpiGrid").innerHTML = [
    {
      label: "Stock total",
      value: `${roundQuantity(totalStock)} kg/und`,
      note: `${state.lots.length} lotes trazables`
    },
    {
      label: "Valor en vitrina",
      value: money(stockValue),
      note: "Precio referencial de venta"
    },
    {
      label: "Alertas FEFO",
      value: alerts.length,
      note: "Vencidos, criticos o por vigilar"
    },
    {
      label: "Cumplimiento",
      value: `${compliance.score}%`,
      note: `${incidents.length} incidente(s) de temperatura`
    }
  ]
    .map(
      (kpi) => `
        <article class="mini-card">
          <span>${escapeHtml(kpi.label)}</span>
          <strong>${escapeHtml(kpi.value)}</strong>
          <small>${escapeHtml(kpi.note)}</small>
        </article>
      `
    )
    .join("");
}

function renderInventory() {
  const query = $("#inventorySearch").value.trim().toLowerCase();
  const category = $("#categoryFilter").value;
  const rows = getStockByProduct(state.products, state.lots).filter((item) => {
    const matchesQuery = [item.name, item.sku, item.category].join(" ").toLowerCase().includes(query);
    const matchesCategory = !category || item.category === category;
    return matchesQuery && matchesCategory;
  });

  $("#inventoryTable").innerHTML = rows
    .map((item) => {
      const zone = STORAGE_ZONES[item.storageZone];
      const action = item.belowReorderPoint
        ? `Comprar ${roundQuantity(item.suggestedPurchase)} ${item.unit}`
        : "Rotacion normal";
      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong><br />
            <small>${item.sku} · ${escapeHtml(zone?.label ?? item.storageZone)}</small>
          </td>
          <td>${escapeHtml(item.category)}</td>
          <td><strong>${roundQuantity(item.stock)}</strong> ${item.unit}</td>
          <td>${item.reorderPoint} ${item.unit}</td>
          <td>${item.nextExpiration ?? "Sin lote"}</td>
          <td><span class="status ${item.belowReorderPoint ? "warning" : "healthy"}">${action}</span></td>
        </tr>
      `;
    })
    .join("");
}

function renderLots() {
  $("#lotBoard").innerHTML = sortLotsFefo(state.lots)
    .map((lot) => {
      const product = productById(lot.productId);
      const supplier = supplierById(lot.supplierId);
      const status = getLotStatus(lot, currentDate);
      const days = daysUntilExpiration(lot, currentDate);
      const progress = Math.max(5, Math.min(100, 100 - Math.max(-1, days) * 8));
      return `
        <article class="lot-card">
          <div>
            <span class="status ${status}">${getLotStatusLabel(status)}</span>
            <h3>${escapeHtml(product?.name ?? lot.productId)}</h3>
            <small>${lot.id} · ${escapeHtml(supplier?.name ?? lot.supplierId)}</small>
          </div>
          <div class="progress" aria-label="Riesgo de caducidad"><span style="width:${progress}%"></span></div>
          <p><strong>${roundQuantity(lot.quantity)}</strong> ${product?.unit ?? ""} · vence ${lot.expiresAt}</p>
          <small>${escapeHtml(lot.location)} · recepcion ${lot.temperatureAtReception} C</small>
          <button class="ghost" type="button" data-block-lot="${lot.id}">
            ${lot.status === "blocked" ? "Liberar lote" : "Bloquear lote"}
          </button>
        </article>
      `;
    })
    .join("");
}

function renderSales() {
  const sales = [...state.sales].reverse().slice(0, 6);
  $("#salesList").innerHTML =
    sales
      .map((sale) => {
        const total = sale.total ?? sale.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
        return `
          <article class="stack-item">
            <strong>${sale.id}</strong> · ${escapeHtml(sale.customer)}<br />
            <small>${sale.date} · ${money(total)}</small>
            <ul>
              ${sale.items
                .map((item) => {
                  const product = productById(item.productId);
                  return `<li>${roundQuantity(item.quantity)} ${product?.unit ?? ""} ${escapeHtml(
                    product?.name ?? item.productName ?? item.productId
                  )} · lote ${item.lotId}</li>`;
                })
                .join("")}
            </ul>
          </article>
        `;
      })
      .join("") || '<p class="muted">Sin ventas registradas.</p>';
}

function renderReorder() {
  const lowStock = getStockByProduct(state.products, state.lots)
    .filter((item) => item.belowReorderPoint)
    .sort((a, b) => b.suggestedPurchase - a.suggestedPurchase);

  $("#reorderList").innerHTML =
    lowStock
      .map(
        (item) => `
          <article class="stack-item">
            <strong>${escapeHtml(item.name)}</strong><br />
            <small>Stock ${roundQuantity(item.stock)} ${item.unit}; meta ${item.targetStock} ${item.unit}</small>
            <p>Solicitar <strong>${roundQuantity(item.suggestedPurchase)} ${item.unit}</strong> para cubrir vitrina.</p>
          </article>
        `
      )
      .join("") || '<p class="muted">No hay productos bajo punto de reposicion.</p>';
}

function renderAlerts() {
  const alerts = getExpirationAlerts(state.products, state.lots, currentDate);
  $("#alertsGrid").innerHTML =
    alerts
      .map(
        (alert) => `
          <article class="alert-card">
            <span class="status ${alert.status}">${alert.statusLabel}</span>
            <h3>${escapeHtml(alert.productName)}</h3>
            <small>Lote ${alert.lotId} · ${roundQuantity(alert.quantity)} disponibles · ${alert.location}</small>
            <p>Vence: <strong>${alert.expiresAt}</strong> (${alert.days} dias)</p>
            <p>${escapeHtml(alert.action)}</p>
          </article>
        `
      )
      .join("") || '<p class="muted">No hay alertas de caducidad activas.</p>';
}

function renderTraceability(lotId = $("#traceLotSelect")?.value) {
  const targetLotId = lotId || state.lots[0]?.id;
  if (!targetLotId) return;

  const report = buildTraceabilityReport({
    lotId: targetLotId,
    lots: state.lots,
    products: state.products,
    suppliers: state.suppliers,
    sales: state.sales
  });

  $("#traceReport").innerHTML = `
    <h3>${escapeHtml(report.product?.name ?? report.lot.productId)}</h3>
    <p><strong>Lote:</strong> ${report.lot.id} · <strong>Vence:</strong> ${report.lot.expiresAt}</p>
    <p><strong>Proveedor:</strong> ${escapeHtml(report.supplier?.name ?? "No registrado")} · ${
      report.supplier?.rif ?? ""
    }</p>
    <p><strong>Ventas afectadas:</strong> ${report.affectedSales.length}</p>
    <ol>
      ${report.recallSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
    </ol>
  `;
}

function renderTemperatures() {
  const incidents = getTemperatureIncidents(state.temperatureLogs);
  $("#temperatureIncidents").innerHTML =
    incidents
      .map(
        (incident) => `
          <article class="stack-item">
            <span class="status critical">Fuera de rango</span>
            <strong>${escapeHtml(incident.equipment)}</strong><br />
            <small>${incident.measuredAt} · ${incident.valueC} C · rango ${incident.range}</small>
            <p>${escapeHtml(incident.correctiveAction || incident.message)}</p>
          </article>
        `
      )
      .join("") || '<p class="muted">Todas las lecturas estan dentro de rango.</p>';
}

function renderSanitation() {
  $("#sanitationGrid").innerHTML = state.sanitationTasks
    .map(
      (task) => `
        <article class="task-card">
          <span class="status ${task.status}">${task.status === "ok" ? "OK" : "Atencion"}</span>
          <h3>${escapeHtml(task.area)}</h3>
          <p>${escapeHtml(task.action)}</p>
          <small>${escapeHtml(task.frequency)} · ultimo: ${task.lastDoneAt}</small>
        </article>
      `
    )
    .join("");
}

function renderCompliance() {
  const compliance = getComplianceScore(state, currentDate);
  $("#complianceScore").textContent = `${compliance.score}% operativo`;
  $("#complianceGrid").innerHTML = VENEZUELAN_COMPLIANCE.map(
    (item) => `
      <article class="compliance-card">
        <span class="status ${item.severity === "critica" ? "critical" : "warning"}">${item.severity}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p><strong>${escapeHtml(item.authority)}</strong></p>
        <p>${escapeHtml(item.control)}</p>
        <small>Evidencia: ${escapeHtml(item.evidence)} · Frecuencia: ${escapeHtml(item.frequency)}</small>
      </article>
    `
  ).join("");
}

function renderLabels() {
  $("#labelGrid").innerHTML = sortLotsFefo(state.lots)
    .filter((lot) => productById(lot.productId)?.requiresLabel)
    .map((lot) => {
      const product = productById(lot.productId);
      const status = getLotStatus(lot, currentDate);
      return `
        <article class="label-card">
          <span class="status ${status}">${getLotStatusLabel(status)}</span>
          <h3>${escapeHtml(product?.name ?? lot.productId)}</h3>
          <p>
            SKU ${product?.sku ?? ""}<br />
            Lote ${lot.id}<br />
            Empaque: ${currentDate}<br />
            Vence: ${lot.expiresAt}<br />
            Peso/precio: ____ ${product?.unit ?? ""} · ${money(product?.price ?? 0)}/${product?.unit ?? ""}
          </p>
          <div class="qr" title="QR interno simulado"></div>
        </article>
      `;
    })
    .join("");
}

function renderRadar() {
  const radar = getChuruguarosRadar(state.products, state.lots, currentDate);
  $("#radarSummary").innerHTML = `
    <div class="mini-card">
      <span>Margen en riesgo</span>
      <strong>${money(radar.marginAtRisk)}</strong>
      <small>${escapeHtml(radar.insight)}</small>
    </div>
    <div class="stack">
      ${
        radar.bundles
          .map(
            (bundle) => `
              <article class="stack-item">
                <strong>${escapeHtml(bundle.name)}</strong><br />
                <small>${bundle.discountPercent}% descuento · lote ${bundle.lotId}</small>
                <p>Recuperacion esperada: ${money(bundle.expectedRecovery)}</p>
              </article>
            `
          )
          .join("") || '<p class="muted">Sin combos urgentes.</p>'
      }
    </div>
  `;
}

function handleSale(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const productId = data.get("productId");
  const quantity = Number(data.get("quantity"));
  const customer = String(data.get("customer") || "Venta mostrador");
  const product = productById(productId);

  try {
    const preview = allocateSaleFefo({
      productId,
      quantity,
      lots: state.lots,
      today: currentDate,
      minShelfLifeDays: product?.minShelfLifeForSaleDays ?? 0
    });
    const result = createSale({
      products: state.products,
      lots: state.lots,
      customer,
      items: [{ productId, quantity }],
      today: currentDate
    });
    state.lots = result.lots;
    state.sales.push(result.sale);
    render();
    toast(`Venta FEFO registrada con lotes: ${preview.map((item) => item.lotId).join(", ")}`);
  } catch (error) {
    toast(error.message);
  }
}

function handlePurchase(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const product = productById(data.get("productId"));
  const supplier = supplierById(data.get("supplierId"));
  const quantity = Number(data.get("quantity"));
  const temperatureAtReception = Number(data.get("temperatureAtReception"));
  const lotId = `L-${currentDate.replaceAll("-", "").slice(2)}-${product.sku.split("-").at(-1)}-${String(
    state.lots.length + 1
  ).padStart(2, "0")}`;

  state.lots.push({
    id: lotId,
    productId: product.id,
    supplierId: supplier.id,
    receivedAt: currentDate,
    expiresAt: String(data.get("expiresAt")),
    quantity,
    cost: Number(data.get("cost")),
    storageZone: product.storageZone,
    sanitaryPermit: supplier.sanitaryPermit,
    status: "available",
    location: STORAGE_ZONES[product.storageZone]?.label ?? "Almacen",
    temperatureAtReception
  });

  render();
  toast(`Lote ${lotId} recibido y agregado a rotacion FEFO.`);
  event.currentTarget.reset();
}

function handleTemperature(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.temperatureLogs.push({
    id: `TMP-${String(state.temperatureLogs.length + 1).padStart(3, "0")}`,
    zone: String(data.get("zone")),
    equipment: String(data.get("equipment")),
    measuredAt: new Date().toISOString(),
    valueC: Number(data.get("valueC")),
    responsible: String(data.get("responsible")),
    correctiveAction: String(data.get("correctiveAction") || "")
  });
  render();
  toast("Lectura de temperatura guardada.");
  event.currentTarget.reset();
}

function handleBlockLot(lotId) {
  const lot = lotById(lotId);
  if (!lot) return;

  lot.status = lot.status === "blocked" ? "available" : "blocked";
  render();
  toast(`Lote ${lot.id} ${lot.status === "blocked" ? "bloqueado" : "liberado"}.`);
}

function wireEvents() {
  $("#todayInput").value = currentDate;
  $("#todayInput").addEventListener("change", (event) => {
    currentDate = event.currentTarget.value || OPERATIONAL_DATE;
    render();
  });

  $("#inventorySearch").addEventListener("input", renderInventory);
  $("#categoryFilter").addEventListener("change", renderInventory);
  $("#saleForm").addEventListener("submit", handleSale);
  $("#purchaseForm").addEventListener("submit", handlePurchase);
  $("#temperatureForm").addEventListener("submit", handleTemperature);
  $("#traceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    renderTraceability(new FormData(event.currentTarget).get("lotId"));
    toast("Reporte de trazabilidad generado.");
  });
  $("#resetDataButton").addEventListener("click", () => {
    state = cloneSeedData();
    currentDate = OPERATIONAL_DATE;
    $("#todayInput").value = currentDate;
    render();
    toast("Datos demo restaurados.");
  });
  $("#printButton").addEventListener("click", () => window.print());
  $("#exportLabelsButton").addEventListener("click", () => {
    document.querySelector("#etiquetas").scrollIntoView({ behavior: "smooth" });
    toast("Etiquetas listas para imprimir.");
  });
  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("[data-block-lot]");
    if (button) handleBlockLot(button.dataset.blockLot);
  });
}

wireEvents();
render();
