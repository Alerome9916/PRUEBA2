'use strict';

const { db } = require('../db');
const config = require('../config');

/**
 * Devuelve el número de días (entero) entre hoy y la fecha de caducidad.
 * Negativo => ya vencido.
 */
function diasParaVencer(fechaCaducidad) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const cad = new Date(fechaCaducidad + 'T00:00:00');
  return Math.round((cad - hoy) / (1000 * 60 * 60 * 24));
}

/**
 * Clasifica un lote según los días restantes (semáforo de caducidad).
 */
function estadoCaducidad(fechaCaducidad) {
  const dias = diasParaVencer(fechaCaducidad);
  const { diasCritico, diasAlerta, diasPrecaucion } = config.CADUCIDAD;
  if (dias < 0) return { nivel: 'vencido', color: '#7f1d1d', dias };
  if (dias <= diasCritico) return { nivel: 'critico', color: '#dc2626', dias };
  if (dias <= diasAlerta) return { nivel: 'alerta', color: '#f59e0b', dias };
  if (dias <= diasPrecaucion) return { nivel: 'precaucion', color: '#eab308', dias };
  return { nivel: 'optimo', color: '#16a34a', dias };
}

/**
 * Lotes disponibles de un producto ordenados por FEFO
 * (First Expired, First Out => caduca primero, sale primero).
 * Excluye lotes vencidos y agotados.
 */
function lotesFEFO(productoId) {
  return db
    .prepare(
      `SELECT * FROM lotes
       WHERE producto_id = ? AND estado = 'activo' AND cantidad_actual > 0
         AND date(fecha_caducidad) >= date('now')
       ORDER BY date(fecha_caducidad) ASC, id ASC`
    )
    .all(productoId);
}

/**
 * Calcula cuántas unidades hay que tomar de cada lote para cubrir una cantidad
 * solicitada respetando FEFO. No modifica la base de datos (solo planifica).
 * @returns {{ asignaciones: Array, faltante: number }}
 */
function planificarSalidaFEFO(productoId, cantidad) {
  const lotes = lotesFEFO(productoId);
  let restante = cantidad;
  const asignaciones = [];
  for (const lote of lotes) {
    if (restante <= 0) break;
    const tomar = Math.min(lote.cantidad_actual, restante);
    asignaciones.push({ lote, cantidad: tomar });
    restante -= tomar;
  }
  return { asignaciones, faltante: Math.max(0, restante) };
}

/**
 * Stock total disponible (no vencido) de un producto.
 */
function stockDisponible(productoId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(cantidad_actual),0) AS stock FROM lotes
       WHERE producto_id = ? AND estado = 'activo'
         AND date(fecha_caducidad) >= date('now')`
    )
    .get(productoId);
  return row.stock;
}

/**
 * Marca como 'vencido' todos los lotes cuya fecha de caducidad ya pasó y que
 * aún tienen existencias. Registra automáticamente la merma correspondiente.
 * Pensado para ejecutarse periódicamente y al iniciar el servidor.
 * @returns {number} cantidad de lotes vencidos procesados
 */
function procesarVencimientos(usuarioId = null) {
  const vencidos = db
    .prepare(
      `SELECT * FROM lotes
       WHERE estado = 'activo' AND date(fecha_caducidad) < date('now')`
    )
    .all();

  const updLote = db.prepare(`UPDATE lotes SET estado = 'vencido' WHERE id = ?`);
  const insMerma = db.prepare(
    `INSERT INTO mermas (lote_id, producto_id, usuario_id, cantidad, motivo, costo_perdido, nota)
     VALUES (?, ?, ?, ?, 'vencimiento', ?, 'Vencimiento automático (FEFO)')`
  );
  const insMov = db.prepare(
    `INSERT INTO movimientos (lote_id, producto_id, tipo, cantidad, referencia, usuario_id)
     VALUES (?, ?, 'merma', ?, 'Vencimiento automático', ?)`
  );

  const tx = db.transaction(() => {
    for (const lote of vencidos) {
      if (lote.cantidad_actual > 0) {
        const costo = lote.cantidad_actual * lote.costo_unitario;
        insMerma.run(lote.id, lote.producto_id, usuarioId, lote.cantidad_actual, costo);
        insMov.run(lote.id, lote.producto_id, lote.cantidad_actual, usuarioId);
      }
      updLote.run(lote.id);
    }
  });
  tx();
  return vencidos.length;
}

module.exports = {
  diasParaVencer,
  estadoCaducidad,
  lotesFEFO,
  planificarSalidaFEFO,
  stockDisponible,
  procesarVencimientos,
};
