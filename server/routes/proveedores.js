'use strict';

const express = require('express');
const { db } = require('../db');
const { requireRol } = require('../auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM proveedores ORDER BY nombre').all());
});

router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  res.json(p);
});

router.post('/', requireRol('admin', 'supervisor', 'almacenista'), (req, res) => {
  const { nombre, rif, contacto, telefono, email, direccion, registro_sanitario } = req.body || {};
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const info = db
    .prepare(
      `INSERT INTO proveedores (nombre, rif, contacto, telefono, email, direccion, registro_sanitario)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(nombre, rif || null, contacto || null, telefono || null, email || null, direccion || null, registro_sanitario || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', requireRol('admin', 'supervisor', 'almacenista'), (req, res) => {
  const p = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const b = req.body || {};
  db.prepare(
    `UPDATE proveedores SET nombre=?, rif=?, contacto=?, telefono=?, email=?, direccion=?, registro_sanitario=?, activo=? WHERE id=?`
  ).run(
    b.nombre ?? p.nombre,
    b.rif ?? p.rif,
    b.contacto ?? p.contacto,
    b.telefono ?? p.telefono,
    b.email ?? p.email,
    b.direccion ?? p.direccion,
    b.registro_sanitario ?? p.registro_sanitario,
    b.activo ?? p.activo,
    p.id
  );
  res.json({ ok: true });
});

module.exports = router;
