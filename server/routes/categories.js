import { Router } from 'express';
import db from '../db.js';
import { authRequired, requireRole, logAudit } from '../auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c ORDER BY c.name
  `).all();
  res.json(rows);
});

router.post('/', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const info = db.prepare(`
      INSERT INTO categories (name, description, requires_refrigeration, storage_temp_min, storage_temp_max, default_shelf_life_days, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(b.name, b.description || '', b.requires_refrigeration ? 1 : 0,
      b.storage_temp_min ?? null, b.storage_temp_max ?? null,
      b.default_shelf_life_days ?? 30, b.color || '#8b5cf6');
    logAudit(req.user.id, 'crear_categoria', 'category', b.name);
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'La categoría ya existe' });
  }
});

router.put('/:id', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const b = req.body || {};
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'No encontrada' });
  db.prepare(`
    UPDATE categories SET name=?, description=?, requires_refrigeration=?, storage_temp_min=?, storage_temp_max=?, default_shelf_life_days=?, color=?
    WHERE id=?
  `).run(b.name ?? c.name, b.description ?? c.description,
    (b.requires_refrigeration ? 1 : 0), b.storage_temp_min ?? c.storage_temp_min,
    b.storage_temp_max ?? c.storage_temp_max, b.default_shelf_life_days ?? c.default_shelf_life_days,
    b.color ?? c.color, c.id);
  logAudit(req.user.id, 'editar_categoria', 'category', c.name);
  res.json({ ok: true });
});

router.delete('/:id', authRequired, requireRole('admin'), (req, res) => {
  const used = db.prepare('SELECT COUNT(*) n FROM products WHERE category_id = ?').get(req.params.id).n;
  if (used > 0) return res.status(400).json({ error: 'Tiene productos asociados' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
