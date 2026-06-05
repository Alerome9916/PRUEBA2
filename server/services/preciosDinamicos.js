'use strict';

const config = require('../config');
const { diasParaVencer } = require('./fefo');

/**
 * NOVEDAD DEL SISTEMA — Motor de Precios Dinámicos Anti-Desperdicio.
 *
 * A diferencia de los sistemas de charcutería tradicionales (que solo alertan
 * sobre vencimientos), este motor calcula automáticamente un precio rebajado
 * según la vida útil restante del lote más próximo a vencer (FEFO). El objetivo
 * es liquidar la mercancía antes de convertirla en merma, recuperando capital y
 * reduciendo el desperdicio de alimentos.
 */

/**
 * Calcula el descuento aplicable a un precio base según los días que faltan
 * para que venza el lote.
 * @param {number} precioBase
 * @param {string} fechaCaducidad (YYYY-MM-DD)
 * @returns {{precioBase:number, precioFinal:number, descuentoPct:number,
 *            etiqueta:(string|null), ahorro:number, dias:number}}
 */
function calcularPrecioDinamico(precioBase, fechaCaducidad) {
  const dias = diasParaVencer(fechaCaducidad);
  const base = {
    precioBase: round(precioBase),
    precioFinal: round(precioBase),
    descuentoPct: 0,
    etiqueta: null,
    ahorro: 0,
    dias,
  };

  if (!config.PRECIOS_DINAMICOS.activo || dias < 0) return base;

  // Reglas ordenadas de menor a mayor margen de días: aplica la primera que cumpla.
  const reglas = [...config.PRECIOS_DINAMICOS.reglas].sort((a, b) => a.diasMax - b.diasMax);
  for (const regla of reglas) {
    if (dias <= regla.diasMax) {
      const precioFinal = round(precioBase * (1 - regla.descuento));
      return {
        precioBase: round(precioBase),
        precioFinal,
        descuentoPct: regla.descuento,
        etiqueta: regla.etiqueta,
        ahorro: round(precioBase - precioFinal),
        dias,
      };
    }
  }
  return base;
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

module.exports = { calcularPrecioDinamico };
