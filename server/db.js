'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Crea el esquema completo del sistema si no existe.
 */
function init() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    usuario TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'cajero',
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    conservacion TEXT NOT NULL DEFAULT 'refrigeracion', -- refrigeracion | congelacion | ambiente
    activo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rif TEXT,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    registro_sanitario TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,        -- código de barras / SKU
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER REFERENCES categorias(id),
    unidad TEXT NOT NULL DEFAULT 'kg',  -- kg | unidad | gramo
    precio_venta REAL NOT NULL DEFAULT 0,  -- precio base en VES
    costo_promedio REAL NOT NULL DEFAULT 0,
    stock_minimo REAL NOT NULL DEFAULT 0,
    vida_util_dias INTEGER NOT NULL DEFAULT 30,
    perecedero INTEGER NOT NULL DEFAULT 1,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Lotes: corazón del control FEFO. Cada recepción genera un lote con su caducidad.
  CREATE TABLE IF NOT EXISTS lotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_lote TEXT NOT NULL,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    proveedor_id INTEGER REFERENCES proveedores(id),
    fecha_recepcion TEXT NOT NULL DEFAULT (date('now')),
    fecha_produccion TEXT,
    fecha_caducidad TEXT NOT NULL,
    cantidad_inicial REAL NOT NULL,
    cantidad_actual REAL NOT NULL,
    costo_unitario REAL NOT NULL DEFAULT 0,
    ubicacion TEXT DEFAULT 'Almacén principal',
    estado TEXT NOT NULL DEFAULT 'activo', -- activo | agotado | vencido | retirado
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_lotes_fefo ON lotes(producto_id, fecha_caducidad);

  -- Entradas (recepción de mercancía). Cabecera de una compra/recepción.
  CREATE TABLE IF NOT EXISTS entradas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documento TEXT,                     -- nro factura/guía del proveedor
    proveedor_id INTEGER REFERENCES proveedores(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    total_costo REAL NOT NULL DEFAULT 0,
    nota TEXT,
    fecha TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS entrada_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entrada_id INTEGER NOT NULL REFERENCES entradas(id) ON DELETE CASCADE,
    lote_id INTEGER REFERENCES lotes(id),
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad REAL NOT NULL,
    costo_unitario REAL NOT NULL
  );

  -- Ventas: salida de inventario aplicando FEFO automáticamente.
  CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    usuario_id INTEGER REFERENCES usuarios(id),
    cliente TEXT DEFAULT 'Consumidor final',
    cliente_rif TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    descuento REAL NOT NULL DEFAULT 0,   -- ahorro por precios dinámicos
    iva REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    metodo_pago TEXT NOT NULL DEFAULT 'efectivo_ves',
    tasa_bcv REAL,
    total_usd REAL,
    fecha TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS venta_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    lote_id INTEGER REFERENCES lotes(id),
    cantidad REAL NOT NULL,
    precio_base REAL NOT NULL,
    precio_aplicado REAL NOT NULL,        -- precio tras descuento dinámico
    descuento_pct REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL
  );

  -- Mermas: pérdidas por vencimiento, daño, derrame, etc.
  CREATE TABLE IF NOT EXISTS mermas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lote_id INTEGER REFERENCES lotes(id),
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    cantidad REAL NOT NULL,
    motivo TEXT NOT NULL DEFAULT 'vencimiento', -- vencimiento | dano | robo | rotura_cadena_frio | otro
    costo_perdido REAL NOT NULL DEFAULT 0,
    nota TEXT,
    fecha TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Cadena de frío: registros de temperatura de los equipos.
  CREATE TABLE IF NOT EXISTS equipos_frio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'refrigeracion', -- refrigeracion | congelacion
    ubicacion TEXT,
    activo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS registros_temperatura (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER NOT NULL REFERENCES equipos_frio(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    temperatura REAL NOT NULL,
    fuera_rango INTEGER NOT NULL DEFAULT 0,
    nota TEXT,
    fecha TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Movimientos de inventario (auditoría / trazabilidad).
  CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lote_id INTEGER REFERENCES lotes(id),
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    tipo TEXT NOT NULL,  -- entrada | venta | merma | ajuste
    cantidad REAL NOT NULL,
    referencia TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Configuración dinámica (tasa BCV, parámetros editables).
  CREATE TABLE IF NOT EXISTS config (
    clave TEXT PRIMARY KEY,
    valor TEXT
  );
  `);
}

module.exports = { db, init, DB_PATH };
