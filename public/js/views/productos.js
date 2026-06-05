import { api, auth } from '../api.js';
import { fmtBs, fmtNum, semaforoBadge, descuentoBadge, escapeHtml, toast, openModal, readForm, empty } from '../utils.js';

const PUEDE_EDITAR = ['admin', 'supervisor', 'almacenista'];

export default async function productos(el) {
  const [lista, cats] = await Promise.all([api.get('/productos'), api.get('/categorias')]);
  const puede = PUEDE_EDITAR.includes(auth.user?.rol);

  el.innerHTML = `
    <div class="toolbar">
      <div class="search"><input id="q" placeholder="🔍 Buscar por nombre o código..." /></div>
      <select id="cat"><option value="">Todas las categorías</option>${cats.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('')}</select>
      <div class="spacer" style="flex:1"></div>
      ${puede ? '<button class="btn" id="nuevo">+ Nuevo producto</button>' : ''}
    </div>
    <div class="card pad-0"><div class="table-wrap"><table id="tabla"></table></div></div>`;

  const tabla = el.querySelector('#tabla');
  function render(rows) {
    tabla.innerHTML = `
      <thead><tr>
        <th>Producto</th><th>Categoría</th><th class="num">Precio base</th>
        <th class="num">Stock</th><th>Próximo a vencer</th><th>Precio dinámico</th>${puede ? '<th></th>' : ''}
      </tr></thead>
      <tbody>
        ${rows.map((p) => `
          <tr>
            <td><div class="t-strong">${escapeHtml(p.nombre)}</div><div class="t-sub">${p.codigo}</div></td>
            <td>${escapeHtml(p.categoria_nombre || '—')}</td>
            <td class="num">${fmtBs(p.precio_venta)}</td>
            <td class="num ${p.bajo_stock ? 'sem-critico' : ''}" style="${p.bajo_stock ? 'color:var(--red);font-weight:700' : ''}">${fmtNum(p.stock)} ${p.unidad}${p.bajo_stock ? ' ⚠️' : ''}</td>
            <td>${semaforoBadge(p.estado_caducidad)}</td>
            <td>${p.precio_dinamico && p.precio_dinamico.etiqueta ? `${descuentoBadge(p.precio_dinamico)} <b style="color:var(--accent)">${fmtBs(p.precio_dinamico.precioFinal)}</b>` : '<span class="muted">—</span>'}</td>
            ${puede ? `<td><button class="btn ghost sm" data-edit="${p.id}">Editar</button></td>` : ''}
          </tr>`).join('') || `<tr><td colspan="7">${empty('🥩', 'No hay productos.')}</td></tr>`}
      </tbody>`;
    tabla.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => formProducto(cats, lista.find((x) => x.id == b.dataset.edit), refresh)));
  }
  render(lista);

  async function refresh() {
    const q = el.querySelector('#q').value;
    const cat = el.querySelector('#cat').value;
    const rows = await api.get(`/productos?q=${encodeURIComponent(q)}&categoria=${cat}`);
    render(rows);
  }
  el.querySelector('#q').addEventListener('input', debounce(refresh, 300));
  el.querySelector('#cat').addEventListener('change', refresh);
  if (puede) el.querySelector('#nuevo').addEventListener('click', () => formProducto(cats, null, refresh));
}

function formProducto(cats, p, onSave) {
  const m = openModal({
    title: p ? 'Editar producto' : 'Nuevo producto',
    body: `<form id="f">
      <div class="form-grid">
        <div class="field full"><label>Nombre</label><input name="nombre" required value="${p ? escapeHtml(p.nombre) : ''}" /></div>
        <div class="field"><label>Código / Cód. barras</label><input name="codigo" required value="${p ? p.codigo : ''}" /></div>
        <div class="field"><label>Categoría</label><select name="categoria_id">${cats.map((c) => `<option value="${c.id}" ${p && p.categoria_id == c.id ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`).join('')}</select></div>
        <div class="field"><label>Unidad</label><select name="unidad">${['kg', 'unidad', 'gramo'].map((u) => `<option ${p && p.unidad === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
        <div class="field"><label>Precio venta (Bs.)</label><input name="precio_venta" type="number" step="0.01" value="${p ? p.precio_venta : 0}" /></div>
        <div class="field"><label>Stock mínimo</label><input name="stock_minimo" type="number" step="0.1" value="${p ? p.stock_minimo : 0}" /></div>
        <div class="field"><label>Vida útil (días)</label><input name="vida_util_dias" type="number" value="${p ? p.vida_util_dias : 30}" /></div>
        <div class="field full"><label>Descripción</label><textarea name="descripcion" rows="2">${p ? escapeHtml(p.descripcion || '') : ''}</textarea></div>
      </div>
    </form>`,
    footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar</button>`,
  });
  m.root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', m.close));
  m.root.querySelector('#save').addEventListener('click', async () => {
    const data = readForm(m.root.querySelector('#f'));
    ['precio_venta', 'stock_minimo', 'vida_util_dias', 'categoria_id'].forEach((k) => (data[k] = Number(data[k])));
    try {
      if (p) await api.put(`/productos/${p.id}`, data);
      else await api.post('/productos', data);
      toast('Producto guardado', 'ok');
      m.close();
      onSave();
    } catch (e) { toast(e.message, 'err'); }
  });
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
