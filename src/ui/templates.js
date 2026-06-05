import { formatDate, formatDateTime } from "../lib/date.js";
import { escapeHtml, formatCurrency, formatKg, formatPercent, formatTemperature } from "../lib/format.js";

export function renderMetricCards(metrics) {
  return metrics
    .map((metric) => {
      const displayValue =
        metric.suffix === "currency"
          ? formatCurrency(metric.value)
          : metric.suffix === "%"
            ? formatPercent(metric.value)
            : `${Number(metric.value).toFixed(1)} ${metric.suffix}`;
      return `
        <article class="metric-card">
          <p class="metric-label">${escapeHtml(metric.label)}</p>
          <p class="metric-value">${escapeHtml(displayValue)}</p>
          <span class="metric-delta ${escapeHtml(metric.tone)}">${escapeHtml(metric.delta)}</span>
        </article>
      `;
    })
    .join("");
}

export function renderNoveltyList(items) {
  if (!items.length) {
    return '<p class="empty-state">No hay recomendaciones activas.</p>';
  }

  return `<div class="novelty-list">${items
    .map(
      (item) => `
        <article class="info-card">
          <span class="badge ${item.tone}">${escapeHtml(item.tone === "danger" ? "Accion inmediata" : item.tone === "warning" ? "Prevenir merma" : "Stock estable")}</span>
          <h4>${escapeHtml(item.product)}</h4>
          <p>${escapeHtml(item.action)}</p>
          <p class="info-muted">${escapeHtml(item.lotId)} · ${item.daysToExpire} dia(s) para vencer · ${formatKg(item.availableKg)}</p>
          <div class="progress"><span style="width:${Math.min(100, Math.max(12, item.excess * 14 + 20))}%"></span></div>
        </article>
      `
    )
    .join("")}</div>`;
}

export function renderZoneCards(zones) {
  return `<div class="zone-grid">${zones
    .map(
      (zone) => `
        <article class="info-card">
          <div class="subpanel-heading">
            <h4>${escapeHtml(zone.zoneName)}</h4>
            <span class="badge ${zone.stable ? "success" : "danger"}">${zone.stable ? "En rango" : "Fuera de rango"}</span>
          </div>
          <p class="info-muted">Limite: ${formatTemperature(zone.limit)} · Lectura: ${zone.temperatureC == null ? "--" : formatTemperature(zone.temperatureC)}</p>
          <p class="info-muted">Humedad: ${zone.humidity == null ? "--" : `${zone.humidity}%`}</p>
          <p>${escapeHtml(zone.cleaningTask)}</p>
          <p class="info-muted">Limpieza pendiente: ${zone.cleaningDue ? formatDateTime(zone.cleaningDue) : "No aplica"}</p>
          ${zone.overdueCleaning ? '<span class="badge warning">Limpieza vencida</span>' : '<span class="badge info">Rutina controlada</span>'}
        </article>
      `
    )
    .join("")}</div>`;
}

