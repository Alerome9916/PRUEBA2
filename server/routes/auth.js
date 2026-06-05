import { Router } from 'express';
import db from '../db.js';
import { hashPassword, verifyPassword, signToken, authRequired, requireRole, logAudit } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuario y clave requeridos' });
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = signToken(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 12 * 3600 * 1000 });
  logAudit(user.id, 'login', 'user', user.username);
  res.json({
    token,
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

// ---- Gestión de usuarios (solo admin) ----
router.get('/users', authRequired, requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id, username, full_name, role, active, created_at FROM users ORDER BY id').all();
  res.json(users);
});

router.post('/users', authRequired, requireRole('admin'), (req, res) => {
  const { username, password, full_name, role } = req.body || {};
  if (!username || !password || !full_name) return res.status(400).json({ error: 'Datos incompletos' });
  if (!['admin', 'almacen', 'ventas'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  try {
    const info = db.prepare(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    ).run(username, hashPassword(password), full_name, role);
    logAudit(req.user.id, 'crear_usuario', 'user', username);
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'El usuario ya existe' });
  }
});

router.put('/users/:id', authRequired, requireRole('admin'), (req, res) => {
  const { full_name, role, active, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  db.prepare('UPDATE users SET full_name = ?, role = ?, active = ? WHERE id = ?')
    .run(full_name ?? u.full_name, role ?? u.role, active ?? u.active, u.id);
  if (password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), u.id);
  }
  logAudit(req.user.id, 'editar_usuario', 'user', u.username);
  res.json({ ok: true });
});

export default router;
