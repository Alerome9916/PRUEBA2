export const storageAreas = [
  {
    id: "vitrina-principal",
    name: "Vitrina principal",
    targetMin: 0,
    targetMax: 5,
    criticalMax: 7,
    backupPriority: 1
  },
  {
    id: "cava-refrigerada",
    name: "Cava refrigerada",
    targetMin: 0,
    targetMax: 4,
    criticalMax: 7,
    backupPriority: 2
  },
  {
    id: "congelador-a",
    name: "Congelador A",
    targetMin: -18,
    targetMax: -12,
    criticalMax: -8,
    backupPriority: 3
  },
  {
    id: "camion-reparto",
    name: "Camion de reparto",
    targetMin: 0,
    targetMax: 5,
    criticalMax: 7,
    backupPriority: 4
  }
];

export const venezuelaRules = [
  {
    id: "rga-arts-11-20",
    title: "Reglamento General de Alimentos",
    reference: "Art. 11, 15, 16, 20",
    description:
      "El establecimiento, equipos y utensilios deben proteger los alimentos contra alteracion, contaminacion y falta de higiene.",
    required: true,
    area: "infraestructura"
  },
  {
    id: "gaceta-36081-cadena-frio",
    title: "Buenas Practicas de Fabricacion, Almacenamiento y Transporte",
    reference: "Gaceta Oficial N. 36.081, Art. 79",
    description:
      "El almacenamiento y transporte deben evitar contaminacion, proliferacion microbiana y deterioro fisico; la cadena de frio debe controlarse.",
    required: true,
    area: "cadena_frio"
  },
  {
    id: "rotulado-es",
    title: "Rotulado y trazabilidad",
    reference: "Reglamento General de Alimentos y normativa sanitaria vigente",
    description:
      "Los productos deben identificarse en castellano con lote, fecha de vencimiento, conservacion y origen.",
    required: true,
    area: "etiquetado"
  },
  {
    id: "permiso-sanitario",
    title: "Permisos y soporte sanitario",
    reference: "Control sanitario local y ministerial",
    description:
      "La charcuteria debe mantener permisos, controles de limpieza, capacitacion y documentos de proveedores disponibles para inspeccion.",
    required: true,
    area: "documentacion"
  }
];

