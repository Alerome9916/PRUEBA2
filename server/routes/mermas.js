'use strict';

const express = require('express');
const { db } = require('../db');
const { requireRol } = require('../auth');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT m.*, p.nombre AS producto_nombre, p.unidad, l.codigo_lote, u.nombre AS usuario_nombre
       FROM mermas m
       JOIN productos p ON p.id = m.producto_id
       LEFT JOIN lotes l ON l.id = m.lote_id
       LEFT JOIN usuarios u ON u.id = m.usuario_id
       ORDER BY m.fecha DESC LIMIT 300`
    )
    .all();
  res.json(rows);
});

/**
 * Registra una merma manual (daño, rotura de cadena de frío, etc.) y descuenta
 * la cantidad del lote indicado.
 */
router.post('/', requireRol('admin', 'supervisor', 'almacenista'), (req, res) => {
  const { lote_id, producto_id, cantidad, motivo, nota } = req.body || {};
  if (!cantidad || cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida' });

  let prodId = producto_id;
  let costoUnit = 0;
  let lote = null;
  if (lote_id) {
    lote = db.prepare('SELECT * FROM lotes WHERE id = ?').get(lote_id);
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    if (cantidad > lote.cantidad_actual) return res.status(400).json({ error: 'La cantidad supera las existencias del lote' });
    prodId = lote.producto_id;
    costoUnit = lote.costo_unitario;
  }
  if (!prodId) return res.status(400).json({ error: 'Producto o lote requerido' });

  const tx = db.transaction(() => {
    const costo = Math.round(costoUnit * cantidad * 100) / 100;
    const mId = db
      .prepare(
        `INSERT INTO mermas (lote_id, producto_id, usuario_id, cantidad, motivo, costo_perdido, nota)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(lote_id || null, prodId, req.user.id, cantidad, motivo || 'otro', costo, nota || null).lastInsertRowid;
    if (lote) {
      db.prepare('UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?').run(cantidad, lote.id);
      db.prepare("UPDATE lotes SET estado='agotado' WHERE id=? AND cantidad_actual<=0").run(lote.id);
    }
    db.prepare(
      `INSERT INTO movimientos (lote_id, producto_id, tipo, cantidad, referencia, usuario_id) VALUES (?, ?, 'merma', ?, ?, ?)`
    ).run(lote_id || null, prodId, cantidad, motivo || 'merma', req.user.id);
    return mId;
  });
  res.status(201).json({ id: tx() });
});

module.exports = router;
