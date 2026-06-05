import { api } from '../api.js';
import { fmtBs, fmtNum, fmtFechaHora, escapeHtml, toast, openModal, empty, MOTIVO_MERMA } from '../utils.js';

export default async function mermas(el) {
  const [lista, lotes] = await Promise.all([api.get('/mermas'), api.get('/lotes?estado=activo')]);
  const totalMes = lista.filter((m) => new Date(m.fecha).getMonth() === new Date().getMonth())
    .reduce((s, m) => s + m.costo_perdido, 0);

  el.innerHTML = `
    <div class="grid cards-3">
      <div class="card kpi red"><div class="label">Pérdida total registrada</div><div class="value">${fmtBs(lista.reduce((s, m) => s + m.costo_perdido, 0))}</div></div>
      <div class="card kpi gold"><div class="label">Pérdida del mes</div><div class="value">${fmtBs(totalMes)}</div></div>
      <div class="card kpi brand"><div class="label">Eventos de merma</div><div class="value">${lista.length}</div></div>
    </div>
    <div class="toolbar mt"><div style="flex:1"></div><button class="btn danger" id="nueva">+ Registrar merma</button></div>
    <div class="card pad-0"><div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Producto</th><th>Lote</th><th>Motivo</th><th class="num">Cantidad</th><th class="num">Costo perdido</th><th>Responsable</th></tr></thead>
      <tbody>${lista.map((m) => `<tr>
        <td>${fmtFechaHora(m.fecha)}</td>
        <td class="t-strong">${escapeHtml(m.producto_nombre)}</td>
        <td>${escapeHtml(m.codigo_lote || '—')}</td>
        <td><span class="badge-pill sem-${m.motivo === 'vencimiento' ? 'vencido' : 'alerta'}">${MOTIVO_MERMA[m.motivo] || m.motivo}</span></td>
        <td class="num">${fmtNum(m.cantidad)} ${m.unidad}</td>
        <td class="num" style="color:var(--red);font-weight:600">${fmtBs(m.costo_perdido)}</td>
        <td>${escapeHtml(m.usuario_nombre || '—')}</td>
      </tr>`).join('') || `<tr><td colspan="7">${empty('🗑️', 'Sin mermas registradas.')}</td></tr>`}</tbody>
    </table></div></div>`;

  el.querySelector('#nueva').addEventListener('click', () => {
    const m = openModal({
      title: 'Registrar merma',
      body: `<form id="f"><div class="form-grid">
        <div class="field full"><label>Lote</label><select name="lote_id" required>
          <option value="">Selecciona un lote...</option>
          ${lotes.map((l) => `<option value="${l.id}">${escapeHtml(l.producto_nombre)} · ${l.codigo_lote} · ${fmtNum(l.cantidad_actual)} ${l.unidad} · vence ${l.fecha_caducidad}</option>`).join('')}
        </select></div>
        <div class="field"><label>Cantidad</label><input name="cantidad" type="number" step="0.1" required /></div>
        <div class="field"><label>Motivo</label><select name="motivo">${Object.entries(MOTIVO_MERMA).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="field full"><label>Nota</label><textarea name="nota" rows="2"></textarea></div>
      </div></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn danger" id="save">Registrar</button>`,
    });
    m.root.querySelector('[data-close]').addEventListener('click', m.close);
    m.root.querySelector('#save').addEventListener('click', async () => {
      const f = m.root.querySelector('#f');
      try {
        await api.post('/mermas', { lote_id: Number(f.lote_id.value), cantidad: Number(f.cantidad.value), motivo: f.motivo.value, nota: f.nota.value });
        toast('Merma registrada', 'ok'); m.close(); mermas(el);
      } catch (e) { toast(e.message, 'err'); }
    });
  });
}
