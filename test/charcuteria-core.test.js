import assert from "node:assert/strict";
import test from "node:test";

import {
  allocateSaleFefo,
  buildTraceabilityReport,
  cloneSeedData,
  createSale,
  getChuruguarosRadar,
  getComplianceScore,
  getExpirationAlerts,
  getStockByProduct,
  getTemperatureIncidents,
  sortLotsFefo
} from "../src/domain/charcuteria-core.js";

test("ordena lotes por FEFO usando vencimiento y recepcion", () => {
  const lots = [
    { id: "B", receivedAt: "2026-06-02", expiresAt: "2026-06-10", quantity: 1, status: "available" },
    { id: "A", receivedAt: "2026-06-01", expiresAt: "2026-06-08", quantity: 1, status: "available" },
    { id: "C", receivedAt: "2026-05-30", expiresAt: "2026-06-08", quantity: 1, status: "available" }
  ];

  assert.deepEqual(
    sortLotsFefo(lots).map((lot) => lot.id),
    ["C", "A", "B"]
  );
});

test("asigna ventas primero al lote que caduca antes", () => {
  const data = cloneSeedData();
  const allocations = allocateSaleFefo({
    productId: "jamon-pierna",
    quantity: 11,
    lots: data.lots,
    today: "2026-06-05",
    minShelfLifeDays: 2
  });

  assert.deepEqual(allocations, [
    {
      lotId: "L-260601-JP",
      productId: "jamon-pierna",
      quantity: 9.5,
      expiresAt: "2026-06-08"
    },
    {
      lotId: "L-260604-JP",
      productId: "jamon-pierna",
      quantity: 1.5,
      expiresAt: "2026-06-18"
    }
  ]);
});

test("rechaza una venta si no cumple vida util minima disponible", () => {
  const data = cloneSeedData();

  assert.throws(
    () =>
      allocateSaleFefo({
        productId: "queso-guayanes",
        quantity: 20,
        lots: data.lots,
        today: "2026-06-05",
        minShelfLifeDays: 1
      }),
    /Stock insuficiente FEFO/
  );
});

test("createSale descuenta inventario y conserva trazabilidad por lote", () => {
  const data = cloneSeedData();
  const result = createSale({
    products: data.products,
    lots: data.lots,
    customer: "Cliente prueba",
    items: [{ productId: "jamon-pierna", quantity: 2 }],
    today: "2026-06-05"
  });

  const changedLot = result.lots.find((lot) => lot.id === "L-260601-JP");
  assert.equal(changedLot.quantity, 7.5);
  assert.equal(result.sale.items[0].lotId, "L-260601-JP");
  assert.equal(result.sale.customer, "Cliente prueba");
});

test("genera alertas de caducidad y radar anti-merma", () => {
  const data = cloneSeedData();
  const alerts = getExpirationAlerts(data.products, data.lots, "2026-06-05");
  const radar = getChuruguarosRadar(data.products, data.lots, "2026-06-05");

  assert.ok(alerts.some((alert) => alert.lotId === "L-260605-EG" && alert.status === "critical"));
  assert.ok(radar.marginAtRisk > 0);
  assert.ok(radar.bundles.length > 0);
});

test("detecta incidentes de temperatura y refleja cumplimiento parcial", () => {
  const data = cloneSeedData();
  const incidents = getTemperatureIncidents(data.temperatureLogs);
  const compliance = getComplianceScore(data, "2026-06-05");

  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].equipment, "Vitrina fria");
  assert.ok(compliance.score < 100);
});

test("calcula stock y reporte de trazabilidad de un lote vendido", () => {
  const data = cloneSeedData();
  const stock = getStockByProduct(data.products, data.lots);
  const report = buildTraceabilityReport({
    lotId: "L-260602-QG",
    lots: data.lots,
    products: data.products,
    suppliers: data.suppliers,
    sales: data.sales
  });

  assert.equal(stock.find((item) => item.id === "queso-guayanes").nextLotId, "L-260602-QG");
  assert.equal(report.affectedSales.length, 1);
  assert.equal(report.supplier.name, "Quesos Artesanales de Coro");
});
