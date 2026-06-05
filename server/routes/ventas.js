'use strict';

const express = require('express');
const { db } = require('../db');
const config = require('../config');
const { planificarSalidaFEFO } = require('../services/fefo');
const { calcularPrecioDinamico } = require('../services/preciosDinamicos');
const { getTasa } = require('./config');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT v.*, u.nombre AS usuario_nombre FROM ventas v LEFT JOIN usuarios u ON u.id=v.usuario_id ORDER BY v.fecha DESC LIMIT 200`
    )
    .all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM ventas WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'No encontrada' });
  const items = db
    .prepare(
      `SELECT vi.*, p.nombre AS producto_nombre, p.unidad, l.codigo_lote, l.fecha_caducidad
       FROM venta_items vi
       JOIN productos p ON p.id = vi.producto_id
       LEFT JOIN lotes l ON l.id = vi.lote_id
       WHERE vi.venta_id = ?`
    )
    .all(v.id);
  res.json({ ...v, items });
});

/**
 * Vista previa de una venta: aplica FEFO y precios dinámicos sin persistir.
 * Útil para que el cajero vea de qué lote saldrá y a qué precio.
 */
router.post('/cotizar', (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Sin items' });
  const resultado = construirLineas(items);
  if (resultado.error) return res.status(400).json({ error: resultado.error });
  res.json(totales(resultado.lineas));
});

function construirLineas(items) {
  const lineas = [];
  for (const it of items) {
    const prod = db.prepare('SELECT * FROM productos WHERE id = ?').get(it.producto_id);
    if (!prod) return { error: `Producto ${it.producto_id} no existe` };
    const cantidad = Number(it.cantidad);
    if (!(cantidad > 0)) return { error: `Cantidad inválida para ${prod.nombre}` };
    const plan = planificarSalidaFEFO(prod.id, cantidad);
    if (plan.faltante > 0) {
      return { error: `Stock insuficiente de ${prod.nombre}. Faltan ${plan.faltante.toFixed(2)} ${prod.unidad}` };
    }
    for (const asig of plan.asignaciones) {
      const pd = calcularPrecioDinamico(prod.precio_venta, asig.lote.fecha_caducidad);
      lineas.push({
        producto_id: prod.id,
        producto_nombre: prod.nombre,
        unidad: prod.unidad,
        lote_id: asig.lote.id,
        codigo_lote: asig.lote.codigo_lote,
        fecha_caducidad: asig.lote.fecha_caducidad,
        cantidad: asig.cantidad,
        precio_base: pd.precioBase,
        precio_aplicado: pd.precioFinal,
        descuento_pct: pd.descuentoPct,
        etiqueta_descuento: pd.etiqueta,
        subtotal: round(pd.precioFinal * asig.cantidad),
        ahorro: round(pd.ahorro * asig.cantidad),
      });
    }
  }
  return { lineas };
}

function totales(lineas) {
  const subtotal = round(lineas.reduce((s, l) => s + l.subtotal, 0));
  const descuento = round(lineas.reduce((s, l) => s + (l.ahorro || 0), 0));
  const iva = round(subtotal * config.FISCAL.IVA);
  const total = round(subtotal + iva);
  const tasa = getTasa();
  return {
    lineas,
    subtotal,
    descuento_anti_desperdicio: descuento,
    iva,
    total,
    tasa_bcv: tasa,
    total_usd: round(total / tasa),
  };
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Registra la venta: descuenta de los lotes siguiendo FEFO, aplica precios
 * dinámicos, calcula IVA (Venezuela) y conversión a divisas según tasa BCV.
 */
router.post('/', (req, res) => {
  const { items, cliente, cliente_rif, metodo_pago } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Venta sin items' });
  const construido = construirLineas(items);
  if (construido.error) return res.status(400).json({ error: construido.error });
  const t = totales(construido.lineas);

  const numero = `V-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;

  const insVenta = db.prepare(
    `INSERT INTO ventas (numero, usuario_id, cliente, cliente_rif, subtotal, descuento, iva, total, metodo_pago, tasa_bcv, total_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insItem = db.prepare(
    `INSERT INTO venta_items (venta_id, producto_id, lote_id, cantidad, precio_base, precio_aplicado, descuento_pct, subtotal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const updLote = db.prepare('UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?');
  const agotarLote = db.prepare("UPDATE lotes SET estado='agotado' WHERE id=? AND cantidad_actual<=0");
  const insMov = db.prepare(
    `INSERT INTO movimientos (lote_id, producto_id, tipo, cantidad, referencia, usuario_id) VALUES (?, ?, 'venta', ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    const ventaId = insVenta.run(
      numero,
      req.user.id,
      cliente || 'Consumidor final',
      cliente_rif || null,
      t.subtotal,
      t.descuento_anti_desperdicio,
      t.iva,
      t.total,
      metodo_pago || 'efectivo_ves',
      t.tasa_bcv,
      t.total_usd
    ).lastInsertRowid;

    for (const l of construido.lineas) {
      insItem.run(ventaId, l.producto_id, l.lote_id, l.cantidad, l.precio_base, l.precio_aplicado, l.descuento_pct, l.subtotal);
      updLote.run(l.cantidad, l.lote_id);
      agotarLote.run(l.lote_id);
      insMov.run(l.lote_id, l.producto_id, l.cantidad, numero, req.user.id);
    }
    return ventaId;
  });

  const ventaId = tx();
  res.status(201).json({ id: ventaId, numero, ...t });
});

module.exports = router;
