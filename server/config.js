'use strict';

/**
 * Configuración central del sistema de la Charcutería Los Churuguaros.
 * Incluye parámetros regulatorios de Venezuela y reglas del negocio.
 */
module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'los-churuguaros-fefo-secret-2026',
  JWT_EXPIRES: '12h',

  // Datos de la empresa (Venezuela)
  EMPRESA: {
    nombre: 'Charcutería Los Churuguaros, C.A.',
    rif: 'J-40512378-9',
    direccion: 'Av. Principal, Quíbor, Estado Lara, Venezuela',
    telefono: '+58 253-123-4567',
    registroSanitario: 'MPPS-INSAI-2024-08712',
  },

  // Parámetros tributarios y monetarios de Venezuela
  FISCAL: {
    IVA: 0.16, // Impuesto al Valor Agregado vigente (16%)
    IGTF: 0.03, // Impuesto a las Grandes Transacciones Financieras (divisas/efectivo)
    monedaLocal: 'VES', // Bolívar
    monedaReferencia: 'USD',
    tasaBCVPorDefecto: 36.5, // Tasa Bs/USD editable (referencial BCV)
  },

  /**
   * Reglas FEFO de semáforo de caducidad.
   * Define cuántos días antes del vencimiento se considera cada estado.
   */
  CADUCIDAD: {
    diasCritico: 7, // rojo intenso: vence en <= 7 días
    diasAlerta: 15, // amarillo: vence en <= 15 días
    diasPrecaucion: 30, // naranja suave: vence en <= 30 días
  },

  /**
   * NOVEDAD: Motor de Precios Dinámicos Anti-Desperdicio.
   * Aplica descuentos automáticos escalonados según la vida útil restante del
   * lote (FEFO), para liquidar mercancía antes de que se convierta en merma.
   * Esto es poco común en sistemas de charcutería tradicionales.
   */
  PRECIOS_DINAMICOS: {
    activo: true,
    reglas: [
      { diasMax: 3, descuento: 0.50, etiqueta: 'LIQUIDACIÓN -50%' },
      { diasMax: 7, descuento: 0.35, etiqueta: 'OFERTA FLASH -35%' },
      { diasMax: 15, descuento: 0.20, etiqueta: 'PRONTO A VENCER -20%' },
      { diasMax: 30, descuento: 0.10, etiqueta: 'PROMOCIÓN -10%' },
    ],
  },

  // Cadena de frío: rangos por tipo de conservación (COVENIN / buenas prácticas)
  CADENA_FRIO: {
    refrigeracion: { min: 0, max: 7, etiqueta: 'Refrigerado (0–7 °C)' },
    congelacion: { min: -25, max: -18, etiqueta: 'Congelado (-25 a -18 °C)' },
    ambiente: { min: 10, max: 25, etiqueta: 'Ambiente (10–25 °C)' },
  },

  ROLES: ['admin', 'supervisor', 'almacenista', 'cajero'],
};
