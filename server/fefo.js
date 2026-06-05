import db, { getSettings } from './db.js';

/** Devuelve la fecha de hoy en formato YYYY-MM-DD (zona local del servidor). */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Días enteros entre dos fechas YYYY-MM-DD (b - a). */
export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db_ = new Date(b + 'T00:00:00');
  return Math.round((db_ - da) / 86400000);
}

/**
 * Clasifica el estado de caducidad de un lote según los umbrales configurados.
 * Semáforo: vencido / critico / advertencia / aviso / optimo
 */
export function expiryStatus(expirationDate, settings = getSettings()) {
  const d = daysBetween(today(), expirationDate);
  let level, label, color;
  if (d < 0) {
    level = 'vencido'; label = 'Vencido'; color = '#1f2937';
  } else if (d <= settings.alert_critical_days) {
    level = 'critico'; label = 'Crítico'; color = '#dc2626';
  } else if (d <= settings.alert_warning_days) {
    level = 'advertencia'; label = 'Advertencia'; color = '#f59e0b';
  } else if (d <= settings.alert_notice_days) {
    level = 'aviso'; label = 'Aviso'; color = '#eab308';
  } else {
    level = 'optimo'; label = 'Óptimo'; color = '#16a34a';
  }
  return { days_to_expiry: d, level, label, color };
}

/**
 * Velocidad de rotación: unidades/kg vendidos por día (promedio) de un producto
 * en los últimos `windowDays` días. Base para la predicción de mermas.
 */
export function rotationVelocity(productId, windowDays = 30) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(qty), 0) AS sold
    FROM movements
    WHERE product_id = ? AND type = 'salida'
      AND created_at >= datetime('now', ?)
  `).get(productId, `-${windowDays} days`);
  return (row.sold || 0) / windowDays;
}

/**
 * NOVEDAD 1 — Predicción de merma.
 * Estima cuánto de un lote NO se venderá antes de caducar, según la velocidad
 * de rotación del producto y el stock total que "compite" delante de este lote
 * (los lotes que caducan antes se venden primero por FEFO).
 */
export function predictWaste(batch, settings = getSettings()) {
  const d = daysBetween(today(), batch.expiration_date);
  if (d <= 0) {
    return { predicted_waste: batch.qty_remaining, risk: 100, velocity: 0, days_to_expiry: d };
  }
  const velocity = rotationVelocity(batch.product_id);

  // Stock de lotes que caducan ANTES o al mismo tiempo (se venderán primero).
  const ahead = db.prepare(`
    SELECT COALESCE(SUM(qty_remaining), 0) AS q
    FROM batches
    WHERE product_id = ? AND status = 'activo'
      AND (expiration_date < ? OR (expiration_date = ? AND id < ?))
  `).get(batch.product_id, batch.expiration_date, batch.expiration_date, batch.id).q;

  // Capacidad de venta estimada hasta la caducidad de este lote.
  const capacity = velocity * d;
  // Lo que queda de capacidad para este lote tras servir los lotes delanteros.
  const availableForThis = Math.max(0, capacity - ahead);
  const willSell = Math.min(batch.qty_remaining, availableForThis);
  const predicted = Math.max(0, batch.qty_remaining - willSell);

  const risk = batch.qty_remaining > 0
    ? Math.round((predicted / batch.qty_remaining) * 100)
    : 0;

  return {
    predicted_waste: Number(predicted.toFixed(3)),
    risk,
    velocity: Number(velocity.toFixed(3)),
    days_to_expiry: d,
    stock_ahead: Number(ahead.toFixed(3)),
  };
}

/**
 * NOVEDAD 2 — Motor de descuentos dinámicos anti-merma.
 * Calcula un % de descuento sugerido que crece a medida que se acerca la
 * caducidad y según el riesgo de merma. Convierte producto "a punto de perderse"
 * en ventas recuperando costo. Algo que los sistemas de inventario clásicos
 * no automatizan.
 */
export function suggestDiscount(batch, settings = getSettings()) {
  if (!settings.auto_discount_enabled) {
    return { discount_pct: 0, reason: 'desactivado', risk: 0, days_to_expiry: daysBetween(today(), batch.expiration_date) };
  }
  const pred = predictWaste(batch, settings);
  const d = pred.days_to_expiry;
  if (d < 0) return { discount_pct: 0, reason: 'vencido', ...pred };
  if (pred.predicted_waste <= 0 && d > settings.alert_warning_days) {
    return { discount_pct: 0, reason: 'rotacion_sana', ...pred };
  }

  // Descuento base por proximidad de caducidad (semáforo).
  let base = 0;
  if (d <= settings.alert_critical_days) base = 45;
  else if (d <= settings.alert_warning_days) base = 25;
  else if (d <= settings.alert_notice_days) base = 12;
  else base = 0;

  // Ajuste por riesgo de merma predicho.
  const riskFactor = pred.risk / 100; // 0..1
  let discount = base + Math.round(riskFactor * 15);

  // Tope de seguridad: nunca por debajo del costo.
  // sale_price * (1 - disc) >= cost  ->  disc <= 1 - cost/sale
  const product = db.prepare('SELECT cost_price, sale_price FROM products WHERE id = ?').get(batch.product_id);
  let maxDiscount = 50;
  if (product && product.sale_price > 0) {
    const floor = Math.floor((1 - product.cost_price / product.sale_price) * 100);
    maxDiscount = Math.max(0, Math.min(50, floor));
  }
  discount = Math.max(0, Math.min(discount, maxDiscount));

  let reason = 'anti_merma';
  if (discount === 0) reason = pred.predicted_waste > 0 ? 'sin_margen' : 'rotacion_sana';

  return { discount_pct: discount, reason, max_safe: maxDiscount, ...pred };
}

/**
 * Stock total disponible de un producto (lotes activos no vencidos).
 */
export function productStock(productId) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(qty_remaining), 0) AS qty
    FROM batches
    WHERE product_id = ? AND status = 'activo' AND expiration_date >= ?
  `).get(productId, today());
  return row.qty || 0;
}

