import { api } from '../api.js';
import { fmtBs, fmtFechaHora, escapeHtml, toast, openModal, empty } from '../utils.js';

export default async function entradas(el) {
  const [lista, productos, proveedores] = await Promise.all([
    api.get('/entradas'), api.get('/productos'), api.get('/proveedores'),
  ]);

  el.innerHTML = `
    <div class="section-note"><span class="ic">📥</span>
      <div><b>Recepción de mercancía.</b> Cada producto recibido genera un <b>lote</b> con su fecha de caducidad, base del control FEFO. El costo promedio del producto se recalcula automáticamente.</div>
    </div>
    <div class="toolbar"><div style="flex:1"></div><button class="btn" id="nueva">+ Registrar recepción</button></div>
    <div class="card pad-0"><div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Documento</th><th>Proveedor</th><th>Responsable</th><th class="num">Costo total</th><th></th></tr></thead>
      <tbody>${lista.map((e) => `<tr>
        <td>${fmtFechaHora(e.fecha)}</td>
        <td class="t-strong">${escapeHtml(e.documento || '—')}</td>
        <td>${escapeHtml(e.proveedor_nombre || '—')}</td>
        <td>${escapeHtml(e.usuario_nombre || '—')}</td>
        <td class="num">${fmtBs(e.total_costo)}</td>
        <td><button class="btn ghost sm" data-ver="${e.id}">Ver</button></td>
      </tr>`).join('') || `<tr><td colspan="6">${empty('📥', 'Sin recepciones registradas.')}</td></tr>`}</tbody>
    </table></div></div>`;

  el.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => verEntrada(b.dataset.ver)));
  el.querySelector('#nueva').addEventListener('click', () => formEntrada(productos, proveedores));
}

async function verEntrada(id) {
  const e = await api.get(`/entradas/${id}`);
  const m = openModal({
    title: `Recepción #${e.id}`,
    wide: true,
    body: `<p class="mb"><b>Documento:</b> ${escapeHtml(e.documento || '—')} · <b>Fecha:</b> ${fmtFechaHora(e.fecha)}</p>
      <table><thead><tr><th>Producto</th><th>Lote</th><th>Caducidad</th><th class="num">Cantidad</th><th class="num">Costo unit.</th></tr></thead>
      <tbody>${e.items.map((i) => `<tr><td>${escapeHtml(i.producto_nombre)}</td><td>${escapeHtml(i.codigo_lote || '—')}</td><td>${i.fecha_caducidad || '—'}</td><td class="num">${i.cantidad}</td><td class="num">${fmtBs(i.costo_unitario)}</td></tr>`).join('')}</tbody></table>`,
    footer: `<button class="btn" data-close>Cerrar</button>`,
  });
  m.root.querySelector('[data-close]').addEventListener('click', m.close);
}

function formEntrada(productos, proveedores) {
  const items = [];
  const m = openModal({
    title: 'Registrar recepción de mercancía',
    wide: true,
    body: `<form id="f">
      <div class="form-grid">
        <div class="field"><label>Documento (factura/guía)</label><input name="documento" placeholder="FAC-00123" /></div>
        <div class="field"><label>Proveedor</label><select name="proveedor_id"><option value="">—</option>${proveedores.map((p) => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
        <div class="field full"><label>Nota</label><input name="nota" /></div>
      </div>
    </form>
    <h4 style="margin:14px 0 8px">Líneas</h4>
    <div class="form-grid" style="grid-template-columns:2fr 1fr 1fr 1.2fr auto;align-items:end">
      <div class="field" style="margin:0"><label>Producto</label><select id="ip">${productos.map((p) => `<option value="${p.id}" data-costo="${p.costo_promedio}" data-vida="${p.vida_util_dias}">${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
      <div class="field" style="margin:0"><label>Cantidad</label><input id="ic" type="number" step="0.1" value="1" /></div>
      <div class="field" style="margin:0"><label>Costo unit.</label><input id="icost" type="number" step="0.01" value="0" /></div>
      <div class="field" style="margin:0"><label>Caducidad</label><input id="icad" type="date" /></div>
      <button class="btn accent" id="add" type="button">+ Agregar</button>
    </div>
    <div class="table-wrap mt"><table id="lineas"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Costo</th><th>Caducidad</th><th></th></tr></thead><tbody></tbody></table></div>`,
    footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar recepción</button>`,
  });

  const sel = m.root.querySelector('#ip');
  const costInput = m.root.querySelector('#icost');
  function syncDefaults() {
    const opt = sel.selectedOptions[0];
    costInput.value = opt.dataset.costo || 0;
    const vida = parseInt(opt.dataset.vida || '30', 10);
    const d = new Date(); d.setDate(d.getDate() + vida);
    m.root.querySelector('#icad').value = d.toISOString().slice(0, 10);
  }
  sel.addEventListener('change', syncDefaults);
  syncDefaults();

  function renderLineas() {
    m.root.querySelector('#lineas tbody').innerHTML = items.map((it, i) => `<tr>
      <td>${escapeHtml(it.nombre)}</td><td class="num">${it.cantidad}</td><td class="num">${fmtBs(it.costo_unitario)}</td><td>${it.fecha_caducidad}</td>
      <td><button class="close-x" data-rm="${i}" style="width:26px;height:26px">×</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Agrega al menos una línea.</td></tr>';
    m.root.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { items.splice(b.dataset.rm, 1); renderLineas(); }));
  }
  renderLineas();

  m.root.querySelector('#add').addEventListener('click', () => {
    const opt = sel.selectedOptions[0];
    const cad = m.root.querySelector('#icad').value;
    const cant = parseFloat(m.root.querySelector('#ic').value);
    if (!cad) return toast('Indica la fecha de caducidad', 'err');
    if (!(cant > 0)) return toast('Cantidad inválida', 'err');
    items.push({ producto_id: Number(sel.value), nombre: opt.textContent, cantidad: cant, costo_unitario: parseFloat(costInput.value) || 0, fecha_caducidad: cad });
    renderLineas();
  });

  m.root.querySelector('[data-close]').addEventListener('click', m.close);
  m.root.querySelector('#save').addEventListener('click', async () => {
    if (!items.length) return toast('Agrega al menos una línea', 'err');
    const f = m.root.querySelector('#f');
    try {
      await api.post('/entradas', {
        documento: f.documento.value || undefined,
        proveedor_id: f.proveedor_id.value ? Number(f.proveedor_id.value) : undefined,
        nota: f.nota.value || undefined,
        items,
      });
      toast('Recepción registrada · lotes creados', 'ok');
      m.close();
      location.hash = '#/inventario';
    } catch (e) { toast(e.message, 'err'); }
  });
}
