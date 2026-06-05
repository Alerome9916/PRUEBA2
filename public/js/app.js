import { api, state, toast } from './core.js';
import { renderDashboard } from './views/dashboard.js';
import { renderPOS } from './views/pos.js';
import { renderProducts, renderCategories, renderSuppliers } from './views/catalog.js';
import { renderInventory, renderAlerts, renderWaste, renderTrace } from './views/inventory.js';
import { renderReports } from './views/reports.js';
import { renderUsers, renderSettings } from './views/admin.js';

const ROUTES = {
  dashboard: { title: 'Panel de Control', icon: '📊', group: 'General', render: renderDashboard },
  pos: { title: 'Punto de Venta (FEFO)', icon: '🧾', group: 'Operación', render: renderPOS },
  alerts: { title: 'Alertas de Caducidad', icon: '🚦', group: 'Operación', render: renderAlerts },
  inventory: { title: 'Inventario y Lotes', icon: '📦', group: 'Operación', render: renderInventory },
  waste: { title: 'Mermas', icon: '🗑️', group: 'Operación', render: renderWaste },
  products: { title: 'Productos', icon: '🥩', group: 'Catálogo', render: renderProducts },
  categories: { title: 'Categorías', icon: '🏷️', group: 'Catálogo', render: renderCategories },
  suppliers: { title: 'Proveedores', icon: '🚚', group: 'Catálogo', render: renderSuppliers },
  reports: { title: 'Reportes', icon: '📈', group: 'Análisis', render: renderReports },
  trace: { title: 'Trazabilidad', icon: '🔎', group: 'Análisis', render: renderTrace },
  users: { title: 'Usuarios', icon: '👥', group: 'Administración', render: renderUsers, roles: ['admin'] },
  settings: { title: 'Configuración', icon: '⚙️', group: 'Administración', render: renderSettings, roles: ['admin'] },
};

async function boot() {
  try {
    const me = await api.get('/auth/me');
    state.user = me.user;
    state.settings = await api.get('/settings');
    renderLayout();
  } catch {
    renderLogin();
  }
}

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-wrap">
      <form class="login-card" id="loginForm">
        <div class="login-logo">🥩</div>
        <h1>Los Churuguaros</h1>
        <p class="sub">Sistema de Inventario y Caducidad · FEFO</p>
        <div class="field"><label>Usuario</label><input name="username" autocomplete="username" required autofocus /></div>
        <div class="field"><label>Contraseña</label><input name="password" type="password" autocomplete="current-password" required /></div>
        <button class="btn btn-primary" style="width:100%" type="submit">Ingresar</button>
        <div class="login-hint">
          Demo · <code>admin / admin123</code> · <code>almacen / almacen123</code> · <code>caja / caja123</code>
        </div>
      </form>
    </div>`;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = 'Ingresando…';
    try {
      const fd = new FormData(e.target);
      const r = await api.post('/auth/login', { username: fd.get('username'), password: fd.get('password') });
      state.user = r.user;
      state.settings = await api.get('/settings');
      renderLayout();
    } catch (err) {
      toast(err.message, 'err');
      btn.disabled = false; btn.textContent = 'Ingresar';
    }
  });
}

function navHTML() {
  const groups = {};
  for (const [key, r] of Object.entries(ROUTES)) {
    if (r.roles && !r.roles.includes(state.user.role)) continue;
    (groups[r.group] = groups[r.group] || []).push([key, r]);
  }
  let html = '';
  for (const [group, items] of Object.entries(groups)) {
    html += `<div class="nav-group-label">${group}</div>`;
    for (const [key, r] of items) {
      const badge = key === 'alerts' ? `<span class="nav-badge" id="alertBadge" hidden>0</span>` : '';
      html += `<a class="nav-item" data-route="${key}"><span class="ic">${r.icon}</span><span>${r.title}</span>${badge}</a>`;
    }
  }
  return html;
}

function renderLayout() {
  const u = state.user;
  const initials = (u.full_name || u.username).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('app').innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <span class="logo">🥩</span>
          <div><div class="name">Los Churuguaros</div><div class="tag">CHARCUTERÍA · FEFO</div></div>
        </div>
        <nav id="nav">${navHTML()}</nav>
        <div style="margin-top:auto;padding-top:14px">
          <a class="nav-item" id="logoutBtn"><span class="ic">🚪</span><span>Cerrar sesión</span></a>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <h2 id="pageTitle">Panel</h2>
          <div class="spacer"></div>
          <span class="pill"><span class="dot"></span>Tasa BCV <strong style="margin-left:4px">${state.settings.exchange_rate} Bs/$</strong></span>
          <span class="pill" style="cursor:pointer" id="alertPill" hidden><span class="dot" style="background:var(--red)"></span><span id="alertPillTxt">0 alertas</span></span>
          <div class="user-chip">
            <div class="avatar">${initials}</div>
            <div style="line-height:1.2"><div style="font-size:13px;font-weight:700">${u.full_name.split('(')[0].trim()}</div><div class="faint" style="text-transform:capitalize">${u.role}</div></div>
          </div>
        </header>
        <main class="content" id="view"></main>
      </div>
    </div>`;

  document.getElementById('nav').addEventListener('click', (e) => {
    const item = e.target.closest('[data-route]');
    if (item) { location.hash = item.dataset.route; }
  });
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api.post('/auth/logout');
    location.hash = '';
    location.reload();
  });
  document.getElementById('alertPill').addEventListener('click', () => location.hash = 'alerts');

  window.addEventListener('hashchange', router);
  router();
  refreshAlertBadge();
  setInterval(refreshAlertBadge, 60000);
}

async function refreshAlertBadge() {
  try {
    const s = await api.get('/alerts/summary');
    const badge = document.getElementById('alertBadge');
    const pill = document.getElementById('alertPill');
    const txt = document.getElementById('alertPillTxt');
    const n = (s.critico || 0) + (s.vencido || 0);
    if (badge) { badge.hidden = n === 0; badge.textContent = n; }
    if (pill && txt) {
      const total = s.total || 0;
      pill.hidden = total === 0;
      txt.textContent = `${total} alerta${total === 1 ? '' : 's'}`;
    }
  } catch { /* ignore */ }
}

function router() {
  let key = (location.hash || '#dashboard').slice(1);
  if (!ROUTES[key] || (ROUTES[key].roles && !ROUTES[key].roles.includes(state.user.role))) key = 'dashboard';
  const route = ROUTES[key];
  document.getElementById('pageTitle').textContent = route.title;
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.route === key));
  const view = document.getElementById('view');
  view.innerHTML = '<div class="spinner"></div>';
  route.render(view).catch((err) => {
    view.innerHTML = `<div class="empty"><div class="ic">⚠️</div><p>${err.message}</p></div>`;
  });
}

boot();
export { refreshAlertBadge };