export const defaultState = {
  business: {
    name: "Charcuteria Los Churuguaros",
    rif: "J-50391245-1",
    branch: "Sede Principal - Caracas",
    manager: "Maria Fernanda Rojas"
  },
  configuration: {
    currency: "USD",
    today: "2026-06-05",
    criticalDays: 5,
    warningDays: 12,
    refrigerationLimit: 7,
    outageEscalationMinutes: 45
  },
  suppliers: [
    {
      id: "prov-01",
      name: "Embutidos Avila, C.A.",
      sanitaryRegistry: "S-19-45872",
      contact: "0212-5551234",
      coldChainCertified: true,
      riskLevel: "bajo"
    },
    {
      id: "prov-02",
      name: "Lacteos Capital",
      sanitaryRegistry: "S-22-88411",
      contact: "0212-5557788",
      coldChainCertified: true,
      riskLevel: "medio"
    },
    {
      id: "prov-03",
      name: "Distribuidora Andina 77",
      sanitaryRegistry: "S-18-55210",
      contact: "0243-1119022",
      coldChainCertified: false,
      riskLevel: "alto"
    }
  ],
  products: [
    {
      id: "prod-01",
      name: "Jamon de pierna premium",
      category: "embutidos",
      unit: "kg",
      storageAreaId: "vitrina-principal",
      minStock: 18,
      maxStock: 120,
      dailyDemand: 7,
      margin: 0.34
    },
    {
      id: "prod-02",
      name: "Queso paisa",
      category: "lacteos",
      unit: "kg",
      storageAreaId: "cava-refrigerada",
      minStock: 15,
      maxStock: 90,
      dailyDemand: 5,
      margin: 0.28
    },
    {
      id: "prod-03",
      name: "Mortadela especial",
      category: "embutidos",
      unit: "kg",
      storageAreaId: "vitrina-principal",
      minStock: 12,
      maxStock: 100,
      dailyDemand: 4,
      margin: 0.31
    },
    {
      id: "prod-04",
      name: "Tocineta ahumada",
      category: "carnicos",
      unit: "kg",
      storageAreaId: "congelador-a",
      minStock: 10,
      maxStock: 80,
      dailyDemand: 2,
      margin: 0.4
    }
  ],
  lots: [
    {
      id: "lot-001",
      productId: "prod-01",
      lotCode: "JP-0601-A",
      supplierId: "prov-01",
      receivedAt: "2026-06-01",
      expiresAt: "2026-06-10",
      quantity: 28,
      cost: 7.9,
      salePrice: 12.5,
      storageAreaId: "vitrina-principal",
      sanitaryStatus: "aprobado",
      labelComplete: true,
      lastTempC: 4.1
    },
    {
      id: "lot-002",
      productId: "prod-01",
      lotCode: "JP-0604-B",
      supplierId: "prov-01",
      receivedAt: "2026-06-04",
      expiresAt: "2026-06-16",
      quantity: 36,
      cost: 8.1,
      salePrice: 12.8,
      storageAreaId: "cava-refrigerada",
      sanitaryStatus: "aprobado",
      labelComplete: true,
      lastTempC: 3.8
    },
    {
      id: "lot-003",
      productId: "prod-02",
      lotCode: "QP-0602-C",
      supplierId: "prov-02",
      receivedAt: "2026-06-02",
      expiresAt: "2026-06-09",
      quantity: 19,
      cost: 6.4,
      salePrice: 10.9,
      storageAreaId: "vitrina-principal",
      sanitaryStatus: "aprobado",
      labelComplete: true,
      lastTempC: 5.5
    },
    {
      id: "lot-004",
      productId: "prod-03",
      lotCode: "ME-0530-D",
      supplierId: "prov-03",
      receivedAt: "2026-05-30",
      expiresAt: "2026-06-07",
      quantity: 14,
      cost: 5.8,
      salePrice: 9.7,
      storageAreaId: "vitrina-principal",
      sanitaryStatus: "en-observacion",
      labelComplete: false,
      lastTempC: 6.8
    },
    {
      id: "lot-005",
      productId: "prod-04",
      lotCode: "TA-0522-E",
      supplierId: "prov-03",
      receivedAt: "2026-05-22",
      expiresAt: "2026-07-28",
      quantity: 30,
      cost: 4.9,
      salePrice: 8.4,
      storageAreaId: "congelador-a",
      sanitaryStatus: "aprobado",
      labelComplete: true,
      lastTempC: -14.2
    }
  ],
  temperatureLogs: [
    {
      id: "temp-01",
      storageAreaId: "vitrina-principal",
      recordedAt: "2026-06-05T08:00:00",
      tempC: 5.9,
      humidity: 68,
      status: "ok"
    },
    {
      id: "temp-02",
      storageAreaId: "vitrina-principal",
      recordedAt: "2026-06-05T12:15:00",
      tempC: 7.4,
      humidity: 71,
      status: "desviacion"
    },
    {
      id: "temp-03",
      storageAreaId: "cava-refrigerada",
      recordedAt: "2026-06-05T08:05:00",
      tempC: 3.9,
      humidity: 66,
      status: "ok"
    },
    {
      id: "temp-04",
      storageAreaId: "congelador-a",
      recordedAt: "2026-06-05T08:10:00",
      tempC: -13.5,
      humidity: 44,
      status: "ok"
    }
  ],
  powerEvents: [
    {
      id: "power-01",
      startedAt: "2026-06-04T17:30:00",
      minutes: 32,
      affectedAreaId: "vitrina-principal",
      generatorActivated: true,
      notes: "Respuesta operativa adecuada."
    },
    {
      id: "power-02",
      startedAt: "2026-06-02T14:10:00",
      minutes: 68,
      affectedAreaId: "vitrina-principal",
      generatorActivated: false,
      notes: "Se aplico venta priorizada y traslado parcial a cava."
    }
  ],
  permits: [
    {
      id: "permit-01",
      name: "Permiso sanitario del establecimiento",
      expiresAt: "2026-09-20",
      owner: "Gerencia"
    },
    {
      id: "permit-02",
      name: "Certificados de manipulacion del personal",
      expiresAt: "2026-07-15",
      owner: "RRHH"
    },
    {
      id: "permit-03",
      name: "Plan de limpieza y desinfeccion",
      expiresAt: "2026-06-20",
      owner: "Calidad"
    }
  ],
  tasks: [
    {
      id: "task-01",
      title: "Rotar lote ME-0530-D al frente de venta",
      type: "fefo",
      priority: "alta",
      dueDate: "2026-06-05",
      status: "pendiente"
    },
    {
      id: "task-02",
      title: "Revisar etiqueta incompleta del lote ME-0530-D",
      type: "sanidad",
      priority: "alta",
      dueDate: "2026-06-05",
      status: "pendiente"
    },
    {
      id: "task-03",
      title: "Actualizar certificados de manipulacion",
      type: "cumplimiento",
      priority: "media",
      dueDate: "2026-07-01",
      status: "en progreso"
    }
  ],
  traceability: [
    {
      id: "trz-01",
      lotId: "lot-001",
      action: "recepcion",
      timestamp: "2026-06-01T07:40:00",
      actor: "Ana Perez",
      notes: "Temperatura de recepcion 3.8 C."
    },
    {
      id: "trz-02",
      lotId: "lot-003",
      action: "movimiento",
      timestamp: "2026-06-04T11:20:00",
      actor: "Carlos Leon",
      notes: "Traslado de cava a vitrina por alta demanda."
    },
    {
      id: "trz-03",
      lotId: "lot-004",
      action: "inspeccion",
      timestamp: "2026-06-05T09:00:00",
      actor: "Yelitza Romero",
      notes: "Etiqueta incompleta detectada. Lote en observacion."
    }
  ]
};
