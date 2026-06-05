'use strict';

const jwt = require('jsonwebtoken');
const config = require('./config');

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, usuario: usuario.usuario, rol: usuario.rol, nombre: usuario.nombre },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES }
  );
}

/** Middleware: exige un token JWT válido. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, config.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

/** Middleware: exige uno de los roles indicados. */
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado para esta acción' });
    }
    next();
  };
}

module.exports = { firmarToken, requireAuth, requireRol };
