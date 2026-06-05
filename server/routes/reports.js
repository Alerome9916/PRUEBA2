import { Router } from 'express';
import db, { getSettings } from '../db.js';
import { authRequired } from '../auth.js';
import { expiryStatus } from '../fefo.js';

const router = Router();

// Valoración de inventario por lote
router.get('/inventory', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT p.sku, p.name, p.unit, c.name AS category, b.lot_code, b.expiration_date,
           b.qty_remaining, b.cost_price, (b.qty_remaining * b.cost_price) AS value, b.location
    FROM batches b JOIN products p ON p.id = b.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE b.status = 'activo' AND b.qty_remaining > 0
    ORDER BY p.name, b.expiration_date
  `).all().map((r) => ({ ...r, ...expiryStatus(r.expiration_date) }));
  const total = rows.reduce((a, r) => a + r.value, 0);
  res.json({ rows, total: round(total) });
});

// Análisis de mermas
router.get('/waste', authRequired, (req, res) => {
  const { from, to } = req.query;
  let where = '1=1'; const args = [];
  if (from) { where += ' AND date(w.created_at) >= ?'; args.push(from); }
  if (to) { where += ' AND date(w.created_at) <= ?'; args.push(to); }

  const byReason = db.prepare(`
    SELECT reason, COUNT(*) n, SUM(qty) qty, SUM(cost_value) value
    FROM waste w WHERE ${where} GROUP BY reason ORDER BY value DESC
  `).all(...args);
  const byProduct = db.prepare(`
    SELECT p.name, p.unit, SUM(w.qty) qty, SUM(w.cost_value) value
    FROM waste w JOIN products p ON p.id = w.product_id WHERE ${where}
    GROUP BY w.product_id ORDER BY value DESC LIMIT 20
  `).all(...args);
  const total = db.prepare(`SELECT COALESCE(SUM(cost_value),0) v, COALESCE(SUM(qty),0) q FROM waste w WHERE ${where}`).get(...args);
  res.json({ by_reason: byReason, by_product: byProduct, total_value: round(total.v), total_qty: round(total.q) });
});

// Reporte de ventas por día
router.get('/sales', authRequired, (req, res) => {
  const { from, to } = req.query;
  let where = '1=1'; const args = [];
  if (from) { where += ' AND date(created_at) >= ?'; args.push(from); }
  if (to) { where += ' AND date(created_at) <= ?'; args.push(to); }
  const byDay = db.prepare(`
    SELECT date(created_at) d, COUNT(*) n, SUM(subtotal) subtotal, SUM(discount_total) discount,
           SUM(iva_total) iva, SUM(total) total
    FROM sales WHERE ${where} GROUP BY date(created_at) ORDER BY d DESC
  `).all(...args);
  const totals = db.prepare(`SELECT COALESCE(SUM(total),0) total, COALESCE(SUM(iva_total),0) iva, COUNT(*) n FROM sales WHERE ${where}`).get(...args);
  res.json({ by_day: byDay, totals: { total: round(totals.total), iva: round(totals.iva), count: totals.n } });
});

// NOVEDAD — Reporte de eficiencia anti-merma (FEFO)
router.get('/anti-waste', authRequired, (req, res) => {
  const recovered = db.prepare(`
    SELECT COALESCE(SUM(si.line_total),0) revenue, COALESCE(SUM(si.qty),0) qty, COUNT(*) lines
    FROM sale_items si WHERE si.is_anti_waste = 1
  `).get();
  const wasteTotal = db.prepare(`SELECT COALESCE(SUM(cost_value),0) v FROM waste`).get().v;
  const byProduct = db.prepare(`
    SELECT p.name, p.unit, SUM(si.qty) qty, SUM(si.line_total) recovered
    FROM sale_items si JOIN products p ON p.id = si.product_id
    WHERE si.is_anti_waste = 1 GROUP BY si.product_id ORDER BY recovered DESC LIMIT 20
  `).all();
  // Tasa de merma = mermas / (mermas + ventas costo)  -> indicador de salud FEFO
  const soldCost = db.prepare(`
    SELECT COALESCE(SUM(m.qty * m.unit_cost),0) v FROM movements m WHERE m.type='salida'
  `).get().v;
  const mermaRate = (wasteTotal + soldCost) > 0 ? (wasteTotal / (wasteTotal + soldCost)) * 100 : 0;
  res.json({
    recovered_revenue: round(recovered.revenue),
    recovered_qty: round(recovered.qty),
    anti_waste_lines: recovered.lines,
    total_waste_value: round(wasteTotal),
    merma_rate: round(mermaRate),
    by_product: byProduct,
  });
});

// Kardex / movimientos de un producto
router.get('/kardex/:productId', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT m.*, b.lot_code, u.full_name AS user_name
    FROM movements m LEFT JOIN batches b ON b.id = m.batch_id
    LEFT JOIN users u ON u.id = m.user_id
    WHERE m.product_id = ? ORDER BY m.created_at DESC LIMIT 300
  `).all(req.params.productId);
  res.json(rows);
});

function round(n) { return Math.round((n || 0) * 100) / 100; }

export default router;
