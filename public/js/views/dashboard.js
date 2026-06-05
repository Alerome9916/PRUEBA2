import { api, fmtUSD, fmtBs, fmtQty, toBs } from '../core.js';

export async function renderDashboard(view) {
  const d = await api.get('/dashboard');
  const k = d.kpis;
  const sem = d.semaforo;
  const totalSem = Object.values(sem).reduce((a, b) => a + b, 0) || 1;

  const semColors = { optimo: '#16a34a', aviso: '#eab308', advertencia: '#f59e0b', critico: '#dc2626', vencido: '#64748b' };
  const semLabels = { optimo: 'Óptimo', aviso: 'Aviso', advertencia: 'Advertencia', critico: 'Crítico', vencido: 'Vencido' };

  const maxTrend = Math.max(1, ...d.sales_trend.map((s) => s.total));
  const spark = d.sales_trend.map((s) =>
    `<div class="b" style="height:${Math.max(3, (s.total / maxTrend) * 100)}%" data-v="${s.d.slice(5)}: ${fmtUSD(s.total)}"></div>`
  ).join('') || '<div class="faint">Sin ventas recientes</div>';

  view.innerHTML = `
    <div class="grid cards-4 mb">
      <div class="card kpi">
        <span class="ic-bg">💰</span>
        <div class="label">Valor de Inventario</div>
        <div class="value">${fmtUSD(k.inventory_value)}</div>
        <div class="meta">${fmtBs(k.inventory_value_bs)}</div>
      </div>
      <div class="card kpi">
        <span class="ic-bg">🧾</span>
        <div class="label">Ventas de Hoy</div>
        <div class="value">${fmtUSD(k.sales_today)}</div>
        <div class="meta">${k.sales_today_count} transacciones · ${fmtBs(toBs(k.sales_today))}</div>
      </div>
      <div class="card kpi">
        <span class="ic-bg">📅</span>
        <div class="label">Ventas del Mes</div>
        <div class="value">${fmtUSD(k.sales_month)}</div>
        <div class="meta">${k.sales_month_count} transacciones</div>
      </div>
      <div class="card kpi accent">
        <span class="ic-bg">♻️</span>
        <div class="label">Recuperado Anti-Merma 🆕</div>
        <div class="value" style="color:var(--accent)">${fmtUSD(k.anti_waste_recovered)}</div>
        <div class="meta">${fmtQty(k.anti_waste_qty)} vendidos con descuento dinámico este mes</div>
      </div>
    </div>

    <div class="grid cards-3 mb">
      <div class="card kpi"><div class="label">⚠️ Pérdida por Mermas (mes)</div><div class="value" style="font-size:22px;color:#f87171">${fmtUSD(k.waste_month_value)}</div><div class="meta">${fmtQty(k.waste_month_qty)} dados de baja</div></div>
      <div class="card kpi"><div class="label">📦 Productos Activos</div><div class="value" style="font-size:22px">${k.total_products}</div><div class="meta">${k.total_suppliers} proveedores</div></div>
      <div class="card kpi"><div class="label">📉 Stock Bajo Mínimo</div><div class="value" style="font-size:22px;color:${k.low_stock ? '#fbbf24' : '#4ade80'}">${k.low_stock}</div><div class="meta">productos por reponer</div></div>
    </div>

    <div class="grid cards-2 mb">
      <div class="card pad-lg">
        <div class="card-title">🚦 Semáforo de Caducidad (FEFO)</div>
        <div class="card-sub">Distribución de lotes activos por proximidad de vencimiento</div>
        <div class="semaforo">
          ${Object.keys(semLabels).map((key) => `
            <div class="sem-cell" style="border-color:${semColors[key]}55;background:${semColors[key]}12">
              <div class="n" style="color:${semColors[key]}">${sem[key] || 0}</div>
              <div class="l" style="color:${semColors[key]}">${semLabels[key]}</div>
            </div>`).join('')}
        </div>
        <div class="mt">
          <div class="bar-track" style="display:flex">
            ${Object.keys(semLabels).map((key) => sem[key] ? `<div style="width:${(sem[key] / totalSem) * 100}%;background:${semColors[key]};height:100%"></div>` : '').join('')}
          </div>
        </div>
      </div>
      <div class="card pad-lg">
        <div class="card-title">📈 Ventas últimos 14 días</div>
        <div class="card-sub">Tendencia de ingresos diarios (USD)</div>
        <div class="spark mt">${spark}</div>
      </div>
    </div>

    <div class="grid cards-2">
      <div class="card">
        <div class="card-title">🏆 Productos más vendidos (mes)</div>
        <div class="table-wrap mt-sm" style="border:none">
          <table><thead><tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Ingresos</th></tr></thead>
          <tbody>${d.top_products.length ? d.top_products.map((p) => `
            <tr><td>${p.name}</td><td class="num">${fmtQty(p.qty, p.unit)}</td><td class="num">${fmtUSD(p.revenue)}</td></tr>`).join('') : '<tr><td colspan="3" class="faint">Sin datos</td></tr>'}</tbody></table>
        </div>
      </div>
      <div class="card">
        <div class="card-title">🗂️ Valor de inventario por categoría</div>
        <div class="mt-sm">
          ${d.by_category.length ? d.by_category.map((c) => {
            const max = Math.max(...d.by_category.map((x) => x.value));
            return `<div style="margin-bottom:12px">
              <div class="row between" style="font-size:13px;margin-bottom:5px"><span>${c.name}</span><strong>${fmtUSD(c.value)}</strong></div>
              <div class="bar-track"><div class="bar-fill" style="width:${(c.value / max) * 100}%;background:${c.color}"></div></div>
            </div>`;
          }).join('') : '<div class="faint">Sin datos</div>'}
        </div>
      </div>
    </div>
  `;
}
