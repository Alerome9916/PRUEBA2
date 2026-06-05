import { api, state, fmtUSD, fmtQty, fmtDate, fmtDateTime, toast, openModal, confirmDialog, readForm, esc, levelBadge } from '../core.js';
import { refreshAlertBadge } from '../app.js';

const canEdit = () => ['admin', 'almacen'].includes(state.user.role);
const reload = () => document.getElementById('view');

// ============================ INVENTARIO / LOTES ============================
export async function renderInventory(view) {
  const [batches, products, suppliers] = await Promise.all([
    api.get('/batches'), api.get('/products'), api.get('/suppliers'),
  ]);
  view.innerHTML = `
    <div class="section-head">
      <div><h3>📦 Inventario y Lotes</h3><div class="desc">Lotes ordenados por <strong>FEFO</strong>. Cada recepción genera un código de trazabilidad.</div></div>
      ${canEdit() ? '<button class="btn btn-primary" id="newBatch">＋ Recepción de mercancía</button>' : ''}
    </div>
    <div class="toolbar">
      <input class="search" id="invSearch" placeholder="🔍 Buscar producto o lote…" />
      <select id="stFilter" style="max-width:180px">
        <option value="">Todos los estados</option>
        <option value="activo">Activos</option><option value="cuarentena">Cuarentena</option>
        <option value="agotado">Agotados</option><option value="vencido">Vencidos</option>
      </select>
    </div>
    <div id="invTable"></div>`;

  const draw = (list) => {
    document.getElementById('invTable').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Producto / Lote</th><th>Proveedor</th><th>Recibido</th><th>Caduca</th><th>Semáforo</th><th class="num">Disp.</th><th class="num">Valor</th><th>FEFO 🆕</th><th></th></tr></thead>
        <tbody>${list.map((b) => {
          const value = b.qty_remaining * b.cost_price;
          const sug = b.suggested_discount > 0 ? `<span class="badge b-advertencia" title="Descuento sugerido por riesgo de merma ${b.risk}%">♻️ -${b.suggested_discount}%</span>` : (b.risk > 0 ? `<span class="faint">riesgo ${b.risk}%</span>` : '<span class="faint">—</span>');
          return `<tr ${b.status !== 'activo' ? 'style="opacity:.6"' : ''}>
            <td><div style="font-weight:600">${esc(b.product_name)}</div><div class="faint"><span class="chip-link" data-trace="${esc(b.trace_code)}">${esc(b.lot_code)}</span> · ${esc(b.trace_code)}</div></td>
            <td class="faint">${esc(b.supplier_name || '—')}<div class="faint">${esc(b.location || '')}</div></td>
            <td class="faint">${fmtDate(b.received_date)}</td>
            <td>${fmtDate(b.expiration_date)}</td>
            <td>${b.status === 'agotado' ? '<span class="badge b-info">Agotado</span>' : b.status === 'cuarentena' ? '<span class="badge b-purple">Cuarentena</span>' : levelBadge(b.level, b.label, b.days_to_expiry)}</td>
            <td class="num">${fmtQty(b.qty_remaining, b.unit)}<div class="faint">de ${fmtQty(b.qty_received)}</div></td>
            <td class="num">${fmtUSD(value)}</td>
            <td>${sug}</td>
            <td class="num">${canEdit() && ['activo', 'cuarentena'].includes(b.status) ? `<button class="btn btn-sm btn-ghost" data-act="${b.id}">⋯</button>` : ''}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="9" class="empty">Sin lotes</td></tr>'}
        </tbody></table></div>`;
    document.querySelectorAll('[data-trace]').forEach((e) => e.onclick = () => showTrace(e.dataset.trace));
    document.querySelectorAll('[data-act]').forEach((e) => e.onclick = () => batchActions(batches.find((x) => x.id === Number(e.dataset.act))));
  };
  draw(batches);

  const filter = () => {
    const q = document.getElementById('invSearch').value.toLowerCase();
    const st = document.getElementById('stFilter').value;
    draw(batches.filter((b) => (!q || b.product_name.toLowerCase().includes(q) || b.lot_code.toLowerCase().includes(q)) && (!st || b.status === st)));
  };
  document.getElementById('invSearch').oninput = filter;
  document.getElementById('stFilter').onchange = filter;
  if (canEdit()) document.getElementById('newBatch').onclick = () => receptionForm(products, suppliers);
}

function receptionForm(products, suppliers) {
  const today = new Date().toISOString().slice(0, 10);
  openModal({
    title: '📥 Recepción de mercancía (nuevo lote)',
    size: 'lg',
    bodyHTML: `<form id="bForm"><div class="form-grid">
      <div class="full"><label>Producto *</label><select name="product_id" required>${products.filter((p) => p.active).map((p) => `<option value="${p.id}">${esc(p.name)} (${esc(p.sku)})</option>`).join('')}</select></div>
      <div><label>Proveedor</label><select name="supplier_id"><option value="">—</option>${suppliers.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      <div><label>Código de lote *</label><input name="lot_code" required placeholder="LP-2401"></div>
      <div><label>Cantidad recibida *</label><input type="number" step="0.01" name="qty_received" required></div>
      <div><label>Costo unitario (USD)</label><input type="number" step="0.01" name="cost_price" placeholder="(usa el del producto)"></div>
      <div><label>Fecha recepción</label><input type="date" name="received_date" value="${today}"></div>
      <div><label>Fecha elaboración</label><input type="date" name="manufacture_date"></div>
      <div><label>Fecha de caducidad *</label><input type="date" name="expiration_date" required></div>
      <div><label>Ubicación</label><input name="location" value="Nevera 1"></div>
      <div class="full"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="quarantine" style="width:auto"> Ingresar en cuarentena (pendiente de inspección sanitaria)</label></div>
      <div class="full"><label>Nota</label><input name="note"></div>
    </div></form>`,
    footHTML: `<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Registrar entrada</button>`,
    onMount: (modal, close) => {
      modal.querySelector('[data-cancel]').onclick = close;
      modal.querySelector('[data-save]').onclick = async () => {
        const data = readForm(modal.querySelector('#bForm'));
        try {
          const r = await api.post('/batches', data);
          toast('Lote recibido · Trazabilidad: ' + r.trace_code, 'ok');
          close(); renderInventory(reload()); refreshAlertBadge();
        } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

function batchActions(b) {
  openModal({
    title: `Lote ${esc(b.lot_code)} · ${esc(b.product_name)}`,
    bodyHTML: `
      <div class="row" style="gap:8px;margin-bottom:14px">${levelBadge(b.level, b.label, b.days_to_expiry)}<span class="tag-soft">Disp. ${fmtQty(b.qty_remaining, b.unit)}</span><span class="tag-soft">${esc(b.trace_code)}</span></div>
      <div class="form-grid">
        <div class="full"><label>Ajustar cantidad (conteo físico)</label><div class="row"><input type="number" step="0.01" id="adjQty" value="${b.qty_remaining}" style="flex:1"><button class="btn" id="doAdj">Ajustar</button></div></div>
        <div class="full"><label>Registrar merma de este lote</label>
          <div class="row"><input type="number" step="0.01" id="wQty" placeholder="Cantidad" style="flex:1">
          <select id="wReason" style="flex:1"><option value="dano">Daño</option><option value="contaminacion">Contaminación</option><option value="vencimiento">Vencimiento</option><option value="otro">Otro</option></select>
          <button class="btn btn-danger" id="doWaste">Registrar</button></div>
        </div>
      </div>
      <div class="hr"></div>
      <div class="row" style="gap:8px">
        ${b.status === 'activo' ? '<button class="btn btn-ghost" id="toQuar">🔒 Enviar a cuarentena</button>' : '<button class="btn btn-ghost" id="toActive">✅ Liberar de cuarentena</button>'}
      </div>`,
    onMount: (modal, close) => {
      modal.querySelector('#doAdj').onclick = async () => {
        try { await api.post(`/batches/${b.id}/adjust`, { new_qty: Number(modal.querySelector('#adjQty').value) }); toast('Inventario ajustado'); close(); renderInventory(reload()); } catch (e) { toast(e.message, 'err'); }
      };
      modal.querySelector('#doWaste').onclick = async () => {
        const qty = Number(modal.querySelector('#wQty').value);
        if (!qty) return toast('Indique la cantidad', 'warn');
        try { await api.post('/waste', { batch_id: b.id, qty, reason: modal.querySelector('#wReason').value }); toast('Merma registrada'); close(); renderInventory(reload()); refreshAlertBadge(); } catch (e) { toast(e.message, 'err'); }
      };
      modal.querySelector('#toQuar')?.addEventListener('click', async () => { try { await api.put(`/batches/${b.id}/status`, { status: 'cuarentena' }); toast('Lote en cuarentena'); close(); renderInventory(reload()); } catch (e) { toast(e.message, 'err'); } });
      modal.querySelector('#toActive')?.addEventListener('click', async () => { try { await api.put(`/batches/${b.id}/status`, { status: 'activo' }); toast('Lote liberado'); close(); renderInventory(reload()); } catch (e) { toast(e.message, 'err'); } });
    },
  });
}

// ============================ ALERTAS DE CADUCIDAD ============================
export async function renderAlerts(view) {
  const [expiry, lowStock] = await Promise.all([api.get('/alerts/expiry'), api.get('/alerts/low-stock')]);
  const auto = state.settings.auto_discount_enabled;
  const totalPotentialLoss = expiry.reduce((a, b) => a + (b.potential_loss || 0), 0);
  const atRisk = expiry.filter((b) => b.suggested_discount > 0);

  view.innerHTML = `
    <div class="section-head">
      <div><h3>🚦 Alertas de Caducidad y Motor Anti-Merma</h3><div class="desc">Semáforo FEFO con descuentos dinámicos sugeridos para evitar pérdidas.</div></div>
      ${canEdit() ? '<button class="btn btn-accent" id="runExpiry">🧹 Barrido de vencidos</button>' : ''}
    </div>

    <div class="discount-banner mb">
      <span style="font-size:22px">🆕</span>
      <div><strong>Motor de descuentos dinámicos anti-merma ${auto ? '<span class="badge b-optimo">Activo</span>' : '<span class="badge b-vencido">Inactivo</span>'}</strong>
      <div class="faint">Predice qué lotes no se venderán antes de caducar (según velocidad de rotación) y sugiere un descuento para recuperar el costo. Pérdida potencial detectada: <strong style="color:#f87171">${fmtUSD(totalPotentialLoss)}</strong> en ${atRisk.length} lotes.</div></div>
    </div>

    <div class="toolbar">
      <select id="lvlFilter" style="max-width:200px">
        <option value="">Todos los niveles</option>
        <option value="critico">🔴 Crítico</option><option value="advertencia">🟠 Advertencia</option>
        <option value="aviso">🟡 Aviso</option><option value="optimo">🟢 Óptimo</option>
      </select>
    </div>
    <div id="alertTable"></div>

    ${lowStock.length ? `<div class="card mt">
      <div class="card-title">📉 Productos bajo stock mínimo</div>
      <div class="table-wrap mt-sm" style="border:none"><table>
        <thead><tr><th>Producto</th><th class="num">Stock actual</th><th class="num">Mínimo</th></tr></thead>
        <tbody>${lowStock.map((p) => `<tr><td>${esc(p.name)} <span class="faint">${esc(p.sku)}</span></td><td class="num" style="color:#fbbf24;font-weight:700">${fmtQty(p.stock, p.unit)}</td><td class="num">${fmtQty(p.min_stock)}</td></tr>`).join('')}</tbody>
      </table></div></div>` : ''}`;

  const draw = (list) => {
    document.getElementById('alertTable').innerHTML = list.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>Producto / Lote</th><th>Caduca</th><th>Estado</th><th class="num">Disp.</th><th class="num">Rotación/día</th><th class="num">Merma prevista 🆕</th><th>Descuento sugerido 🆕</th><th class="num">Precio recup.</th></tr></thead>
        <tbody>${list.map((b) => `<tr>
          <td><div style="font-weight:600">${esc(b.product_name)}</div><div class="faint">${esc(b.lot_code)}</div></td>
          <td>${fmtDate(b.expiration_date)}</td>
          <td>${levelBadge(b.level, b.label, b.days_to_expiry)}</td>
          <td class="num">${fmtQty(b.qty_remaining, b.unit)}</td>
          <td class="num">${fmtQty(b.velocity)}</td>
          <td class="num">${b.predicted_waste > 0 ? `<span style="color:#f87171;font-weight:700">${fmtQty(b.predicted_waste, b.unit)}</span><div class="faint">${fmtUSD(b.potential_loss)}</div>` : '<span class="badge b-optimo">0</span>'}</td>
          <td>${b.suggested_discount > 0 ? `<span class="progress-pill" style="background:rgba(245,166,35,.18);color:var(--accent)">−${b.suggested_discount}%</span><div class="faint">${descReason(b.discount_reason)}</div>` : `<span class="faint">${descReason(b.discount_reason)}</span>`}</td>
          <td class="num">${b.suggested_discount > 0 ? `<strong style="color:var(--accent)">${fmtUSD(b.recovery_price)}</strong><div class="faint"><s>${fmtUSD(b.sale_price)}</s></div>` : fmtUSD(b.sale_price)}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<div class="empty"><div class="ic">✅</div><p>Sin lotes en alerta</p></div>';
  };
  draw(expiry);
  document.getElementById('lvlFilter').onchange = (e) => draw(e.target.value ? expiry.filter((b) => b.level === e.target.value) : expiry);
  document.getElementById('runExpiry')?.addEventListener('click', () => confirmDialog('Esto marcará como vencidos todos los lotes con fecha pasada y generará la merma automática. ¿Continuar?', async () => {
    try { const r = await api.post('/waste/run-expiry'); toast(`Barrido completado: ${r.processed} lote(s) vencido(s)`, 'ok'); renderAlerts(reload()); refreshAlertBadge(); } catch (e) { toast(e.message, 'err'); }
  }, { danger: false, yesLabel: 'Ejecutar barrido' }));
}

function descReason(r) {
  return ({ anti_merma: 'anti-merma', rotacion_sana: 'rotación sana', sin_margen: 'sin margen seguro', desactivado: 'motor inactivo', vencido: 'vencido' }[r]) || '';
}

// ============================ MERMAS ============================
export async function renderWaste(view) {
  const waste = await api.get('/waste');
  const total = waste.reduce((a, w) => a + w.cost_value, 0);
  const reasons = { vencimiento: '⏰ Vencimiento', dano: '💥 Daño', contaminacion: '☣️ Contaminación', otro: '❓ Otro' };
  view.innerHTML = `
    <div class="section-head">
      <div><h3>🗑️ Mermas</h3><div class="desc">Registro de productos dados de baja. Total histórico: <strong style="color:#f87171">${fmtUSD(total)}</strong></div></div>
      ${canEdit() ? '<button class="btn btn-accent" id="runExpiry2">🧹 Barrido de vencidos</button>' : ''}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Producto / Lote</th><th>Motivo</th><th class="num">Cantidad</th><th class="num">Costo perdido</th><th>Responsable</th></tr></thead>
      <tbody>${waste.map((w) => `<tr>
        <td class="faint">${fmtDateTime(w.created_at)}</td>
        <td>${esc(w.product_name)}<div class="faint">${esc(w.lot_code || '—')}</div></td>
        <td>${reasons[w.reason] || w.reason}</td>
        <td class="num">${fmtQty(w.qty, w.unit)}</td>
        <td class="num" style="color:#f87171">${fmtUSD(w.cost_value)}</td>
        <td class="faint">${esc(w.user_name || 'Sistema')}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="empty">Sin mermas registradas</td></tr>'}</tbody>
    </table></div>`;
  document.getElementById('runExpiry2')?.addEventListener('click', () => confirmDialog('¿Ejecutar el barrido de lotes vencidos (FEFO)?', async () => {
    try { const r = await api.post('/waste/run-expiry'); toast(`${r.processed} lote(s) procesado(s)`, 'ok'); renderWaste(reload()); refreshAlertBadge(); } catch (e) { toast(e.message, 'err'); }
  }, { danger: false, yesLabel: 'Ejecutar' }));
}

// ============================ TRAZABILIDAD ============================
export async function renderTrace(view) {
  view.innerHTML = `
    <div class="section-head"><div><h3>🔎 Trazabilidad</h3><div class="desc">Consulta el origen, lote y caducidad por código de trazabilidad (QR).</div></div></div>
    <div class="card" style="max-width:520px">
      <label>Código de trazabilidad</label>
      <div class="row"><input id="traceInput" placeholder="CHU-..." style="flex:1"><button class="btn btn-primary" id="traceBtn">Consultar</button></div>
    </div>
    <div id="traceResult" class="mt"></div>`;
  const go = () => { const c = document.getElementById('traceInput').value.trim(); if (c) showTrace(c, document.getElementById('traceResult')); };
  document.getElementById('traceBtn').onclick = go;
  document.getElementById('traceInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

async function showTrace(code, container) {
  let data;
  try { data = await api.get('/trace/' + encodeURIComponent(code)); }
  catch (e) { if (container) container.innerHTML = `<div class="empty"><div class="ic">❓</div><p>${e.message}</p></div>`; else toast(e.message, 'err'); return; }
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&bgcolor=1c212b&color=ffffff&data=${encodeURIComponent(code)}`;
  const html = `
    <div class="row" style="gap:18px;align-items:flex-start;flex-wrap:wrap">
      <img src="${qr}" alt="QR" style="border-radius:12px;border:1px solid var(--border)" onerror="this.style.display='none'"/>
      <div style="flex:1;min-width:240px">
        <div class="card-title">${esc(data.product_name)}</div>
        <div class="row" style="gap:8px;margin:8px 0">${levelBadge(data.level, data.label, data.days_to_expiry)}<span class="tag-soft">${esc(data.category || '')}</span></div>
        <table style="font-size:13px"><tbody>
          <tr><td class="faint">Código trazabilidad</td><td><strong>${esc(data.trace_code)}</strong></td></tr>
          <tr><td class="faint">Lote</td><td>${esc(data.lot_code)}</td></tr>
          <tr><td class="faint">SKU</td><td>${esc(data.sku)}</td></tr>
          <tr><td class="faint">Elaboración</td><td>${fmtDate(data.manufacture_date)}</td></tr>
          <tr><td class="faint">Recepción</td><td>${fmtDate(data.received_date)}</td></tr>
          <tr><td class="faint">Caducidad</td><td><strong>${fmtDate(data.expiration_date)}</strong></td></tr>
          <tr><td class="faint">Proveedor</td><td>${esc(data.supplier_name || '—')}</td></tr>
          <tr><td class="faint">Permiso INSAI</td><td>${esc(data.sanitary_permit || '—')}</td></tr>
          <tr><td class="faint">Norma COVENIN</td><td>${esc(data.covenin_norm || '—')}</td></tr>
          <tr><td class="faint">Reg. sanitario</td><td>${esc(data.sanitary_reg || '—')}</td></tr>
          <tr><td class="faint">Ubicación</td><td>${esc(data.location || '—')}</td></tr>
        </tbody></table>
      </div>
    </div>`;
  if (container) container.innerHTML = `<div class="card" style="max-width:640px">${html}</div>`;
  else openModal({ title: '🔎 Trazabilidad del lote', size: 'lg', bodyHTML: html });
}
