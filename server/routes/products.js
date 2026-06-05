import { Router } from 'express';
import db from '../db.js';
import { authRequired, requireRole, logAudit } from '../auth.js';
import { productStock, today } from '../fefo.js';

const router = Router();

function enrich(p) {
  const stock = productStock(p.id);
  const next = db.prepare(`
    SELECT MIN(expiration_date) AS d FROM batches
    WHERE product_id = ? AND status = 'activo' AND qty_remaining > 0 AND expiration_date >= ?
  `).get(p.id, today()).d;
  return { ...p, stock, next_expiry: next, low_stock: stock <= p.min_stock };
}

router.get('/', authRequired, (req, res) => {
  const { q, category_id } = req.query;
  let sql = `
    SELECT p.*, c.name AS category_name, c.color AS category_color
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE 1=1`;
  const args = [];
  if (q) { sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'; args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (category_id) { sql += ' AND p.category_id = ?'; args.push(category_id); }
  sql += ' ORDER BY p.name';
  const rows = db.prepare(sql).all(...args).map(enrich);
  res.json(rows);
});

router.get('/:id', authRequired, (req, res) => {
  const p = db.prepare(`
    SELECT p.*, c.name AS category_name FROM products p
    LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?
  `).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  res.json(enrich(p));
});

router.post('/', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const b = req.body || {};
  if (!b.sku || !b.name) return res.status(400).json({ error: 'SKU y nombre requeridos' });
  try {
    const info = db.prepare(`
      INSERT INTO products (sku, barcode, name, category_id, unit, cost_price, sale_price, iva_exempt, min_stock, max_stock, storage_temp_min, storage_temp_max, covenin_norm, sanitary_reg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(b.sku, b.barcode || '', b.name, b.category_id || null, b.unit || 'kg',
      b.cost_price || 0, b.sale_price || 0, b.iva_exempt ? 1 : 0, b.min_stock || 0, b.max_stock || 0,
      b.storage_temp_min ?? null, b.storage_temp_max ?? null, b.covenin_norm || '', b.sanitary_reg || '');
    logAudit(req.user.id, 'crear_producto', 'product', b.name);
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'El SKU ya existe' });
  }
});

router.put('/:id', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const b = req.body || {};
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  db.prepare(`
    UPDATE products SET barcode=?, name=?, category_id=?, unit=?, cost_price=?, sale_price=?, iva_exempt=?, min_stock=?, max_stock=?, storage_temp_min=?, storage_temp_max=?, covenin_norm=?, sanitary_reg=?, active=?
    WHERE id=?
  `).run(b.barcode ?? p.barcode, b.name ?? p.name, b.category_id ?? p.category_id, b.unit ?? p.unit,
    b.cost_price ?? p.cost_price, b.sale_price ?? p.sale_price, (b.iva_exempt ? 1 : 0),
    b.min_stock ?? p.min_stock, b.max_stock ?? p.max_stock, b.storage_temp_min ?? p.storage_temp_min,
    b.storage_temp_max ?? p.storage_temp_max, b.covenin_norm ?? p.covenin_norm, b.sanitary_reg ?? p.sanitary_reg,
    b.active ?? p.active, p.id);
  logAudit(req.user.id, 'editar_producto', 'product', p.name);
  res.json({ ok: true });
});

router.delete('/:id', authRequired, requireRole('admin'), (req, res) => {
  const used = db.prepare('SELECT COUNT(*) n FROM batches WHERE product_id = ? AND status = "activo"').get(req.params.id).n;
  if (used > 0) return res.status(400).json({ error: 'Tiene lotes activos; desactívelo en su lugar' });
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
