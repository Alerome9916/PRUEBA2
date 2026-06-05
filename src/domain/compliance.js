import { daysBetween, formatDateTime, minutesBetween, toDate } from "../lib/date.js";

export function evaluateLotCompliance(lot, product, state, referenceDate = new Date()) {
  const blockers = [];
  const warnings = [];
  const daysToExpire = daysBetween(referenceDate, lot.expiryAt);
  const zone = state.zones.find((entry) => entry.id === lot.zone);
  const allowedTemperature = lot.allowedStorageTempC ?? zone?.maxTemperatureC ?? product.storageTempMax;

  if (daysToExpire < 0) {
    blockers.push("Lote vencido: no puede comercializarse.");
  } else if (daysToExpire <= 2) {
    warnings.push(`Vence en ${daysToExpire} dia(s), priorizar salida inmediata.`);
  } else if (daysToExpire <= 5) {
    warnings.push(`Ventana critica FEFO: vence en ${daysToExpire} dias.`);
  }

  if (!lot.sanitaryPermit) {
    blockers.push("Permiso o soporte sanitario del lote pendiente de validacion.");
  }

  if (!lot.labelCheck) {
    blockers.push("Rotulado incompleto frente a RGA art. 37 / COVENIN 2952:2001.");
  }

  if (lot.openedAt) {
    const daysOpen = daysBetween(lot.openedAt, referenceDate);
    if (daysOpen > product.openShelfLifeDays) {
      blockers.push(`Supera vida util tras apertura (${product.openShelfLifeDays} dias).`);
    }
  }

  const recentLog = state.tempLogs
    .filter((log) => log.zone === lot.zone)
    .sort((left, right) => toDate(right.recordedAt) - toDate(left.recordedAt))[0];

  if (recentLog && recentLog.temperatureC > allowedTemperature) {
    blockers.push(
      `Ultima lectura termica fuera de rango (${recentLog.temperatureC.toFixed(1)} C > ${allowedTemperature} C en ${formatDateTime(recentLog.recordedAt)}).`
    );
  }

  const outageRisk = state.outages
    .filter((event) => event.zone === lot.zone)
    .map((event) => ({
      ...event,
      durationMinutes: minutesBetween(event.startedAt, event.endedAt)
    }))
    .find(
      (event) =>
        event.durationMinutes > state.meta.coldChainToleranceMinutes && event.maxTemperatureC > allowedTemperature
    );

  if (outageRisk) {
    blockers.push(
      `Cuarentena preventiva por contingencia electrica (${outageRisk.durationMinutes} min, ${outageRisk.maxTemperatureC.toFixed(1)} C max).`
    );
  }

  const availableKg = Math.max(0, Number(lot.quantityKg) - Number(lot.reservedKg || 0));
  const commercialStatus = blockers.length
    ? "bloqueado"
    : daysToExpire <= 2
      ? "prioritario"
      : "operativo";

  return {
    daysToExpire,
    blockers,
    warnings,
    availableKg,
    canDispatch: blockers.length === 0 && availableKg > 0,
    commercialStatus,
    riskScore: calculateLotRisk(lot, product, availableKg, daysToExpire, blockers.length)
  };
}

export function buildComplianceReport(state, referenceDate = new Date()) {
  const productMap = new Map(state.products.map((product) => [product.id, product]));
  const zoneMap = new Map(state.zones.map((zone) => [zone.id, zone]));
  const lotChecks = state.lots.map((lot) => {
    const product = productMap.get(lot.productId);
    const evaluation = evaluateLotCompliance(lot, product, state, referenceDate);
    return {
      id: lot.id,
      batch: lot.batch,
      product: product.name,
      zone: zoneMap.get(lot.zone)?.name || lot.zone,
      ...evaluation
    };
  });

  const cleaningChecks = state.cleaningTasks.map((task) => ({
    ...task,
    overdue: !task.completed && toDate(task.dueAt) < toDate(referenceDate)
  }));

  const compliantLots = lotChecks.filter((lot) => lot.blockers.length === 0).length;
  const compliantCleaning = cleaningChecks.filter((task) => !task.overdue).length;
  const denominator = lotChecks.length + cleaningChecks.length || 1;

  return {
    lotChecks,
    cleaningChecks,
    complianceRate: Math.round(((compliantLots + compliantCleaning) / denominator) * 100),
    blockedLots: lotChecks.filter((lot) => lot.blockers.length > 0),
    criticalCleaning: cleaningChecks.filter((task) => task.overdue)
  };
}

export function assessOutageImpact(state, referenceDate = new Date()) {
  const productMap = new Map(state.products.map((product) => [product.id, product]));
  const zoneMap = new Map(state.zones.map((zone) => [zone.id, zone]));

  const events = state.outages
    .map((event) => {
      const durationMinutes = minutesBetween(event.startedAt, event.endedAt);
      const impactedLots = state.lots.filter((lot) => lot.zone === event.zone).map((lot) => {
        const product = productMap.get(lot.productId);
        const zone = zoneMap.get(lot.zone);
        const allowedTemperature = lot.allowedStorageTempC ?? zone?.maxTemperatureC ?? product.storageTempMax;
        const thermalGap = event.maxTemperatureC - allowedTemperature;
        const quarantine = durationMinutes > state.meta.coldChainToleranceMinutes && thermalGap > 0;
        return {
          lotId: lot.id,
          product: product.name,
          batch: lot.batch,
          quantityKg: lot.quantityKg,
          quarantine,
          action: quarantine
            ? "Aislar, validar ficha tecnica y registrar decision sanitaria."
            : "Mantener en observacion reforzada."
        };
      });

      return {
        ...event,
        durationMinutes,
        zoneName: zoneMap.get(event.zone)?.name || event.zone,
        ageDays: Math.max(0, daysBetween(event.endedAt, referenceDate)),
        impactedLots
      };
    })
    .sort((left, right) => toDate(right.startedAt) - toDate(left.startedAt));

  return {
    events,
    quarantinedLots: events.flatMap((event) => event.impactedLots.filter((lot) => lot.quarantine))
  };
}

function calculateLotRisk(lot, product, availableKg, daysToExpire, blockersCount) {
  const demandPressure = availableKg / Math.max(product.dailyDemandKg || 1, 1);
  const expiryPressure = daysToExpire <= 0 ? 50 : Math.max(0, 28 - daysToExpire * 4);
  const blockerPressure = blockersCount * 18;
  return Math.min(100, Math.round(expiryPressure + blockerPressure + demandPressure * 6));
}
