import { api } from '../api.js';
import { fmtBs, fmtUsd, fmtNum, descuentoBadge, escapeHtml, semaforoBadge, toast, openModal, empty } from '../utils.js';

const cart = []; // { producto_id, nombre, unidad, cantidad, precio_venta }

export default async function pos(el, ctx) {
  const productos = (await api.get('/productos')).filter((p) => p.activo);

  el.innerHTML = `
    <div class="section-note">
      <span class="ic">🤖</span>
      <div><b>Motor Anti-Desperdicio activo.</b> El precio de cada producto se ajusta automáticamente según la caducidad del lote más próximo (FEFO). El descuento se aplica solo en la venta para liquidar mercancía antes de que se pierda.</div>
    </div>
    <div class="pos">
      <div>
        <div class="toolbar"><div class="search"><input id="q" placeholder="🔍 Buscar producto o escanear código..." autofocus /></div></div>
        <div class="pos-products" id="prods"></div>
      </div>
      <div class="card" style="position:sticky;top:84px">
        <div class="card-head"><h3>🧾 Venta actual</h3><button class="btn ghost sm" id="clear">Vaciar</button></div>
        <div id="cart"></div>
        <div class="totes" id="totes"></div>
        <div class="field mt"><label>Cliente</label><input id="cliente" placeholder="Consumidor final" /></div>
        <div class="form-grid">
          <div class="field"><label>RIF/CI</label><input id="rif" placeholder="V-..." /></div>
          <div class="field"><label>Pago</label><select id="pago">
            <option value="efectivo_ves">Efectivo Bs.</option>
            <option value="efectivo_usd">Efectivo $ (Divisa)</option>
            <option value="punto">Punto de venta</option>
            <option value="pago_movil">Pago móvil</option>
            <option value="transferencia">Transferencia</option>
          </select></div>
        </div>
        <button class="btn block success mt" id="cobrar" style="font-size:16px;padding:14px">💰 Cobrar</button>
      </div>
    </div>`;

  const prodsEl = el.querySelector('#prods');
  function renderProds(list) {
    prodsEl.innerHTML = list.map((p) => {
      const pd = p.precio_dinamico;
      const hasDisc = pd && pd.etiqueta;
      const out = p.stock <= 0;
      return `<div class="pos-prod ${out ? 'out' : ''}" data-id="${p.id}">
        ${hasDisc ? `<div class="disc-corner">${descuentoBadge(pd)}</div>` : ''}
        <div class="pn">${escapeHtml(p.nombre)}</div>
        <div class="pp">${hasDisc ? `<s>${fmtBs(pd.precioBase)}</s>${fmtBs(pd.precioFinal)}` : fmtBs(p.precio_venta)}</div>
        <div class="meta">Stock: ${fmtNum(p.stock)} ${p.unidad} ${p.estado_caducidad ? '· ' + p.estado_caducidad.dias + 'd' : ''}</div>
      </div>`;
    }).join('') || empty('🥩', 'Sin productos.');
    prodsEl.querySelectorAll('.pos-prod').forEach((c) =>
      c.addEventListener('click', () => addToCart(productos.find((p) => p.id == c.dataset.id))));
  }
  renderProds(productos);

  el.querySelector('#q').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderProds(productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.includes(q)));
  });

  function addToCart(p) {
    if (!p || p.stock <= 0) return;
    const ex = cart.find((c) => c.producto_id === p.id);
    if (ex) ex.cantidad = Math.round((ex.cantidad + 1) * 100) / 100;
    else cart.push({ producto_id: p.id, nombre: p.nombre, unidad: p.unidad, cantidad: 1 });
    renderCart();
  }

  async function renderCart() {
    const cEl = el.querySelector('#cart');
    if (!cart.length) {
      cEl.innerHTML = empty('🛒', 'Agrega productos a la venta.');
      el.querySelector('#totes').innerHTML = '';
      return;
    }
    cEl.innerHTML = cart.map((c, i) => `
      <div class="cart-line">
        <div class="cl-name"><div class="t-strong">${escapeHtml(c.nombre)}</div><div class="t-sub">${c.unidad}</div></div>
        <input class="qty" type="number" step="0.1" min="0.1" value="${c.cantidad}" data-i="${i}" />
        <button class="close-x" data-rm="${i}" style="width:28px;height:28px;font-size:15px">×</button>
      </div>`).join('');
    cEl.querySelectorAll('.qty').forEach((q) => q.addEventListener('change', (e) => {
      cart[e.target.dataset.i].cantidad = parseFloat(e.target.value) || 0.1; renderCart();
    }));
    cEl.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { cart.splice(b.dataset.rm, 1); renderCart(); }));
    await cotizar();
  }

  async function cotizar() {
    const totesEl = el.querySelector('#totes');
    try {
      const q = await api.post('/ventas/cotizar', { items: cart.map((c) => ({ producto_id: c.producto_id, cantidad: c.cantidad })) });
      totesEl.dataset.ok = '1';
      totesEl.innerHTML = `
        <div class="row"><span>Subtotal</span><b>${fmtBs(q.subtotal)}</b></div>
        ${q.descuento_anti_desperdicio > 0 ? `<div class="row save"><span>🤖 Ahorro anti-desperdicio</span><b>− ${fmtBs(q.descuento_anti_desperdicio)}</b></div>` : ''}
        <div class="row"><span>IVA (16%)</span><b>${fmtBs(q.iva)}</b></div>
        <div class="row grand"><span>Total</span><span>${fmtBs(q.total)}</span></div>
        <div class="row"><span class="muted">Equivalente</span><span class="muted">${fmtUsd(q.total_usd)} · Tasa ${q.tasa_bcv}</span></div>`;
    } catch (e) {
      totesEl.dataset.ok = '';
      totesEl.innerHTML = `<div class="row" style="color:var(--red)"><span>⚠️ ${e.message}</span></div>`;
    }
  }

  el.querySelector('#clear').addEventListener('click', () => { cart.length = 0; renderCart(); });
  el.querySelector('#cobrar').addEventListener('click', async () => {
    if (!cart.length) return toast('La venta está vacía', 'err');
    try {
      const venta = await api.post('/ventas', {
        items: cart.map((c) => ({ producto_id: c.producto_id, cantidad: c.cantidad })),
        cliente: el.querySelector('#cliente').value || undefined,
        cliente_rif: el.querySelector('#rif').value || undefined,
        metodo_pago: el.querySelector('#pago').value,
      });
      cart.length = 0;
      renderCart();
      mostrarTicket(venta);
      ctx.refreshAlertBadge && ctx.refreshAlertBadge();
      // recargar stocks
      const fresh = await api.get('/productos');
      productos.length = 0; fresh.forEach((p) => productos.push(p));
      renderProds(productos);
    } catch (e) { toast(e.message, 'err'); }
  });

  renderCart();
}

