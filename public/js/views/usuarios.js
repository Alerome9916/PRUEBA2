import { api } from '../api.js';
import { fmtFecha, escapeHtml, toast, openModal, readForm, empty, ROL_LABEL } from '../utils.js';
import { sysConfig } from '../app.js';

export default async function usuarios(el) {
  const lista = await api.get('/auth/usuarios');
  const roles = sysConfig()?.roles || ['admin', 'supervisor', 'almacenista', 'cajero'];

  el.innerHTML = `
    <div class="toolbar"><div style="flex:1"></div><button class="btn" id="nuevo">+ Nuevo usuario</button></div>
    <div class="card pad-0"><div class="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Creado</th><th></th></tr></thead>
      <tbody>${lista.map((u) => `<tr>
        <td class="t-strong">${escapeHtml(u.nombre)}</td>
        <td>${escapeHtml(u.usuario)}</td>
        <td><span class="chip">${ROL_LABEL[u.rol] || u.rol}</span></td>
        <td>${u.activo ? '<span class="badge-pill sem-optimo">Activo</span>' : '<span class="badge-pill sem-vencido">Inactivo</span>'}</td>
        <td>${fmtFecha(u.creado_en)}</td>
        <td><button class="btn ghost sm" data-edit="${u.id}">Editar</button></td>
      </tr>`).join('') || `<tr><td colspan="6">${empty('👥', 'Sin usuarios.')}</td></tr>`}</tbody>
    </table></div></div>`;

  function form(u) {
    const m = openModal({
      title: u ? 'Editar usuario' : 'Nuevo usuario',
      body: `<form id="f"><div class="form-grid">
        <div class="field full"><label>Nombre completo</label><input name="nombre" required value="${u ? escapeHtml(u.nombre) : ''}" /></div>
        <div class="field"><label>Usuario</label><input name="usuario" required value="${u ? escapeHtml(u.usuario) : ''}" ${u ? 'disabled' : ''} /></div>
        <div class="field"><label>Rol</label><select name="rol">${roles.map((r) => `<option value="${r}" ${u && u.rol === r ? 'selected' : ''}>${ROL_LABEL[r] || r}</option>`).join('')}</select></div>
        <div class="field"><label>Contraseña ${u ? '(dejar vacío para no cambiar)' : ''}</label><input name="password" type="password" ${u ? '' : 'required'} /></div>
        ${u ? `<div class="field"><label>Estado</label><select name="activo"><option value="1" ${u.activo ? 'selected' : ''}>Activo</option><option value="0" ${!u.activo ? 'selected' : ''}>Inactivo</option></select></div>` : ''}
      </div></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar</button>`,
    });
    m.root.querySelector('[data-close]').addEventListener('click', m.close);
    m.root.querySelector('#save').addEventListener('click', async () => {
      const data = readForm(m.root.querySelector('#f'));
      try {
        if (u) {
          const payload = { nombre: data.nombre, rol: data.rol, activo: Number(data.activo) };
          if (data.password) payload.password = data.password;
          await api.put(`/auth/usuarios/${u.id}`, payload);
        } else {
          await api.post('/auth/usuarios', data);
        }
        toast('Usuario guardado', 'ok'); m.close(); usuarios(el);
      } catch (e) { toast(e.message, 'err'); }
    });
  }

  el.querySelector('#nuevo').addEventListener('click', () => form(null));
  el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => form(lista.find((x) => x.id == b.dataset.edit))));
}
