from __future__ import annotations

import sqlite3
from pathlib import Path


SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    sanitary_registry TEXT NOT NULL,
    shelf_life_days INTEGER NOT NULL CHECK (shelf_life_days > 0),
    min_temp_c REAL NOT NULL,
    max_temp_c REAL NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rif TEXT NOT NULL UNIQUE,
    sanitary_permit TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    lot_code TEXT NOT NULL UNIQUE,
    production_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    received_date TEXT NOT NULL,
    purchase_cost REAL NOT NULL CHECK (purchase_cost >= 0),
    quantity_received REAL NOT NULL CHECK (quantity_received > 0),
    quantity_available REAL NOT NULL CHECK (quantity_available >= 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'quarantine', 'disposed')),
    storage_location TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL REFERENCES lots(id),
    movement_type TEXT NOT NULL CHECK (
        movement_type IN ('in', 'sale', 'adjustment', 'waste', 'transfer')
    ),
    quantity REAL NOT NULL CHECK (quantity > 0),
    reason TEXT NOT NULL,
    reference TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS temperature_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area TEXT NOT NULL,
    product_id INTEGER REFERENCES products(id),
    lot_id INTEGER REFERENCES lots(id),
    temperature_c REAL NOT NULL,
    logged_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS sales_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_item_id INTEGER NOT NULL REFERENCES sales_items(id),
    lot_id INTEGER NOT NULL REFERENCES lots(id),
    quantity REAL NOT NULL CHECK (quantity > 0),
    expiry_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    entity TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def connect(db_path: str) -> sqlite3.Connection:
    path = Path(db_path)
    if path.parent and not path.parent.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: str) -> None:
    conn = connect(db_path)
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
    finally:
        conn.close()
