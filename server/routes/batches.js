import { Router } from 'express';
import db from '../db.js';
import { authRequired, requireRole, logAudit } from '../auth.js';
import { expiryStatus, suggestDiscount, today } from '../fefo.js';

const router = Router();

function genTrace() {
  const d = new Date();
  const stamp = d.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CHU-${stamp}-${rnd}`;
}

function enrichBatch(b) {
  const st = expiryStatus(b.expiration_date);
  const disc = suggestDiscount(b);
  return { ...b, ...st, suggested_discount: disc.discount_pct, discount_reason: disc.reason, risk: disc.risk, predicted_waste: disc.predicted_waste, velocity: disc.velocity };
}

router.get('/', authRequired, (req, res) => {
  const { product_id, status } = req.query;
  let sql = `
    SELECT b.*, p.name AS product_name, p.sku, p.unit, s.name AS supplier_name
    FROM batches b
    JOIN products p ON p.id = b.product_id
    LEFT JOIN suppliers s ON s.id = b.supplier_id
    WHERE 1=1`;
  const args = [];
  if (product_id) { sql += ' AND b.product_id = ?'; args.push(product_id); }
  if (status) { sql += ' AND b.status = ?'; args.push(status); }
  sql += ' ORDER BY b.expiration_date ASC, b.id ASC';
  res.json(db.prepare(sql).all(...args).map(enrichBatch));
});

router.get('/:id', authRequired, (req, res) => {
  const b = db.prepare(`
    SELECT b.*, p.name AS product_name, p.sku, p.unit, s.name AS supplier_name
    FROM batches b JOIN products p ON p.id = b.product_id
    LEFT JOIN suppliers s ON s.id = b.supplier_id WHERE b.id = ?
  `).get(req.params.id);
  if (!b) return res.status(404).json({ error: 'No encontrado' });
  const movements = db.prepare('SELECT * FROM movements WHERE batch_id = ? ORDER BY created_at DESC').all(b.id);
  res.json({ ...enrichBatch(b), movements });
});

// Recepción de mercancía = nuevo lote (entrada)
router.post('/', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const b = req.body || {};
  if (!b.product_id || !b.lot_code || !b.qty_received || !b.expiration_date) {
    return res.status(400).json({ error: 'Producto, lote, cantidad y fecha de caducidad son obligatorios' });
  }
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(b.product_id);
  if (!prod) return res.status(400).json({ error: 'Producto inexistente' });
  if (b.expiration_date < today()) {
    return res.status(400).json({ error: 'No se puede recibir mercancía ya vencida' });
  }
  const trace = genTrace();
  const cost = b.cost_price ?? prod.cost_price;
  const status = b.quarantine ? 'cuarentena' : 'activo';
  const tx = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO batches (product_id, supplier_id, lot_code, trace_code, qty_received, qty_remaining, cost_price, received_date, manufacture_date, expiration_date, location, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(b.product_id, b.supplier_id || null, b.lot_code, trace, b.qty_received, b.qty_received,
      cost, b.received_date || today(), b.manufacture_date || null, b.expiration_date,
      b.location || 'Nevera 1', status);
    db.prepare(`
      INSERT INTO movements (type, product_id, batch_id, qty, unit_cost, reference, note, user_id)
      VALUES ('entrada', ?, ?, ?, ?, ?, ?, ?)
    `).run(b.product_id, info.lastInsertRowid, b.qty_received, cost, b.lot_code, b.note || '', req.user.id);
    return info.lastInsertRowid;
  });
  const id = tx();
  logAudit(req.user.id, 'recepcion_lote', 'batch', { id, product: prod.name, lot: b.lot_code });
  res.json({ id, trace_code: trace });
});

// Cambiar estado: cuarentena <-> activo
router.put('/:id/status', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const { status } = req.body || {};
  if (!['activo', 'cuarentena'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  const bch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
  if (!bch) return res.status(404).json({ error: 'No encontrado' });
  if (['vencido', 'agotado'].includes(bch.status)) return res.status(400).json({ error: 'Lote no modificable' });
  db.prepare('UPDATE batches SET status = ? WHERE id = ?').run(status, bch.id);
  logAudit(req.user.id, 'cambio_estado_lote', 'batch', { id: bch.id, status });
  res.json({ ok: true });
});

// Ajuste de inventario sobre un lote (correcciones de conteo)
router.post('/:id/adjust', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const { new_qty, note } = req.body || {};
  const bch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
  if (!bch) return res.status(404).json({ error: 'No encontrado' });
  if (new_qty == null || new_qty < 0) return res.status(400).json({ error: 'Cantidad inválida' });
  const diff = new_qty - bch.qty_remaining;
  const tx = db.transaction(() => {
    const status = new_qty <= 0 ? 'agotado' : bch.status === 'agotado' ? 'activo' : bch.status;
    db.prepare('UPDATE batches SET qty_remaining = ?, status = ? WHERE id = ?').run(new_qty, status, bch.id);
    db.prepare(`
      INSERT INTO movements (type, product_id, batch_id, qty, unit_cost, reference, note, user_id)
      VALUES ('ajuste', ?, ?, ?, ?, 'AJUSTE', ?, ?)
    `).run(bch.product_id, bch.id, diff, bch.cost_price, note || '', req.user.id);
  });
  tx();
  logAudit(req.user.id, 'ajuste_lote', 'batch', { id: bch.id, diff });
  res.json({ ok: true });
});

export default router;