function mostrarTicket(v) {
  const m = openModal({
    title: `✅ Venta ${v.numero}`,
    body: `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:40px">🥩</div>
        <b>Charcutería Los Churuguaros</b><div class="t-sub">Comprobante de venta · IVA incluido</div>
      </div>
      <table>
        <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">P.Unit</th><th class="num">Subtotal</th></tr></thead>
        <tbody>${v.lineas.map((l) => `<tr>
          <td>${escapeHtml(l.producto_nombre)} ${l.etiqueta_descuento ? descuentoBadge({etiqueta:l.etiqueta_descuento}) : ''}<div class="t-sub">Lote ${l.codigo_lote}</div></td>
          <td class="num">${fmtNum(l.cantidad)}</td>
          <td class="num">${fmtBs(l.precio_aplicado)}</td>
          <td class="num">${fmtBs(l.subtotal)}</td></tr>`).join('')}</tbody>
      </table>
      <div class="totes mt">
        <div class="row"><span>Subtotal</span><b>${fmtBs(v.subtotal)}</b></div>
        ${v.descuento_anti_desperdicio > 0 ? `<div class="row save"><span>Ahorro anti-desperdicio</span><b>− ${fmtBs(v.descuento_anti_desperdicio)}</b></div>` : ''}
        <div class="row"><span>IVA 16%</span><b>${fmtBs(v.iva)}</b></div>
        <div class="row grand"><span>Total</span><span>${fmtBs(v.total)}</span></div>
        <div class="row"><span class="muted">Equivalente divisa</span><span class="muted">${fmtUsd(v.total_usd)}</span></div>
      </div>`,
    footer: `<button class="btn" data-close>Cerrar</button>`,
  });
  m.root.querySelector('[data-close]').addEventListener('click', m.close);
}
