export const DAY_MS = 24 * 60 * 60 * 1000;

export function toDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }

  return new Date(value);
}

export function startOfDay(value = new Date()) {
  const date = toDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(fromValue, toValue) {
  const from = startOfDay(fromValue);
  const to = startOfDay(toValue);
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function minutesBetween(fromValue, toValue) {
  const from = toDate(fromValue);
  const to = toDate(toValue);
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

export function formatDate(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function toInputDateTime(value = new Date()) {
  const date = toDate(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
