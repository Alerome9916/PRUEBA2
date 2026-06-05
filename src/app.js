import { buildDashboard, buildReportRows, buildTraceability, buildZoneStatus, rowsToCsv } from "./domain/analytics.js";
import { buildComplianceReport, assessOutageImpact } from "./domain/compliance.js";
import { buildExpiryAlerts, buildLotSnapshot, recommendDispatch } from "./domain/fefo.js";
import { toInputDateTime } from "./lib/date.js";
import { addCleaningTask, addLot, addOutage, addTempLog, loadState, resetState, saveState } from "./state/store.js";
import {
  renderAlerts,
  renderCompliance,
  renderDispatchPlan,
  renderInventoryTable,
  renderMetricCards,
  renderNoveltyList,
  renderOutages,
  renderReportsSummary,
  renderTraceability,
  renderZoneCards
} from "./ui/templates.js";

let state = loadState();
let inventoryFilter = "all";
let lastDispatchPlan = null;

const refs = {
  metrics: document.querySelector('[data-render="metrics"]'),
  novelty: document.querySelector('[data-render="novelty"]'),
  zones: document.querySelector('[data-render="zones"]'),
  inventory: document.querySelector('[data-render="inventory"]'),
  dispatch: document.querySelector('[data-render="dispatch"]'),
  alerts: document.querySelector('[data-render="alerts"]'),
  compliance: document.querySelector('[data-render="compliance"]'),
  outages: document.querySelector('[data-render="outages"]'),
  traceability: document.querySelector('[data-render="traceability"]'),
  reports: document.querySelector('[data-render="reports"]'),
  inventoryFilter: document.getElementById("inventory-filter"),
  dispatchProduct: document.getElementById("dispatch-product")
};

hydrateSelects();
setFormDefaults();
bindEvents();
renderAll();

function renderAll() {
  const dashboard = buildDashboard(state);
  const zones = buildZoneStatus(state);
  const snapshot = buildLotSnapshot(state);
  const alerts = buildExpiryAlerts(state);
  const compliance = buildComplianceReport(state);
  const outages = assessOutageImpact(state);
  const traceability = buildTraceability(state);

  refs.metrics.innerHTML = renderMetricCards(dashboard.metrics);
  refs.novelty.innerHTML = renderNoveltyList(dashboard.novelty);
  refs.zones.innerHTML = renderZoneCards(zones);
  refs.inventory.innerHTML = renderInventoryTable(
    inventoryFilter === "all" ? snapshot : snapshot.filter((lot) => lot.productId === inventoryFilter)
  );
  refs.dispatch.innerHTML = renderDispatchPlan(lastDispatchPlan);
  refs.alerts.innerHTML = renderAlerts(alerts);
  refs.compliance.innerHTML = renderCompliance(compliance);
  refs.outages.innerHTML = renderOutages(outages);
  refs.traceability.innerHTML = renderTraceability(traceability);
  refs.reports.innerHTML = renderReportsSummary(dashboard.reports);
}

