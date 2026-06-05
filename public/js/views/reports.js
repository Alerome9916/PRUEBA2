import { api, fmtUSD, fmtBs, fmtQty, fmtDate, toBs, esc, levelBadge } from '../core.js';

const TABS = [
  { id: 'inventory', label: '💰 Valoración', render: repInventory },
  { id: 'anti', label: '♻️ Anti-Merma 🆕', render: repAnti },
  { id: 'waste', label: '🗑️ Mermas', render: repWaste },
  { id: 'sales', label: '🧾 Ventas', render: repSales },
  { id: 'kardex', label: '📒 Kardex', render: repKardex },
];

export async function renderReports(view) {
  view.innerHTML = `
    <div class="section-head"><div><h3>📈 Reportes</h3><div class="desc">Análisis de inventario, mermas, ventas y eficiencia FEFO.</div></div></div>
    <div class="toolbar" id="repTabs">${TABS.map((t, i) => `<button class="btn ${i === 0 ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="${t.id}">${t.label}</button>`).join('')}</div>
    <div id="repBody"></div>`;
  const tabsEl = view.querySelector('#repTabs');
  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    tabsEl.querySelectorAll('button').forEach((x) => { x.classList.toggle('btn-primary', x === b); x.classList.toggle('btn-ghost', x !== b); });
    const tab = TABS.find((t) => t.id === b.dataset.tab);
    document.getElementById('repBody').innerHTML = '<div class="spinner"></div>';
    tab.render(document.getElementById('repBody'));
  });
  repInventory(view.querySelector('#repBody'));
}

async function repInventory(body) {
  const d = await api.get('/reports/inventory');
  body.innerHTML = `
    <div class="card mb"><div class="row between"><div class="card-title">Valor total del inventario activo</div><div style="font-size:22px;font-weight:800">${fmtUSD(d.total)} <span class="faint" style="font-size:13px">· ${fmtBs(toBs(d.total))}</span></div></div></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Producto</th><th>Categoría</th><th>Lote</th><th>Caduca</th><th>Estado</th><th class="num">Cant.</th><th class="num">Costo</th><th class="num">Valor</th></tr></thead>
      <tbody>${d.rows.map((r) => `<tr>
        <td>${esc(r.name)} <span class="faint">${esc(r.sku)}</span></td>
        <td class="faint">${esc(r.category || '—')}</td>
        <td>${esc(r.lot_code)}</td>
        <td>${fmtDate(r.expiration_date)}</td>
        <td>${levelBadge(r.level, r.label, r.days_to_expiry)}</td>
        <td class="num">${fmtQty(r.qty_remaining, r.unit)}</td>
        <td class="num">${fmtUSD(r.cost_price)}</td>
        <td class="num">${fmtUSD(r.value)}</td>
      </tr>`).join('') || '<tr><td colspan="8" class="empty">Sin inventario</td></tr>'}</tbody>
    </table></div>`;
}

async function repAnti(body) {
  const d = await api.get('/reports/anti-waste');
  body.innerHTML = `
    <div class="grid cards-3 mb">
      <div class="card kpi"><div class="label">♻️ Ingresos recuperados</div><div class="value" style="color:var(--accent)">${fmtUSD(d.recovered_revenue)}</div><div class="meta">${fmtQty(d.recovered_qty)} vendidos con descuento anti-merma</div></div>
      <div class="card kpi"><div class="label">🗑️ Pérdida por mermas</div><div class="value" style="font-size:23px;color:#f87171">${fmtUSD(d.total_waste_value)}</div><div class="meta">acumulado histórico</div></div>
      <div class="card kpi"><div class="label">📊 Tasa de merma</div><div class="value" style="font-size:23px">${d.merma_rate}%</div><div class="meta">mermas / (mermas + ventas a costo)</div></div>
    </div>
    <div class="discount-banner mb"><span style="font-size:20px">💡</span><div>Esta es la <strong>novedad</strong> del sistema: combina FEFO con un motor predictivo que convierte producto a punto de vencer en ventas con descuento dinámico, recuperando dinero que de otro modo sería merma.</div></div>
    <div class="card">
      <div class="card-title">Recuperación por producto</div>
      <div class="table-wrap mt-sm" style="border:none"><table>
        <thead><tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Ingreso recuperado</th></tr></thead>
        <tbody>${d.by_product.length ? d.by_product.map((p) => `<tr><td>${esc(p.name)}</td><td class="num">${fmtQty(p.qty, p.unit)}</td><td class="num">${fmtUSD(p.recovered)}</td></tr>`).join('') : '<tr><td colspan="3" class="faint">Aún no hay ventas anti-merma. Active el motor y use el botón ♻️ en el Punto de Venta.</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

async function repWaste(body) {
  const d = await api.get('/reports/waste');
  const reasons = { vencimiento: '⏰ Vencimiento', dano: '💥 Daño', contaminacion: '☣️ Contaminación', otro: '❓ Otro' };
  body.innerHTML = `
    <div class="card mb"><div class="row between"><div class="card-title">Total mermas</div><div style="font-size:22px;font-weight:800;color:#f87171">${fmtUSD(d.total_value)} <span class="faint" style="font-size:13px">· ${fmtQty(d.total_qty)}</span></div></div></div>
    <div class="grid cards-2">
      <div class="card"><div class="card-title">Por motivo</div><div class="table-wrap mt-sm" style="border:none"><table><thead><tr><th>Motivo</th><th class="num">Casos</th><th class="num">Cant.</th><th class="num">Costo</th></tr></thead><tbody>${d.by_reason.map((r) => `<tr><td>${reasons[r.reason] || r.reason}</td><td class="num">${r.n}</td><td class="num">${fmtQty(r.qty)}</td><td class="num">${fmtUSD(r.value)}</td></tr>`).join('') || '<tr><td colspan="4" class="faint">Sin datos</td></tr>'}</tbody></table></div></div>
      <div class="card"><div class="card-title">Por producto (top 20)</div><div class="table-wrap mt-sm" style="border:none"><table><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Costo</th></tr></thead><tbody>${d.by_product.map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${fmtQty(r.qty, r.unit)}</td><td class="num">${fmtUSD(r.value)}</td></tr>`).join('') || '<tr><td colspan="3" class="faint">Sin datos</td></tr>'}</tbody></table></div></div>
    </div>`;
}

async function repSales(body) {
  const d = await api.get('/reports/sales');
  body.innerHTML = `
    <div class="grid cards-3 mb">
      <div class="card kpi"><div class="label">Total ventas</div><div class="value">${fmtUSD(d.totals.total)}</div></div>
      <div class="card kpi"><div class="label">IVA recaudado</div><div class="value" style="font-size:23px">${fmtUSD(d.totals.iva)}</div></div>
      <div class="card kpi"><div class="label">Transacciones</div><div class="value" style="font-size:23px">${d.totals.count}</div></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th class="num">Ventas</th><th class="num">Subtotal</th><th class="num">Descuento</th><th class="num">IVA</th><th class="num">Total</th></tr></thead>
      <tbody>${d.by_day.map((r) => `<tr><td>${fmtDate(r.d)}</td><td class="num">${r.n}</td><td class="num">${fmtUSD(r.subtotal)}</td><td class="num">${fmtUSD(r.discount)}</td><td class="num">${fmtUSD(r.iva)}</td><td class="num"><strong>${fmtUSD(r.total)}</strong></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sin ventas</td></tr>'}</tbody>
    </table></div>`;
}

async function repKardex(body) {
  const products = await api.get('/products');
  body.innerHTML = `
    <div class="toolbar"><select id="kProd" style="max-width:340px">${products.map((p) => `<option value="${p.id}">${esc(p.name)} (${esc(p.sku)})</option>`).join('')}</select></div>
    <div id="kardexBody"></div>`;
  const load = async () => {
    const id = document.getElementById('kProd').value;
    const rows = await api.get('/reports/kardex/' + id);
    const types = { entrada: '<span class="badge b-optimo">Entrada</span>', salida: '<span class="badge b-info">Salida</span>', merma: '<span class="badge b-critico">Merma</span>', ajuste: '<span class="badge b-purple">Ajuste</span>' };
    document.getElementById('kardexBody').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Lote</th><th class="num">Cantidad</th><th class="num">Costo unit.</th><th>Referencia</th><th>Usuario</th></tr></thead>
        <tbody>${rows.map((m) => `<tr>
          <td class="faint">${fmtDateTime(m.created_at)}</td><td>${types[m.type] || m.type}</td>
          <td>${esc(m.lot_code || '—')}</td>
          <td class="num" style="color:${m.qty < 0 ? '#f87171' : m.type === 'entrada' ? '#4ade80' : 'inherit'}">${m.type === 'salida' || m.type === 'merma' ? '−' : ''}${fmtQty(Math.abs(m.qty))}</td>
          <td class="num">${fmtUSD(m.unit_cost)}</td><td class="faint">${esc(m.reference || '')} ${esc(m.note || '')}</td><td class="faint">${esc(m.user_name || 'Sistema')}</td>
        </tr>`).join('') || '<tr><td colspan="7" class="empty">Sin movimientos</td></tr>'}</tbody>
      </table></div>`;
  };
  document.getElementById('kProd').onchange = load;
  load();
}

function fmtDateTime(d) { return d ? new Date(d.replace(' ', 'T')).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'; }
