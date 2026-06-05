export const seedState = {
  meta: {
    businessName: "Los Churuguaros",
    location: "Caracas, Venezuela",
    coldChainToleranceMinutes: 30
  },
  suppliers: [
    { id: "prov-frigo", name: "Frigorificos del Centro", permitCode: "SACS-VC-22041" },
    { id: "prov-andes", name: "Lacteos Los Andes", permitCode: "SACS-VC-19873" },
    { id: "prov-embut", name: "Embutidos La Colina", permitCode: "SACS-VC-31077" }
  ],
  zones: [
    { id: "camara-1", name: "Camara 1", maxTemperatureC: 4 },
    { id: "camara-2", name: "Camara 2", maxTemperatureC: 4 },
    { id: "vitrina-a", name: "Vitrina A", maxTemperatureC: 7 },
    { id: "vitrina-b", name: "Vitrina B", maxTemperatureC: 7 }
  ],
  products: [
    {
      id: "jamon-cocido",
      name: "Jamon cocido premium",
      category: "Embutido",
      storageTempMax: 4,
      openShelfLifeDays: 5,
      dailyDemandKg: 9,
      reorderPointKg: 18,
      averageMarginPercent: 22
    },
    {
      id: "mortadela-pimienta",
      name: "Mortadela con pimienta",
      category: "Embutido",
      storageTempMax: 4,
      openShelfLifeDays: 4,
      dailyDemandKg: 7,
      reorderPointKg: 14,
      averageMarginPercent: 18
    },
    {
      id: "queso-guayanes",
      name: "Queso guayanes artesanal",
      category: "Lacteo",
      storageTempMax: 4,
      openShelfLifeDays: 3,
      dailyDemandKg: 11,
      reorderPointKg: 16,
      averageMarginPercent: 24
    },
    {
      id: "pepperoni",
      name: "Pepperoni rebanado",
      category: "Especialidad",
      storageTempMax: 4,
      openShelfLifeDays: 7,
      dailyDemandKg: 4,
      reorderPointKg: 8,
      averageMarginPercent: 30
    },
    {
      id: "tocineta",
      name: "Tocineta ahumada",
      category: "Especialidad",
      storageTempMax: 4,
      openShelfLifeDays: 6,
      dailyDemandKg: 5,
      reorderPointKg: 9,
      averageMarginPercent: 26
    }
  ],
  lots: [
    {
      id: "LCH-240601-01",
      batch: "JC-7781",
      productId: "jamon-cocido",
      supplierId: "prov-frigo",
      zone: "camara-1",
      quantityKg: 34,
      reservedKg: 4,
      receivedAt: "2026-06-01",
      expiryAt: "2026-06-10",
      openedAt: "2026-06-04",
      costPerKg: 8.3,
      invoice: "F001-8821",
      sanitaryPermit: true,
      labelCheck: true,
      notes: "Listo para vitrina y despacho"
    },
    {
      id: "LCH-240602-02",
      batch: "MP-5520",
      productId: "mortadela-pimienta",
      supplierId: "prov-embut",
      zone: "vitrina-a",
      quantityKg: 22,
      reservedKg: 2,
      receivedAt: "2026-06-02",
      expiryAt: "2026-06-08",
      openedAt: "2026-06-02",
      costPerKg: 5.9,
      invoice: "F002-1140",
      sanitaryPermit: true,
      labelCheck: true,
      notes: "Alta rotacion en mostrador"
    },
    {
      id: "LCH-240603-03",
      batch: "QG-192",
      productId: "queso-guayanes",
      supplierId: "prov-andes",
      zone: "camara-2",
      quantityKg: 18,
      reservedKg: 0,
      receivedAt: "2026-06-03",
      expiryAt: "2026-06-07",
      openedAt: "2026-06-03",
      costPerKg: 7.1,
      invoice: "F003-7710",
      sanitaryPermit: true,
      labelCheck: true,
      notes: "Lote en observacion por retiro preventivo previo"
    },
    {
      id: "LCH-240530-04",
      batch: "PP-984",
      productId: "pepperoni",
      supplierId: "prov-embut",
      zone: "vitrina-b",
      quantityKg: 11,
      reservedKg: 1,
      receivedAt: "2026-05-30",
      expiryAt: "2026-06-15",
      openedAt: null,
      costPerKg: 10.9,
      invoice: "F004-5521",
      sanitaryPermit: false,
      labelCheck: true,
      notes: "Pendiente validar soporte del proveedor"
    },
    {
      id: "LCH-240531-05",
      batch: "TC-3001",
      productId: "tocineta",
      supplierId: "prov-frigo",
      zone: "camara-2",
      quantityKg: 15,
      reservedKg: 0,
      receivedAt: "2026-05-31",
      expiryAt: "2026-06-12",
      openedAt: null,
      costPerKg: 9.4,
      invoice: "F005-4408",
      sanitaryPermit: true,
      labelCheck: false,
      notes: "Falta confirmar marbete de conservacion"
    },
    {
      id: "LCH-240605-06",
      batch: "JC-7795",
      productId: "jamon-cocido",
      supplierId: "prov-frigo",
      zone: "vitrina-a",
      quantityKg: 13,
      reservedKg: 0,
      receivedAt: "2026-06-05",
      expiryAt: "2026-06-16",
      openedAt: null,
      costPerKg: 8.5,
      invoice: "F006-4421",
      sanitaryPermit: true,
      labelCheck: true,
      notes: "Reposicion de vitrina"
    }
  ],
  tempLogs: [
    { id: "TMP-1", zone: "camara-1", recordedAt: "2026-06-05T08:10", temperatureC: 3.2, humidity: 76 },
    { id: "TMP-2", zone: "camara-2", recordedAt: "2026-06-05T08:12", temperatureC: 5.1, humidity: 78 },
    { id: "TMP-3", zone: "vitrina-a", recordedAt: "2026-06-05T09:05", temperatureC: 6.5, humidity: 69 },
    { id: "TMP-4", zone: "vitrina-b", recordedAt: "2026-06-05T09:00", temperatureC: 4.0, humidity: 70 }
  ],
  cleaningTasks: [
    {
      id: "CL-1",
      zone: "camara-1",
      task: "Sanitizacion de estantes",
      owner: "Mariela",
      dueAt: "2026-06-05T18:00",
      completed: false
    },
    {
      id: "CL-2",
      zone: "vitrina-a",
      task: "Cambio de film protector y desinfeccion",
      owner: "Luis",
      dueAt: "2026-06-05T14:00",
      completed: true
    },
    {
      id: "CL-3",
      zone: "camara-2",
      task: "Limpieza profunda de piso y drenaje",
      owner: "Sandra",
      dueAt: "2026-06-05T11:30",
      completed: false
    }
  ],
  outages: [
    {
      id: "OUT-1",
      zone: "camara-2",
      startedAt: "2026-06-04T19:10",
      endedAt: "2026-06-04T20:25",
      maxTemperatureC: 8.9,
      note: "Microcorte nocturno con retardo de planta"
    }
  ],
  withdrawals: [
    {
      id: "RET-1",
      date: "2026-05-29",
      productId: "queso-guayanes",
      batch: "QG-192",
      reason: "Observacion sensorial reportada por proveedor",
      status: "cerrado",
      action: "Aislamiento preventivo, evaluacion y cierre documental",
      affectedLots: ["LCH-240603-03"]
    }
  ]
};
