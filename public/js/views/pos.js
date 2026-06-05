import { api, state, fmtUSD, fmtBs, fmtQty, fmtDate, toBs, toast, openModal, esc, levelBadge } from '../core.js';
import { refreshAlertBadge } from '../app.js';

let cart = [];          // { product, qty, anti }
let products = [];
let discountMap = {};   // product_id -> { discount_pct, level, days }

export async function renderPOS(view) {
  products = await api.get('/products');
  try {
    const alerts = await api.get('/alerts/expiry');
    discountMap = {};
    for (const a of alerts) {
      // primer lote (más próximo a caducar) por producto = el que saldría por FEFO
      if (!discountMap[a.product_id]) discountMap[a.product_id] = { discount_pct: a.suggested_discount, level: a.level, days: a.days_to_expiry };
    }
  } catch { discountMap = {}; }

  view.innerHTML = `
    <div class="pos-grid">
      <div>
        <div class="toolbar">
          <input class="search" id="posSearch" placeholder="🔍 Buscar producto por nombre, SKU o código de barras…" />
        </div>
        <div class="prod-pick" id="prodPick"></div>
      </div>
      <div class="card cart">
        <div class="card-title">🛒 Venta actual</div>
        <div class="card-sub">El sistema descuenta los lotes por <strong>FEFO</strong> (primero en caducar, primero en salir).</div>
        <div id="cartItems"></div>
        <div id="cartTotals"></div>
        <div class="mt">
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:10px">
            <div class="full"><label>Cliente</label><input id="posCustomer" placeholder="Contado" /></div>
            <div><label>RIF/C.I.</label><input id="posRif" placeholder="V-00000000" /></div>
            <div><label>Método de pago</label>
              <select id="posPay">
                <option value="efectivo_bs">Efectivo Bs</option>
                <option value="punto">Punto de venta</option>
                <option value="pago_movil">Pago móvil</option>
                <option value="divisa_usd">Divisa USD (efectivo)</option>
                <option value="zelle">Zelle</option>
              </select>
            </div>
          </div>
        </div>
        <button class="btn btn-primary mt" style="width:100%" id="posCheckout" disabled>Procesar Venta</button>
      </div>
    </div>`;

  const search = view.querySelector('#posSearch');
  search.addEventListener('input', () => renderTiles(search.value.toLowerCase()));
  view.querySelector('#posCheckout').addEventListener('click', checkout);
  renderTiles('');
  renderCart();
}

function renderTiles(q) {
  const list = products.filter((p) =>
    p.active && (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.barcode || '').includes(q))
  );
  const root = document.getElementById('prodPick');
  if (!list.length) { root.innerHTML = '<div class="empty"><div class="ic">🔍</div><p>Sin resultados</p></div>'; return; }
  root.innerHTML = list.map((p) => {
    const disc = discountMap[p.id];
    const out = p.stock <= 0;
    const stkColor = out ? '#f87171' : p.low_stock ? '#fbbf24' : '#4ade80';
    const discBadge = disc && disc.discount_pct > 0
      ? `<div style="margin-top:6px"><span class="badge b-advertencia">♻️ -${disc.discount_pct}% anti-merma</span></div>` : '';
    return `<button class="prod-tile" data-id="${p.id}" ${out ? 'disabled style="opacity:.45"' : ''}>
      <div class="stk" style="color:${stkColor}">●</div>
      <div class="pn">${esc(p.name)}</div>
      <div class="ps">${esc(p.sku)} · stock ${fmtQty(p.stock, p.unit)}</div>
      <div class="pp">${fmtUSD(p.sale_price)}<span class="faint">/${p.unit}</span></div>
      ${discBadge}
    </button>`;
  }).join('');
  root.querySelectorAll('.prod-tile').forEach((t) => t.addEventListener('click', () => addToCart(Number(t.dataset.id))));
}

function addToCart(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  const existing = cart.find((c) => c.product.id === id);
  const step = p.unit === 'kg' ? 0.5 : 1;
  if (existing) existing.qty = Number((existing.qty + step).toFixed(3));
  else cart.push({ product: p, qty: step, anti: !!(discountMap[id] && discountMap[id].discount_pct > 0) });
  renderCart();
}

