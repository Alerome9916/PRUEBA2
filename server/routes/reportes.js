'use strict';

const express = require('express');
const { db } = require('../db');
const { estadoCaducidad } = require('../services/fefo');

const router = express.Router();

// Inventario valorizado (a costo y a precio de venta).
router.get('/inventario-valorizado', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.codigo, p.nombre, p.unidad, p.precio_venta, c.nombre AS categoria,
              COALESCE(SUM(CASE WHEN l.estado='activo' AND date(l.fecha_caducidad)>=date('now') THEN l.cantidad_actual ELSE 0 END),0) AS stock,
              COALESCE(SUM(CASE WHEN l.estado='activo' AND date(l.fecha_caducidad)>=date('now') THEN l.cantidad_actual*l.costo_unitario ELSE 0 END),0) AS valor_costo
       FROM productos p
       LEFT JOIN lotes l ON l.producto_id = p.id
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.activo=1
       GROUP BY p.id ORDER BY valor_costo DESC`
    )
    .all()
    .map((r) => ({ ...r, valor_venta: Math.round(r.stock * r.precio_venta * 100) / 100 }));
  const totalCosto = rows.reduce((s, r) => s + r.valor_costo, 0);
  const totalVenta = rows.reduce((s, r) => s + r.valor_venta, 0);
  res.json({ items: rows, totalCosto: round(totalCosto), totalVenta: round(totalVenta) });
});

// Productos por vencer agrupados por estado.
router.get('/por-vencer', (req, res) => {
  const lotes = db
    .prepare(
      `SELECT l.*, p.nombre AS producto_nombre, p.unidad FROM lotes l JOIN productos p ON p.id=l.producto_id
       WHERE l.estado='activo' AND l.cantidad_actual>0 ORDER BY date(l.fecha_caducidad) ASC`
    )
    .all()
    .map((l) => ({ ...l, estado_caducidad: estadoCaducidad(l.fecha_caducidad) }));
  res.json(lotes);
});

// Resumen de ventas por rango de fechas.
router.get('/ventas', (req, res) => {
  const { desde, hasta } = req.query;
  const d = desde || '2000-01-01';
  const h = hasta || '2999-12-31';
  const resumen = db
    .prepare(
      `SELECT COUNT(*) AS num_ventas, COALESCE(SUM(subtotal),0) AS subtotal,
              COALESCE(SUM(descuento),0) AS descuento, COALESCE(SUM(iva),0) AS iva,
              COALESCE(SUM(total),0) AS total
       FROM ventas WHERE date(fecha) BETWEEN ? AND ?`
    )
    .get(d, h);
  const topProductos = db
    .prepare(
      `SELECT p.nombre, SUM(vi.cantidad) AS cantidad, SUM(vi.subtotal) AS total
       FROM venta_items vi JOIN ventas v ON v.id=vi.venta_id JOIN productos p ON p.id=vi.producto_id
       WHERE date(v.fecha) BETWEEN ? AND ?
       GROUP BY vi.producto_id ORDER BY total DESC LIMIT 10`
    )
    .all(d, h);
  const porDia = db
    .prepare(
      `SELECT date(fecha) AS dia, SUM(total) AS total FROM ventas WHERE date(fecha) BETWEEN ? AND ? GROUP BY date(fecha) ORDER BY dia`
    )
    .all(d, h);
  res.json({ resumen, topProductos, porDia });
});

// Reporte de mermas (pérdidas) por motivo.
router.get('/mermas', (req, res) => {
  const porMotivo = db
    .prepare(
      `SELECT motivo, COUNT(*) AS num, SUM(cantidad) AS cantidad, SUM(costo_perdido) AS costo
       FROM mermas GROUP BY motivo ORDER BY costo DESC`
    )
    .all();
  const total = db.prepare('SELECT COALESCE(SUM(costo_perdido),0) AS c FROM mermas').get().c;
  res.json({ porMotivo, totalPerdido: round(total) });
});

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

module.exports = router;
