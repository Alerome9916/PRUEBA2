import { api, auth } from '../api.js';
import { fmtFechaHora, escapeHtml, toast, openModal, empty } from '../utils.js';

export default async function cadenaFrio(el) {
  const [equipos, registros] = await Promise.all([api.get('/cadena-frio/equipos'), api.get('/cadena-frio/registros')]);

  el.innerHTML = `
    <div class="section-note"><span class="ic">❄️</span>
      <div><b>Monitoreo de cadena de frío.</b> Registra la temperatura de cada equipo. El sistema marca automáticamente las lecturas fuera del rango exigido por las buenas prácticas sanitarias (refrigeración 0–7 °C, congelación −25 a −18 °C).</div>
    </div>
    <div class="grid cards-3">
      ${equipos.map((e) => {
        const u = e.ultima_lectura;
        const fuera = u && u.fuera_rango;
        return `<div class="card kpi ${fuera ? 'red' : 'green'}">
          <div class="ic-bg">${e.tipo === 'congelacion' ? '🧊' : '❄️'}</div>
          <div class="label">${escapeHtml(e.nombre)}</div>
          <div class="value">${u ? u.temperatura + ' °C' : '—'}</div>
          <div class="sub">${e.rango.etiqueta} · ${escapeHtml(e.ubicacion || '')}</div>
          ${fuera ? '<div class="badge-pill sem-critico mt">⚠️ Fuera de rango</div>' : (u ? '<div class="badge-pill sem-optimo mt">✓ Normal</div>' : '')}
          <div class="mt"><button class="btn ghost sm" data-temp="${e.id}">+ Lectura</button></div>
        </div>`;
      }).join('') || empty('❄️', 'Sin equipos registrados.')}
    </div>
    ${['admin', 'supervisor'].includes(auth.user?.rol) ? '<div class="toolbar mt"><div style="flex:1"></div><button class="btn ghost" id="nuevoEq">+ Nuevo equipo</button></div>' : '<div class="mt"></div>'}
    <div class="card pad-0"><div class="card-head" style="padding:16px 18px 0"><h3>Historial de lecturas</h3></div><div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Equipo</th><th>Temperatura</th><th>Estado</th><th>Responsable</th><th>Nota</th></tr></thead>
      <tbody>${registros.map((r) => `<tr>
        <td>${fmtFechaHora(r.fecha)}</td><td>${escapeHtml(r.equipo_nombre)}</td>
        <td class="t-strong">${r.temperatura} °C</td>
        <td>${r.fuera_rango ? '<span class="badge-pill sem-critico">Fuera de rango</span>' : '<span class="badge-pill sem-optimo">Normal</span>'}</td>
        <td>${escapeHtml(r.usuario_nombre || '—')}</td><td class="t-sub">${escapeHtml(r.nota || '')}</td>
      </tr>`).join('') || `<tr><td colspan="6">${empty('🌡️', 'Sin lecturas.')}</td></tr>`}</tbody>
    </table></div></div>`;

  el.querySelectorAll('[data-temp]').forEach((b) => b.addEventListener('click', () => {
    const eq = equipos.find((e) => e.id == b.dataset.temp);
    const m = openModal({
      title: `Lectura — ${eq.nombre}`,
      body: `<p class="mb t-sub">Rango permitido: <b>${eq.rango.etiqueta}</b></p>
        <form id="f"><div class="field"><label>Temperatura (°C)</label><input name="temperatura" type="number" step="0.1" required autofocus /></div>
        <div class="field"><label>Nota (opcional)</label><input name="nota" /></div></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Guardar</button>`,
    });
    m.root.querySelector('[data-close]').addEventListener('click', m.close);
    m.root.querySelector('#save').addEventListener('click', async () => {
      const f = m.root.querySelector('#f');
      try {
        const r = await api.post('/cadena-frio/registros', { equipo_id: eq.id, temperatura: f.temperatura.value, nota: f.nota.value });
        toast(r.fuera_rango ? '⚠️ Temperatura FUERA de rango' : 'Lectura registrada', r.fuera_rango ? 'err' : 'ok');
        m.close(); cadenaFrio(el);
      } catch (e) { toast(e.message, 'err'); }
    });
  }));

  const nuevoEq = el.querySelector('#nuevoEq');
  if (nuevoEq) nuevoEq.addEventListener('click', () => {
    const m = openModal({
      title: 'Nuevo equipo de frío',
      body: `<form id="f"><div class="form-grid">
        <div class="field full"><label>Nombre</label><input name="nombre" required /></div>
        <div class="field"><label>Tipo</label><select name="tipo"><option value="refrigeracion">Refrigeración</option><option value="congelacion">Congelación</option></select></div>
        <div class="field"><label>Ubicación</label><input name="ubicacion" /></div>
      </div></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="save">Crear</button>`,
    });
    m.root.querySelector('[data-close]').addEventListener('click', m.close);
    m.root.querySelector('#save').addEventListener('click', async () => {
      const f = m.root.querySelector('#f');
      try { await api.post('/cadena-frio/equipos', { nombre: f.nombre.value, tipo: f.tipo.value, ubicacion: f.ubicacion.value }); toast('Equipo creado', 'ok'); m.close(); cadenaFrio(el); }
      catch (e) { toast(e.message, 'err'); }
    });
  });
}
