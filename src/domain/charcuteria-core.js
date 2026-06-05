const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const BUSINESS = Object.freeze({
  name: "Charcuteria Los Churuguaros",
  rif: "J-00000000-0",
  location: "Churuguara, estado Falcon, Venezuela",
  slogan: "Frescura controlada, rotacion segura",
  currency: "VES"
});

export const STORAGE_ZONES = Object.freeze({
  refrigerated: {
    label: "Refrigerado",
    minC: 0,
    maxC: 5,
    venezuelanControl: "Cadena de frio documentada para productos carnicos, lacteos y preparados."
  },
  frozen: {
    label: "Congelado",
    minC: -22,
    maxC: -12,
    venezuelanControl: "Control de congelacion y ausencia de recongelamiento."
  },
  dry: {
    label: "Seco",
    minC: 15,
    maxC: 28,
    venezuelanControl: "Almacen limpio, ventilado y separado de quimicos."
  }
});

export const PRODUCT_CATEGORIES = Object.freeze([
  "Embutidos",
  "Quesos",
  "Carnes curadas",
  "Lacteos",
  "Encurtidos",
  "Preparados",
  "Insumos"
]);

export const VENEZUELAN_COMPLIANCE = Object.freeze([
  {
    id: "sacs-permiso-sanitario",
    authority: "Servicio Autonomo de Contraloria Sanitaria (SACS)",
    title: "Permiso sanitario y condiciones higienico-sanitarias",
    appliesTo: "Establecimiento, manipuladores, areas de corte, neveras y vitrinas",
    control: "Mantener permiso vigente, inspecciones internas, limpieza documentada y control de plagas.",
    evidence: "Permiso sanitario, actas de inspeccion, plan POES, bitacora de saneamiento.",
    frequency: "Vigencia legal e inspeccion interna semanal",
    severity: "critica"
  },
  {
    id: "bpm-poes",
    authority: "Buenas Practicas de Manufactura / POES",
    title: "Manipulacion segura de alimentos",
    appliesTo: "Recepcion, desposte, rebanado, empaque, despacho y degustaciones",
    control: "Separar crudos/listos para consumo, usar utensilios sanitizados y registrar limpieza por turno.",
    evidence: "Checklist BPM, registro de limpieza, control de uniforme y lavado de manos.",
    frequency: "Por turno",
    severity: "critica"
  },
  {
    id: "cadena-frio",
    authority: "Normativa sanitaria venezolana y criterios COVENIN aplicables",
    title: "Cadena de frio y temperatura de conservacion",
    appliesTo: "Quesos, jamones, mortadelas, chorizos, carnes curadas y productos preparados",
    control: "Registrar temperaturas, bloquear venta si hay ruptura sostenida y priorizar lotes FEFO.",
    evidence: "Bitacora de temperatura, acciones correctivas, reporte de bloqueo de lote.",
    frequency: "Apertura, medio turno y cierre",
    severity: "critica"
  },
  {
    id: "etiquetado",
    authority: "SENCAMER / normas COVENIN de rotulado y metrologia",
    title: "Etiquetado, peso neto y datos del producto",
    appliesTo: "Productos reempacados o fraccionados en tienda",
    control: "Mostrar nombre, lote, peso, fecha de empaque, fecha de vencimiento, precio y origen.",
    evidence: "Etiqueta generada, lote trazable, calibracion de balanza.",
    frequency: "Cada empaque",
    severity: "alta"
  },
  {
    id: "senasag-no",
    authority: "SENIAT / facturacion fiscal",
    title: "Documentacion fiscal de compras y ventas",
    appliesTo: "Compras a proveedores, ventas al detal y cierres de caja",
    control: "Conservar facturas, notas de entrega, RIF de proveedores y correlativos de venta.",
    evidence: "Factura fiscal, libro de compras, reporte Z o cierre diario.",
    frequency: "Cada transaccion",
    severity: "alta"
  },
  {
    id: "trazabilidad-retiro",
    authority: "Sistema interno de inocuidad alimentaria",
    title: "Trazabilidad y retiro preventivo",
    appliesTo: "Lotes con alerta sanitaria, devoluciones, reclamos o ruptura de frio",
    control: "Identificar origen-destino del lote, bloquear existencias y generar lista de clientes afectados.",
    evidence: "Acta de bloqueo, reporte de retiro, historial de ventas por lote.",
    frequency: "Ante incidente",
    severity: "critica"
  }
]);

