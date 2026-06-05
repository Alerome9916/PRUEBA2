import { Router } from 'express';
import db from '../db.js';
import { authRequired, requireRole, logAudit } from '../auth.js';
import { expireOverdueBatches } from '../fefo.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT w.*, p.name AS product_name, p.unit, b.lot_code, u.full_name AS user_name
    FROM waste w
    JOIN products p ON p.id = w.product_id
    LEFT JOIN batches b ON b.id = w.batch_id
    LEFT JOIN users u ON u.id = w.user_id
    ORDER BY w.created_at DESC LIMIT 500
  `).all();
  res.json(rows);
});

// Registrar merma manual (daño, contaminación, etc.)
router.post('/', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const b = req.body || {};
  if (!b.batch_id || !b.qty || b.qty <= 0) return res.status(400).json({ error: 'Lote y cantidad requeridos' });
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(b.batch_id);
  if (!batch) return res.status(404).json({ error: 'Lote no encontrado' });
  if (b.qty > batch.qty_remaining) return res.status(400).json({ error: 'Cantidad mayor a la disponible en el lote' });

  const costValue = b.qty * batch.cost_price;
  const tx = db.transaction(() => {
    const newRemaining = Number((batch.qty_remaining - b.qty).toFixed(3));
    const status = newRemaining <= 0.0001 ? 'agotado' : batch.status;
    db.prepare('UPDATE batches SET qty_remaining = ?, status = ? WHERE id = ?').run(Math.max(0, newRemaining), status, batch.id);
    db.prepare(`
      INSERT INTO waste (batch_id, product_id, qty, reason, cost_value, note, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(batch.id, batch.product_id, b.qty, b.reason || 'dano', costValue, b.note || '', req.user.id);
    db.prepare(`
      INSERT INTO movements (type, product_id, batch_id, qty, unit_cost, reference, note, user_id)
      VALUES ('merma', ?, ?, ?, ?, 'MERMA', ?, ?)
    `).run(batch.product_id, batch.id, b.qty, batch.cost_price, b.reason || 'dano', req.user.id);
  });
  tx();
  logAudit(req.user.id, 'merma', 'waste', { batch: batch.id, qty: b.qty });
  res.json({ ok: true });
});

// Ejecutar barrido FEFO de vencimientos (marca vencidos -> merma automática)
router.post('/run-expiry', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const n = expireOverdueBatches(req.user.id);
  logAudit(req.user.id, 'barrido_vencimiento', 'waste', { lotes: n });
  res.json({ processed: n });
});

export default router;
