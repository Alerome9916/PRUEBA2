import { api } from '../api.js';
import { fmtNum, fmtFecha, fmtFechaHora, semaforoBadge, escapeHtml, empty } from '../utils.js';

const TIPO_MOV = { entrada: '📥 Entrada', venta: '🧾 Venta', merma: '🗑️ Merma', ajuste: '⚙️ Ajuste' };

export default async function trazabilidad(el, ctx) {
  const loteId = ctx.params && ctx.params[0];
  if (loteId) return detalle(el, loteId);

  const lotes = await api.get('/lotes');
  el.innerHTML = `
    <div class="section-note"><span class="ic">🔎</span>
      <div><b>Trazabilidad por lote.</b> Consulta el origen, recorrido y estado de cualquier lote, y genera su código <b>QR</b> para etiquetado y verificación (cumple el principio de trazabilidad sanitaria de Venezuela).</div>
    </div>
    <div class="toolbar"><div class="search"><input id="q" placeholder="🔍 Buscar lote o producto..." /></div></div>
    <div class="card pad-0"><div class="table-wrap"><table id="t">
      <thead><tr><th>Lote</th><th>Producto</th><th>Proveedor</th><th>Caducidad</th><th>Estado</th><th></th></tr></thead>
      <tbody></tbody></table></div></div>`;

  const tbody = el.querySelector('#t tbody');
  function render(rows) {
    tbody.innerHTML = rows.map((l) => `<tr>
      <td class="t-strong">${escapeHtml(l.codigo_lote)}</td>
      <td>${escapeHtml(l.producto_nombre)}</td>
      <td>${escapeHtml(l.proveedor_nombre || '—')}</td>
      <td>${fmtFecha(l.fecha_caducidad)}</td>
      <td>${semaforoBadge(l.estado_caducidad)}</td>
      <td><a class="btn ghost sm" href="#/trazabilidad/${l.id}">🔎 Ver / QR</a></td>
    </tr>`).join('') || `<tr><td colspan="6">${empty('📦', 'Sin lotes.')}</td></tr>`;
  }
  render(lotes);
  el.querySelector('#q').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    render(lotes.filter((l) => l.codigo_lote.toLowerCase().includes(q) || l.producto_nombre.toLowerCase().includes(q)));
  });
}

async function detalle(el, id) {
  const [data, qr] = await Promise.all([api.get(`/trazabilidad/lote/${id}`), api.get(`/trazabilidad/lote/${id}/qr`)]);
  const l = data.lote;
  el.innerHTML = `
    <a class="btn ghost sm mb" href="#/trazabilidad">← Volver</a>
    <div class="grid cards-2">
      <div class="card">
        <div class="card-head"><h3>📦 Lote ${escapeHtml(l.codigo_lote)}</h3>${semaforoBadge(l.estado_caducidad)}</div>
        <table>
          ${fila('Producto', `${escapeHtml(l.producto_nombre)} (${l.producto_codigo})`)}
          ${fila('Existencia', `${fmtNum(l.cantidad_actual)} / ${fmtNum(l.cantidad_inicial)} ${l.unidad}`)}
          ${fila('Proveedor', `${escapeHtml(l.proveedor_nombre || '—')} ${l.proveedor_rif ? '· ' + l.proveedor_rif : ''}`)}
          ${fila('Reg. sanitario', escapeHtml(l.registro_sanitario || 'N/D'))}
          ${fila('Producción', fmtFecha(l.fecha_produccion))}
          ${fila('Recepción', fmtFecha(l.fecha_recepcion))}
          ${fila('Caducidad', `<b>${fmtFecha(l.fecha_caducidad)}</b>`)}
          ${fila('Ubicación', escapeHtml(l.ubicacion || '—'))}
          ${fila('Estado', l.estado)}
        </table>
      </div>
      <div class="card qr-box">
        <div class="card-head" style="justify-content:center"><h3>Código QR de trazabilidad</h3></div>
        <img src="${qr.qr}" alt="QR del lote" />
        <p class="t-sub mt">Escanéalo para verificar origen y caducidad.<br/>Empresa: ${escapeHtml(qr.payload.empresa)} · ${qr.payload.rif}</p>
        <a class="btn ghost sm mt" href="${qr.qr}" download="QR-${l.codigo_lote}.png">⬇️ Descargar QR</a>
      </div>
    </div>
    <div class="card mt">
      <div class="card-head"><h3>🕓 Historial de movimientos</h3></div>
      <div class="timeline">
        ${data.movimientos.map((m) => `<div class="tl-item">
          <div class="tl-t">${TIPO_MOV[m.tipo] || m.tipo} · ${fmtNum(m.cantidad)} ${l.unidad} ${m.referencia ? `<span class="chip">${escapeHtml(m.referencia)}</span>` : ''}</div>
          <div class="tl-d">${fmtFechaHora(m.fecha)} ${m.usuario_nombre ? '· ' + escapeHtml(m.usuario_nombre) : ''}</div>
        </div>`).join('') || empty('🕓', 'Sin movimientos.')}
      </div>
    </div>`;
}

function fila(k, v) { return `<tr><td class="t-sub">${k}</td><td class="t-strong">${v}</td></tr>`; }
