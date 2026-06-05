import { storageAreas, venezuelaRules } from "./data.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(value) {
  if (!value) {
    return null;
  }

  if (value.includes("T")) {
    return new Date(value);
  }

  return new Date(`${value}T00:00:00`);
}

export function differenceInDays(from, to) {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  if (!fromDate || !toDate) {
    return 0;
  }

  return Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_MS);
}

export function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function getAreaById(areaId) {
  return storageAreas.find((area) => area.id === areaId);
}

export function getProductById(state, productId) {
  return state.products.find((product) => product.id === productId);
}

export function getSupplierById(state, supplierId) {
  return state.suppliers.find((supplier) => supplier.id === supplierId);
}

export function getLotRisk(lot, state, today = state.configuration.today) {
  const product = getProductById(state, lot.productId);
  const supplier = getSupplierById(state, lot.supplierId);
  const area = getAreaById(lot.storageAreaId);
  const daysToExpire = differenceInDays(today, lot.expiresAt);
  const warningDays = state.configuration.warningDays;
  const criticalDays = state.configuration.criticalDays;

  let status = "estable";
  if (daysToExpire < 0) {
    status = "vencido";
  } else if (daysToExpire <= criticalDays) {
    status = "critico";
  } else if (daysToExpire <= warningDays) {
    status = "alerta";
  }

  const tempBreach =
    area && typeof lot.lastTempC === "number" && lot.lastTempC > area.criticalMax;
  const observation = lot.sanitaryStatus === "en-observacion";
  const incompleteLabel = !lot.labelComplete;
  const supplierPenalty = supplier?.riskLevel === "alto" ? 10 : supplier?.riskLevel === "medio" ? 4 : 0;
  const demandWindow = product ? lot.quantity / Math.max(product.dailyDemand, 1) : 0;
  const rotationPenalty = demandWindow > Math.max(daysToExpire, 1) ? 12 : 0;

  let score = Math.max(0, 100 - Math.max(daysToExpire, 0) * 2);
  if (status === "critico") {
    score += 20;
  }
  if (status === "vencido") {
    score += 40;
  }
  if (tempBreach) {
    score += 18;
  }
  if (observation) {
    score += 15;
  }
  if (incompleteLabel) {
    score += 12;
  }
  score += supplierPenalty + rotationPenalty;

  let recommendation = "Mantener monitoreo normal.";
  if (status === "vencido") {
    recommendation = "Bloquear venta y ejecutar cuarentena sanitaria.";
  } else if (status === "critico" || tempBreach || observation || incompleteLabel) {
    recommendation = "Priorizar despacho FEFO, revisar ficha sanitaria y reforzar control.";
  } else if (status === "alerta") {
    recommendation = "Mover al frente de venta y activar promocion controlada.";
  }

  return {
    ...lot,
    productName: product?.name ?? "Producto desconocido",
    supplierName: supplier?.name ?? "Proveedor desconocido",
    storageAreaName: area?.name ?? "Area no asignada",
    daysToExpire,
    status,
    tempBreach,
    observation,
    incompleteLabel,
    demandWindow,
    riskScore: score,
    recommendation
  };
}

export function buildFefoQueue(state, today = state.configuration.today) {
  return state.lots
    .map((lot) => getLotRisk(lot, state, today))
    .sort((left, right) => {
      if (left.daysToExpire !== right.daysToExpire) {
        return left.daysToExpire - right.daysToExpire;
      }
      return right.riskScore - left.riskScore;
    })
    .map((lot, index) => ({
      ...lot,
      fefoRank: index + 1,
      priorityBand:
        lot.status === "vencido"
          ? "bloqueado"
          : lot.status === "critico" || lot.tempBreach || lot.incompleteLabel
            ? "prioridad-maxima"
            : lot.status === "alerta"
              ? "prioridad-media"
              : "rutina"
    }));
}

export function groupInventoryByProduct(state, today = state.configuration.today) {
  return state.products.map((product) => {
    const productLots = state.lots
      .filter((lot) => lot.productId === product.id)
      .map((lot) => getLotRisk(lot, state, today));

    const totalQuantity = productLots.reduce((sum, lot) => sum + lot.quantity, 0);
    const estimatedCoverageDays = totalQuantity / Math.max(product.dailyDemand, 1);
    const healthyLots = productLots.filter((lot) => lot.status === "estable").length;
    const atRiskLots = productLots.length - healthyLots;

    return {
      ...product,
      totalQuantity,
      estimatedCoverageDays,
      healthyLots,
      atRiskLots,
      belowMinStock: totalQuantity < product.minStock,
      overStock: totalQuantity > product.maxStock,
      lots: productLots
    };
  });
}

