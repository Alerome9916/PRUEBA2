import { api, auth } from './api.js';
import { toast, ROL_LABEL } from './utils.js';

import dashboard from './views/dashboard.js';
import productos from './views/productos.js';
import inventario from './views/inventario.js';
import pos from './views/pos.js';
import entradas from './views/entradas.js';
import proveedores from './views/proveedores.js';
import mermas from './views/mermas.js';
import cadenaFrio from './views/cadenaFrio.js';
import alertas from './views/alertas.js';
import trazabilidad from './views/trazabilidad.js';
import reportes from './views/reportes.js';
import usuarios from './views/usuarios.js';
import normativa from './views/normativa.js';

// Definición de navegación: secciones, ruta, icono, vista y roles permitidos.
const NAV = [
  { group: 'General', items: [
    { id: 'dashboard', label: 'Panel de Control', ic: '📊', view: dashboard },
    { id: 'alertas', label: 'Centro de Alertas', ic: '🔔', view: alertas, badge: true },
  ]},
  { group: 'Operaciones', items: [
    { id: 'pos', label: 'Punto de Venta', ic: '🧾', view: pos },
    { id: 'entradas', label: 'Recepción / Entradas', ic: '📥', view: entradas, roles: ['admin','supervisor','almacenista'] },
    { id: 'mermas', label: 'Mermas', ic: '🗑️', view: mermas, roles: ['admin','supervisor','almacenista'] },
  ]},
  { group: 'Inventario', items: [
    { id: 'productos', label: 'Productos', ic: '🥩', view: productos },
    { id: 'inventario', label: 'Lotes (FEFO)', ic: '📦', view: inventario },
    { id: 'trazabilidad', label: 'Trazabilidad / QR', ic: '🔎', view: trazabilidad },
    { id: 'proveedores', label: 'Proveedores', ic: '🚚', view: proveedores },
  ]},
  { group: 'Calidad', items: [
    { id: 'cadena-frio', label: 'Cadena de Frío', ic: '❄️', view: cadenaFrio },
    { id: 'normativa', label: 'Normativa Venezuela', ic: '📋', view: normativa },
  ]},
  { group: 'Gestión', items: [
    { id: 'reportes', label: 'Reportes', ic: '📈', view: reportes },
    { id: 'usuarios', label: 'Usuarios', ic: '👥', view: usuarios, roles: ['admin'] },
  ]},
];

const ROUTES = {};
NAV.forEach((g) => g.items.forEach((i) => (ROUTES[i.id] = i)));

let SYS = null; // configuración del sistema
let alertCount = 0;

async function loadConfig() {
  try { SYS = await api.get('/config'); } catch { SYS = null; }
}
export function sysConfig() { return SYS; }

