'use strict';

const express = require('express');
const QRCode = require('qrcode');
const { db } = require('../db');
const config = require('../config');
const { estadoCaducidad } = require('../services/fefo');

const router = express.Router();

/**
 * Trazabilidad completa de un lote: origen (proveedor), entrada, movimientos
 * (ventas/mermas/ajustes) y estado actual. Cumple el principio de trazabilidad
 * exigido por las normas sanitarias (INSAI / COVENIN) en Venezuela.
 */
router.get('/lote/:id', (req, res) => {
  const lote = db
    .prepare(
      `SELECT l.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo, p.unidad,
              pr.nombre AS proveedor_nombre, pr.rif AS proveedor_rif, pr.registro_sanitario
       FROM lotes l
       JOIN productos p ON p.id = l.producto_id
       LEFT JOIN proveedores pr ON pr.id = l.proveedor_id
       WHERE l.id = ?`
    )
    .get(req.params.id);
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

  const movimientos = db
    .prepare(
      `SELECT m.*, u.nombre AS usuario_nombre FROM movimientos m LEFT JOIN usuarios u ON u.id=m.usuario_id
       WHERE m.lote_id = ? ORDER BY m.fecha ASC`
    )
    .all(lote.id);

  const entrada = db
    .prepare(
      `SELECT e.* FROM entradas e JOIN entrada_items ei ON ei.entrada_id=e.id WHERE ei.lote_id = ? LIMIT 1`
    )
    .get(lote.id);

  res.json({
    lote: { ...lote, estado_caducidad: estadoCaducidad(lote.fecha_caducidad) },
    entrada: entrada || null,
    movimientos,
  });
});

/** Genera un código QR (data URL) que enlaza a la trazabilidad del lote. */
router.get('/lote/:id/qr', async (req, res) => {
  const lote = db.prepare('SELECT * FROM lotes WHERE id = ?').get(req.params.id);
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
  const payload = {
    empresa: config.EMPRESA.nombre,
    rif: config.EMPRESA.rif,
    lote: lote.codigo_lote,
    caducidad: lote.fecha_caducidad,
    url: `${req.protocol}://${req.get('host')}/#/trazabilidad/${lote.id}`,
  };
  try {
    const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), { width: 280, margin: 1 });
    res.json({ qr: dataUrl, payload });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo generar el QR' });
  }
});

module.exports = router;