export function getColdChainSummary(state, today = state.configuration.today) {
  const recentLogs = state.temperatureLogs
    .slice()
    .sort((a, b) => parseDate(b.recordedAt) - parseDate(a.recordedAt));

  const areas = storageAreas.map((area) => {
    const logs = recentLogs.filter((log) => log.storageAreaId === area.id);
    const latest = logs[0];
    const deviations = logs.filter((log) => log.tempC > area.criticalMax).length;
    const lots = state.lots
      .filter((lot) => lot.storageAreaId === area.id)
      .map((lot) => getLotRisk(lot, state, today));

    return {
      ...area,
      latestTempC: latest?.tempC ?? null,
      latestHumidity: latest?.humidity ?? null,
      deviations,
      affectedLots: lots.filter((lot) => lot.tempBreach).length,
      operationalStatus:
        deviations > 0 || (typeof latest?.tempC === "number" && latest.tempC > area.criticalMax)
          ? "en-riesgo"
          : "estable"
    };
  });

  return {
    deviations: recentLogs.filter((log) => log.status === "desviacion").length,
    activeAreasAtRisk: areas.filter((area) => area.operationalStatus === "en-riesgo").length,
    areas
  };
}

export function getComplianceSummary(state, today = state.configuration.today) {
  const permits = state.permits.map((permit) => ({
    ...permit,
    daysToExpire: differenceInDays(today, permit.expiresAt)
  }));

  const validPermits = permits.filter((permit) => permit.daysToExpire >= 0).length;
  const labelsComplete = state.lots.filter((lot) => lot.labelComplete).length;
  const sanitaryApproved = state.lots.filter((lot) => lot.sanitaryStatus === "aprobado").length;
  const coldChain = getColdChainSummary(state, today);

  const weights = {
    permits: 35,
    labels: 25,
    sanitary: 20,
    coldChain: 20
  };

  const permitScore = (validPermits / Math.max(permits.length, 1)) * weights.permits;
  const labelScore = (labelsComplete / Math.max(state.lots.length, 1)) * weights.labels;
  const sanitaryScore =
    (sanitaryApproved / Math.max(state.lots.length, 1)) * weights.sanitary;
  const coldChainScore =
    ((storageAreas.length - coldChain.activeAreasAtRisk) / Math.max(storageAreas.length, 1)) *
    weights.coldChain;

  const score = Math.round(permitScore + labelScore + sanitaryScore + coldChainScore);

  return {
    score,
    rules: venezuelaRules,
    permits,
    expiringPermits: permits.filter((permit) => permit.daysToExpire <= 30),
    status:
      score >= 90 ? "alto cumplimiento" : score >= 75 ? "cumplimiento vigilado" : "riesgo regulatorio"
  };
}

export function buildAlerts(state, today = state.configuration.today) {
  const fefoQueue = buildFefoQueue(state, today);
  const compliance = getComplianceSummary(state, today);
  const coldChain = getColdChainSummary(state, today);
  const alerts = [];

  fefoQueue.forEach((lot) => {
    if (lot.status === "vencido") {
      alerts.push({
        severity: "critica",
        title: `Lote vencido ${lot.lotCode}`,
        detail: `${lot.productName} debe pasar a cuarentena.`
      });
    } else if (lot.status === "critico") {
      alerts.push({
        severity: "alta",
        title: `Despacho FEFO inmediato: ${lot.lotCode}`,
        detail: `${lot.productName} vence en ${lot.daysToExpire} dias.`
      });
    }

    if (lot.incompleteLabel) {
      alerts.push({
        severity: "alta",
        title: `Etiqueta incompleta: ${lot.lotCode}`,
        detail: "No cumple con la trazabilidad minima para expendio."
      });
    }

    if (lot.tempBreach) {
      alerts.push({
        severity: "alta",
        title: `Desviacion termica en ${lot.lotCode}`,
        detail: `${lot.storageAreaName} supero el umbral critico de temperatura.`
      });
    }
  });

  compliance.expiringPermits.forEach((permit) => {
    alerts.push({
      severity: permit.daysToExpire <= 7 ? "alta" : "media",
      title: `Documento por vencer: ${permit.name}`,
      detail: `Faltan ${permit.daysToExpire} dias para su vencimiento.`
    });
  });

  if (coldChain.activeAreasAtRisk > 0) {
    alerts.push({
      severity: "alta",
      title: "Cadena de frio comprometida",
      detail: `${coldChain.activeAreasAtRisk} area(s) requieren accion inmediata.`
    });
  }

  return alerts;
}

