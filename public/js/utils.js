// Utilidades de formato y helpers de UI.

export const fmtBs = (n) =>
  'Bs. ' + (Number(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtUsd = (n) =>
  '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtNum = (n, dec = 2) =>
  (Number(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: dec });

export const fmtFecha = (s) => {
  if (!s) return '—';
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtFechaHora = (s) => {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + (s.includes('T') || s.length <= 10 ? '' : 'Z'));
  return d.toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const SEM_LABEL = {
  optimo: 'Óptimo', precaucion: 'Precaución', alerta: 'Alerta', critico: 'Crítico', vencido: 'Vencido',
};

export function semaforoBadge(estado) {
  if (!estado) return '<span class="chip">Sin lote</span>';
  const dias = estado.dias;
  const txt = estado.nivel === 'vencido'
    ? `Vencido (${Math.abs(dias)}d)`
    : `${SEM_LABEL[estado.nivel]} · ${dias}d`;
  return `<span class="badge-pill sem-${estado.nivel}"><span class="dot" style="background:${estado.color}"></span>${txt}</span>`;
}

export function descuentoBadge(pd) {
  if (!pd || !pd.etiqueta) return '';
  return `<span class="tag-disc">${pd.etiqueta}</span>`;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 300); }, 3200);
}

export function spinner() { return '<div class="spinner"></div>'; }

export function empty(icon, text) {
  return `<div class="empty"><div class="ic">${icon}</div><p>${text}</p></div>`;
}

// Modal genérico. Devuelve { close }.
export function openModal({ title, body, footer, wide }) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal ${wide ? 'wide' : ''}">
        <div class="modal-head"><h3>${title}</h3><button class="close-x" data-close>×</button></div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>
    </div>`;
  const overlay = root.querySelector('.modal-overlay');
  const close = () => { root.innerHTML = ''; };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  root.querySelector('[data-close]').addEventListener('click', close);
  return { root, close };
}

// Lee un form en objeto.
export function readForm(form) {
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  return data;
}

export const ROL_LABEL = {
  admin: 'Administrador', supervisor: 'Supervisor', almacenista: 'Almacenista', cajero: 'Cajero',
};

export const MOTIVO_MERMA = {
  vencimiento: 'Vencimiento', dano: 'Daño físico', robo: 'Robo/Faltante',
  rotura_cadena_frio: 'Rotura cadena de frío', otro: 'Otro',
};
