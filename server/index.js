import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initSchema } from './db.js';
import { ensureSeed } from './seed.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import supplierRoutes from './routes/suppliers.js';
import productRoutes from './routes/products.js';
import batchRoutes from './routes/batches.js';
import saleRoutes from './routes/sales.js';
import wasteRoutes from './routes/waste.js';
import alertRoutes from './routes/alerts.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import traceRoutes from './routes/trace.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

initSchema();
ensureSeed();

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/trace', traceRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'Los Churuguaros FEFO', ts: new Date().toISOString() }));

// Frontend estático (SPA)
const publicDir = join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Recurso no encontrado' });
  res.sendFile(join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🥩  Charcutería Los Churuguaros — Sistema FEFO`);
  console.log(`  ➜  Servidor en http://localhost:${PORT}\n`);
});
