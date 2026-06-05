import { escapeHtml } from '../utils.js';
import { sysConfig } from '../app.js';

export default async function normativa(el) {
  const sys = sysConfig() || {};
  const emp = sys.empresa || {};
  const cad = sys.caducidad || {};
  const fr = sys.cadenaFrio || {};

  el.innerHTML = `
    <div class="section-note"><span class="ic">📋</span>
      <div><b>Cumplimiento normativo — Venezuela.</b> Este módulo documenta cómo el sistema se alinea con las normas sanitarias y fiscales venezolanas aplicables a una charcutería.</div>
    </div>

    <div class="grid cards-2">
      <div class="card">
        <div class="card-head"><h3>🏢 Datos del establecimiento</h3></div>
        <table>
          ${fila('Razón social', escapeHtml(emp.nombre))}
          ${fila('RIF', escapeHtml(emp.rif))}
          ${fila('Registro sanitario', escapeHtml(emp.registroSanitario))}
          ${fila('Dirección', escapeHtml(emp.direccion))}
          ${fila('Teléfono', escapeHtml(emp.telefono))}
        </table>
      </div>
      <div class="card">
        <div class="card-head"><h3>💵 Parámetros fiscales</h3></div>
        <table>
          ${fila('IVA aplicado', ((sys.fiscal?.IVA || 0) * 100) + '%')}
          ${fila('IGTF (divisas/efectivo)', ((sys.fiscal?.IGTF || 0) * 100) + '%')}
          ${fila('Moneda local', sys.fiscal?.monedaLocal || 'VES (Bolívar)')}
          ${fila('Tasa BCV referencial', 'Bs. ' + (sys.fiscal?.tasaBCV ?? '—') + ' / USD')}
        </table>
      </div>
    </div>

    <div class="card mt">
      <div class="card-head"><h3>📑 Normas y principios implementados</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Norma / Principio</th><th>Aplicación en el sistema</th></tr></thead>
        <tbody>
          ${norma('COVENIN 2952 — Rotulado de alimentos envasados', 'Cada lote registra fecha de producción y de caducidad; las etiquetas/QR muestran origen, lote y vencimiento.')}
          ${norma('COVENIN 3802 — Buenas Prácticas de Fabricación', 'Monitoreo de cadena de frío con registros de temperatura y alertas de desviación.')}
          ${norma('Método FEFO (First Expired, First Out)', 'La salida de mercancía prioriza automáticamente los lotes con caducidad más próxima, minimizando merma.')}
          ${norma('Trazabilidad sanitaria (INSAI / SENCAMER)', 'Historial completo de cada lote: proveedor → recepción → ventas/mermas, con código QR verificable.')}
          ${norma('Ley del IVA — Providencia SENIAT', 'Cálculo automático de IVA (16%) en cada venta y comprobante con desglose.')}
          ${norma('Control de divisas (referencia BCV)', 'Conversión de totales a USD según tasa BCV editable; soporte de IGTF para pagos en divisa/efectivo.')}
          ${norma('Higiene y retiro de productos vencidos', 'Los lotes vencidos se marcan y se registran como merma para su retiro y disposición sanitaria.')}
        </tbody>
      </table></div>
    </div>

    <div class="grid cards-2 mt">
      <div class="card">
        <div class="card-head"><h3>🚦 Umbrales de caducidad (semáforo FEFO)</h3></div>
        <table>
          ${fila('🔴 Crítico', '≤ ' + (cad.diasCritico ?? 7) + ' días')}
          ${fila('🟠 Alerta', '≤ ' + (cad.diasAlerta ?? 15) + ' días')}
          ${fila('🟡 Precaución', '≤ ' + (cad.diasPrecaucion ?? 30) + ' días')}
          ${fila('🟢 Óptimo', '> ' + (cad.diasPrecaucion ?? 30) + ' días')}
        </table>
      </div>
      <div class="card">
        <div class="card-head"><h3>❄️ Rangos de cadena de frío</h3></div>
        <table>
          ${fila('Refrigeración', fr.refrigeracion?.etiqueta || '0–7 °C')}
          ${fila('Congelación', fr.congelacion?.etiqueta || '−25 a −18 °C')}
          ${fila('Ambiente', fr.ambiente?.etiqueta || '10–25 °C')}
        </table>
      </div>
    </div>`;
}

function fila(k, v) { return `<tr><td class="t-sub">${k}</td><td class="t-strong">${v}</td></tr>`; }
function norma(n, a) { return `<tr><td class="t-strong">${n}</td><td>${a}</td></tr>`; }