/**
 * Motor FEFO — First Expired, First Out.
 * Devuelve la asignación de `qty` repartida entre lotes ordenados por fecha de
 * caducidad ascendente (el que caduca primero sale primero). No descuenta stock,
 * solo planifica la asignación (la transacción real se hace en el módulo de ventas).
 */
export function allocateFEFO(productId, qty) {
  const batches = db.prepare(`
    SELECT * FROM batches
    WHERE product_id = ? AND status = 'activo' AND qty_remaining > 0 AND expiration_date >= ?
    ORDER BY expiration_date ASC, id ASC
  `).all(productId, today());

  const allocation = [];
  let pending = qty;
  for (const b of batches) {
    if (pending <= 0) break;
    const take = Math.min(pending, b.qty_remaining);
    allocation.push({
      batch_id: b.id,
      lot_code: b.lot_code,
      trace_code: b.trace_code,
      expiration_date: b.expiration_date,
      qty: Number(take.toFixed(3)),
    });
    pending -= take;
  }
  return {
    fulfilled: pending <= 0.0001,
    shortfall: pending > 0 ? Number(pending.toFixed(3)) : 0,
    allocation,
  };
}

/**
 * Marca como 'vencido' todos los lotes activos cuya fecha de caducidad ya pasó,
 * generando la merma automática correspondiente (cumplimiento sanitario).
 * Devuelve el número de lotes procesados.
 */
export function expireOverdueBatches(userId = null) {
  const overdue = db.prepare(`
    SELECT * FROM batches
    WHERE status = 'activo' AND expiration_date < ? AND qty_remaining > 0
  `).all(today());

  const tx = db.transaction(() => {
    for (const b of overdue) {
      db.prepare(`UPDATE batches SET status = 'vencido' WHERE id = ?`).run(b.id);
      const costValue = b.qty_remaining * b.cost_price;
      db.prepare(`
        INSERT INTO waste (batch_id, product_id, qty, reason, cost_value, note, user_id)
        VALUES (?, ?, ?, 'vencimiento', ?, 'Vencimiento automático (FEFO)', ?)
      `).run(b.id, b.product_id, b.qty_remaining, costValue, userId);
      db.prepare(`
        INSERT INTO movements (type, product_id, batch_id, qty, unit_cost, reference, note, user_id)
        VALUES ('merma', ?, ?, ?, ?, 'AUTO-VENCIMIENTO', 'Caducado por FEFO', ?)
      `).run(b.product_id, b.id, b.qty_remaining, b.cost_price, userId);
    }
  });
  tx();
  return overdue.length;
}
