import { api, state, toast, openModal, readForm, esc, fmtDateTime } from '../core.js';

// ============================ USUARIOS ============================
export async function renderUsers(view) {
  const users = await api.get('/auth/users');
  const roles = { admin: '👑 Administrador', almacen: '📦 Almacén', ventas: '🧾 Ventas' };
  view.innerHTML = `
    <div class="section-head">
      <div><h3>👥 Usuarios</h3><div class="desc">Control de acceso por roles: administrador, almacén y ventas.</div></div>
      <button class="btn btn-primary" id="newUser">＋ Nuevo usuario</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
      <tbody>${users.map((u) => `<tr>
        <td><strong>${esc(u.username)}</strong></td>
        <td>${esc(u.full_name)}</td>
        <td>${roles[u.role] || u.role}</td>
        <td>${u.active ? '<span class="badge b-optimo">Activo</span>' : '<span class="badge b-vencido">Inactivo</span>'}</td>
        <td class="num"><button class="btn btn-sm btn-ghost" data-edit="${u.id}">✏️</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  document.getElementById('newUser').onclick = () => userForm(null);
  document.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => userForm(users.find((u) => u.id === Number(b.dataset.edit))));
}

function userForm(u) {
  const v = u || {};
  openModal({
    title: u ? 'Editar usuario' : 'Nuevo usuario',
    bodyHTML: `<form id="uForm"><div class="form-grid">
      <div><label>Usuario *</label><input name="username" value="${esc(v.username || '')}" ${u ? 'readonly' : ''} required></div>
      <div><label>Rol</label><select name="role"><option value="admin" ${v.role === 'admin' ? 'selected' : ''}>Administrador</option><option value="almacen" ${v.role === 'almacen' ? 'selected' : ''}>Almacén</option><option value="ventas" ${v.role === 'ventas' ? 'selected' : ''}>Ventas</option></select></div>
      <div class="full"><label>Nombre completo *</label><input name="full_name" value="${esc(v.full_name || '')}" required></div>
      <div class="full"><label>Contraseña ${u ? '(dejar vacío para no cambiar)' : '*'}</label><input type="password" name="password" ${u ? '' : 'required'}></div>
      ${u ? `<div class="full"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="active" ${v.active ? 'checked' : ''} style="width:auto"> Usuario activo</label></div>` : ''}
    </div></form>`,
    footHTML: `<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>`,
    onMount: (modal, close) => {
      modal.querySelector('[data-cancel]').onclick = close;
      modal.querySelector('[data-save]').onclick = async () => {
        const data = readForm(modal.querySelector('#uForm'));
        try {
          if (u) { if (!data.password) delete data.password; await api.put('/auth/users/' + u.id, data); }
          else await api.post('/auth/users', data);
          toast('Usuario guardado', 'ok'); close(); renderUsers(document.getElementById('view'));
        } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

// ============================ CONFIGURACIÓN ============================
export async function renderSettings(view) {
  const s = await api.get('/settings');
  let audit = [];
  try { audit = await api.get('/settings/audit'); } catch { /* ignore */ }
  view.innerHTML = `
    <div class="section-head"><div><h3>⚙️ Configuración</h3><div class="desc">Parámetros de la empresa, impuestos venezolanos y motor anti-merma.</div></div></div>
    <form id="setForm">
    <div class="grid cards-2">
      <div class="card">
        <div class="card-title">🏢 Datos de la empresa</div>
        <div class="form-grid mt-sm">
          <div class="full"><label>Razón social</label><input name="company_name" value="${esc(s.company_name)}"></div>
          <div><label>RIF</label><input name="rif" value="${esc(s.rif)}"></div>
          <div><label>Teléfono</label><input name="phone" value="${esc(s.phone)}"></div>
          <div class="full"><label>Dirección</label><input name="address" value="${esc(s.address)}"></div>
          <div class="full"><label>Email</label><input name="email" value="${esc(s.email)}"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">💵 Impuestos y moneda (Venezuela)</div>
        <div class="form-grid mt-sm">
          <div><label>IVA (%)</label><input type="number" step="0.1" name="iva_rate" value="${s.iva_rate}"></div>
          <div><label>IGTF (%)</label><input type="number" step="0.1" name="igtf_rate" value="${s.igtf_rate}"></div>
          <div class="full"><label>Tasa de cambio (Bs por USD · BCV)</label><input type="number" step="0.01" name="exchange_rate" value="${s.exchange_rate}"></div>
        </div>
        <div class="hr"></div>
        <div class="card-title">🚦 Umbrales del semáforo FEFO (días)</div>
        <div class="form-grid mt-sm">
          <div><label>Crítico ≤</label><input type="number" name="alert_critical_days" value="${s.alert_critical_days}"></div>
          <div><label>Advertencia ≤</label><input type="number" name="alert_warning_days" value="${s.alert_warning_days}"></div>
          <div><label>Aviso ≤</label><input type="number" name="alert_notice_days" value="${s.alert_notice_days}"></div>
        </div>
        <div class="mt"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="auto_discount_enabled" ${s.auto_discount_enabled ? 'checked' : ''} style="width:auto"> ♻️ Activar motor de descuentos dinámicos anti-merma 🆕</label></div>
      </div>
    </div>
    <div class="mt"><button class="btn btn-primary" type="submit">Guardar configuración</button></div>
    </form>
    <div class="card mt">
      <div class="card-title">📜 Bitácora de auditoría</div>
      <div class="table-wrap mt-sm" style="border:none"><table>
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
        <tbody>${audit.slice(0, 50).map((a) => `<tr><td class="faint">${fmtDateTime(a.created_at)}</td><td>${esc(a.username || '—')}</td><td><span class="tag-soft">${esc(a.action)}</span></td><td class="faint">${esc(a.detail || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="faint">Sin registros</td></tr>'}</tbody>
      </table></div>
    </div>`;
  document.getElementById('setForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = readForm(e.target);
    try { state.settings = await api.put('/settings', data); toast('Configuración guardada', 'ok'); } catch (err) { toast(err.message, 'err'); }
  });
}
