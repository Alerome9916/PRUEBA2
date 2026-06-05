'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

const config = require('./config');
const { init } = require('./db');
const { procesarVencimientos } = require('./services/fefo');
const { ensureSeed } = require('./seed');
const { requireAuth } = require('./auth');

init();
ensureSeed(); // crea datos demo la primera vez
procesarVencimientos(); // marca vencidos al arrancar

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Rutas API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categorias', requireAuth, require('./routes/categorias'));
app.use('/api/proveedores', requireAuth, require('./routes/proveedores'));
app.use('/api/productos', requireAuth, require('./routes/productos'));
app.use('/api/lotes', requireAuth, require('./routes/lotes'));
app.use('/api/entradas', requireAuth, require('./routes/entradas'));
app.use('/api/ventas', requireAuth, require('./routes/ventas'));
app.use('/api/mermas', requireAuth, require('./routes/mermas'));
app.use('/api/cadena-frio', requireAuth, require('./routes/cadenaFrio'));
app.use('/api/alertas', requireAuth, require('./routes/alertas'));
app.use('/api/trazabilidad', requireAuth, require('./routes/trazabilidad'));
app.use('/api/reportes', requireAuth, require('./routes/reportes'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/api/config', require('./routes/config'));

// Frontend estático
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// Tarea periódica: cada 6 horas reevalúa vencimientos.
setInterval(() => procesarVencimientos(), 6 * 60 * 60 * 1000);

app.listen(config.PORT, () => {
  console.log(`\n  Charcutería Los Churuguaros — Sistema FEFO`);
  console.log(`  Servidor activo en http://localhost:${config.PORT}\n`);
});
