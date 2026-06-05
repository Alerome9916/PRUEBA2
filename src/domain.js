const DAY_MS = 24 * 60 * 60 * 1000;

export const VENEZUELA_COMPLIANCE_AREAS = [
  {
    id: "sanitario",
    name: "Sanitario y alimentos",
    items: [
      "Permiso sanitario vigente del establecimiento.",
      "Registro sanitario o ficha tecnica de productos empacados cuando aplique.",
      "Carnet o constancia de manipulacion de alimentos del personal.",
      "Control documentado de limpieza, desinfeccion y manejo de plagas.",
      "Cadena de frio documentada para lacteos, embutidos y carnes procesadas."
    ]
  },
  {
    id: "etiquetado",
    name: "Rotulado y trazabilidad",
    items: [
      "Identificacion visible de lote, fecha de elaboracion/recepcion y vencimiento.",
      "Condiciones de conservacion en etiqueta o ficha interna.",
      "Proveedor, RIF y documento de compra asociados al lote.",
      "Separacion fisica de productos vencidos, en cuarentena o decomisados."
    ]
  },
  {
    id: "fiscal",
    name: "Fiscal y comercial",
    items: [
      "RIF del proveedor registrado.",
      "Documento fiscal SENIAT asociado a cada compra.",
      "Precio de venta y unidad de medida visibles para el cliente.",
      "Bitacora de ajustes, mermas y anulaciones para auditoria interna."
    ]
  }
];

export const MOVEMENT_TYPES = {
  PURCHASE: "compra",
  SALE: "venta",
  WASTE: "merma",
  ADJUSTMENT: "ajuste",
  QUARANTINE: "cuarentena",
  RELEASE: "liberacion"
};

export const BATCH_STATUS = {
  AVAILABLE: "disponible",
  QUARANTINED: "cuarentena",
  RECALLED: "retiro",
  DEPLETED: "agotado"
};

export const DEFAULT_TODAY = "2026-06-05";

