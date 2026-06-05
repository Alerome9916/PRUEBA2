'use strict';

const express = require('express');
const { db } = require('../db');
const config = require('../config');
const { requireAuth, requireRol } = require('../auth');

const router = express.Router();

function getTasa() {
  const row = db.prepare("SELECT valor FROM config WHERE clave = 'tasa_bcv'").get();
  return row ? parseFloat(row.valor) : config.FISCAL.tasaBCVPorDefecto;
}

// Información pública del sistema (empresa, parámetros). No requiere token.
router.get('/', (req, res) => {
  res.json({
    empresa: config.EMPRESA,
    fiscal: { ...config.FISCAL, tasaBCV: getTasa() },
    caducidad: config.CADUCIDAD,
    preciosDinamicos: config.PRECIOS_DINAMICOS,
    cadenaFrio: config.CADENA_FRIO,
    roles: config.ROLES,
  });
});

router.put('/tasa', requireAuth, requireRol('admin', 'supervisor'), (req, res) => {
  const { tasa } = req.body || {};
  const t = parseFloat(tasa);
  if (!t || t <= 0) return res.status(400).json({ error: 'Tasa inválida' });
  db.prepare("INSERT OR REPLACE INTO config (clave, valor) VALUES ('tasa_bcv', ?)").run(String(t));
  res.json({ ok: true, tasaBCV: t });
});

module.exports = router;
module.exports.getTasa = getTasa;
