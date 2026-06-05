'use strict';

const express = require('express');
const { db } = require('../db');
const config = require('../config');
const { estadoCaducidad } = require('../services/fefo');
const { calcularPrecioDinamico } = require('../services/preciosDinamicos');

const router = express.Router();

/**
 * Centro de alertas FEFO: lotes próximos a vencer / vencidos, productos bajo
 * stock y equipos de frío fuera de rango. Incluye sugerencia de precio dinámico.
 */
router.get('/', (req, res) => {
  const diasMax = config.CADUCIDAD.diasPrecaucion;

  const lotes = db
    .prepare(
      `SELECT l.*, p.nombre AS producto_nombre, p.unidad, p.precio_venta, pr.nombre AS proveedor_nombre
       FROM lotes l
       JOIN productos p ON p.id = l.producto_id
       LEFT JOIN proveedores pr ON pr.id = l.proveedor_id
       WHERE l.estado = 'activo' AND l.cantidad_actual > 0
         AND julianday(l.fecha_caducidad) - julianday('now') <= ?
       ORDER BY date(l.fecha_caducidad) ASC`
    )
    .all(diasMax)
    .map((l) => ({
      ...l,
      estado_caducidad: estadoCaducidad(l.fecha_caducidad),
      precio_dinamico: calcularPrecioDinamico(l.precio_venta, l.fecha_caducidad),
    }));

  const vencidos = db
    .prepare(
      `SELECT l.*, p.nombre AS producto_nombre, p.unidad FROM lotes l JOIN productos p ON p.id=l.producto_id
       WHERE l.estado='vencido' AND l.cantidad_actual > 0 ORDER BY date(l.fecha_caducidad) DESC LIMIT 100`
    )
    .all()
    .map((l) => ({ ...l, estado_caducidad: estadoCaducidad(l.fecha_caducidad) }));

  const bajoStock = db
    .prepare(
      `SELECT p.id, p.nombre, p.codigo, p.unidad, p.stock_minimo,
              COALESCE((SELECT SUM(cantidad_actual) FROM lotes l WHERE l.producto_id=p.id AND l.estado='activo' AND date(l.fecha_caducidad)>=date('now')),0) AS stock
       FROM productos p WHERE p.activo=1`
    )
    .all()
    .filter((p) => p.stock < p.stock_minimo);

  const frioFueraRango = db
    .prepare(
      `SELECT r.*, e.nombre AS equipo_nombre, e.tipo FROM registros_temperatura r
       JOIN equipos_frio e ON e.id=r.equipo_id
       WHERE r.fuera_rango=1 AND julianday('now')-julianday(r.fecha) <= 2
       ORDER BY r.fecha DESC`
    )
    .all();

  res.json({
    porVencer: lotes,
    vencidos,
    bajoStock,
    cadenaFrio: frioFueraRango,
    resumen: {
      criticos: lotes.filter((l) => l.estado_caducidad.nivel === 'critico').length,
      vencidos: vencidos.length,
      bajoStock: bajoStock.length,
      frio: frioFueraRango.length,
    },
  });
});

module.exports = router;
