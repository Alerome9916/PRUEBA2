import { api, auth } from '../api.js';
import { fmtBs, fmtUsd, fmtNum, fmtFecha, semaforoBadge, escapeHtml, toast, empty, MOTIVO_MERMA } from '../utils.js';
import { sysConfig } from '../app.js';

export default async function reportes(el) {
  const [inv, vencer, ventas, merm] = await Promise.all([
    api.get('/reportes/inventario-valorizado'),
    api.get('/reportes/por-vencer'),
    api.get('/reportes/ventas'),
    api.get('/reportes/mermas'),
  ]);
  const sys = sysConfig();
  const puedeTasa = ['admin', 'supervisor'].includes(auth.user?.rol);
  const maxDia = Math.max(...(ventas.porDia.map((d) => d.total) || [1]), 1);

  el.innerHTML = `
    <div class="grid cards-4">
      <div class="card kpi brand"><div class="label">Inventario a costo</div><div class="value">${fmtBs(inv.totalCosto)}</div><div class="sub">${fmtUsd(inv.totalCosto / (sys?.fiscal?.tasaBCV || 1))}</div></div>
      <div class="card kpi green"><div class="label">Inventario a venta</div><div class="value">${fmtBs(inv.totalVenta)}</div><div class="sub">margen potencial ${fmtBs(inv.totalVenta - inv.totalCosto)}</div></div>
      <div class="card kpi gold"><div class="label">Ventas (total histórico)</div><div class="value">${fmtBs(ventas.resumen.total)}</div><div class="sub">${ventas.resumen.num_ventas} ventas · ahorro clientes ${fmtBs(ventas.resumen.descuento)}</div></div>
      <div class="card kpi red"><div class="label">Pérdida por mermas</div><div class="value">${fmtBs(merm.totalPerdido)}</div></div>
    </div>

    <div class="card mt">
      <div class="card-head"><h3>⚙️ Parámetros · Tasa de cambio BCV</h3></div>
      <div class="flex wrap">
        <div>Tasa actual: <b style="color:var(--green)">Bs. ${sys?.fiscal?.tasaBCV}</b> / USD</div>
        ${puedeTasa ? `<input id="tasa" type="number" step="0.01" value="${sys?.fiscal?.tasaBCV}" style="padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;width:140px" />
        <button class="btn sm" id="saveTasa">Actualizar tasa</button>` : ''}
      </div>
    </div>

    <div class="grid cards-2 mt">
      <div class="card">
        <div class="card-head"><h3>📊 Ventas por día</h3></div>
        ${ventas.porDia.length ? `<div class="bars">${ventas.porDia.slice(-10).map((d) => {
          const h = Math.max((d.total / maxDia) * 100, 4);
          return `<div class="bar" style="height:${h}%"><b>${fmtNum(d.total/1000,1)}k</b><span>${fmtFecha(d.dia).slice(0,6)}</span></div>`;
        }).join('')}</div>` : empty('📊', 'Sin ventas.')}
      </div>
      <div class="card">
        <div class="card-head"><h3>🏆 Top productos vendidos</h3></div>
        <div class="table-wrap"><table><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Total</th></tr></thead>
        <tbody>${ventas.topProductos.map((p) => `<tr><td>${escapeHtml(p.nombre)}</td><td class="num">${fmtNum(p.cantidad)}</td><td class="num">${fmtBs(p.total)}</td></tr>`).join('') || `<tr><td colspan="3">${empty('🏆', 'Sin datos.')}</td></tr>`}</tbody></table></div>
      </div>
    </div>

    <div class="card mt">
      <div class="card-head"><h3>💰 Inventario valorizado por producto</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Producto</th><th>Categoría</th><th class="num">Stock</th><th class="num">Valor costo</th><th class="num">Valor venta</th></tr></thead>
        <tbody>${inv.items.map((i) => `<tr><td class="t-strong">${escapeHtml(i.nombre)}</td><td>${escapeHtml(i.categoria || '—')}</td><td class="num">${fmtNum(i.stock)} ${i.unidad}</td><td class="num">${fmtBs(i.valor_costo)}</td><td class="num">${fmtBs(i.valor_venta)}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>

    <div class="grid cards-2 mt">
      <div class="card">
        <div class="card-head"><h3>⏳ Próximos a vencer</h3></div>
        <div class="table-wrap"><table><thead><tr><th>Producto</th><th>Lote</th><th>Caducidad</th><th>Estado</th></tr></thead>
        <tbody>${vencer.slice(0, 15).map((l) => `<tr><td>${escapeHtml(l.producto_nombre)}</td><td>${escapeHtml(l.codigo_lote)}</td><td>${fmtFecha(l.fecha_caducidad)}</td><td>${semaforoBadge(l.estado_caducidad)}</td></tr>`).join('') || `<tr><td colspan="4">${empty('✅','Nada por vencer.')}</td></tr>`}</tbody></table></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>🗑️ Mermas por motivo</h3></div>
        <div class="table-wrap"><table><thead><tr><th>Motivo</th><th class="num">Eventos</th><th class="num">Costo</th></tr></thead>
        <tbody>${merm.porMotivo.map((m) => `<tr><td>${MOTIVO_MERMA[m.motivo] || m.motivo}</td><td class="num">${m.num}</td><td class="num" style="color:var(--red)">${fmtBs(m.costo)}</td></tr>`).join('') || `<tr><td colspan="3">${empty('✅','Sin mermas.')}</td></tr>`}</tbody></table></div>
      </div>
    </div>`;

  if (puedeTasa) {
    el.querySelector('#saveTasa').addEventListener('click', async () => {
      try {
        const tasa = Number(el.querySelector('#tasa').value);
        const r = await api.put('/config/tasa', { tasa });
        if (sys) sys.fiscal.tasaBCV = r.tasaBCV;
        toast('Tasa actualizada', 'ok');
        const chip = document.getElementById('rateChip');
        if (chip) chip.innerHTML = `💵 BCV <b>Bs. ${r.tasaBCV}</b>`;
      } catch (e) { toast(e.message, 'err'); }
    });
  }
}
