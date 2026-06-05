import { buildComplianceReport, assessOutageImpact } from "./compliance.js";
import { buildExpiryAlerts, buildLotSnapshot } from "./fefo.js";

export function buildDashboard(state, referenceDate = new Date()) {
  const snapshot = buildLotSnapshot(state, referenceDate);
  const alerts = buildExpiryAlerts(state, referenceDate);
  const compliance = buildComplianceReport(state, referenceDate);
  const outageImpact = assessOutageImpact(state, referenceDate);

  const totalKg = snapshot.reduce((accumulator, lot) => accumulator + lot.availableKg, 0);
  const inventoryValue = snapshot.reduce((accumulator, lot) => accumulator + lot.inventoryValue, 0);
  const nearExpiryKg = [...alerts.urgent, ...alerts.warning].reduce(
    (accumulator, lot) => accumulator + lot.availableKg,
    0
  );
  const blockedKg = alerts.blocked.reduce((accumulator, lot) => accumulator + lot.availableKg, 0);
  const coldOkZones = state.zones.filter((zone) => {
    const lastLog = state.tempLogs
      .filter((log) => log.zone === zone.id)
      .sort((left, right) => new Date(right.recordedAt) - new Date(left.recordedAt))[0];
    return lastLog ? lastLog.temperatureC <= zone.maxTemperatureC : false;
  }).length;

  return {
    metrics: [
      {
        label: "Inventario disponible",
        value: totalKg,
        suffix: "kg",
        tone: "success",
        delta: `${snapshot.length} lotes activos`
      },
      {
        label: "Valor estimado",
        value: inventoryValue,
        suffix: "currency",
        tone: "info",
        delta: "Costo disponible en piso"
      },
      {
        label: "Riesgo FEFO",
        value: nearExpiryKg,
        suffix: "kg",
        tone: nearExpiryKg > 20 ? "danger" : "warning",
        delta: `${alerts.urgent.length} urgentes / ${alerts.warning.length} en alerta`
      },
      {
        label: "Bloqueado",
        value: blockedKg,
        suffix: "kg",
        tone: blockedKg > 0 ? "danger" : "success",
        delta: `${alerts.blocked.length} lotes retenidos`
      },
      {
        label: "Cumplimiento",
        value: compliance.complianceRate,
        suffix: "%",
        tone: compliance.complianceRate >= 85 ? "success" : "warning",
        delta: `${compliance.criticalCleaning.length} tareas de limpieza criticas`
      },
      {
        label: "Zonas frias estables",
        value: coldOkZones,
        suffix: `/${state.zones.length}`,
        tone: coldOkZones === state.zones.length ? "success" : "warning",
        delta: `${outageImpact.quarantinedLots.length} lotes en cuarentena`
      }
    ],
    novelty: buildNoveltyRecommendations(snapshot),
    reports: {
      totalKg,
      inventoryValue,
      complianceRate: compliance.complianceRate,
      blockedLots: compliance.blockedLots.length,
      quarantinedLots: outageImpact.quarantinedLots.length
    }
  };
}

export function buildNoveltyRecommendations(snapshot) {
  return snapshot
    .filter((lot) => lot.availableKg > 0)
    .map((lot) => {
      const demandWindowDays = lot.availableKg / Math.max(lot.product.dailyDemandKg || 1, 1);
      const excess = Number((demandWindowDays - Math.max(lot.daysToExpire, 1)).toFixed(1));
      let action = "Mantener ritmo actual";
      let tone = "success";

      if (!lot.canDispatch) {
        action = "Poner en hold comercial y validar decision sanitaria";
        tone = "danger";
      } else if (lot.daysToExpire <= 2 && demandWindowDays > lot.daysToExpire) {
        action = "Activar combo promocional o traslado interno inmediato";
        tone = "danger";
      } else if (lot.daysToExpire <= 5 && demandWindowDays > lot.daysToExpire) {
        action = "Fraccionar, mover a vitrina y comunicar prioridad al turno";
        tone = "warning";
      } else if (lot.blockers.length === 0 && lot.warnings.length === 0) {
        action = "Stock sano: reservar para ventas programadas";
      }

      return {
        lotId: lot.id,
        product: lot.product.name,
        daysToExpire: lot.daysToExpire,
        availableKg: lot.availableKg,
        action,
        tone,
        excess
      };
    })
    .sort((left, right) => {
      const weight = { danger: 0, warning: 1, success: 2 };
      return weight[left.tone] - weight[right.tone] || left.daysToExpire - right.daysToExpire;
    })
    .slice(0, 5);
}

export function buildZoneStatus(state, referenceDate = new Date()) {
  return state.zones.map((zone) => {
    const lastLog = state.tempLogs
      .filter((log) => log.zone === zone.id)
      .sort((left, right) => new Date(right.recordedAt) - new Date(left.recordedAt))[0];
    const openTask = state.cleaningTasks
      .filter((task) => task.zone === zone.id && !task.completed)
      .sort((left, right) => new Date(left.dueAt) - new Date(right.dueAt))[0];

    return {
      zoneName: zone.name,
      limit: zone.maxTemperatureC,
      temperatureC: lastLog?.temperatureC ?? null,
      humidity: lastLog?.humidity ?? null,
      stable: lastLog ? lastLog.temperatureC <= zone.maxTemperatureC : false,
      cleaningDue: openTask?.dueAt ?? null,
      cleaningTask: openTask?.task ?? "Sin pendientes",
      overdueCleaning: openTask ? new Date(openTask.dueAt) < new Date(referenceDate) : false
    };
  });
}

export function buildTraceability(state) {
  const productMap = new Map(state.products.map((product) => [product.id, product]));
  const supplierMap = new Map(state.suppliers.map((supplier) => [supplier.id, supplier]));

  return {
    lots: state.lots.map((lot) => ({
      lotId: lot.id,
      batch: lot.batch,
      product: productMap.get(lot.productId)?.name || lot.productId,
      supplier: supplierMap.get(lot.supplierId)?.name || lot.supplierId,
      invoice: lot.invoice,
      expiryAt: lot.expiryAt,
      zone: lot.zone,
      notes: lot.notes
    })),
    withdrawals: state.withdrawals.map((record) => ({
      ...record,
      product: productMap.get(record.productId)?.name || record.productId
    }))
  };
}

export function buildReportRows(state, referenceDate = new Date()) {
  const snapshot = buildLotSnapshot(state, referenceDate);
  const alerts = buildExpiryAlerts(state, referenceDate);

  return {
    inventoryRows: snapshot.map((lot) => ({
      lote: lot.id,
      producto: lot.product.name,
      loteFabricante: lot.batch,
      zona: lot.zoneName,
      disponibleKg: lot.availableKg,
      vence: lot.expiryAt,
      estado: lot.statusLabel,
      observaciones: [...lot.warnings, ...lot.blockers].join(" | ") || "OK"
    })),
    alertRows: [...alerts.urgent, ...alerts.warning, ...alerts.blocked].map((lot) => ({
      lote: lot.id,
      producto: lot.product.name,
      diasParaVencer: lot.daysToExpire,
      disponibleKg: lot.availableKg,
      estado: lot.statusLabel,
      causa: [...lot.warnings, ...lot.blockers].join(" | ") || "Monitoreo"
    }))
  };
}

export function rowsToCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(
      headers
        .map((header) => JSON.stringify(row[header] ?? ""))
        .join(",")
    );
  });
  return lines.join("\n");
}