function bindEvents() {
  document.getElementById("lot-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state = addLot(state, {
      productId: data.get("productId"),
      supplierId: data.get("supplierId"),
      zone: data.get("zone"),
      quantityKg: Number(data.get("quantityKg")),
      reservedKg: Number(data.get("reservedKg") || 0),
      receivedAt: data.get("receivedAt"),
      expiryAt: data.get("expiryAt"),
      openedAt: data.get("openedAt") || null,
      sanitaryPermit: data.get("sanitaryPermit") === "on",
      labelCheck: data.get("labelCheck") === "on",
      costPerKg: 8.2
    });
    persistAndRefresh();
    event.currentTarget.reset();
    setFormDefaults();
  });

  document.getElementById("temperature-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state = addTempLog(state, {
      zone: data.get("zone"),
      temperatureC: Number(data.get("temperatureC")),
      humidity: Number(data.get("humidity") || 0),
      recordedAt: data.get("recordedAt")
    });
    persistAndRefresh();
    event.currentTarget.reset();
    setFormDefaults();
  });

  document.getElementById("cleaning-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state = addCleaningTask(state, {
      zone: data.get("zone"),
      task: data.get("task"),
      owner: data.get("owner"),
      dueAt: data.get("dueAt")
    });
    persistAndRefresh();
    event.currentTarget.reset();
    setFormDefaults();
  });

  document.getElementById("outage-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state = addOutage(state, {
      zone: data.get("zone"),
      startedAt: data.get("startedAt"),
      endedAt: data.get("endedAt"),
      maxTemperatureC: Number(data.get("maxTemperatureC")),
      note: data.get("note")
    });
    persistAndRefresh();
    event.currentTarget.reset();
    setFormDefaults();
  });

  document.getElementById("dispatch-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    lastDispatchPlan = recommendDispatch(data.get("productId"), Number(data.get("quantityKg")), state);
    refs.dispatch.innerHTML = renderDispatchPlan(lastDispatchPlan);
  });

  refs.inventoryFilter.addEventListener("change", (event) => {
    inventoryFilter = event.target.value;
    renderAll();
  });

  document.getElementById("export-inventory").addEventListener("click", () => {
    const reports = buildReportRows(state);
    downloadCsv("inventario-los-churuguaros.csv", rowsToCsv(reports.inventoryRows));
  });

  document.getElementById("export-alerts").addEventListener("click", () => {
    const reports = buildReportRows(state);
    downloadCsv("alertas-los-churuguaros.csv", rowsToCsv(reports.alertRows));
  });

  document.getElementById("reset-data").addEventListener("click", () => {
    if (!window.confirm("Esto restaurara el demo completo. Deseas continuar?")) {
      return;
    }

    state = resetState();
    lastDispatchPlan = null;
    hydrateSelects();
    setFormDefaults();
    renderAll();
  });
}

function hydrateSelects() {
  const productOptions = ['<option value="all">Todos</option>']
    .concat(state.products.map((product) => `<option value="${product.id}">${product.name}</option>`))
    .join("");
  const productOnlyOptions = state.products
    .map((product) => `<option value="${product.id}">${product.name}</option>`)
    .join("");
  const supplierOptions = state.suppliers
    .map((supplier) => `<option value="${supplier.id}">${supplier.name}</option>`)
    .join("");
  const zoneOptions = state.zones.map((zone) => `<option value="${zone.id}">${zone.name}</option>`).join("");

  refs.inventoryFilter.innerHTML = productOptions;
  refs.inventoryFilter.value = inventoryFilter;
  document.getElementById("lot-product").innerHTML = productOnlyOptions;
  document.getElementById("dispatch-product").innerHTML = productOnlyOptions;
  document.getElementById("lot-supplier").innerHTML = supplierOptions;
  document.getElementById("lot-zone").innerHTML = zoneOptions;
  document.getElementById("temp-zone").innerHTML = zoneOptions;
  document.getElementById("clean-zone").innerHTML = zoneOptions;
  document.getElementById("outage-zone").innerHTML = zoneOptions;

  if (!refs.dispatchProduct.value) {
    refs.dispatchProduct.value = state.products[0]?.id || "";
  }
}

function setFormDefaults() {
  const now = new Date();
  const receivedInput = document.querySelector('input[name="receivedAt"]');
  const expiryInput = document.querySelector('input[name="expiryAt"]');
  const tempInput = document.querySelector('input[name="recordedAt"]');
  const dueInput = document.querySelector('input[name="dueAt"]');
  const startedInput = document.querySelector('input[name="startedAt"]');
  const endedInput = document.querySelector('input[name="endedAt"]');

  if (receivedInput && !receivedInput.value) {
    receivedInput.value = now.toISOString().slice(0, 10);
  }

  if (expiryInput && !expiryInput.value) {
    const future = new Date(now);
    future.setDate(future.getDate() + 7);
    expiryInput.value = future.toISOString().slice(0, 10);
  }

  if (tempInput && !tempInput.value) {
    tempInput.value = toInputDateTime(now);
  }

  if (dueInput && !dueInput.value) {
    const due = new Date(now);
    due.setHours(due.getHours() + 4);
    dueInput.value = toInputDateTime(due);
  }

  if (startedInput && !startedInput.value) {
    const start = new Date(now);
    start.setHours(start.getHours() - 1);
    startedInput.value = toInputDateTime(start);
  }

  if (endedInput && !endedInput.value) {
    endedInput.value = toInputDateTime(now);
  }
}

function persistAndRefresh() {
  saveState(state);
  hydrateSelects();
  renderAll();
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
