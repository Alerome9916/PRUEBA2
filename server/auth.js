import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'churuguaros-fefo-secret-2025';
const TOKEN_TTL = '12h';

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

/** Middleware: requiere un token válido (cookie o cabecera Authorization). */
export function authRequired(req, res, next) {
  const token =
    (req.cookies && req.cookies.token) ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

/** Middleware factory: requiere uno de los roles indicados. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tiene permisos para esta acción' });
    }
    next();
  };
}

export function logAudit(userId, action, entity, detail) {
  try {
    db.prepare(
      'INSERT INTO audit_log (user_id, action, entity, detail) VALUES (?, ?, ?, ?)'
    ).run(userId, action, entity, typeof detail === 'string' ? detail : JSON.stringify(detail));
  } catch { /* no-op */ }
}
