'use strict';

const express = require('express');
const { db } = require('../db');
const { requireRol } = require('../auth');
const { stockDisponible, lotesFEFO, estadoCaducidad } = require('../services/fefo');
const { calcularPrecioDinamico } = require('../services/preciosDinamicos');

const router = express.Router();

function enriquecer(p) {
  const stock = stockDisponible(p.id);
  const lotes = lotesFEFO(p.id);
  const proximo = lotes[0] || null;
  let precioDinamico = null;
  let estado = null;
  if (proximo) {
    precioDinamico = calcularPrecioDinamico(p.precio_venta, proximo.fecha_caducidad);
    estado = estadoCaducidad(proximo.fecha_caducidad);
  }
  return {
    ...p,
    stock,
    bajo_stock: stock < p.stock_minimo,
    lote_proximo: proximo
      ? { id: proximo.id, codigo_lote: proximo.codigo_lote, fecha_caducidad: proximo.fecha_caducidad }
      : null,
    estado_caducidad: estado,
    precio_dinamico: precioDinamico,
  };
}

router.get('/', (req, res) => {
  const { q, categoria } = req.query;
  let sql = `SELECT p.*, c.nombre AS categoria_nombre, c.conservacion
             FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE 1=1`;
  const params = [];
  if (q) {
    sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (categoria) {
    sql += ' AND p.categoria_id = ?';
    params.push(categoria);
  }
  sql += ' ORDER BY p.nombre';
  const rows = db.prepare(sql).all(...params).map(enriquecer);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const p = db
    .prepare(`SELECT p.*, c.nombre AS categoria_nombre, c.conservacion FROM productos p LEFT JOIN categorias c ON c.id=p.categoria_id WHERE p.id=?`)
    .get(req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const lotes = db
    .prepare(`SELECT * FROM lotes WHERE producto_id = ? ORDER BY date(fecha_caducidad) ASC`)
    .all(p.id)
    .map((l) => ({ ...l, estado_caducidad: estadoCaducidad(l.fecha_caducidad), precio_dinamico: calcularPrecioDinamico(p.precio_venta, l.fecha_caducidad) }));
  res.json({ ...enriquecer(p), lotes });
});

router.post('/', requireRol('admin', 'supervisor', 'almacenista'), (req, res) => {
  const b = req.body || {};
  if (!b.codigo || !b.nombre) return res.status(400).json({ error: 'Código y nombre requeridos' });
  try {
    const info = db
      .prepare(
        `INSERT INTO productos (codigo, nombre, descripcion, categoria_id, unidad, precio_venta, costo_promedio, stock_minimo, vida_util_dias, perecedero)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        b.codigo,
        b.nombre,
        b.descripcion || null,
        b.categoria_id || null,
        b.unidad || 'kg',
        b.precio_venta || 0,
        b.costo_promedio || 0,
        b.stock_minimo || 0,
        b.vida_util_dias || 30,
        b.perecedero === 0 ? 0 : 1
      );
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'El código ya existe' });
  }
});

router.put('/:id', requireRol('admin', 'supervisor', 'almacenista'), (req, res) => {
  const p = db.prepare('SELECT * FROM productos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const b = req.body || {};
  db.prepare(
    `UPDATE productos SET codigo=?, nombre=?, descripcion=?, categoria_id=?, unidad=?, precio_venta=?, costo_promedio=?, stock_minimo=?, vida_util_dias=?, perecedero=?, activo=? WHERE id=?`
  ).run(
    b.codigo ?? p.codigo,
    b.nombre ?? p.nombre,
    b.descripcion ?? p.descripcion,
    b.categoria_id ?? p.categoria_id,
    b.unidad ?? p.unidad,
    b.precio_venta ?? p.precio_venta,
    b.costo_promedio ?? p.costo_promedio,
    b.stock_minimo ?? p.stock_minimo,
    b.vida_util_dias ?? p.vida_util_dias,
    b.perecedero ?? p.perecedero,
    b.activo ?? p.activo,
    p.id
  );
  res.json({ ok: true });
});

module.exports = router;