// ---------------- LOGIN ----------------
function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">🥩</div>
        <h1>Los Churuguaros</h1>
        <p class="sub">Sistema de Inventario & Caducidad · Método FEFO</p>
        <form id="loginForm">
          <div class="field">
            <label>Usuario</label>
            <input name="usuario" autocomplete="username" placeholder="admin" required autofocus />
          </div>
          <div class="field">
            <label>Contraseña</label>
            <input name="password" type="password" autocomplete="current-password" placeholder="••••••••" required />
          </div>
          <button class="btn block" type="submit">Iniciar sesión</button>
        </form>
        <div class="demo-users">
          <b>Usuarios de prueba:</b><br/>
          <code>admin</code> / admin123 · <code>supervisor</code> / super123<br/>
          <code>almacen</code> / almacen123 · <code>cajero</code> / cajero123
        </div>
      </div>
    </div>`;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button');
    btn.disabled = true; btn.textContent = 'Verificando...';
    try {
      const { token, usuario } = await api.login(f.usuario.value, f.password.value);
      auth.set(token, usuario);
      await loadConfig();
      location.hash = '#/dashboard';
      renderApp();
    } catch (err) {
      toast(err.message, 'err');
      btn.disabled = false; btn.textContent = 'Iniciar sesión';
    }
  });
}

// ---------------- LAYOUT ----------------
function allowed(item) {
  if (!item.roles) return true;
  return item.roles.includes(auth.user?.rol);
}

function navHtml(active) {
  return NAV.map((g) => {
    const items = g.items.filter(allowed);
    if (!items.length) return '';
    return `<div class="nav-group-title">${g.group}</div>` +
      items.map((i) => `
        <a class="nav-item ${i.id === active ? 'active' : ''}" href="#/${i.id}">
          <span class="ic">${i.ic}</span><span>${i.label}</span>
          ${i.badge ? `<span class="badge" id="alertBadge" style="display:none"></span>` : ''}
        </a>`).join('');
  }).join('');
}

function renderApp() {
  const u = auth.user;
  const tasa = SYS?.fiscal?.tasaBCV ?? '—';
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <span class="logo">🥩</span>
          <div><div class="name">Los Churuguaros</div><div class="tag">Charcutería · FEFO</div></div>
        </div>
        <nav id="nav"></nav>
        <div class="sidebar-foot">${SYS?.empresa?.rif || ''}<br/>v1.0 · ${SYS?.empresa?.registroSanitario || ''}</div>
      </aside>
      <div class="main">
        <header class="topbar">
          <h2 id="pageTitle">Panel de Control</h2>
          <div class="spacer"></div>
          <div class="rate-chip" id="rateChip" title="Tasa BCV (editable en Reportes/Config)">💵 BCV <b>Bs. ${tasa}</b></div>
          <div class="user-chip">
            <div class="avatar">${(u?.nombre || '?').slice(0,1).toUpperCase()}</div>
            <div class="meta"><div class="n">${u?.nombre || ''}</div><div class="r">${ROL_LABEL[u?.rol] || u?.rol}</div></div>
            <button class="btn ghost sm" id="logoutBtn">Salir</button>
          </div>
        </header>
        <main class="content" id="view"></main>
      </div>
    </div>`;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.clear(); location.hash = '#/login'; renderLogin();
  });
  route();
  refreshAlertBadge();
}

async function refreshAlertBadge() {
  try {
    const a = await api.get('/alertas');
    alertCount = (a.resumen.criticos || 0) + (a.resumen.vencidos || 0) + (a.resumen.bajoStock || 0) + (a.resumen.frio || 0);
    const b = document.getElementById('alertBadge');
    if (b) { b.textContent = alertCount; b.style.display = alertCount ? '' : 'none'; }
  } catch {}
}
export { refreshAlertBadge };

// ---------------- ROUTER ----------------
function currentRoute() {
  const h = location.hash.replace(/^#\//, '') || 'dashboard';
  return h.split('/');
}

async function route() {
  if (!auth.isLogged) { renderLogin(); return; }
  if (!SYS) await loadConfig();
  const [id, ...params] = currentRoute();
  const item = ROUTES[id] || ROUTES['dashboard'];
  if (item.roles && !item.roles.includes(auth.user?.rol)) {
    document.getElementById('view').innerHTML = '<div class="empty"><div class="ic">🔒</div><p>No tienes permiso para esta sección.</p></div>';
    return;
  }
  // refrescar sidebar activo
  const nav = document.getElementById('nav');
  if (nav) nav.innerHTML = navHtml(item.id);
  const title = document.getElementById('pageTitle');
  if (title) title.textContent = item.label;
  const view = document.getElementById('view');
  if (view) {
    view.innerHTML = '<div class="spinner"></div>';
    try {
      await item.view(view, { params, sys: SYS, refreshAlertBadge });
    } catch (e) {
      view.innerHTML = `<div class="empty"><div class="ic">⚠️</div><p>${e.message}</p></div>`;
    }
  }
  refreshAlertBadge();
}

window.addEventListener('hashchange', () => {
  if (!auth.isLogged) { renderLogin(); return; }
  if (!document.querySelector('.layout')) { renderApp(); return; }
  route();
});

// ---------------- INIT ----------------
(async function init() {
  await loadConfig();
  if (auth.isLogged) {
    if (!location.hash) location.hash = '#/dashboard';
    renderApp();
  } else {
    renderLogin();
  }
})();
