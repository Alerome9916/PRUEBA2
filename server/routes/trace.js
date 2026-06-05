import { Router } from 'express';
import db from '../db.js';
import { expiryStatus } from '../fefo.js';

const router = Router();

// Trazabilidad pública por código (QR). Permite verificar origen, lote y caducidad.
router.get('/:code', (req, res) => {
  const b = db.prepare(`
    SELECT b.lot_code, b.trace_code, b.received_date, b.manufacture_date, b.expiration_date,
           b.location, b.status, p.name AS product_name, p.sku, p.unit, p.covenin_norm, p.sanitary_reg,
           c.name AS category, s.name AS supplier_name, s.sanitary_permit
    FROM batches b
    JOIN products p ON p.id = b.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.trace_code = ?
  `).get(req.params.code);
  if (!b) return res.status(404).json({ error: 'Código de trazabilidad no encontrado' });
  res.json({ ...b, ...expiryStatus(b.expiration_date) });
});

export default router;