export const seedData = Object.freeze({
  suppliers: [
    {
      id: "prov-avila",
      name: "Distribuidora Carnica Avila",
      rif: "J-40111222-3",
      phone: "+58 412-1112233",
      sanitaryPermit: "SACS-DC-2026-0154",
      risk: "bajo",
      leadTimeDays: 2
    },
    {
      id: "prov-coro",
      name: "Quesos Artesanales de Coro",
      rif: "J-30999888-1",
      phone: "+58 414-5557788",
      sanitaryPermit: "SACS-LAC-2026-0801",
      risk: "medio",
      leadTimeDays: 3
    },
    {
      id: "prov-turmero",
      name: "Embutidos Turmero C.A.",
      rif: "J-29888777-0",
      phone: "+58 424-7708899",
      sanitaryPermit: "SACS-EMB-2026-0440",
      risk: "bajo",
      leadTimeDays: 4
    }
  ],
  products: [
    {
      id: "jamon-pierna",
      sku: "CHU-JP-001",
      name: "Jamon de pierna ahumado",
      category: "Embutidos",
      storageZone: "refrigerated",
      unit: "kg",
      reorderPoint: 12,
      targetStock: 36,
      minShelfLifeForSaleDays: 2,
      price: 8.7,
      vatRate: 0.16,
      requiresLabel: true
    },
    {
      id: "queso-guayanes",
      sku: "CHU-QG-002",
      name: "Queso guayanes",
      category: "Quesos",
      storageZone: "refrigerated",
      unit: "kg",
      reorderPoint: 10,
      targetStock: 28,
      minShelfLifeForSaleDays: 1,
      price: 7.2,
      vatRate: 0,
      requiresLabel: true
    },
    {
      id: "mortadela-tapara",
      sku: "CHU-MT-003",
      name: "Mortadela con aceitunas",
      category: "Embutidos",
      storageZone: "refrigerated",
      unit: "kg",
      reorderPoint: 15,
      targetStock: 45,
      minShelfLifeForSaleDays: 3,
      price: 4.9,
      vatRate: 0.16,
      requiresLabel: true
    },
    {
      id: "chorizo-ahumado",
      sku: "CHU-CA-004",
      name: "Chorizo ahumado artesanal",
      category: "Carnes curadas",
      storageZone: "refrigerated",
      unit: "kg",
      reorderPoint: 8,
      targetStock: 24,
      minShelfLifeForSaleDays: 4,
      price: 6.1,
      vatRate: 0.16,
      requiresLabel: true
    },
    {
      id: "aceituna-rellena",
      sku: "CHU-AR-005",
      name: "Aceitunas rellenas",
      category: "Encurtidos",
      storageZone: "dry",
      unit: "kg",
      reorderPoint: 5,
      targetStock: 18,
      minShelfLifeForSaleDays: 10,
      price: 5.4,
      vatRate: 0.16,
      requiresLabel: true
    },
    {
      id: "ensalada-gallina",
      sku: "CHU-EG-006",
      name: "Ensalada de gallina lista para servir",
      category: "Preparados",
      storageZone: "refrigerated",
      unit: "kg",
      reorderPoint: 4,
      targetStock: 12,
      minShelfLifeForSaleDays: 1,
      price: 6.8,
      vatRate: 0,
      requiresLabel: true
    }
  ],
  lots: [
    {
      id: "L-260601-JP",
      productId: "jamon-pierna",
      supplierId: "prov-avila",
      receivedAt: "2026-06-01",
      expiresAt: "2026-06-08",
      quantity: 9.5,
      cost: 5.1,
      storageZone: "refrigerated",
      sanitaryPermit: "SACS-DC-2026-0154",
      status: "available",
      location: "Nevera 1 / Bandeja A",
      temperatureAtReception: 3.1
    },
    {
      id: "L-260604-JP",
      productId: "jamon-pierna",
      supplierId: "prov-avila",
      receivedAt: "2026-06-04",
      expiresAt: "2026-06-18",
      quantity: 18,
      cost: 5.2,
      storageZone: "refrigerated",
      sanitaryPermit: "SACS-DC-2026-0154",
      status: "available",
      location: "Nevera 1 / Bandeja B",
      temperatureAtReception: 2.8
    },
    {
      id: "L-260602-QG",
      productId: "queso-guayanes",
      supplierId: "prov-coro",
      receivedAt: "2026-06-02",
      expiresAt: "2026-06-06",
      quantity: 5.25,
      cost: 4.3,
      storageZone: "refrigerated",
      sanitaryPermit: "SACS-LAC-2026-0801",
      status: "available",
      location: "Vitrina fria / Quesos",
      temperatureAtReception: 4.2
    },
    {
      id: "L-260604-QG",
      productId: "queso-guayanes",
      supplierId: "prov-coro",
      receivedAt: "2026-06-04",
      expiresAt: "2026-06-10",
      quantity: 11,
      cost: 4.1,
      storageZone: "refrigerated",
      sanitaryPermit: "SACS-LAC-2026-0801",
      status: "available",
      location: "Nevera 2 / Quesos",
      temperatureAtReception: 3.7
    },
    {
      id: "L-260528-MT",
      productId: "mortadela-tapara",
      supplierId: "prov-turmero",
      receivedAt: "2026-05-28",
      expiresAt: "2026-06-07",
      quantity: 13.7,
      cost: 2.6,
      storageZone: "refrigerated",
      sanitaryPermit: "SACS-EMB-2026-0440",
      status: "available",
      location: "Nevera 1 / Bandeja C",
      temperatureAtReception: 3
    },
    {
      id: "L-260603-CA",
      productId: "chorizo-ahumado",
      supplierId: "prov-turmero",
      receivedAt: "2026-06-03",
      expiresAt: "2026-06-20",
      quantity: 7.5,
      cost: 3.8,
      storageZone: "refrigerated",
      sanitaryPermit: "SACS-EMB-2026-0440",
      status: "available",
      location: "Nevera 3 / Curados",
      temperatureAtReception: 2.4
    },
    {
      id: "L-260520-AR",
      productId: "aceituna-rellena",
      supplierId: "prov-avila",
      receivedAt: "2026-05-20",
      expiresAt: "2026-08-30",
      quantity: 9,
      cost: 2.9,
      storageZone: "dry",
      sanitaryPermit: "SACS-DC-2026-0154",
      status: "available",
      location: "Estante seco / Frascos",
      temperatureAtReception: 24
    },
    {
      id: "L-260605-EG",
      productId: "ensalada-gallina",
      supplierId: "prov-avila",
      receivedAt: "2026-06-05",
      expiresAt: "2026-06-06",
      quantity: 3.2,
      cost: 3.4,
      storageZone: "refrigerated",
      sanitaryPermit: "SACS-DC-2026-0154",
      status: "available",
      location: "Vitrina fria / Preparados",
      temperatureAtReception: 2.6
    }
  ],
  sales: [
    {
      id: "V-260605-001",
      customer: "Venta mostrador",
      date: "2026-06-05",
      items: [
        { productId: "jamon-pierna", lotId: "L-260601-JP", quantity: 1.2, price: 8.7 },
        { productId: "queso-guayanes", lotId: "L-260602-QG", quantity: 0.8, price: 7.2 }
      ]
    }
  ],
  temperatureLogs: [
    {
      id: "TMP-001",
      zone: "refrigerated",
      equipment: "Nevera 1",
      measuredAt: "2026-06-05T08:00:00-04:00",
      valueC: 3.4,
      responsible: "Encargado de apertura",
      correctiveAction: ""
    },
    {
      id: "TMP-002",
      zone: "refrigerated",
      equipment: "Vitrina fria",
      measuredAt: "2026-06-05T12:30:00-04:00",
      valueC: 6.2,
      responsible: "Turno medio dia",
      correctiveAction: "Se ajusto termostato y se movieron preparados a Nevera 2 hasta estabilizar."
    },
    {
      id: "TMP-003",
      zone: "dry",
      equipment: "Estante seco",
      measuredAt: "2026-06-05T09:00:00-04:00",
      valueC: 25,
      responsible: "Encargado de apertura",
      correctiveAction: ""
    }
  ],
  sanitationTasks: [
    {
      id: "SAN-001",
      area: "Rebanadora",
      action: "Desarme, lavado, desinfeccion y verificacion visual",
      frequency: "Cada 4 horas y al cambiar de producto",
      lastDoneAt: "2026-06-05T12:00:00-04:00",
      responsible: "Turno medio dia",
      status: "ok"
    },
    {
      id: "SAN-002",
      area: "Vitrina fria",
      action: "Limpieza de superficies y revision de goteo",
      frequency: "Apertura y cierre",
      lastDoneAt: "2026-06-05T07:30:00-04:00",
      responsible: "Encargado de apertura",
      status: "ok"
    },
    {
      id: "SAN-003",
      area: "Balanza etiquetadora",
      action: "Limpieza, prueba de etiqueta y verificacion de peso",
      frequency: "Diaria",
      lastDoneAt: "2026-06-04T18:00:00-04:00",
      responsible: "Cierre anterior",
      status: "attention"
    }
  ]
});