export function simulatePowerOutage(
  state,
  {
    affectedAreaId,
    minutes,
    generatorActivated = false,
    ambientTempC = 28,
    today = state.configuration.today
  }
) {
  const area = getAreaById(affectedAreaId);
  const impactedLots = state.lots
    .filter((lot) => lot.storageAreaId === affectedAreaId)
    .map((lot) => getLotRisk(lot, state, today))
    .map((lot) => {
      const predictedRise =
        affectedAreaId === "congelador-a" ? minutes * 0.08 : minutes * 0.06;
      const mitigation = generatorActivated ? 0.45 : 1;
      const predictedTemp = Number((lot.lastTempC + predictedRise * mitigation).toFixed(1));
      const areaCritical = area?.criticalMax ?? state.configuration.refrigerationLimit;
      const tempRisk = predictedTemp > areaCritical;
      const riskLevel =
        minutes >= state.configuration.outageEscalationMinutes && tempRisk
          ? "alto"
          : tempRisk || minutes >= 30
            ? "medio"
            : "bajo";

      let action = "Monitorear y registrar en bitacora.";
      if (riskLevel === "alto") {
        action = "Trasladar a respaldo, bloquear venta temporal y evaluar inocuidad.";
      } else if (riskLevel === "medio") {
        action = "Priorizar salida FEFO, inspeccionar empaque y registrar correccion.";
      }

      return {
        lotId: lot.id,
        lotCode: lot.lotCode,
        productName: lot.productName,
        predictedTemp,
        riskLevel,
        tempRisk,
        action,
        daysToExpire: lot.daysToExpire
      };
    })
    .sort((left, right) => {
      const order = { alto: 0, medio: 1, bajo: 2 };
      if (order[left.riskLevel] !== order[right.riskLevel]) {
        return order[left.riskLevel] - order[right.riskLevel];
      }
      return left.daysToExpire - right.daysToExpire;
    });

  const affectedQuantity = state.lots
    .filter((lot) => lot.storageAreaId === affectedAreaId)
    .reduce((sum, lot) => sum + lot.quantity, 0);

  return {
    areaName: area?.name ?? "Area desconocida",
    minutes,
    generatorActivated,
    ambientTempC,
    affectedQuantity,
    impactedLots,
    summary:
      impactedLots.filter((lot) => lot.riskLevel === "alto").length > 0
        ? "Alto riesgo sanitario: activar contingencia electrica y trazabilidad reforzada."
        : impactedLots.filter((lot) => lot.riskLevel === "medio").length > 0
          ? "Riesgo moderado: vender por FEFO y auditar cadena de frio."
          : "Impacto controlado: continuar con registro preventivo."
  };
}

export function getDashboardMetrics(state, today = state.configuration.today) {
  const inventory = groupInventoryByProduct(state, today);
  const fefoQueue = buildFefoQueue(state, today);
  const compliance = getComplianceSummary(state, today);
  const coldChain = getColdChainSummary(state, today);
  const alerts = buildAlerts(state, today);

  const stockValue = state.lots.reduce((sum, lot) => sum + lot.quantity * lot.salePrice, 0);
  const costValue = state.lots.reduce((sum, lot) => sum + lot.quantity * lot.cost, 0);

  return {
    stockValue,
    costValue,
    estimatedGrossMargin: stockValue - costValue,
    totalLots: state.lots.length,
    nearExpiryLots: fefoQueue.filter((lot) => ["critico", "alerta"].includes(lot.status)).length,
    expiredLots: fefoQueue.filter((lot) => lot.status === "vencido").length,
    complianceScore: compliance.score,
    activeAlerts: alerts.length,
    coldChainAreasAtRisk: coldChain.activeAreasAtRisk,
    lowStockProducts: inventory.filter((product) => product.belowMinStock).length
  };
}

export function lotTableToCsv(rows) {
  const headers = [
    "lote",
    "producto",
    "vence",
    "dias_para_vencer",
    "cantidad",
    "estado",
    "recomendacion"
  ];
  const lines = rows.map((row) =>
    [
      row.lotCode,
      row.productName,
      row.expiresAt,
      row.daysToExpire,
      row.quantity,
      row.status,
      row.recommendation
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}
