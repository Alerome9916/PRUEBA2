import { api } from '../api.js';
import { fmtBs, fmtUsd, fmtNum } from '../utils.js';

const SEM = [
  ['critico', '#dc2626', 'Crítico'],
  ['alerta', '#f59e0b', 'Alerta'],
  ['precaucion', '#eab308', 'Precaución'],
  ['optimo', '#16a34a', 'Óptimo'],
  ['vencido', '#7f1d1d', 'Vencido'],
];

export default async function dashboard(el) {
  const d = await api.get('/dashboard');
  const k = d.kpis;
  const totalSem = Object.values(d.semaforo).reduce((a, b) => a + b, 0) || 1;
  const maxVenta = Math.max(...(d.ventas7.map((v) => v.total) || [1]), 1);

  el.innerHTML = `
    <div class="grid cards-4">
      ${kpi('brand', '📦', 'Valor de Inventario', fmtBs(k.valorInventarioCosto), `${fmtUsd(k.valorInventarioUSD)} · a costo`)}
      ${kpi('green', '🧾', 'Ventas de Hoy', fmtBs(k.ventasHoy), `${k.numVentasHoy} transacción(es)`)}
      ${kpi('gold', '🥩', 'Productos / Lotes', `${k.totalProductos} <small>/ ${k.totalLotes}</small>`, 'activos en stock')}
      ${kpi('red', '⚠️', 'Merma del Mes', fmtBs(k.mermaMes), `${k.vencidosPendientes} lote(s) vencido(s) por retirar`)}
    </div>

    <div class="grid cards-2 mt">
      <div class="card">
        <div class="card-head"><h3>🚦 Semáforo de Caducidad (FEFO)</h3><span class="hint">${totalSem} lotes activos</span></div>
        <div class="sem-bar">
          ${SEM.map(([key, color]) => {
            const v = d.semaforo[key] || 0;
            const pct = (v / totalSem) * 100;
            return pct > 0 ? `<div style="width:${pct}%;background:${color}" title="${key}: ${v}"></div>` : '';
          }).join('')}
        </div>
        <div class="sem-legend">
          ${SEM.map(([key, color, label]) => `<span><span class="dot" style="background:${color}"></span>${label}: <b>${d.semaforo[key] || 0}</b></span>`).join('')}
        </div>
        <p class="t-sub mt">El método <b>FEFO</b> (First Expired, First Out) prioriza la salida de los lotes que vencen primero, reduciendo la merma.</p>
      </div>

      <div class="card">
        <div class="card-head"><h3>📈 Ventas últimos 7 días</h3></div>
        ${d.ventas7.length ? `<div class="bars">
          ${d.ventas7.map((v) => {
            const h = Math.max((v.total / maxVenta) * 100, 4);
            const dia = new Date(v.dia + 'T00:00:00').toLocaleDateString('es-VE', { weekday: 'short' });
            return `<div class="bar" style="height:${h}%"><b>${fmtNum(v.total/1000,1)}k</b><span>${dia}</span></div>`;
          }).join('')}
        </div>` : '<div class="empty"><div class="ic">🧾</div><p>Aún no hay ventas registradas.</p></div>'}
      </div>
    </div>

    <div class="card mt">
      <div class="card-head"><h3>🗂️ Inventario por Categoría (valor a costo)</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Categoría</th><th class="num">Valor (Bs.)</th><th style="width:45%">Proporción</th></tr></thead>
          <tbody>
            ${d.porCategoria.map((c) => {
              const max = d.porCategoria[0].valor || 1;
              return `<tr>
                <td class="t-strong">${c.nombre}</td>
                <td class="num">${fmtBs(c.valor)}</td>
                <td><div style="background:var(--surface-2);border-radius:6px;overflow:hidden;height:10px"><div style="width:${(c.valor/max)*100}%;height:100%;background:linear-gradient(90deg,var(--brand),var(--accent))"></div></div></td>
              </tr>`;
            }).join('') || '<tr><td colspan="3" class="muted">Sin datos</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function kpi(cls, ic, label, value, sub) {
  return `<div class="card kpi ${cls}">
    <div class="ic-bg">${ic}</div>
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    <div class="sub">${sub}</div>
  </div>`;
}
