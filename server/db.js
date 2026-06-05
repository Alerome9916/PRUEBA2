import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || join(DATA_DIR, 'churuguaros.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Esquema completo del sistema de inventario y caducidad (FEFO).
 * Diseñado para la Charcutería "Los Churuguaros" según normativa venezolana
 * (IVA 16%, RIF, COVENIN de etiquetado y cadena de frío, doble moneda Bs/USD).
 */
export function initSchema() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT NOT NULL DEFAULT 'Charcutería Los Churuguaros',
    rif TEXT NOT NULL DEFAULT 'J-00000000-0',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    iva_rate REAL NOT NULL DEFAULT 16.0,        -- IVA Venezuela
    igtf_rate REAL NOT NULL DEFAULT 3.0,        -- IGTF para pagos en divisas
    exchange_rate REAL NOT NULL DEFAULT 36.50,  -- Tasa BCV Bs/USD
    base_currency TEXT NOT NULL DEFAULT 'USD',
    alert_critical_days INTEGER NOT NULL DEFAULT 3,
    alert_warning_days INTEGER NOT NULL DEFAULT 10,
    alert_notice_days INTEGER NOT NULL DEFAULT 20,
    auto_discount_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'ventas',  -- admin | almacen | ventas
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    requires_refrigeration INTEGER NOT NULL DEFAULT 1,
    storage_temp_min REAL,
    storage_temp_max REAL,
    default_shelf_life_days INTEGER DEFAULT 30,
    color TEXT DEFAULT '#8b5cf6',
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rif TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    sanitary_permit TEXT DEFAULT '',  -- Permiso sanitario / registro INSAI-SENCAMER
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT DEFAULT '',
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    unit TEXT NOT NULL DEFAULT 'kg',   -- kg | unidad
    cost_price REAL NOT NULL DEFAULT 0,     -- USD
    sale_price REAL NOT NULL DEFAULT 0,     -- USD
    iva_exempt INTEGER NOT NULL DEFAULT 0,
    min_stock REAL NOT NULL DEFAULT 0,
    max_stock REAL NOT NULL DEFAULT 0,
    storage_temp_min REAL,
    storage_temp_max REAL,
    covenin_norm TEXT DEFAULT '',      -- Norma COVENIN aplicable
    sanitary_reg TEXT DEFAULT '',      -- Registro sanitario del producto
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    lot_code TEXT NOT NULL,
    trace_code TEXT UNIQUE NOT NULL,   -- Código de trazabilidad (QR)
    qty_received REAL NOT NULL,
    qty_remaining REAL NOT NULL,
    cost_price REAL NOT NULL DEFAULT 0,
    received_date TEXT NOT NULL,
    manufacture_date TEXT,
    expiration_date TEXT NOT NULL,
    location TEXT DEFAULT 'Nevera 1',
    status TEXT NOT NULL DEFAULT 'activo',  -- activo | agotado | vencido | cuarentena
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_batches_fefo ON batches(product_id, expiration_date, status);

  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                 -- entrada | salida | merma | ajuste
    product_id INTEGER NOT NULL REFERENCES products(id),
    batch_id INTEGER REFERENCES batches(id),
    qty REAL NOT NULL,
    unit_cost REAL DEFAULT 0,
    reference TEXT DEFAULT '',
    note TEXT DEFAULT '',
    user_id INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_mov_product ON movements(product_id, created_at);

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    customer TEXT DEFAULT 'Contado',
    customer_rif TEXT DEFAULT '',
    subtotal REAL NOT NULL DEFAULT 0,
    discount_total REAL NOT NULL DEFAULT 0,
    iva_total REAL NOT NULL DEFAULT 0,
    igtf_total REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,           -- USD
    total_bs REAL NOT NULL DEFAULT 0,
    exchange_rate REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'efectivo_bs',
    user_id INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    batch_id INTEGER REFERENCES batches(id),
    qty REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_pct REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL,
    is_anti_waste INTEGER NOT NULL DEFAULT 0  -- vendido con descuento anti-merma
  );

  CREATE TABLE IF NOT EXISTS waste (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER REFERENCES batches(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty REAL NOT NULL,
    reason TEXT NOT NULL DEFAULT 'vencimiento',  -- vencimiento | dano | contaminacion | otro
    cost_value REAL NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    user_id INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  `);

  // Garantiza la fila única de configuración
  const row = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!row) {
    db.prepare('INSERT INTO settings (id) VALUES (1)').run();
  }
}

export function getSettings() {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get();
}

export default db;
