import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../auth.js';
import { expiryStatus, suggestDiscount, productStock, today } from '../fefo.js';

const router = Router();

// Alertas de caducidad (semáforo FEFO) con descuentos sugeridos.
router.get('/expiry', authRequired, (req, res) => {
  const batches = db.prepare(`
    SELECT b.*, p.name AS product_name, p.sku, p.unit, p.sale_price, s.name AS supplier_name
    FROM batches b
    JOIN products p ON p.id = b.product_id
    LEFT JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.status IN ('activo','cuarentena') AND b.qty_remaining > 0
    ORDER BY b.expiration_date ASC
  `).all();

  const enriched = batches.map((b) => {
    const st = expiryStatus(b.expiration_date);
    const sug = suggestDiscount(b);
    return {
      ...b, ...st,
      suggested_discount: sug.discount_pct,
      discount_reason: sug.reason,
      risk: sug.risk,
      predicted_waste: sug.predicted_waste,
      velocity: sug.velocity,
      potential_loss: Number((sug.predicted_waste * b.cost_price).toFixed(2)),
      recovery_price: Number((b.sale_price * (1 - sug.discount_pct / 100)).toFixed(2)),
    };
  });

  const filtered = req.query.level ? enriched.filter((e) => e.level === req.query.level) : enriched;
  res.json(filtered);
});

// Alertas de stock bajo
router.get('/low-stock', authRequired, (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE active = 1 AND min_stock > 0').all();
  const low = products
    .map((p) => ({ ...p, stock: productStock(p.id) }))
    .filter((p) => p.stock <= p.min_stock)
    .sort((a, b) => a.stock - b.stock);
  res.json(low);
});

// Resumen de alertas para el badge global
router.get('/summary', authRequired, (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const batches = db.prepare(`
    SELECT expiration_date FROM batches WHERE status = 'activo' AND qty_remaining > 0
  `).all();
  let critico = 0, advertencia = 0, vencido = 0;
  for (const b of batches) {
    const st = expiryStatus(b.expiration_date, settings);
    if (st.level === 'vencido') vencido++;
    else if (st.level === 'critico') critico++;
    else if (st.level === 'advertencia') advertencia++;
  }
  const lowStock = db.prepare('SELECT * FROM products WHERE active = 1 AND min_stock > 0').all()
    .filter((p) => productStock(p.id) <= p.min_stock).length;
  res.json({ critico, advertencia, vencido, low_stock: lowStock, total: critico + advertencia + vencido + lowStock });
});

export default router;
