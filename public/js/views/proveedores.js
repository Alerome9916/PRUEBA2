import { api, auth } from '../api.js';
import { escapeHtml, toast, openModal, readForm, empty } from '../utils.js';

const PUEDE = ['admin', 'supervisor', 'almacenista'];

export default async function proveedores(el) {
  const lista = await api.get('/proveedores');
  const puede = PUEDE.includes(auth.user?.rol);

  el.innerHTML = `
    <div class="toolbar"><div style="flex:1"></div>${puede ? '<button class="btn" id="nuevo">+ Nuevo proveedor</button>' : ''}</div>
    <div class="card pad-0"><div class="table-wrap"><table>
      <thead><tr><th>Proveedor</th><th>RIF</th><th>Contacto</th><th>Teléfono</th><th>Reg. Sanitario</th>${puede ? '<th></th>' : ''}</tr></thead>
      <tbody>${lista.map((p) => `<tr>
        <td><div class="t-strong">${escapeHtml(p.nombre)}</div><div class="t-sub">${escapeHtml(p.email || '')}</div></td>
        <td>${escapeHtml(p.rif || '—')}</td>
        <td>${escapeHtml(p.contacto || '—')}</td>
        <td>${escapeHtml(p.telefono || '—')}</td>
        <td><span class="chip">${escapeHtml(p.registro_sanitario || 'N/D')}</span></td>
        ${puede ? `<td><button class="btn ghost sm" data-edit="${p.id}">Editar</button></td>` : ''}
      </tr>`).join('') || `<tr><td colspan="6">${empty('🚚', 'Sin proveedores.')}</td></tr>`}</tbody>
    </table></div></div>`;

  if (puede) {
    el.querySelector('#nuevo').addEventListener('click', () => form(null));
    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => form(lista.find((x) => x.id == b.dataset.edit))));
  }

  function form(p) {
    const m = openModal({
      title: p ? 'Editar proveedor' : 'Nuevo proveedor',
      body: `<form id="f"><div class="form-grid">
        <div class="field full"><label>Nombre</label><input name="nombre" required value="${p ? escapeHtml(p.nombre) : ''}" /></div>
        <div class="field"><label>RIF</label><input name="rif" value="${p ? escapeHtml(p.rif || '') : ''}" placeholder="J-00000000-0" /></div>
        <div class="field"><label>Registro sanitario (INSAI)</label><input name="registro_sanitario" value="${p ? escapeHtml(p.registro_sanitario || '') : ''}" /></div>
        <div class="field"><label>Contacto</label><input name="contacto" value="${p ? escapeHtml(p.contacto || '') : ''}" /></div>
        <div class="field"><label>Teléfono</label><input name="telefono" value="${p ? escapeHtml(p.telefono || '') : ''}" /></div>
        <div class="field"><label>Email</label><input name="email" value="${p ? escapeHtml(p.email || '') : ''}" /></div>
        <div class="field full"><label>Dirección</label><input name="direccion" value="${p ? escapeHtml(p.direccion || '') : ''}" /></div>
      </div></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar</button>`,
    });
    m.root.querySelector('[data-close]').addEventListener('click', m.close);
    m.root.querySelector('#save').addEventListener('click', async () => {
      const data = readForm(m.root.querySelector('#f'));
      try {
        if (p) await api.put(`/proveedores/${p.id}`, data); else await api.post('/proveedores', data);
        toast('Proveedor guardado', 'ok'); m.close(); proveedores(el);
      } catch (e) { toast(e.message, 'err'); }
    });
  }
}