export function buildSeedData() {
  return {
    business: {
      name: "Los Churuguaros",
      rif: "J-40999888-4",
      location: "Churuguara, municipio Federacion, estado Falcon",
      currency: "VES",
      usdReferenceRate: 36.5,
      coldChainContact: "Responsable de calidad",
      fefoPolicy:
        "Todo despacho debe consumir primero el lote con fecha de vencimiento mas proxima, siempre que no este vencido, en cuarentena o bajo retiro."
    },
    products: [
      {
        id: "prod-jamon-pierna",
        sku: "LC-CHA-001",
        name: "Jamon de pierna ahumado",
        category: "Embutidos",
        unit: "kg",
        shelfLifeDays: 45,
        minStockKg: 18,
        costBs: 112,
        priceBs: 168,
        temperatureMinC: 0,
        temperatureMaxC: 5,
        sanitaryRegistry: "RS-MPPS-EMB-00125",
        storage: "Refrigerado entre 0 C y 5 C"
      },
      {
        id: "prod-queso-guayanes",
        sku: "LC-LAC-014",
        name: "Queso guayanes",
        category: "Lacteos",
        unit: "kg",
        shelfLifeDays: 18,
        minStockKg: 12,
        costBs: 95,
        priceBs: 142,
        temperatureMinC: 1,
        temperatureMaxC: 6,
        sanitaryRegistry: "RS-MPPS-LAC-00451",
        storage: "Refrigerado entre 1 C y 6 C"
      },
      {
        id: "prod-chorizo-ahumado",
        sku: "LC-CHA-022",
        name: "Chorizo ahumado",
        category: "Embutidos",
        unit: "kg",
        shelfLifeDays: 60,
        minStockKg: 15,
        costBs: 130,
        priceBs: 198,
        temperatureMinC: 0,
        temperatureMaxC: 5,
        sanitaryRegistry: "RS-MPPS-EMB-00880",
        storage: "Refrigerado entre 0 C y 5 C"
      },
      {
        id: "prod-mortadela",
        sku: "LC-CHA-030",
        name: "Mortadela especial",
        category: "Embutidos",
        unit: "kg",
        shelfLifeDays: 50,
        minStockKg: 20,
        costBs: 78,
        priceBs: 118,
        temperatureMinC: 0,
        temperatureMaxC: 5,
        sanitaryRegistry: "RS-MPPS-EMB-00231",
        storage: "Refrigerado entre 0 C y 5 C"
      }
    ],
    suppliers: [
      {
        id: "sup-andina",
        name: "Distribuidora Lacteos Andina",
        rif: "J-30111222-7",
        phone: "0412-0000001",
        sanitaryPermit: "PS-FA-2026-019",
        leadTimeDays: 2,
        score: 94
      },
      {
        id: "sup-centro",
        name: "Embutidos Centro Occidente",
        rif: "J-29888777-3",
        phone: "0414-0000002",
        sanitaryPermit: "PS-LA-2026-044",
        leadTimeDays: 3,
        score: 89
      }
    ],
    batches: [
      {
        id: "lot-jp-260601",
        productId: "prod-jamon-pierna",
        supplierId: "sup-centro",
        lotCode: "JP-260601",
        receivedAt: "2026-06-01",
        manufacturedAt: "2026-05-29",
        expiresAt: "2026-06-18",
        initialKg: 32,
        remainingKg: 19.5,
        costBs: 112,
        invoice: "FAC-000154",
        status: BATCH_STATUS.AVAILABLE,
        location: "Nevera 1 / Bandeja A",
        receivingTempC: 3.4,
        notes: "Empaque integro, rotulado legible."
      },
      {
        id: "lot-jp-260605",
        productId: "prod-jamon-pierna",
        supplierId: "sup-centro",
        lotCode: "JP-260605",
        receivedAt: "2026-06-05",
        manufacturedAt: "2026-06-03",
        expiresAt: "2026-07-05",
        initialKg: 28,
        remainingKg: 28,
        costBs: 114,
        invoice: "FAC-000188",
        status: BATCH_STATUS.AVAILABLE,
        location: "Nevera 1 / Bandeja B",
        receivingTempC: 3.1,
        notes: "Reservado para reposicion FEFO posterior."
      },
      {
        id: "lot-qg-260525",
        productId: "prod-queso-guayanes",
        supplierId: "sup-andina",
        lotCode: "QG-260525",
        receivedAt: "2026-05-25",
        manufacturedAt: "2026-05-24",
        expiresAt: "2026-06-08",
        initialKg: 22,
        remainingKg: 6.2,
        costBs: 95,
        invoice: "FAC-008901",
        status: BATCH_STATUS.AVAILABLE,
        location: "Nevera 2 / Gaveta rapida",
        receivingTempC: 4.2,
        notes: "Debe priorizarse por FEFO."
      },
      {
        id: "lot-ca-260520",
        productId: "prod-chorizo-ahumado",
        supplierId: "sup-centro",
        lotCode: "CA-260520",
        receivedAt: "2026-05-20",
        manufacturedAt: "2026-05-18",
        expiresAt: "2026-06-22",
        initialKg: 26,
        remainingKg: 21,
        costBs: 130,
        invoice: "FAC-000139",
        status: BATCH_STATUS.AVAILABLE,
        location: "Nevera 3 / Gancho 2",
        receivingTempC: 2.9,
        notes: "Control sensorial diario."
      },
      {
        id: "lot-mo-260501",
        productId: "prod-mortadela",
        supplierId: "sup-centro",
        lotCode: "MO-260501",
        receivedAt: "2026-05-01",
        manufacturedAt: "2026-04-29",
        expiresAt: "2026-06-04",
        initialKg: 18,
        remainingKg: 2.4,
        costBs: 78,
        invoice: "FAC-000101",
        status: BATCH_STATUS.QUARANTINED,
        location: "Area de cuarentena",
        receivingTempC: 3,
        notes: "Vencido. No despachar."
      }
    ],
    purchases: [
      {
        id: "pur-001",
        date: "2026-06-01",
        supplierId: "sup-centro",
        invoice: "FAC-000154",
        totalBs: 3584,
        receivedBy: "Encargado de almacen",
        checklist: {
          coldChainOk: true,
          labelOk: true,
          invoiceOk: true,
          sensoryOk: true
        }
      }
    ],
    sales: [
      {
        id: "sale-001",
        date: "2026-06-05",
        customer: "Venta mostrador",
        items: [
          {
            productId: "prod-queso-guayanes",
            quantityKg: 2,
            allocations: [
              {
                batchId: "lot-qg-260525",
                quantityKg: 2
              }
            ]
          }
        ],
        totalBs: 284,
        operator: "Caja 1"
      }
    ],
    waste: [
      {
        id: "waste-001",
        date: "2026-06-05",
        batchId: "lot-mo-260501",
        productId: "prod-mortadela",
        quantityKg: 1.1,
        reason: "Vencimiento",
        disposition: "Separado para decomiso interno",
        authorizedBy: "Responsable de calidad"
      }
    ],
    coldChainLogs: [
      {
        id: "temp-001",
        dateTime: "2026-06-05T08:00:00",
        equipment: "Nevera 1",
        temperatureC: 3.2,
        humidityPct: 68,
        recordedBy: "Turno manana",
        notes: "Normal"
      },
      {
        id: "temp-002",
        dateTime: "2026-06-05T12:00:00",
        equipment: "Nevera 2",
        temperatureC: 7.1,
        humidityPct: 72,
        recordedBy: "Turno manana",
        notes: "Puerta abierta en hora pico; corregido."
      }
    ],
    complianceTasks: [
      {
        id: "comp-001",
        area: "sanitario",
        title: "Renovar permiso sanitario del establecimiento",
        dueDate: "2026-07-15",
        owner: "Gerencia",
        status: "pendiente",
        evidence: "Carpeta sanitaria"
      },
      {
        id: "comp-002",
        area: "fiscal",
        title: "Verificar correlativos fiscales de compras del mes",
        dueDate: "2026-06-10",
        owner: "Administracion",
        status: "en_progreso",
        evidence: "Libro de compras"
      }
    ],
    audits: [
      {
        id: "audit-001",
        dateTime: "2026-06-05T09:30:00",
        actor: "Sistema",
        action: "Inventario inicial cargado",
        entity: "inventario",
        details: "Datos de demostracion listos para operar."
      }
    ]
  };
}

