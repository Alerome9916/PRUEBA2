import { Router } from 'express';
import db, { getSettings } from '../db.js';
import { authRequired, logAudit } from '../auth.js';
import { allocateFEFO, suggestDiscount, today } from '../fefo.js';

const router = Router();

function genSaleCode() {
  const row = db.prepare("SELECT COUNT(*) n FROM sales").get().n + 1;
  return 'V-' + String(row).padStart(6, '0');
}

// Previsualización FEFO de un carrito (qué lotes saldrían) sin confirmar venta.
router.post('/preview', authRequired, (req, res) => {
  const items = (req.body && req.body.items) || [];
  const settings = getSettings();
  const result = [];
  for (const it of items) {
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id);
    if (!p) continue;
    const alloc = allocateFEFO(it.product_id, it.qty);
    result.push({ product_id: p.id, name: p.name, unit: p.unit, requested: it.qty, ...alloc });
  }
  res.json({ items: result, settings: { iva_rate: settings.iva_rate, exchange_rate: settings.exchange_rate } });
});

router.post('/', authRequired, (req, res) => {
  const b = req.body || {};
  const items = b.items || [];
  if (!items.length) return res.status(400).json({ error: 'El carrito está vacío' });
  const settings = getSettings();
  const isDivisa = b.payment_method === 'divisa_usd' || b.payment_method === 'zelle';

  try {
    const out = db.transaction(() => {
      const saleId = db.prepare(`
        INSERT INTO sales (code, customer, customer_rif, subtotal, discount_total, iva_total, igtf_total, total, total_bs, exchange_rate, payment_method, user_id)
        VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?, ?)
      `).run(genSaleCode(), b.customer || 'Contado', b.customer_rif || '', settings.exchange_rate, b.payment_method || 'efectivo_bs', req.user.id).lastInsertRowid;

      let subtotal = 0, discountTotal = 0, ivaTotal = 0;

      for (const it of items) {
        const p = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id);
        if (!p) throw { code: 400, msg: 'Producto inexistente' };
        const alloc = allocateFEFO(it.product_id, it.qty);
        if (!alloc.fulfilled) {
          throw { code: 400, msg: `Stock insuficiente de "${p.name}" (faltan ${alloc.shortfall} ${p.unit})` };
        }
        for (const chunk of alloc.allocation) {
          const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(chunk.batch_id);
          let discountPct = Number(it.discount_pct || 0);
          let isAnti = 0;
          if (it.apply_anti_waste) {
            const sug = suggestDiscount(batch, settings);
            discountPct = sug.discount_pct;
            isAnti = discountPct > 0 ? 1 : 0;
          }
          const unitPrice = p.sale_price;
          const lineBase = unitPrice * chunk.qty;
          const lineDiscount = lineBase * (discountPct / 100);
          const lineTotal = lineBase - lineDiscount;
          const lineIva = p.iva_exempt ? 0 : lineTotal * (settings.iva_rate / 100);

          subtotal += lineBase;
          discountTotal += lineDiscount;
          ivaTotal += lineIva;

          db.prepare(`
            INSERT INTO sale_items (sale_id, product_id, batch_id, qty, unit_price, discount_pct, line_total, is_anti_waste)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(saleId, p.id, batch.id, chunk.qty, unitPrice, discountPct, lineTotal, isAnti);

          const newRemaining = Number((batch.qty_remaining - chunk.qty).toFixed(3));
          const newStatus = newRemaining <= 0.0001 ? 'agotado' : batch.status;
          db.prepare('UPDATE batches SET qty_remaining = ?, status = ? WHERE id = ?')
            .run(Math.max(0, newRemaining), newStatus, batch.id);

          db.prepare(`
            INSERT INTO movements (type, product_id, batch_id, qty, unit_cost, reference, note, user_id)
            VALUES ('salida', ?, ?, ?, ?, ?, ?, ?)
          `).run(p.id, batch.id, chunk.qty, batch.cost_price, genSaleCodeRef(saleId), isAnti ? 'Venta anti-merma' : 'Venta', req.user.id);
        }
      }

      const taxedBase = subtotal - discountTotal + ivaTotal;
      const igtfTotal = isDivisa ? taxedBase * (settings.igtf_rate / 100) : 0;
      const total = taxedBase + igtfTotal;
      const totalBs = total * settings.exchange_rate;

      db.prepare(`
        UPDATE sales SET subtotal=?, discount_total=?, iva_total=?, igtf_total=?, total=?, total_bs=? WHERE id=?
      `).run(round(subtotal), round(discountTotal), round(ivaTotal), round(igtfTotal), round(total), round(totalBs), saleId);

      return saleId;
    })();

    logAudit(req.user.id, 'venta', 'sale', { id: out });
    res.json(getSaleFull(out));
  } catch (e) {
    if (e && e.code === 400) return res.status(400).json({ error: e.msg });
    console.error(e);
    res.status(500).json({ error: 'Error procesando la venta' });
  }
});

router.get('/', authRequired, (req, res) => {
  const { from, to } = req.query;
  let sql = `SELECT s.*, u.full_name AS cashier FROM sales s LEFT JOIN users u ON u.id = s.user_id WHERE 1=1`;
  const args = [];
  if (from) { sql += ' AND date(s.created_at) >= ?'; args.push(from); }
  if (to) { sql += ' AND date(s.created_at) <= ?'; args.push(to); }
  sql += ' ORDER BY s.created_at DESC LIMIT 500';
  res.json(db.prepare(sql).all(...args));
});

router.get('/:id', authRequired, (req, res) => {
  const sale = getSaleFull(req.params.id);
  if (!sale) return res.status(404).json({ error: 'No encontrada' });
  res.json(sale);
});

function getSaleFull(id) {
  const sale = db.prepare(`SELECT s.*, u.full_name AS cashier FROM sales s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?`).get(id);
  if (!sale) return null;
  sale.items = db.prepare(`
    SELECT si.*, p.name AS product_name, p.unit, b.lot_code, b.trace_code, b.expiration_date
    FROM sale_items si JOIN products p ON p.id = si.product_id
    LEFT JOIN batches b ON b.id = si.batch_id WHERE si.sale_id = ?
  `).all(id);
  return sale;
}

function genSaleCodeRef(id) { return 'V-' + String(id).padStart(6, '0'); }
function round(n) { return Math.round(n * 100) / 100; }

export default router;
