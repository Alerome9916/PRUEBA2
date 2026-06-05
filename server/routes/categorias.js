'use strict';

const express = require('express');
const { db } = require('../db');
const { requireRol } = require('../auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM categorias ORDER BY nombre').all());
});

router.post('/', requireRol('admin', 'supervisor'), (req, res) => {
  const { nombre, descripcion, conservacion } = req.body || {};
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const info = db
      .prepare('INSERT INTO categorias (nombre, descripcion, conservacion) VALUES (?, ?, ?)')
      .run(nombre, descripcion || null, conservacion || 'refrigeracion');
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'La categoría ya existe' });
  }
});

router.put('/:id', requireRol('admin', 'supervisor'), (req, res) => {
  const c = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'No encontrada' });
  const { nombre, descripcion, conservacion, activo } = req.body || {};
  db.prepare('UPDATE categorias SET nombre=?, descripcion=?, conservacion=?, activo=? WHERE id=?').run(
    nombre ?? c.nombre,
    descripcion ?? c.descripcion,
    conservacion ?? c.conservacion,
    activo ?? c.activo,
    c.id
  );
  res.json({ ok: true });
});

module.exports = router;
