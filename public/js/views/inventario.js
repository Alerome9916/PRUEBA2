import { api } from '../api.js';
import { fmtBs, fmtNum, fmtFecha, semaforoBadge, descuentoBadge, escapeHtml, empty } from '../utils.js';

export default async function inventario(el) {
  const lotes = await api.get('/lotes?estado=activo');

  el.innerHTML = `
    <div class="section-note">
      <span class="ic">📦</span>
      <div><b>Control de Lotes por FEFO.</b> Los lotes se ordenan por fecha de caducidad ascendente: el primero en vencer es el primero en salir. El sistema sugiere precios dinámicos para liquidar los lotes próximos a vencer y evitar mermas.</div>
    </div>
    <div class="toolbar">
      <div class="search"><input id="q" placeholder="🔍 Buscar lote o producto..." /></div>
      <select id="filtro">
        <option value="">Todos los estados de caducidad</option>
        <option value="critico">Solo críticos</option>
        <option value="alerta">Solo alerta</option>
        <option value="precaucion">Solo precaución</option>
        <option value="optimo">Solo óptimos</option>
      </select>
    </div>
    <div class="card pad-0"><div class="table-wrap"><table id="tabla"></table></div></div>`;

  const tabla = el.querySelector('#tabla');
  function render(rows) {
    tabla.innerHTML = `
      <thead><tr>
        <th>Lote</th><th>Producto</th><th>Proveedor</th><th class="num">Existencia</th>
        <th>Recepción</th><th>Caducidad</th><th>Estado FEFO</th><th>Precio sugerido</th><th>Trazar</th>
      </tr></thead>
      <tbody>
        ${rows.map((l) => `
          <tr>
            <td class="t-strong">${escapeHtml(l.codigo_lote)}</td>
            <td>${escapeHtml(l.producto_nombre)}<div class="t-sub">${l.producto_codigo}</div></td>
            <td>${escapeHtml(l.proveedor_nombre || '—')}</td>
            <td class="num">${fmtNum(l.cantidad_actual)} ${l.unidad}</td>
            <td>${fmtFecha(l.fecha_recepcion)}</td>
            <td class="t-strong">${fmtFecha(l.fecha_caducidad)}</td>
            <td>${semaforoBadge(l.estado_caducidad)}</td>
            <td>${l.precio_dinamico && l.precio_dinamico.etiqueta ? `${descuentoBadge(l.precio_dinamico)}<br/><b style="color:var(--accent)">${fmtBs(l.precio_dinamico.precioFinal)}</b> <s class="t-sub">${fmtBs(l.precio_dinamico.precioBase)}</s>` : fmtBs(l.precio_venta)}</td>
            <td><a class="btn ghost sm" href="#/trazabilidad/${l.id}">🔎 QR</a></td>
          </tr>`).join('') || `<tr><td colspan="9">${empty('📦', 'No hay lotes activos.')}</td></tr>`}
      </tbody>`;
  }
  render(lotes);

  function apply() {
    const q = el.querySelector('#q').value.toLowerCase();
    const f = el.querySelector('#filtro').value;
    render(lotes.filter((l) =>
      (!q || l.codigo_lote.toLowerCase().includes(q) || l.producto_nombre.toLowerCase().includes(q)) &&
      (!f || l.estado_caducidad.nivel === f)));
  }
  el.querySelector('#q').addEventListener('input', apply);
  el.querySelector('#filtro').addEventListener('change', apply);
}