export function parseLocalDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(value) {
  const date = parseLocalDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(start, end) {
  const from = parseLocalDate(start);
  const to = parseLocalDate(end);
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function roundKg(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

export function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function getProduct(data, productId) {
  return data.products.find((product) => product.id === productId);
}

export function getSupplier(data, supplierId) {
  return data.suppliers.find((supplier) => supplier.id === supplierId);
}

export function getBatch(data, batchId) {
  return data.batches.find((batch) => batch.id === batchId);
}

export function getBatchStatus(batch, today = DEFAULT_TODAY) {
  const remainingKg = Number(batch.remainingKg || 0);
  const daysToExpire = daysBetween(today, batch.expiresAt);

  if (batch.status === BATCH_STATUS.RECALLED) {
    return {
      code: "retiro",
      label: "Retiro sanitario",
      severity: "danger",
      daysToExpire,
      canSell: false
    };
  }
  if (remainingKg <= 0 || batch.status === BATCH_STATUS.DEPLETED) {
    return {
      code: "agotado",
      label: "Agotado",
      severity: "neutral",
      daysToExpire,
      canSell: false
    };
  }
  if (daysToExpire < 0) {
    return {
      code: "vencido",
      label: "Vencido",
      severity: "danger",
      daysToExpire,
      canSell: false
    };
  }
  if (batch.status === BATCH_STATUS.QUARANTINED) {
    return {
      code: "cuarentena",
      label: "Cuarentena",
      severity: "danger",
      daysToExpire,
      canSell: false
    };
  }
  if (daysToExpire <= 3) {
    return {
      code: "critico",
      label: "Vence en 72 h",
      severity: "danger",
      daysToExpire,
      canSell: true
    };
  }
  if (daysToExpire <= 7) {
    return {
      code: "urgente",
      label: "Prioridad FEFO",
      severity: "warning",
      daysToExpire,
      canSell: true
    };
  }
  if (daysToExpire <= 15) {
    return {
      code: "observacion",
      label: "En observacion",
      severity: "info",
      daysToExpire,
      canSell: true
    };
  }

  return {
    code: "ok",
    label: "Apto",
    severity: "success",
    daysToExpire,
    canSell: true
  };
}

export function getAvailableBatches(data, productId, today = DEFAULT_TODAY) {
  return data.batches
    .filter((batch) => batch.productId === productId)
    .map((batch) => ({
      ...batch,
      product: getProduct(data, batch.productId),
      supplier: getSupplier(data, batch.supplierId),
      health: getBatchStatus(batch, today)
    }))
    .filter((batch) => batch.health.canSell && Number(batch.remainingKg) > 0)
    .sort((a, b) => {
      const expiryDiff = parseLocalDate(a.expiresAt) - parseLocalDate(b.expiresAt);
      if (expiryDiff !== 0) return expiryDiff;
      const receivedDiff = parseLocalDate(a.receivedAt) - parseLocalDate(b.receivedAt);
      if (receivedDiff !== 0) return receivedDiff;
      return a.lotCode.localeCompare(b.lotCode);
    });
}

export function allocateFefo(data, requestedItems, today = DEFAULT_TODAY) {
  const allocations = [];
  const shortages = [];

  for (const item of requestedItems) {
    const product = getProduct(data, item.productId);
    const requestedKg = roundKg(item.quantityKg);
    let pendingKg = requestedKg;
    const itemAllocations = [];

    for (const batch of getAvailableBatches(data, item.productId, today)) {
      if (pendingKg <= 0) break;
      const quantityKg = Math.min(Number(batch.remainingKg), pendingKg);
      if (quantityKg <= 0) continue;
      itemAllocations.push({
        productId: item.productId,
        productName: product?.name || item.productId,
        batchId: batch.id,
        lotCode: batch.lotCode,
        expiresAt: batch.expiresAt,
        daysToExpire: batch.health.daysToExpire,
        location: batch.location,
        quantityKg: roundKg(quantityKg),
        unitPriceBs: product?.priceBs || 0,
        subtotalBs: money(quantityKg * (product?.priceBs || 0))
      });
      pendingKg = roundKg(pendingKg - quantityKg);
    }

    allocations.push({
      productId: item.productId,
      productName: product?.name || item.productId,
      requestedKg,
      allocatedKg: roundKg(requestedKg - pendingKg),
      allocations: itemAllocations
    });

    if (pendingKg > 0) {
      shortages.push({
        productId: item.productId,
        productName: product?.name || item.productId,
        requestedKg,
        missingKg: roundKg(pendingKg)
      });
    }
  }

  return {
    allocations,
    shortages,
    totalBs: money(
      allocations.flatMap((item) => item.allocations).reduce((sum, allocation) => sum + allocation.subtotalBs, 0)
    ),
    isComplete: shortages.length === 0
  };
}

export function applySaleFefo(data, saleDraft, today = DEFAULT_TODAY) {
  const result = allocateFefo(data, saleDraft.items, today);
  if (!result.isComplete) {
    return {
      ok: false,
      result,
      message: "No hay inventario apto suficiente para completar el despacho FEFO."
    };
  }

  for (const item of result.allocations) {
    for (const allocation of item.allocations) {
      const batch = getBatch(data, allocation.batchId);
      batch.remainingKg = roundKg(Number(batch.remainingKg) - allocation.quantityKg);
      if (batch.remainingKg <= 0) {
        batch.status = BATCH_STATUS.DEPLETED;
      }
    }
  }

  const sale = {
    id: saleDraft.id || `sale-${Date.now()}`,
    date: saleDraft.date || today,
    customer: saleDraft.customer || "Venta mostrador",
    operator: saleDraft.operator || "Operador",
    items: result.allocations.map((item) => ({
      productId: item.productId,
      quantityKg: item.allocatedKg,
      allocations: item.allocations.map((allocation) => ({
        batchId: allocation.batchId,
        lotCode: allocation.lotCode,
        quantityKg: allocation.quantityKg,
        expiresAt: allocation.expiresAt
      }))
    })),
    totalBs: result.totalBs
  };
  data.sales.unshift(sale);
  addAudit(data, sale.operator, "Venta FEFO registrada", "venta", `Venta ${sale.id} por Bs ${sale.totalBs}.`);

  return {
    ok: true,
    sale,
    result
  };
}

export function addAudit(data, actor, action, entity, details) {
  data.audits.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    dateTime: new Date().toISOString(),
    actor,
    action,
    entity,
    details
  });
}

export function getInventoryByProduct(data, today = DEFAULT_TODAY) {
  return data.products.map((product) => {
    const productBatches = data.batches.filter((batch) => batch.productId === product.id);
    const availableKg = productBatches.reduce((sum, batch) => {
      const health = getBatchStatus(batch, today);
      return health.canSell ? sum + Number(batch.remainingKg || 0) : sum;
    }, 0);
    const blockedKg = productBatches.reduce((sum, batch) => {
      const health = getBatchStatus(batch, today);
      return !health.canSell ? sum + Number(batch.remainingKg || 0) : sum;
    }, 0);
    const nextExpiry = productBatches
      .filter((batch) => Number(batch.remainingKg) > 0)
      .sort((a, b) => parseLocalDate(a.expiresAt) - parseLocalDate(b.expiresAt))[0];
    const marginPct = product.priceBs > 0 ? ((product.priceBs - product.costBs) / product.priceBs) * 100 : 0;

    return {
      product,
      availableKg: roundKg(availableKg),
      blockedKg: roundKg(blockedKg),
      minStockKg: product.minStockKg,
      nextExpiryAt: nextExpiry?.expiresAt || null,
      nextExpiryDays: nextExpiry ? daysBetween(today, nextExpiry.expiresAt) : null,
      valuationCostBs: money(availableKg * product.costBs),
      valuationRetailBs: money(availableKg * product.priceBs),
      marginPct: Math.round(marginPct)
    };
  });
}

export function getInventorySummary(data, today = DEFAULT_TODAY) {
  const byProduct = getInventoryByProduct(data, today);
  const batchHealth = data.batches.map((batch) => ({
    batch,
    health: getBatchStatus(batch, today),
    product: getProduct(data, batch.productId)
  }));

  return {
    totalAvailableKg: roundKg(byProduct.reduce((sum, item) => sum + item.availableKg, 0)),
    totalBlockedKg: roundKg(byProduct.reduce((sum, item) => sum + item.blockedKg, 0)),
    valuationCostBs: money(byProduct.reduce((sum, item) => sum + item.valuationCostBs, 0)),
    valuationRetailBs: money(byProduct.reduce((sum, item) => sum + item.valuationRetailBs, 0)),
    expiredKg: roundKg(
      batchHealth
        .filter((item) => item.health.code === "vencido")
        .reduce((sum, item) => sum + Number(item.batch.remainingKg || 0), 0)
    ),
    expiring7DaysKg: roundKg(
      batchHealth
        .filter((item) => item.health.canSell && item.health.daysToExpire <= 7)
        .reduce((sum, item) => sum + Number(item.batch.remainingKg || 0), 0)
    ),
    lowStockProducts: byProduct.filter((item) => item.availableKg < item.minStockKg),
    byProduct
  };
}

export function getColdChainBreaches(data) {
  return data.coldChainLogs
    .map((log) => {
      const equipmentNumber = log.equipment.match(/\d+/)?.[0];
      const relatedProducts = data.batches
        .filter((batch) => batch.location.includes(equipmentNumber ? `Nevera ${equipmentNumber}` : log.equipment))
        .map((batch) => getProduct(data, batch.productId))
        .filter(Boolean);
      const minTemp = Math.min(...relatedProducts.map((product) => product.temperatureMinC), 0);
      const maxTemp = Math.max(...relatedProducts.map((product) => product.temperatureMaxC), 5);
      const breached = Number(log.temperatureC) < minTemp || Number(log.temperatureC) > maxTemp;
      return {
        ...log,
        minTemp,
        maxTemp,
        breached,
        relatedProducts: [...new Set(relatedProducts.map((product) => product.name))]
      };
    })
    .filter((log) => log.breached);
}

export function createAlertFeed(data, today = DEFAULT_TODAY) {
  const alerts = [];

  for (const batch of data.batches) {
    const product = getProduct(data, batch.productId);
    const health = getBatchStatus(batch, today);
    if (health.code === "vencido") {
      alerts.push({
        id: `expired-${batch.id}`,
        severity: "danger",
        title: "Lote vencido bloqueado",
        message: `${product?.name || "Producto"} lote ${batch.lotCode} vencio el ${batch.expiresAt}. Mantener separado y registrar decomiso.`,
        action: "Registrar merma/decomiso",
        entityId: batch.id
      });
    } else if (health.canSell && health.daysToExpire <= 7) {
      alerts.push({
        id: `expiry-${batch.id}`,
        severity: health.daysToExpire <= 3 ? "danger" : "warning",
        title: "Prioridad FEFO por caducidad",
        message: `${product?.name || "Producto"} lote ${batch.lotCode} vence en ${health.daysToExpire} dia(s).`,
        action: "Activar venta prioritaria",
        entityId: batch.id
      });
    } else if (health.code === "cuarentena") {
      alerts.push({
        id: `quarantine-${batch.id}`,
        severity: "danger",
        title: "Lote en cuarentena",
        message: `${product?.name || "Producto"} lote ${batch.lotCode} no puede venderse hasta liberacion documentada.`,
        action: "Resolver cuarentena",
        entityId: batch.id
      });
    }
  }

  for (const item of getInventorySummary(data, today).lowStockProducts) {
    alerts.push({
      id: `low-${item.product.id}`,
      severity: "info",
      title: "Stock por debajo del minimo",
      message: `${item.product.name} tiene ${item.availableKg} kg disponibles; minimo configurado ${item.minStockKg} kg.`,
      action: "Generar compra sugerida",
      entityId: item.product.id
    });
  }

  for (const breach of getColdChainBreaches(data)) {
    alerts.push({
      id: `temp-${breach.id}`,
      severity: "danger",
      title: "Desviacion de cadena de frio",
      message: `${breach.equipment} registro ${breach.temperatureC} C; rango esperado ${breach.minTemp}-${breach.maxTemp} C.`,
      action: "Documentar accion correctiva",
      entityId: breach.id
    });
  }

  for (const task of data.complianceTasks) {
    const daysToDue = daysBetween(today, task.dueDate);
    if (task.status !== "completado" && daysToDue <= 7) {
      alerts.push({
        id: `compliance-${task.id}`,
        severity: daysToDue < 0 ? "danger" : "warning",
        title: "Compromiso normativo pendiente",
        message: `${task.title} vence ${daysToDue < 0 ? "hace" : "en"} ${Math.abs(daysToDue)} dia(s).`,
        action: "Adjuntar evidencia",
        entityId: task.id
      });
    }
  }

  const weights = {
    danger: 0,
    warning: 1,
    info: 2,
    success: 3,
    neutral: 4
  };
  return alerts.sort((a, b) => weights[a.severity] - weights[b.severity] || a.title.localeCompare(b.title));
}

export function getSmartFefoRecommendations(data, today = DEFAULT_TODAY) {
  return data.batches
    .map((batch) => {
      const product = getProduct(data, batch.productId);
      const health = getBatchStatus(batch, today);
      const stockPressure =
        product && product.minStockKg > 0 ? Math.max(0, 1 - Number(batch.remainingKg || 0) / product.minStockKg) : 0;
      const expiryPressure = health.daysToExpire <= 0 ? 100 : Math.max(0, 100 - health.daysToExpire * 6);
      const valueAtRisk = Number(batch.remainingKg || 0) * Number(batch.costBs || product?.costBs || 0);
      const riskScore = Math.min(100, Math.round(expiryPressure + stockPressure * 12 + (valueAtRisk > 1500 ? 8 : 0)));

      let recommendation = "Mantener en rotacion normal.";
      if (!health.canSell) {
        recommendation = "Bloquear venta, separar fisicamente y documentar decision de calidad.";
      } else if (health.daysToExpire <= 3) {
        recommendation = "Crear combo de salida rapida, ubicar en primera linea y revisar sensorialmente cada turno.";
      } else if (health.daysToExpire <= 7) {
        recommendation = "Priorizar en mostrador y sugerir al vendedor antes de abrir lotes nuevos.";
      } else if (riskScore >= 70) {
        recommendation = "Monitorear diariamente por valor en riesgo y fecha cercana.";
      }

      return {
        batch,
        product,
        health,
        riskScore,
        valueAtRisk: money(valueAtRisk),
        recommendation,
        pickRoute: `${batch.location} -> balanza -> empaque -> caja`,
        voicePrompt: `Despachar ${product?.name || "producto"} lote ${batch.lotCode}, vence ${batch.expiresAt}.`
      };
    })
    .filter((item) => Number(item.batch.remainingKg) > 0)
    .sort((a, b) => b.riskScore - a.riskScore || parseLocalDate(a.batch.expiresAt) - parseLocalDate(b.batch.expiresAt));
}

export function validateBatchCompliance(data, batch) {
  const product = getProduct(data, batch.productId);
  const supplier = getSupplier(data, batch.supplierId);
  const issues = [];

  if (!batch.lotCode) issues.push("El lote no tiene codigo trazable.");
  if (!batch.expiresAt) issues.push("El lote no tiene fecha de vencimiento.");
  if (!batch.receivedAt) issues.push("El lote no tiene fecha de recepcion.");
  if (!batch.invoice) issues.push("Falta documento fiscal o factura de compra.");
  if (!supplier?.rif) issues.push("El proveedor no tiene RIF registrado.");
  if (!supplier?.sanitaryPermit) issues.push("El proveedor no tiene permiso sanitario registrado.");
  if (!product?.sanitaryRegistry) issues.push("El producto no tiene registro sanitario/ficha tecnica cargada.");
  if (Number(batch.receivingTempC) > Number(product?.temperatureMaxC ?? 5)) {
    issues.push("Temperatura de recepcion fuera del rango declarado.");
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function exportInventoryCsv(data, today = DEFAULT_TODAY) {
  const rows = [
    [
      "producto",
      "sku",
      "lote",
      "proveedor",
      "recibido",
      "vence",
      "dias_para_vencer",
      "kg_restantes",
      "estado",
      "ubicacion",
      "costo_bs"
    ]
  ];

  for (const batch of data.batches) {
    const product = getProduct(data, batch.productId);
    const supplier = getSupplier(data, batch.supplierId);
    const health = getBatchStatus(batch, today);
    rows.push([
      product?.name || batch.productId,
      product?.sku || "",
      batch.lotCode,
      supplier?.name || "",
      batch.receivedAt,
      batch.expiresAt,
      health.daysToExpire,
      batch.remainingKg,
      health.label,
      batch.location,
      batch.costBs
    ]);
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
