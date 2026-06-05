'use strict';

const express = require('express');
const { db } = require('../db');
const { estadoCaducidad } = require('../services/fefo');
const { calcularPrecioDinamico } = require('../services/preciosDinamicos');

const router = express.Router();

// Lista de lotes con su producto, estado de caducidad y precio dinámico.
router.get('/', (req, res) => {
  const { estado, producto } = req.query;
  let sql = `SELECT l.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad, p.precio_venta,
                    pr.nombre AS proveedor_nombre
             FROM lotes l
             JOIN productos p ON p.id = l.producto_id
             LEFT JOIN proveedores pr ON pr.id = l.proveedor_id WHERE 1=1`;
  const params = [];
  if (estado) {
    sql += ' AND l.estado = ?';
    params.push(estado);
  }
  if (producto) {
    sql += ' AND l.producto_id = ?';
    params.push(producto);
  }
  sql += ' ORDER BY date(l.fecha_caducidad) ASC';
  const rows = db.prepare(sql).all(...params).map((l) => ({
    ...l,
    estado_caducidad: estadoCaducidad(l.fecha_caducidad),
    precio_dinamico: calcularPrecioDinamico(l.precio_venta, l.fecha_caducidad),
  }));
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const l = db
    .prepare(`SELECT l.*, p.nombre AS producto_nombre, p.unidad, p.precio_venta FROM lotes l JOIN productos p ON p.id=l.producto_id WHERE l.id=?`)
    .get(req.params.id);
  if (!l) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ...l, estado_caducidad: estadoCaducidad(l.fecha_caducidad), precio_dinamico: calcularPrecioDinamico(l.precio_venta, l.fecha_caducidad) });
});

module.exports = router;
