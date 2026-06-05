'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { firmarToken, requireAuth, requireRol } = require('../auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { usuario, password } = req.body || {};
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  const u = db.prepare('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1').get(usuario);
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = firmarToken(u);
  res.json({ token, usuario: { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol } });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ usuario: req.user });
});

// Gestión de usuarios (solo admin)
router.get('/usuarios', requireAuth, requireRol('admin'), (req, res) => {
  const rows = db.prepare('SELECT id, nombre, usuario, rol, activo, creado_en FROM usuarios ORDER BY id').all();
  res.json(rows);
});

router.post('/usuarios', requireAuth, requireRol('admin'), (req, res) => {
  const { nombre, usuario, password, rol } = req.body || {};
  if (!nombre || !usuario || !password || !rol) return res.status(400).json({ error: 'Datos incompletos' });
  try {
    const info = db
      .prepare('INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)')
      .run(nombre, usuario, bcrypt.hashSync(password, 10), rol);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'El usuario ya existe' });
  }
});

router.put('/usuarios/:id', requireAuth, requireRol('admin'), (req, res) => {
  const { nombre, rol, activo, password } = req.body || {};
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('UPDATE usuarios SET nombre = ?, rol = ?, activo = ? WHERE id = ?').run(
    nombre ?? u.nombre,
    rol ?? u.rol,
    activo ?? u.activo,
    u.id
  );
  if (password) db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), u.id);
  res.json({ ok: true });
});

module.exports = router;
