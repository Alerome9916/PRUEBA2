'use strict';

const express = require('express');
const { db } = require('../db');
const config = require('../config');
const { estadoCaducidad } = require('../services/fefo');

const router = express.Router();

router.get('/', (req, res) => {
  const totalProductos = db.prepare("SELECT COUNT(*) c FROM productos WHERE activo=1").get().c;
  const totalLotes = db.prepare("SELECT COUNT(*) c FROM lotes WHERE estado='activo' AND cantidad_actual>0").get().c;

  const valor = db
    .prepare(
      `SELECT COALESCE(SUM(cantidad_actual*costo_unitario),0) costo FROM lotes WHERE estado='activo' AND date(fecha_caducidad)>=date('now')`
    )
    .get().costo;

  const ventasHoy = db
    .prepare("SELECT COALESCE(SUM(total),0) total, COUNT(*) num FROM ventas WHERE date(fecha)=date('now')")
    .get();

  const mermaMes = db
    .prepare("SELECT COALESCE(SUM(costo_perdido),0) c FROM mermas WHERE strftime('%Y-%m', fecha)=strftime('%Y-%m','now')")
    .get().c;

  // Semáforo FEFO: conteo de lotes por nivel de caducidad
  const lotesActivos = db
    .prepare("SELECT fecha_caducidad FROM lotes WHERE estado='activo' AND cantidad_actual>0")
    .all();
  const semaforo = { optimo: 0, precaucion: 0, alerta: 0, critico: 0, vencido: 0 };
  for (const l of lotesActivos) semaforo[estadoCaducidad(l.fecha_caducidad).nivel]++;

  const vencidosPend = db.prepare("SELECT COUNT(*) c FROM lotes WHERE estado='vencido' AND cantidad_actual>0").get().c;

  // Distribución de inventario por categoría
  const porCategoria = db
    .prepare(
      `SELECT c.nombre, COALESCE(SUM(l.cantidad_actual*l.costo_unitario),0) AS valor
       FROM categorias c
       LEFT JOIN productos p ON p.categoria_id=c.id
       LEFT JOIN lotes l ON l.producto_id=p.id AND l.estado='activo' AND date(l.fecha_caducidad)>=date('now')
       GROUP BY c.id HAVING valor > 0 ORDER BY valor DESC`
    )
    .all();

  // Ventas últimos 7 días
  const ventas7 = db
    .prepare(
      `SELECT date(fecha) dia, SUM(total) total FROM ventas WHERE julianday('now')-julianday(fecha) <= 7 GROUP BY date(fecha) ORDER BY dia`
    )
    .all();

  const tasa = (db.prepare("SELECT valor FROM config WHERE clave='tasa_bcv'").get() || {}).valor || config.FISCAL.tasaBCVPorDefecto;

  res.json({
    kpis: {
      totalProductos,
      totalLotes,
      valorInventarioCosto: round(valor),
      valorInventarioUSD: round(valor / parseFloat(tasa)),
      ventasHoy: round(ventasHoy.total),
      numVentasHoy: ventasHoy.num,
      mermaMes: round(mermaMes),
      vencidosPendientes: vencidosPend,
    },
    semaforo,
    porCategoria,
    ventas7,
    tasaBCV: parseFloat(tasa),
  });
});

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

module.exports = router;