export function renderInventoryTable(rows) {
  if (!rows.length) {
    return '<p class="empty-state">No hay lotes para el filtro seleccionado.</p>';
  }

  return `
    <table class="inventory-table">
      <thead>
        <tr>
          <th>Lote</th>
          <th>Producto</th>
          <th>Zona</th>
          <th>Disponible</th>
          <th>Caduca</th>
          <th>Estado</th>
          <th>Hallazgos</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (lot) => `
              <tr>
                <td>
                  <strong>${escapeHtml(lot.id)}</strong>
                  <div class="info-muted mono">${escapeHtml(lot.batch)}</div>
                </td>
                <td>
                  <strong>${escapeHtml(lot.product.name)}</strong>
                  <div class="info-muted">${escapeHtml(lot.supplier.name)}</div>
                </td>
                <td>${escapeHtml(lot.zoneName)}</td>
                <td>${formatKg(lot.availableKg)}</td>
                <td>
                  <strong>${escapeHtml(lot.expiryLabel)}</strong>
                  <div class="info-muted">${lot.daysToExpire} dia(s)</div>
                </td>
                <td><span class="badge ${lot.canDispatch ? (lot.daysToExpire <= 2 ? "warning" : "success") : "danger"}">${escapeHtml(lot.statusLabel)}</span></td>
                <td>${escapeHtml([...lot.warnings, ...lot.blockers].join(" | ") || "Sin novedades")}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function renderDispatchPlan(plan) {
  if (!plan) {
    return '<p class="empty-state">Ejecuta una simulacion para ver el plan FEFO.</p>';
  }

  return `
    <div class="alert-grid">
      <article class="info-card">
        <h4>Asignacion sugerida</h4>
        <ul>
          ${plan.allocations.length
            ? plan.allocations
                .map(
                  (entry) => `<li>${escapeHtml(entry.lotId)} (${escapeHtml(entry.batch)}) · ${formatKg(entry.assignedKg)} · vence ${escapeHtml(formatDate(entry.expiryAt))}</li>`
                )
                .join("")
            : "<li>No hay lotes disponibles para despacho.</li>"}
        </ul>
        <p class="info-muted">Faltante: ${formatKg(plan.shortageKg)}</p>
      </article>
      <article class="info-card">
        <h4>Lotes bloqueados</h4>
        <ul>
          ${plan.blockedLots.length
            ? plan.blockedLots
                .map(
                  (lot) => `<li>${escapeHtml(lot.lotId)} · ${escapeHtml(lot.reasons.join(" | "))}</li>`
                )
                .join("")
            : "<li>Sin lotes bloqueados para este producto.</li>"}
        </ul>
      </article>
    </div>
  `;
}

export function renderAlerts(alerts) {
  const groups = [
    { title: "Urgentes 0-2 dias", tone: "danger", rows: alerts.urgent },
    { title: "Advertencia 3-5 dias", tone: "warning", rows: alerts.warning },
    { title: "Seguimiento 6-10 dias", tone: "info", rows: alerts.watch },
    { title: "Hold / bloqueado", tone: "danger", rows: alerts.blocked }
  ];

  return `<div class="alert-grid">${groups
    .map(
      (group) => `
        <article class="info-card">
          <div class="subpanel-heading">
            <h4>${escapeHtml(group.title)}</h4>
            <span class="badge ${group.tone}">${group.rows.length}</span>
          </div>
          ${group.rows.length
            ? `<ul>${group.rows
                .map(
                  (lot) => `<li>${escapeHtml(lot.product.name)} · ${escapeHtml(lot.id)} · ${lot.daysToExpire} dia(s) · ${formatKg(lot.availableKg)}</li>`
                )
                .join("")}</ul>`
            : '<p class="info-muted">Sin registros.</p>'}
        </article>
      `
    )
    .join("")}</div>`;
}

export function renderCompliance(report) {
  return `
    <div class="kpi-grid metric-grid">
      <article class="metric-card">
        <p class="metric-label">Cumplimiento integral</p>
        <p class="metric-value">${formatPercent(report.complianceRate)}</p>
        <span class="metric-delta ${report.complianceRate >= 85 ? "success" : "warning"}">Lotes + limpieza</span>
      </article>
      <article class="metric-card">
        <p class="metric-label">Lotes retenidos</p>
        <p class="metric-value">${report.blockedLots.length}</p>
        <span class="metric-delta ${report.blockedLots.length ? "danger" : "success"}">Control sanitario</span>
      </article>
      <article class="metric-card">
        <p class="metric-label">Limpiezas criticas</p>
        <p class="metric-value">${report.criticalCleaning.length}</p>
        <span class="metric-delta ${report.criticalCleaning.length ? "warning" : "success"}">BPM en frio</span>
      </article>
    </div>
    <div class="compliance-grid">
      <article class="info-card">
        <h4>Lotes con bloqueo comercial</h4>
        ${report.blockedLots.length
          ? `<ul>${report.blockedLots
              .map(
                (lot) => `<li><strong>${escapeHtml(lot.product)}</strong> · ${escapeHtml(lot.id)} · ${escapeHtml(lot.blockers.join(" | "))}</li>`
              )
              .join("")}</ul>`
          : '<p class="info-muted">Sin bloqueos activos.</p>'}
      </article>
      <article class="info-card">
        <h4>Limpieza y saneamiento</h4>
        ${report.cleaningChecks.length
          ? `<ul>${report.cleaningChecks
              .map(
                (task) => `<li>${escapeHtml(task.zone)} · ${escapeHtml(task.task)} · ${task.completed ? "Completada" : task.overdue ? "Vencida" : "Programada"}</li>`
              )
              .join("")}</ul>`
          : '<p class="info-muted">Sin tareas registradas.</p>'}
      </article>
      <article class="info-card">
        <h4>Normas mapeadas</h4>
        <ul>
          <li>Rotulado legible y en castellano para productos de duracion limitada.</li>
          <li>Fecha de vencimiento visible y gestionada como criterio FEFO.</li>
          <li>Conservacion y temperatura monitoreadas por zona fria.</li>
          <li>Registro de lotes, soporte sanitario y acciones correctivas.</li>
        </ul>
      </article>
    </div>
  `;
}

export function renderOutages(outageImpact) {
  if (!outageImpact.events.length) {
    return '<p class="empty-state">No hay contingencias registradas.</p>';
  }

  return `<div class="outage-grid">${outageImpact.events
    .map(
      (event) => `
        <article class="info-card">
          <div class="subpanel-heading">
            <h4>${escapeHtml(event.zoneName)}</h4>
            <span class="badge ${event.impactedLots.some((lot) => lot.quarantine) ? "danger" : "warning"}">${event.durationMinutes} min</span>
          </div>
          <p class="info-muted">Inicio ${formatDateTime(event.startedAt)} · Fin ${formatDateTime(event.endedAt)}</p>
          <p>Maximo registrado: ${formatTemperature(event.maxTemperatureC)} · ${escapeHtml(event.note)}</p>
          <ul>
            ${event.impactedLots
              .map(
                (lot) => `<li>${escapeHtml(lot.lotId)} · ${escapeHtml(lot.product)} · ${formatKg(lot.quantityKg)} · ${escapeHtml(lot.action)}</li>`
              )
              .join("")}
          </ul>
        </article>
      `
    )
    .join("")}</div>`;
}

export function renderTraceability(traceability) {
  return `
    <div class="trace-grid">
      <article class="info-card">
        <h4>Matriz de trazabilidad por lote</h4>
        <ul>
          ${traceability.lots
            .map(
              (lot) => `<li><strong>${escapeHtml(lot.lotId)}</strong> · ${escapeHtml(lot.product)} · ${escapeHtml(lot.supplier)} · Factura ${escapeHtml(lot.invoice)} · Vence ${escapeHtml(formatDate(lot.expiryAt))}</li>`
            )
            .join("")}
        </ul>
      </article>
      <article class="info-card">
        <h4>Retiros y observaciones</h4>
        ${traceability.withdrawals.length
          ? `<ul>${traceability.withdrawals
              .map(
                (record) => `<li><strong>${escapeHtml(record.product)}</strong> · ${escapeHtml(record.batch)} · ${escapeHtml(record.status)} · ${escapeHtml(record.action)}</li>`
              )
              .join("")}</ul>`
          : '<p class="info-muted">Sin retiros registrados.</p>'}
      </article>
    </div>
  `;
}

export function renderReportsSummary(reportSummary) {
  return `
    <div class="report-grid">
      <article class="info-card">
        <h4>Inventario valorizado</h4>
        <p>${formatKg(reportSummary.totalKg)} disponibles</p>
        <p class="info-muted">${formatCurrency(reportSummary.inventoryValue)} en costo estimado</p>
      </article>
      <article class="info-card">
        <h4>Compliance general</h4>
        <p>${formatPercent(reportSummary.complianceRate)}</p>
        <p class="info-muted">${reportSummary.blockedLots} lotes bloqueados / ${reportSummary.quarantinedLots} en cuarentena</p>
      </article>
      <article class="info-card">
        <h4>Respaldo sugerido</h4>
        <ul>
          <li>Exportar inventario y alertas al cierre del turno.</li>
          <li>Verificar lotes bloqueados antes de reapertura.</li>
          <li>Archivar incidencias de frio con firma del responsable.</li>
        </ul>
      </article>
    </div>
  `;
}
