import { Router } from 'express';
import db, { getSettings } from '../db.js';
import { authRequired } from '../auth.js';
import { expiryStatus, productStock, today } from '../fefo.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const settings = getSettings();

  const totalProducts = db.prepare('SELECT COUNT(*) n FROM products WHERE active = 1').get().n;
  const totalSuppliers = db.prepare('SELECT COUNT(*) n FROM suppliers WHERE active = 1').get().n;

  const inventoryValue = db.prepare(`
    SELECT COALESCE(SUM(qty_remaining * cost_price), 0) AS v
    FROM batches WHERE status = 'activo'
  `).get().v;

  const salesToday = db.prepare(`
    SELECT COALESCE(SUM(total),0) total, COUNT(*) n FROM sales WHERE date(created_at) = ?
  `).get(today());
  const salesMonth = db.prepare(`
    SELECT COALESCE(SUM(total),0) total, COUNT(*) n FROM sales
    WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now')
  `).get();

  const wasteMonth = db.prepare(`
    SELECT COALESCE(SUM(cost_value),0) v, COALESCE(SUM(qty),0) q FROM waste
    WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now')
  `).get();

  // Recuperado por ventas anti-merma este mes (NOVEDAD)
  const antiWaste = db.prepare(`
    SELECT COALESCE(SUM(line_total),0) recovered, COALESCE(SUM(qty),0) q
    FROM sale_items si JOIN sales s ON s.id = si.sale_id
    WHERE si.is_anti_waste = 1 AND strftime('%Y-%m', s.created_at) = strftime('%Y-%m','now')
  `).get();

  // Semáforo de caducidad
  const activeBatches = db.prepare(`SELECT expiration_date, qty_remaining, cost_price FROM batches WHERE status='activo' AND qty_remaining>0`).all();
  const semaforo = { optimo: 0, aviso: 0, advertencia: 0, critico: 0, vencido: 0 };
  for (const b of activeBatches) semaforo[expiryStatus(b.expiration_date, settings).level]++;

  // Top productos vendidos (mes)
  const topProducts = db.prepare(`
    SELECT p.name, p.unit, SUM(si.qty) qty, SUM(si.line_total) revenue
    FROM sale_items si JOIN products p ON p.id = si.product_id JOIN sales s ON s.id = si.sale_id
    WHERE strftime('%Y-%m', s.created_at) = strftime('%Y-%m','now')
    GROUP BY si.product_id ORDER BY revenue DESC LIMIT 5
  `).all();

  // Ventas últimos 14 días
  const salesTrend = db.prepare(`
    SELECT date(created_at) d, SUM(total) total FROM sales
    WHERE created_at >= datetime('now','-14 days')
    GROUP BY date(created_at) ORDER BY d
  `).all();

  // Valor de inventario por categoría
  const byCategory = db.prepare(`
    SELECT c.name, c.color, COALESCE(SUM(b.qty_remaining * b.cost_price),0) value
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    LEFT JOIN batches b ON b.product_id = p.id AND b.status='activo'
    GROUP BY c.id HAVING value > 0 ORDER BY value DESC
  `).all();

  const lowStock = db.prepare('SELECT * FROM products WHERE active = 1 AND min_stock > 0').all()
    .filter((p) => productStock(p.id) <= p.min_stock).length;

  res.json({
    settings: { iva_rate: settings.iva_rate, exchange_rate: settings.exchange_rate, company_name: settings.company_name },
    kpis: {
      total_products: totalProducts,
      total_suppliers: totalSuppliers,
      inventory_value: round(inventoryValue),
      inventory_value_bs: round(inventoryValue * settings.exchange_rate),
      sales_today: round(salesToday.total),
      sales_today_count: salesToday.n,
      sales_month: round(salesMonth.total),
      sales_month_count: salesMonth.n,
      waste_month_value: round(wasteMonth.v),
      waste_month_qty: round(wasteMonth.q),
      anti_waste_recovered: round(antiWaste.recovered),
      anti_waste_qty: round(antiWaste.q),
      low_stock: lowStock,
    },
    semaforo,
    top_products: topProducts,
    sales_trend: salesTrend,
    by_category: byCategory,
  });
});

function round(n) { return Math.round((n || 0) * 100) / 100; }

export default router;
