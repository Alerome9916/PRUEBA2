import { api } from '../api.js';
import { fmtBs, fmtNum, fmtFecha, semaforoBadge, descuentoBadge, escapeHtml, empty } from '../utils.js';

export default async function alertas(el) {
  const a = await api.get('/alertas');
  const r = a.resumen;

  el.innerHTML = `
    <div class="grid cards-4">
      ${card('red', '🔴', 'Críticos (≤7 días)', r.criticos)}
      ${card('red', '⛔', 'Vencidos por retirar', r.vencidos)}
      ${card('gold', '📉', 'Bajo stock', r.bajoStock)}
      ${card('brand', '❄️', 'Fallas cadena de frío', r.frio)}
    </div>

    <div class="card mt">
      <div class="card-head"><h3>⏳ Lotes próximos a vencer (FEFO) — con precio dinámico sugerido</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Producto</th><th>Lote</th><th class="num">Existencia</th><th>Caducidad</th><th>Estado</th><th>Acción anti-desperdicio</th></tr></thead>
        <tbody>${a.porVencer.map((l) => `<tr>
          <td class="t-strong">${escapeHtml(l.producto_nombre)}</td>
          <td>${escapeHtml(l.codigo_lote)}</td>
          <td class="num">${fmtNum(l.cantidad_actual)} ${l.unidad}</td>
          <td>${fmtFecha(l.fecha_caducidad)}</td>
          <td>${semaforoBadge(l.estado_caducidad)}</td>
          <td>${l.precio_dinamico && l.precio_dinamico.etiqueta ? `${descuentoBadge(l.precio_dinamico)} → <b style="color:var(--accent)">${fmtBs(l.precio_dinamico.precioFinal)}</b>` : '<span class="muted">Mantener precio</span>'}</td>
        </tr>`).join('') || `<tr><td colspan="6">${empty('✅', 'Ningún lote próximo a vencer.')}</td></tr>`}</tbody>
      </table></div>
    </div>

    <div class="grid cards-2 mt">
      <div class="card">
        <div class="card-head"><h3>⛔ Lotes vencidos (retirar)</h3></div>
        <div class="table-wrap"><table><thead><tr><th>Producto</th><th>Lote</th><th class="num">Cant.</th><th>Venció</th></tr></thead>
        <tbody>${a.vencidos.map((l) => `<tr><td>${escapeHtml(l.producto_nombre)}</td><td>${escapeHtml(l.codigo_lote)}</td><td class="num">${fmtNum(l.cantidad_actual)} ${l.unidad}</td><td>${semaforoBadge(l.estado_caducidad)}</td></tr>`).join('') || `<tr><td colspan="4">${empty('✅', 'Sin vencidos.')}</td></tr>`}</tbody></table></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>📉 Productos bajo stock mínimo</h3></div>
        <div class="table-wrap"><table><thead><tr><th>Producto</th><th class="num">Stock</th><th class="num">Mínimo</th></tr></thead>
        <tbody>${a.bajoStock.map((p) => `<tr><td>${escapeHtml(p.nombre)}<div class="t-sub">${p.codigo}</div></td><td class="num" style="color:var(--red);font-weight:700">${fmtNum(p.stock)} ${p.unidad}</td><td class="num">${fmtNum(p.stock_minimo)}</td></tr>`).join('') || `<tr><td colspan="3">${empty('✅', 'Stock saludable.')}</td></tr>`}</tbody></table></div>
      </div>
    </div>`;
}

function card(cls, ic, label, value) {
  return `<div class="card kpi ${value > 0 ? cls : 'green'}"><div class="ic-bg">${ic}</div><div class="label">${label}</div><div class="value">${value}</div></div>`;
}