function lineCalc(item) {
  const p = item.product;
  const base = p.sale_price * item.qty;
  const discPct = item.anti && discountMap[p.id] ? discountMap[p.id].discount_pct : 0;
  const lineTotal = base * (1 - discPct / 100);
  const iva = p.iva_exempt ? 0 : lineTotal * (state.settings.iva_rate / 100);
  return { base, discPct, discount: base - lineTotal, lineTotal, iva };
}

function renderCart() {
  const root = document.getElementById('cartItems');
  const btn = document.getElementById('posCheckout');
  if (!cart.length) {
    root.innerHTML = '<div class="empty" style="padding:30px 10px"><div class="ic">🛒</div><p>Agregue productos a la venta</p></div>';
    document.getElementById('cartTotals').innerHTML = '';
    btn.disabled = true; return;
  }
  root.innerHTML = cart.map((c, i) => {
    const calc = lineCalc(c);
    const hasDisc = discountMap[c.product.id] && discountMap[c.product.id].discount_pct > 0;
    const over = c.qty > c.product.stock;
    return `<div class="cart-item">
      <div style="flex:1">
        <div class="ci-name">${esc(c.product.name)} ${over ? '<span class="badge b-critico">stock!</span>' : ''}</div>
        <div class="fefo-chip">${fmtUSD(c.product.sale_price)}/${c.product.unit} · disp. ${fmtQty(c.product.stock, c.product.unit)}</div>
        ${hasDisc ? `<label style="display:flex;align-items:center;gap:6px;margin-top:5px;font-size:11.5px;color:var(--accent);cursor:pointer">
          <input type="checkbox" data-anti="${i}" ${c.anti ? 'checked' : ''} style="width:auto"> ♻️ Descuento anti-merma -${discountMap[c.product.id].discount_pct}%</label>` : ''}
      </div>
      <div style="text-align:right">
        <input type="number" min="0" step="${c.product.unit === 'kg' ? '0.1' : '1'}" value="${c.qty}" data-qty="${i}" />
        <div class="fefo-chip">${fmtUSD(calc.lineTotal)}${calc.discPct ? ` <s style="color:var(--text-faint)">${fmtUSD(calc.base)}</s>` : ''}</div>
      </div>
      <button class="close-x" data-rm="${i}" style="width:28px;height:28px;font-size:15px">×</button>
    </div>`;
  }).join('');

  root.querySelectorAll('[data-qty]').forEach((inp) => inp.addEventListener('input', () => {
    cart[Number(inp.dataset.qty)].qty = Number(inp.value) || 0; renderTotals(); updateBtn();
  }));
  root.querySelectorAll('[data-anti]').forEach((cb) => cb.addEventListener('change', () => {
    cart[Number(cb.dataset.anti)].anti = cb.checked; renderCart();
  }));
  root.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => {
    cart.splice(Number(b.dataset.rm), 1); renderCart();
  }));
  renderTotals(); updateBtn();
}

function updateBtn() {
  const btn = document.getElementById('posCheckout');
  const valid = cart.length && cart.every((c) => c.qty > 0 && c.qty <= c.product.stock);
  btn.disabled = !valid;
}

function renderTotals() {
  let subtotal = 0, discount = 0, iva = 0;
  for (const c of cart) { const k = lineCalc(c); subtotal += k.base; discount += k.discount; iva += k.iva; }
  const pay = document.getElementById('posPay').value;
  const isDivisa = pay === 'divisa_usd' || pay === 'zelle';
  const taxed = subtotal - discount + iva;
  const igtf = isDivisa ? taxed * (state.settings.igtf_rate / 100) : 0;
  const total = taxed + igtf;
  document.getElementById('cartTotals').innerHTML = `
    <div class="hr"></div>
    <div class="tot-line"><span class="muted">Subtotal</span><span>${fmtUSD(subtotal)}</span></div>
    ${discount > 0 ? `<div class="tot-line"><span style="color:var(--accent)">Descuento anti-merma</span><span style="color:var(--accent)">−${fmtUSD(discount)}</span></div>` : ''}
    <div class="tot-line"><span class="muted">IVA (${state.settings.iva_rate}%)</span><span>${fmtUSD(iva)}</span></div>
    ${igtf > 0 ? `<div class="tot-line"><span class="muted">IGTF (${state.settings.igtf_rate}%)</span><span>${fmtUSD(igtf)}</span></div>` : ''}
    <div class="tot-line grand"><span>Total</span><span>${fmtUSD(total)}</span></div>
    <div class="tot-line"><span class="muted">Equivalente Bs</span><strong>${fmtBs(toBs(total))}</strong></div>`;
}

