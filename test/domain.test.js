import assert from "node:assert/strict";
import test from "node:test";
import {
  BATCH_STATUS,
  allocateFefo,
  applySaleFefo,
  buildSeedData,
  createAlertFeed,
  getBatch,
  getBatchStatus,
  getInventorySummary,
  getSmartFefoRecommendations,
  validateBatchCompliance
} from "../src/domain.js";

test("FEFO asigna primero el lote apto con vencimiento mas cercano", () => {
  const data = buildSeedData();

  const result = allocateFefo(data, [{ productId: "prod-jamon-pierna", quantityKg: 25 }], "2026-06-05");

  assert.equal(result.isComplete, true);
  assert.equal(result.allocations[0].allocations[0].batchId, "lot-jp-260601");
  assert.equal(result.allocations[0].allocations[0].quantityKg, 19.5);
  assert.equal(result.allocations[0].allocations[1].batchId, "lot-jp-260605");
  assert.equal(result.allocations[0].allocations[1].quantityKg, 5.5);
});

test("FEFO excluye lotes vencidos y en cuarentena", () => {
  const data = buildSeedData();

  const result = allocateFefo(data, [{ productId: "prod-mortadela", quantityKg: 0.5 }], "2026-06-05");

  assert.equal(result.isComplete, false);
  assert.equal(result.shortages[0].missingKg, 0.5);
  assert.equal(result.allocations[0].allocations.length, 0);
});

test("registrar venta FEFO descuenta inventario y conserva trazabilidad de lote", () => {
  const data = buildSeedData();

  const response = applySaleFefo(
    data,
    {
      date: "2026-06-05",
      customer: "Cliente prueba",
      operator: "Caja test",
      items: [{ productId: "prod-queso-guayanes", quantityKg: 3 }]
    },
    "2026-06-05"
  );

  assert.equal(response.ok, true);
  assert.equal(getBatch(data, "lot-qg-260525").remainingKg, 3.2);
  assert.equal(data.sales[0].items[0].allocations[0].batchId, "lot-qg-260525");
});

test("lote vencido no es vendible aunque tenga existencia", () => {
  const data = buildSeedData();
  const status = getBatchStatus(getBatch(data, "lot-mo-260501"), "2026-06-05");

  assert.equal(status.code, "vencido");
  assert.equal(status.canSell, false);
});

test("resumen identifica inventario bajo minimo y kilos bloqueados", () => {
  const data = buildSeedData();
  const summary = getInventorySummary(data, "2026-06-05");

  assert.ok(summary.totalAvailableKg > 0);
  assert.ok(summary.totalBlockedKg >= 2.4);
  assert.ok(summary.lowStockProducts.some((item) => item.product.id === "prod-queso-guayanes"));
});

test("alertas incluyen caducidad, cadena de frio y cumplimiento", () => {
  const data = buildSeedData();
  const alerts = createAlertFeed(data, "2026-06-05");

  assert.ok(alerts.some((alert) => alert.title === "Prioridad FEFO por caducidad"));
  assert.ok(alerts.some((alert) => alert.title === "Desviacion de cadena de frio"));
  assert.ok(alerts.some((alert) => alert.title === "Compromiso normativo pendiente"));
});

test("radar inteligente prioriza lotes bloqueados o de caducidad cercana", () => {
  const data = buildSeedData();
  const recommendations = getSmartFefoRecommendations(data, "2026-06-05");

  assert.equal(recommendations[0].batch.status, BATCH_STATUS.QUARANTINED);
  assert.ok(recommendations.some((item) => item.batch.id === "lot-qg-260525"));
});

test("validacion documental detecta faltantes normativos del lote", () => {
  const data = buildSeedData();
  const batch = {
    id: "lot-incompleto",
    productId: "prod-jamon-pierna",
    supplierId: "sup-centro",
    lotCode: "",
    receivedAt: "2026-06-05",
    expiresAt: "",
    invoice: "",
    remainingKg: 1,
    receivingTempC: 3
  };

  const validation = validateBatchCompliance(data, batch);

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes("El lote no tiene codigo trazable."));
  assert.ok(validation.issues.includes("Falta documento fiscal o factura de compra."));
});
