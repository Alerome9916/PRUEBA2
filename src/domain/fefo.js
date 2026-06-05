import { evaluateLotCompliance } from "./compliance.js";
import { formatDate, toDate } from "../lib/date.js";

export function buildLotSnapshot(state, referenceDate = new Date()) {
  const productMap = new Map(state.products.map((product) => [product.id, product]));
  const supplierMap = new Map(state.suppliers.map((supplier) => [supplier.id, supplier]));
  const zoneMap = new Map(state.zones.map((zone) => [zone.id, zone]));

  return state.lots
    .map((lot) => {
      const product = productMap.get(lot.productId);
      const supplier = supplierMap.get(lot.supplierId);
      const compliance = evaluateLotCompliance(lot, product, state, referenceDate);
      return {
        ...lot,
        product,
        supplier,
        zoneName: zoneMap.get(lot.zone)?.name || lot.zone,
        ...compliance,
        statusLabel: buildStatusLabel(compliance),
        expiryLabel: formatDate(lot.expiryAt),
        inventoryValue: compliance.availableKg * Number(lot.costPerKg || 0)
      };
    })
    .sort((left, right) => {
      if (left.canDispatch !== right.canDispatch) {
        return Number(right.canDispatch) - Number(left.canDispatch);
      }

      if (left.daysToExpire !== right.daysToExpire) {
        return left.daysToExpire - right.daysToExpire;
      }

      return toDate(left.receivedAt) - toDate(right.receivedAt);
    });
}

export function getFefoQueue(productId, state, referenceDate = new Date()) {
  return buildLotSnapshot(state, referenceDate)
    .filter((lot) => lot.productId === productId && lot.canDispatch && lot.availableKg > 0)
    .sort((left, right) => left.daysToExpire - right.daysToExpire || toDate(left.receivedAt) - toDate(right.receivedAt));
}

export function recommendDispatch(productId, quantityKg, state, referenceDate = new Date()) {
  const requested = Number(quantityKg);
  const queue = getFefoQueue(productId, state, referenceDate);
  let remaining = requested;

  const allocations = queue.map((lot) => {
    const assignedKg = remaining > 0 ? Math.min(remaining, lot.availableKg) : 0;
    remaining = Math.max(0, remaining - assignedKg);
    return {
      lotId: lot.id,
      batch: lot.batch,
      product: lot.product.name,
      expiryAt: lot.expiryAt,
      daysToExpire: lot.daysToExpire,
      assignedKg,
      availableKg: lot.availableKg,
      zoneName: lot.zoneName
    };
  }).filter((entry) => entry.assignedKg > 0);

  return {
    productId,
    requestedKg: requested,
    allocations,
    shortageKg: Number(remaining.toFixed(1)),
    blockedLots: buildLotSnapshot(state, referenceDate)
      .filter((lot) => lot.productId === productId && !lot.canDispatch && lot.availableKg > 0)
      .map((lot) => ({
        lotId: lot.id,
        batch: lot.batch,
        reasons: lot.blockers
      }))
  };
}

export function buildExpiryAlerts(state, referenceDate = new Date()) {
  const snapshot = buildLotSnapshot(state, referenceDate).filter((lot) => lot.availableKg > 0);
  const urgent = [];
  const warning = [];
  const watch = [];
  const blocked = [];

  snapshot.forEach((lot) => {
    if (!lot.canDispatch) {
      blocked.push(lot);
      return;
    }

    if (lot.daysToExpire <= 2) {
      urgent.push(lot);
    } else if (lot.daysToExpire <= 5) {
      warning.push(lot);
    } else if (lot.daysToExpire <= 10) {
      watch.push(lot);
    }
  });

  return {
    urgent,
    warning,
    watch,
    blocked
  };
}

function buildStatusLabel(compliance) {
  if (!compliance.canDispatch) {
    return "Bloqueado";
  }

  if (compliance.daysToExpire <= 2) {
    return "Prioridad FEFO";
  }

  return "Operativo";
}
