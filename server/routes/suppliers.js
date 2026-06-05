import { Router } from 'express';
import db from '../db.js';
import { authRequired, requireRole, logAudit } from '../auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM batches b WHERE b.supplier_id = s.id) AS batch_count
    FROM suppliers s ORDER BY s.name
  `).all();
  res.json(rows);
});

router.post('/', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Nombre requerido' });
  const info = db.prepare(`
    INSERT INTO suppliers (name, rif, contact, phone, email, address, sanitary_permit)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(b.name, b.rif || '', b.contact || '', b.phone || '', b.email || '', b.address || '', b.sanitary_permit || '');
  logAudit(req.user.id, 'crear_proveedor', 'supplier', b.name);
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', authRequired, requireRole('admin', 'almacen'), (req, res) => {
  const b = req.body || {};
  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'No encontrado' });
  db.prepare(`
    UPDATE suppliers SET name=?, rif=?, contact=?, phone=?, email=?, address=?, sanitary_permit=?, active=?
    WHERE id=?
  `).run(b.name ?? s.name, b.rif ?? s.rif, b.contact ?? s.contact, b.phone ?? s.phone,
    b.email ?? s.email, b.address ?? s.address, b.sanitary_permit ?? s.sanitary_permit,
    b.active ?? s.active, s.id);
  logAudit(req.user.id, 'editar_proveedor', 'supplier', s.name);
  res.json({ ok: true });
});

router.delete('/:id', authRequired, requireRole('admin'), (req, res) => {
  const used = db.prepare('SELECT COUNT(*) n FROM batches WHERE supplier_id = ?').get(req.params.id).n;
  if (used > 0) return res.status(400).json({ error: 'Tiene lotes asociados; desactívelo en su lugar' });
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