async function checkout() {
  const btn = document.getElementById('posCheckout');
  btn.disabled = true; btn.textContent = 'Procesando…';
  try {
    const payload = {
      customer: document.getElementById('posCustomer').value || 'Contado',
      customer_rif: document.getElementById('posRif').value || '',
      payment_method: document.getElementById('posPay').value,
      items: cart.map((c) => ({ product_id: c.product.id, qty: c.qty, apply_anti_waste: c.anti })),
    };
    const sale = await api.post('/sales', payload);
    cart = [];
    toast('Venta registrada: ' + sale.code, 'ok');
    showReceipt(sale);
    products = await api.get('/products');
    renderTiles(document.getElementById('posSearch').value.toLowerCase());
    renderCart();
    refreshAlertBadge();
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    btn.textContent = 'Procesar Venta'; updateBtn();
  }
}

function showReceipt(sale) {
  openModal({
    title: `🧾 Comprobante ${esc(sale.code)}`,
    bodyHTML: `
      <div class="trace-box" style="font-family:inherit">
        <div class="row between"><strong>${esc(state.settings.company_name)}</strong><span class="faint">${fmtDate(sale.created_at.slice(0,10))}</span></div>
        <div class="faint">RIF: ${esc(state.settings.rif)}</div>
        <div class="hr"></div>
        <div style="font-size:13px"><strong>Cliente:</strong> ${esc(sale.customer)} ${sale.customer_rif ? '· ' + esc(sale.customer_rif) : ''}</div>
        <div class="table-wrap mt-sm" style="border:none">
          <table><thead><tr><th>Producto</th><th>Lote / Caduca (FEFO)</th><th class="num">Cant.</th><th class="num">Total</th></tr></thead>
          <tbody>${sale.items.map((it) => `<tr>
            <td>${esc(it.product_name)} ${it.is_anti_waste ? '<span class="badge b-advertencia">♻️</span>' : ''}</td>
            <td class="faint">${esc(it.lot_code || '—')} · ${fmtDate(it.expiration_date)}</td>
            <td class="num">${fmtQty(it.qty, it.unit)}</td>
            <td class="num">${fmtUSD(it.line_total)}</td></tr>`).join('')}</tbody></table>
        </div>
        <div class="hr"></div>
        <div class="tot-line"><span class="muted">Subtotal</span><span>${fmtUSD(sale.subtotal)}</span></div>
        ${sale.discount_total > 0 ? `<div class="tot-line"><span style="color:var(--accent)">Descuento</span><span>−${fmtUSD(sale.discount_total)}</span></div>` : ''}
        <div class="tot-line"><span class="muted">IVA</span><span>${fmtUSD(sale.iva_total)}</span></div>
        ${sale.igtf_total > 0 ? `<div class="tot-line"><span class="muted">IGTF</span><span>${fmtUSD(sale.igtf_total)}</span></div>` : ''}
        <div class="tot-line grand"><span>Total</span><span>${fmtUSD(sale.total)}</span></div>
        <div class="tot-line"><span class="muted">Total Bs (tasa ${sale.exchange_rate})</span><strong>${fmtBs(sale.total_bs)}</strong></div>
      </div>`,
    footHTML: `<button class="btn btn-ghost" onclick="window.print()">🖨️ Imprimir</button><button class="btn btn-primary" data-close>Listo</button>`,
    onMount: (modal, close) => modal.querySelector('[data-close]:not(.close-x)').onclick = close,
  });
}
