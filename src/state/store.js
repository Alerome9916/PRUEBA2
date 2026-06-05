import { seedState } from "../data/seed.js";

const STORAGE_KEY = "los-churuguaros-fefo-state-v1";

export function loadState() {
  const rawState = window.localStorage.getItem(STORAGE_KEY);
  if (!rawState) {
    return clone(seedState);
  }

  try {
    return mergeWithSeed(JSON.parse(rawState));
  } catch (error) {
    console.warn("No se pudo leer el estado persistido, se carga el demo.", error);
    return clone(seedState);
  }
}

export function saveState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  window.localStorage.removeItem(STORAGE_KEY);
  return clone(seedState);
}

export function addLot(state, payload) {
  const newLot = {
    id: createId("LCH"),
    batch: `${payload.productId.slice(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    invoice: `AUTO-${Math.floor(Math.random() * 9000 + 1000)}`,
    notes: "Registrado desde centro de captura",
    ...payload
  };

  return {
    ...state,
    lots: [newLot, ...state.lots]
  };
}

export function addTempLog(state, payload) {
  return {
    ...state,
    tempLogs: [{ id: createId("TMP"), ...payload }, ...state.tempLogs]
  };
}

export function addCleaningTask(state, payload) {
  return {
    ...state,
    cleaningTasks: [{ id: createId("CL"), completed: false, ...payload }, ...state.cleaningTasks]
  };
}

export function addOutage(state, payload) {
  return {
    ...state,
    outages: [{ id: createId("OUT"), ...payload }, ...state.outages]
  };
}

function mergeWithSeed(state) {
  return {
    ...clone(seedState),
    ...state,
    meta: { ...seedState.meta, ...state.meta },
    suppliers: Array.isArray(state.suppliers) && state.suppliers.length ? state.suppliers : clone(seedState.suppliers),
    zones: Array.isArray(state.zones) && state.zones.length ? state.zones : clone(seedState.zones),
    products: Array.isArray(state.products) && state.products.length ? state.products : clone(seedState.products),
    lots: Array.isArray(state.lots) ? state.lots : clone(seedState.lots),
    tempLogs: Array.isArray(state.tempLogs) ? state.tempLogs : clone(seedState.tempLogs),
    cleaningTasks: Array.isArray(state.cleaningTasks) ? state.cleaningTasks : clone(seedState.cleaningTasks),
    outages: Array.isArray(state.outages) ? state.outages : clone(seedState.outages),
    withdrawals: Array.isArray(state.withdrawals) ? state.withdrawals : clone(seedState.withdrawals)
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${suffix}`;
}
