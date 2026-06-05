'use strict';

const express = require('express');
const { db } = require('../db');
const config = require('../config');
const { requireRol } = require('../auth');

const router = express.Router();

router.get('/equipos', (req, res) => {
  const equipos = db.prepare('SELECT * FROM equipos_frio ORDER BY nombre').all().map((e) => {
    const ultima = db
      .prepare('SELECT * FROM registros_temperatura WHERE equipo_id = ? ORDER BY fecha DESC LIMIT 1')
      .get(e.id);
    const rango = config.CADENA_FRIO[e.tipo] || config.CADENA_FRIO.refrigeracion;
    return { ...e, rango, ultima_lectura: ultima || null };
  });
  res.json(equipos);
});

router.post('/equipos', requireRol('admin', 'supervisor'), (req, res) => {
  const { nombre, tipo, ubicacion } = req.body || {};
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const info = db
    .prepare('INSERT INTO equipos_frio (nombre, tipo, ubicacion) VALUES (?, ?, ?)')
    .run(nombre, tipo || 'refrigeracion', ubicacion || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get('/registros', (req, res) => {
  const { equipo } = req.query;
  let sql = `SELECT r.*, e.nombre AS equipo_nombre, e.tipo, u.nombre AS usuario_nombre
             FROM registros_temperatura r
             JOIN equipos_frio e ON e.id = r.equipo_id
             LEFT JOIN usuarios u ON u.id = r.usuario_id WHERE 1=1`;
  const params = [];
  if (equipo) {
    sql += ' AND r.equipo_id = ?';
    params.push(equipo);
  }
  sql += ' ORDER BY r.fecha DESC LIMIT 200';
  res.json(db.prepare(sql).all(...params));
});

/**
 * Registra una lectura de temperatura y determina si está fuera del rango
 * permitido para el tipo de equipo (cadena de frío — buenas prácticas COVENIN).
 */
router.post('/registros', (req, res) => {
  const { equipo_id, temperatura, nota } = req.body || {};
  const t = parseFloat(temperatura);
  if (!equipo_id || Number.isNaN(t)) return res.status(400).json({ error: 'Equipo y temperatura requeridos' });
  const eq = db.prepare('SELECT * FROM equipos_frio WHERE id = ?').get(equipo_id);
  if (!eq) return res.status(404).json({ error: 'Equipo no encontrado' });
  const rango = config.CADENA_FRIO[eq.tipo] || config.CADENA_FRIO.refrigeracion;
  const fuera = t < rango.min || t > rango.max ? 1 : 0;
  const info = db
    .prepare(
      `INSERT INTO registros_temperatura (equipo_id, usuario_id, temperatura, fuera_rango, nota) VALUES (?, ?, ?, ?, ?)`
    )
    .run(equipo_id, req.user.id, t, fuera, nota || null);
  res.status(201).json({ id: info.lastInsertRowid, fuera_rango: !!fuera, rango });
});

module.exports = router;
