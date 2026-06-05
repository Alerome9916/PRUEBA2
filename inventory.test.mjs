import test from "node:test";
import assert from "node:assert/strict";

import { defaultState } from "./data.js";
import {
  buildAlerts,
  buildFefoQueue,
  getComplianceSummary,
  groupInventoryByProduct,
  simulatePowerOutage
} from "./logic.js";

function cloneState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test("FEFO ordena por fecha de vencimiento y prioridad sanitaria", () => {
  const state = cloneState();
  const queue = buildFefoQueue(state);

  assert.equal(queue[0].lotCode, "ME-0530-D");
  assert.equal(queue[0].status, "critico");
  assert.ok(queue[0].riskScore >= queue[1].riskScore || queue[0].daysToExpire <= queue[1].daysToExpire);
});

test("inventario consolidado calcula stock por producto", () => {
  const state = cloneState();
  const inventory = groupInventoryByProduct(state);
  const jamon = inventory.find((item) => item.id === "prod-01");

  assert.ok(jamon);
  assert.equal(jamon.totalQuantity, 64);
  assert.equal(jamon.belowMinStock, false);
});

test("cumplimiento sanitario detecta brechas documentales o de etiquetado", () => {
  const state = cloneState();
  const compliance = getComplianceSummary(state);

  assert.ok(compliance.score < 100);
  assert.ok(compliance.expiringPermits.some((permit) => permit.name.includes("limpieza")));
});

test("simulador de contingencia eleva riesgo en corte electrico prolongado", () => {
  const state = cloneState();
  const result = simulatePowerOutage(state, {
    affectedAreaId: "vitrina-principal",
    minutes: 70,
    generatorActivated: false
  });

  assert.equal(result.areaName, "Vitrina principal");
  assert.ok(result.impactedLots.some((lot) => lot.riskLevel === "alto"));
});

test("alertas incluyen trazabilidad incompleta cuando falta etiqueta", () => {
  const state = cloneState();
  const alerts = buildAlerts(state);

  assert.ok(alerts.some((alert) => alert.title.includes("Etiqueta incompleta")));
});