export function parseDate(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Fecha invalida: ${value}`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(value) {
  return parseDate(value).toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.floor((parseDate(to).getTime() - parseDate(from).getTime()) / MS_PER_DAY);
}

export function daysUntilExpiration(lot, today = new Date()) {
  return daysBetween(formatDate(today), lot.expiresAt);
}

export function roundQuantity(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

export function availableLots(lots) {
  return lots.filter((lot) => lot.status === "available" && Number(lot.quantity) > 0);
}

export function sortLotsFefo(lots) {
  return [...lots].sort((a, b) => {
    const byExpiry = parseDate(a.expiresAt).getTime() - parseDate(b.expiresAt).getTime();
    if (byExpiry !== 0) return byExpiry;

    const byReceived = parseDate(a.receivedAt).getTime() - parseDate(b.receivedAt).getTime();
    if (byReceived !== 0) return byReceived;

    return a.id.localeCompare(b.id);
  });
}

export function getProductLots(productId, lots, options = {}) {
  const includeBlocked = options.includeBlocked ?? false;
  const productLots = lots.filter((lot) => lot.productId === productId);
  return sortLotsFefo(includeBlocked ? productLots : availableLots(productLots));
}

export function getStockByProduct(products, lots) {
  return products.map((product) => {
    const productLots = getProductLots(product.id, lots);
    const stock = productLots.reduce((sum, lot) => sum + Number(lot.quantity), 0);
    const nextLot = productLots[0];
    return {
      ...product,
      stock: roundQuantity(stock),
      nextExpiration: nextLot?.expiresAt ?? null,
      nextLotId: nextLot?.id ?? null,
      belowReorderPoint: stock <= Number(product.reorderPoint),
      suggestedPurchase: Math.max(0, roundQuantity(Number(product.targetStock) - stock))
    };
  });
}

export function getLotStatus(lot, today = new Date()) {
  if (lot.status === "blocked") return "blocked";
  if (lot.status === "quarantine") return "quarantine";

  const days = daysUntilExpiration(lot, today);
  if (days < 0) return "expired";
  if (days === 0) return "expiresToday";
  if (days <= 2) return "critical";
  if (days <= 5) return "warning";
  return "healthy";
}

export function getLotStatusLabel(status) {
  const labels = {
    blocked: "Bloqueado",
    quarantine: "Cuarentena",
    expired: "Vencido",
    expiresToday: "Vence hoy",
    critical: "Critico",
    warning: "Vigilar",
    healthy: "Saludable"
  };
  return labels[status] ?? status;
}

export function allocateSaleFefo({ productId, quantity, lots, today = new Date(), minShelfLifeDays = 0 }) {
  if (!productId) throw new Error("Debe indicar el producto.");
  if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    throw new Error("La cantidad debe ser mayor a cero.");
  }

  const todayText = formatDate(today);
  let remaining = Number(quantity);
  const allocations = [];
  const candidates = getProductLots(productId, lots).filter((lot) => {
    const days = daysBetween(todayText, lot.expiresAt);
    return days >= Number(minShelfLifeDays);
  });

  for (const lot of candidates) {
    if (remaining <= 0) break;
    const taken = Math.min(Number(lot.quantity), remaining);
    allocations.push({
      lotId: lot.id,
      productId,
      quantity: roundQuantity(taken),
      expiresAt: lot.expiresAt
    });
    remaining = roundQuantity(remaining - taken);
  }

  if (remaining > 0) {
    const available = roundQuantity(Number(quantity) - remaining);
    throw new Error(
      `Stock insuficiente FEFO para ${productId}. Disponible con vida util minima: ${available}, faltante: ${remaining}.`
    );
  }

  return allocations;
}

export function applySaleAllocations(lots, allocations) {
  return lots.map((lot) => {
    const allocation = allocations.find((item) => item.lotId === lot.id);
    if (!allocation) return lot;
    return {
      ...lot,
      quantity: roundQuantity(Number(lot.quantity) - Number(allocation.quantity))
    };
  });
}

export function createSale({ products, lots, customer = "Venta mostrador", items, today = new Date() }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("La venta debe tener al menos un producto.");
  }

  let workingLots = lots;
  const saleItems = [];

  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product) throw new Error(`Producto no encontrado: ${item.productId}`);

    const allocations = allocateSaleFefo({
      productId: item.productId,
      quantity: item.quantity,
      lots: workingLots,
      today,
      minShelfLifeDays: product.minShelfLifeForSaleDays
    });

    saleItems.push(
      ...allocations.map((allocation) => ({
        ...allocation,
        price: Number(product.price),
        productName: product.name,
        lineTotal: roundMoney(Number(product.price) * Number(allocation.quantity))
      }))
    );

    workingLots = applySaleAllocations(workingLots, allocations);
  }

  const subtotal = saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = saleItems.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + item.lineTotal * Number(product?.vatRate ?? 0);
  }, 0);

  return {
    sale: {
      id: `V-${formatDate(today).replaceAll("-", "")}-${String(Date.now()).slice(-4)}`,
      customer,
      date: formatDate(today),
      items: saleItems,
      subtotal: roundMoney(subtotal),
      tax: roundMoney(tax),
      total: roundMoney(subtotal + tax)
    },
    lots: workingLots
  };
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function getExpirationAlerts(products, lots, today = new Date()) {
  return sortLotsFefo(lots)
    .map((lot) => {
      const product = products.find((entry) => entry.id === lot.productId);
      const status = getLotStatus(lot, today);
      const days = daysUntilExpiration(lot, today);
      return {
        lotId: lot.id,
        productId: lot.productId,
        productName: product?.name ?? lot.productId,
        quantity: Number(lot.quantity),
        expiresAt: lot.expiresAt,
        days,
        status,
        statusLabel: getLotStatusLabel(status),
        action: recommendExpirationAction(status, lot, product),
        location: lot.location
      };
    })
    .filter((alert) => alert.status !== "healthy");
}

export function recommendExpirationAction(status, lot, product) {
  const unit = product?.unit ?? "und";
  if (status === "expired") return "Retirar de venta, bloquear lote y levantar acta sanitaria.";
  if (status === "blocked") return "Mantener bloqueado hasta cierre de investigacion.";
  if (status === "quarantine") return "Esperar liberacion del responsable sanitario.";
  if (status === "expiresToday") return `Vender solo si es inocuo y permitido; preparar combo FEFO por ${lot.quantity} ${unit}.`;
  if (status === "critical") return "Priorizar en mostrador, combos y degustacion controlada con etiqueta visible.";
  if (status === "warning") return "Ubicar al frente de vitrina y revisar demanda del dia.";
  return "Continuar rotacion FEFO.";
}

export function getTemperatureIncidents(logs) {
  return logs
    .map((log) => {
      const zone = STORAGE_ZONES[log.zone];
      if (!zone) {
        return { ...log, ok: false, message: "Zona de almacenamiento desconocida." };
      }

      const value = Number(log.valueC);
      const ok = value >= zone.minC && value <= zone.maxC;
      return {
        ...log,
        ok,
        range: `${zone.minC} a ${zone.maxC} C`,
        message: ok
          ? "Temperatura dentro del rango."
          : `Temperatura fuera de rango para ${zone.label}; requiere accion correctiva.`
      };
    })
    .filter((entry) => !entry.ok);
}

export function getComplianceScore({ products, lots, suppliers, temperatureLogs, sanitationTasks }, today = new Date()) {
  const checks = [
    {
      id: "lotes-vigentes",
      label: "Lotes sin vencidos disponibles",
      passed: !lots.some((lot) => lot.status === "available" && getLotStatus(lot, today) === "expired")
    },
    {
      id: "proveedores-permiso",
      label: "Proveedores con permiso sanitario",
      passed: suppliers.every((supplier) => Boolean(supplier.sanitaryPermit))
    },
    {
      id: "temperatura",
      label: "Temperaturas en rango",
      passed: getTemperatureIncidents(temperatureLogs).length === 0
    },
    {
      id: "etiquetas",
      label: "Productos fraccionados con etiqueta obligatoria",
      passed: products.every((product) => product.requiresLabel)
    },
    {
      id: "saneamiento",
      label: "Tareas POES sin atrasos criticos",
      passed: sanitationTasks.every((task) => task.status !== "overdue")
    }
  ];

  const passed = checks.filter((check) => check.passed).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    checks
  };
}

export function getChuruguarosRadar(products, lots, today = new Date()) {
  const stock = getStockByProduct(products, lots);
  const alerts = getExpirationAlerts(products, lots, today);
  const marginAtRisk = alerts.reduce((sum, alert) => {
    const product = products.find((entry) => entry.id === alert.productId);
    return sum + Number(alert.quantity) * Number(product?.price ?? 0);
  }, 0);

  const bundles = alerts
    .filter((alert) => ["expiresToday", "critical", "warning"].includes(alert.status))
    .slice(0, 4)
    .map((alert, index) => ({
      id: `combo-${index + 1}`,
      name: `Combo FEFO ${alert.productName}`,
      lotId: alert.lotId,
      discountPercent: alert.status === "expiresToday" ? 25 : alert.status === "critical" ? 18 : 10,
      reason: `${alert.statusLabel}: ${alert.quantity} disponibles hasta ${alert.expiresAt}`,
      expectedRecovery: roundMoney(Number(alert.quantity) * Number(products.find((p) => p.id === alert.productId)?.price ?? 0) * 0.85)
    }));

  return {
    generatedAt: formatDate(today),
    marginAtRisk: roundMoney(marginAtRisk),
    lowStock: stock.filter((item) => item.belowReorderPoint),
    bundles,
    insight:
      bundles.length > 0
        ? "Activar combos FEFO antes del cierre y ubicar los lotes al frente de la vitrina."
        : "La rotacion esta estable; mantener monitoreo de temperaturas y reposicion."
  };
}

export function buildTraceabilityReport({ lotId, lots, products, suppliers, sales }) {
  const lot = lots.find((entry) => entry.id === lotId);
  if (!lot) throw new Error(`Lote no encontrado: ${lotId}`);

  const product = products.find((entry) => entry.id === lot.productId);
  const supplier = suppliers.find((entry) => entry.id === lot.supplierId);
  const affectedSales = sales
    .map((sale) => ({
      ...sale,
      items: sale.items.filter((item) => item.lotId === lotId)
    }))
    .filter((sale) => sale.items.length > 0);

  return {
    lot,
    product,
    supplier,
    affectedSales,
    recallSteps: [
      "Bloquear fisicamente el lote y marcarlo como no vendible.",
      "Separar producto en cuarentena sanitaria con responsable asignado.",
      "Identificar ventas afectadas y contactar clientes si aplica.",
      "Notificar al proveedor y conservar factura/nota de entrega.",
      "Registrar disposicion final y accion correctiva."
    ]
  };
}

export function cloneSeedData() {
  return JSON.parse(JSON.stringify(seedData));
}
