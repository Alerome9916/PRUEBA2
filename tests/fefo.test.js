import test from "node:test";
import assert from "node:assert/strict";

import { seedState } from "../src/data/seed.js";
import { buildExpiryAlerts, getFefoQueue, recommendDispatch } from "../src/domain/fefo.js";
import { assessOutageImpact, evaluateLotCompliance } from "../src/domain/compliance.js";

const referenceDate = new Date("2026-06-05T10:00:00");

test("FEFO prioriza lotes con vencimiento mas cercano y despachables", () => {
  const queue = getFefoQueue("jamon-cocido", seedState, referenceDate);

  assert.equal(queue.length, 2);
  assert.equal(queue[0].id, "LCH-240601-01");
  assert.equal(queue[1].id, "LCH-240605-06");
});

test("recomendacion de despacho divide la salida entre lotes FEFO", () => {
  const plan = recommendDispatch("jamon-cocido", 35, seedState, referenceDate);

  assert.equal(plan.allocations.length, 2);
  assert.equal(plan.allocations[0].lotId, "LCH-240601-01");
  assert.equal(plan.allocations[0].assignedKg, 30);
  assert.equal(plan.allocations[1].assignedKg, 5);
  assert.equal(plan.shortageKg, 0);
});

test("cumplimiento bloquea lotes con soporte o rotulado incompleto", () => {
  const pepperoni = seedState.products.find((product) => product.id === "pepperoni");
  const lot = seedState.lots.find((entry) => entry.id === "LCH-240530-04");

  const evaluation = evaluateLotCompliance(lot, pepperoni, seedState, referenceDate);

  assert.equal(evaluation.canDispatch, false);
  assert.match(evaluation.blockers.join(" "), /sanitario/i);
});

test("contingencia electrica deja lotes de camara-2 en cuarentena preventiva", () => {
  const impact = assessOutageImpact(seedState, referenceDate);

  const quarantinedLots = impact.quarantinedLots.map((lot) => lot.lotId).sort();
  assert.deepEqual(quarantinedLots, ["LCH-240531-05", "LCH-240603-03"]);
});

test("alertas separan urgentes de bloqueados", () => {
  const alerts = buildExpiryAlerts(seedState, referenceDate);

  assert.equal(alerts.urgent.some((lot) => lot.id === "LCH-240602-02"), true);
  assert.equal(alerts.blocked.some((lot) => lot.id === "LCH-240530-04"), true);
});
