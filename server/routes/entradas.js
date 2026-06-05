'use strict';

const express = require('express');
const { db } = require('../db');
const { requireRol } = require('../auth');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.*, pr.nombre AS proveedor_nombre, u.nombre AS usuario_nombre
       FROM entradas e
       LEFT JOIN proveedores pr ON pr.id = e.proveedor_id
       LEFT JOIN usuarios u ON u.id = e.usuario_id
       ORDER BY e.fecha DESC`
    )
    .all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM entradas WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  const items = db
    .prepare(
      `SELECT ei.*, p.nombre AS producto_nombre, l.codigo_lote, l.fecha_caducidad
       FROM entrada_items ei
       JOIN productos p ON p.id = ei.producto_id
       LEFT JOIN lotes l ON l.id = ei.lote_id
       WHERE ei.entrada_id = ?`
    )
    .all(e.id);
  res.json({ ...e, items });
});

/**
 * Registra una recepción de mercancía. Cada item genera un LOTE nuevo con su
 * fecha de caducidad (clave para FEFO) y actualiza el costo promedio del producto.
 */
router.post('/', requireRol('admin', 'supervisor', 'almacenista'), (req, res) => {
  const { documento, proveedor_id, nota, items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe incluir al menos un producto' });
  }
  for (const it of items) {
    if (!it.producto_id || !it.cantidad || !it.fecha_caducidad) {
      return res.status(400).json({ error: 'Cada item requiere producto, cantidad y fecha de caducidad' });
    }
  }

  const insEntrada = db.prepare(
    `INSERT INTO entradas (documento, proveedor_id, usuario_id, total_costo, nota) VALUES (?, ?, ?, ?, ?)`
  );
  const insLote = db.prepare(
    `INSERT INTO lotes (codigo_lote, producto_id, proveedor_id, fecha_produccion, fecha_caducidad, cantidad_inicial, cantidad_actual, costo_unitario, ubicacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insItem = db.prepare(
    `INSERT INTO entrada_items (entrada_id, lote_id, producto_id, cantidad, costo_unitario) VALUES (?, ?, ?, ?, ?)`
  );
  const insMov = db.prepare(
    `INSERT INTO movimientos (lote_id, producto_id, tipo, cantidad, referencia, usuario_id) VALUES (?, ?, 'entrada', ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    let total = 0;
    const entradaId = insEntrada.run(documento || null, proveedor_id || null, req.user.id, 0, nota || null).lastInsertRowid;
    const lotesCreados = [];
    for (const it of items) {
      const costo = Number(it.costo_unitario) || 0;
      total += costo * Number(it.cantidad);
      const codigoLote = it.codigo_lote || `L-${Date.now()}-${it.producto_id}`;
      const loteId = insLote.run(
        codigoLote,
        it.producto_id,
        proveedor_id || null,
        it.fecha_produccion || null,
        it.fecha_caducidad,
        it.cantidad,
        it.cantidad,
        costo,
        it.ubicacion || 'Almacén principal'
      ).lastInsertRowid;
      insItem.run(entradaId, loteId, it.producto_id, it.cantidad, costo);
      insMov.run(loteId, it.producto_id, it.cantidad, `Entrada #${entradaId}`, req.user.id);

      // Actualiza costo promedio ponderado del producto.
      const prod = db.prepare('SELECT * FROM productos WHERE id = ?').get(it.producto_id);
      if (prod && costo > 0) {
        const stockPrevio = db
          .prepare(`SELECT COALESCE(SUM(cantidad_actual),0) s FROM lotes WHERE producto_id=? AND id<>?`)
          .get(it.producto_id, loteId).s;
        const nuevoCosto =
          stockPrevio + Number(it.cantidad) > 0
            ? (prod.costo_promedio * stockPrevio + costo * Number(it.cantidad)) / (stockPrevio + Number(it.cantidad))
            : costo;
        db.prepare('UPDATE productos SET costo_promedio = ? WHERE id = ?').run(Math.round(nuevoCosto * 100) / 100, it.producto_id);
      }
      lotesCreados.push({ id: loteId, codigo_lote: codigoLote });
    }
    db.prepare('UPDATE entradas SET total_costo = ? WHERE id = ?').run(Math.round(total * 100) / 100, entradaId);
    return { entradaId, lotesCreados };
  });

  const out = tx();
  res.status(201).json(out);
});

module.exports = router;
