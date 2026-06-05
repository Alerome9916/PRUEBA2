// ---------- Estado global ----------
export const state = {
  user: null,
  settings: null,
};

// ---------- Cliente API ----------
async function request(method, path, body) {
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch('/api' + path, opts);
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) {
    const msg = (data && data.error) || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
};

// ---------- Helpers de formato ----------
export const fmtUSD = (n) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtBs = (n) =>
  Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Bs';
export const toBs = (usd) => (Number(usd || 0) * (state.settings?.exchange_rate || 0));
export const fmtQty = (n, unit = '') => `${Number(n || 0).toLocaleString('es-VE', { maximumFractionDigits: 3 })}${unit ? ' ' + unit : ''}`;
export const fmtDate = (d) => d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d) => d ? new Date(d.replace(' ', 'T')).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function levelBadge(level, label, days) {
  const map = { optimo: 'b-optimo', aviso: 'b-aviso', advertencia: 'b-advertencia', critico: 'b-critico', vencido: 'b-vencido' };
  const txt = label || level;
  const extra = days != null ? ` · ${days < 0 ? 'hace ' + Math.abs(days) + 'd' : days + 'd'}` : '';
  return `<span class="badge ${map[level] || 'b-info'}">${esc(txt)}${extra}</span>`;
}

// ---------- Toast ----------
export function toast(msg, type = 'ok') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; el.style.transition = 'all .25s'; }, 3200);
  setTimeout(() => el.remove(), 3500);
}

// ---------- Modal ----------
export function openModal({ title, bodyHTML, footHTML, size = '', onMount }) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-backdrop>
      <div class="modal ${size}">
        <div class="modal-head"><h3>${title}</h3><button class="close-x" data-close>×</button></div>
        <div class="modal-body">${bodyHTML}</div>
        ${footHTML ? `<div class="modal-foot">${footHTML}</div>` : ''}
      </div>
    </div>`;
  const close = () => { root.innerHTML = ''; };
  root.querySelector('[data-close]')?.addEventListener('click', close);
  root.querySelector('[data-backdrop]')?.addEventListener('click', (e) => { if (e.target.dataset.backdrop !== undefined) close(); });
  if (onMount) onMount(root.querySelector('.modal'), close);
  return close;
}
export function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

export function confirmDialog(message, onYes, { danger = true, yesLabel = 'Confirmar' } = {}) {
  openModal({
    title: 'Confirmar acción',
    bodyHTML: `<p style="font-size:14px;line-height:1.6">${esc(message)}</p>`,
    footHTML: `<button class="btn btn-ghost" data-no>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${yesLabel}</button>`,
    onMount: (modal, close) => {
      modal.querySelector('[data-no]').onclick = close;
      modal.querySelector('[data-yes]').onclick = async () => { close(); await onYes(); };
    },
  });
}

// ---------- Utilidad: leer formulario ----------
export function readForm(scope) {
  const data = {};
  scope.querySelectorAll('[name]').forEach((i) => {
    if (i.type === 'checkbox') data[i.name] = i.checked ? 1 : 0;
    else if (i.type === 'number') data[i.name] = i.value === '' ? null : Number(i.value);
    else data[i.name] = i.value;
  });
  return data;
}
