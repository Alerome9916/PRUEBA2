import db, { initSchema, getSettings } from './db.js';
import { hashPassword } from './auth.js';

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function dateTimeDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function genTrace(i) {
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12);
  return `CHU-${stamp}-${String(i).padStart(4, '0')}`;
}

export function seed() {
  initSchema();

  // Configuración empresa
  db.prepare(`
    UPDATE settings SET company_name=?, rif=?, address=?, phone=?, email=?, exchange_rate=?
    WHERE id=1
  `).run('Charcutería Los Churuguaros', 'J-41258963-7',
    'Av. Lara, Local 7, Barquisimeto, Edo. Lara, Venezuela', '0251-2334455',
    'contacto@loschuruguaros.com.ve', 38.75);

  // Usuarios
  const users = [
    ['admin', 'admin123', 'José Churuguaro (Administrador)', 'admin'],
    ['almacen', 'almacen123', 'María Pérez (Almacén)', 'almacen'],
    ['caja', 'caja123', 'Luis González (Cajero)', 'ventas'],
  ];
  const insUser = db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)');
  for (const [u, p, n, r] of users) insUser.run(u, hashPassword(p), n, r);

  // Categorías (con cadena de frío)
  const categories = [
    ['Jamones', 'Jamones cocidos, ahumados y serranos', 1, 0, 4, 25, '#ef4444'],
    ['Quesos', 'Quesos blancos, amarillos y madurados', 1, 2, 6, 30, '#f59e0b'],
    ['Embutidos', 'Mortadela, salchichón, salchichas', 1, 0, 4, 20, '#ec4899'],
    ['Chorizos y Longanizas', 'Chorizos frescos y curados', 1, 0, 4, 15, '#dc2626'],
    ['Tocinetas y Ahumados', 'Tocineta, pernil ahumado', 1, 0, 4, 30, '#a16207'],
    ['Charcutería Importada', 'Productos curados de importación', 1, 2, 8, 60, '#8b5cf6'],
    ['Lácteos y Untables', 'Mantequilla, quesos crema', 1, 2, 6, 40, '#3b82f6'],
    ['Encurtidos y Aceitunas', 'Encurtidos, aceitunas (anaquel)', 0, null, null, 180, '#16a34a'],
  ];
  const insCat = db.prepare(`INSERT INTO categories (name, description, requires_refrigeration, storage_temp_min, storage_temp_max, default_shelf_life_days, color) VALUES (?,?,?,?,?,?,?)`);
  const catIds = {};
  for (const c of categories) catIds[c[0]] = insCat.run(...c).lastInsertRowid;

  // Proveedores
  const suppliers = [
    ['Plumrose Venezuela C.A.', 'J-00012345-6', 'Carlos Méndez', '0212-9001122', 'ventas@plumrose.com.ve', 'Cagua, Edo. Aragua', 'INSAI-2451'],
    ['Alimentos La Montserratina', 'J-00067890-1', 'Ana Rivas', '0241-8112233', 'pedidos@montserratina.com', 'Valencia, Edo. Carabobo', 'INSAI-1187'],
    ['Charcutería Andina S.A.', 'J-00098765-4', 'Pedro Sánchez', '0274-2667788', 'info@charandina.com.ve', 'Mérida, Edo. Mérida', 'INSAI-3320'],
    ['Lácteos Los Andes', 'J-00045612-3', 'Rosa Díaz', '0271-3445566', 'comercial@losandes.com.ve', 'San Cristóbal, Táchira', 'INSAI-2098'],
    ['Importadora Gourmet C.A.', 'J-00078945-2', 'Giovanni Rossi', '0212-7556644', 'import@gourmet.com.ve', 'Caracas, Distrito Capital', 'INSAI-4471'],
  ];
  const insSup = db.prepare(`INSERT INTO suppliers (name, rif, contact, phone, email, address, sanitary_permit) VALUES (?,?,?,?,?,?,?)`);
  const supIds = suppliers.map((s) => insSup.run(...s).lastInsertRowid);

  // Productos
  // [sku, barcode, name, category, unit, cost, price, ivaExempt, min, max, tmin, tmax, covenin, sanitary]
  const products = [
    ['JAM-001', '7591234000018', 'Jamón Cocido Premium', 'Jamones', 'kg', 5.20, 8.50, 0, 3, 30, 0, 4, 'COVENIN 1088', 'RS-J-1201'],
    ['JAM-002', '7591234000025', 'Jamón Ahumado', 'Jamones', 'kg', 6.10, 9.90, 0, 2, 20, 0, 4, 'COVENIN 1088', 'RS-J-1202'],
    ['JAM-003', '7591234000032', 'Jamón Serrano Importado', 'Charcutería Importada', 'kg', 18.00, 28.00, 0, 1, 10, 2, 8, 'COVENIN 3236', 'RS-J-3301'],
    ['QUE-001', '7591234000049', 'Queso Amarillo Tipo Cheddar', 'Quesos', 'kg', 4.80, 7.80, 0, 4, 40, 2, 6, 'COVENIN 3822', 'RS-Q-2101'],
    ['QUE-002', '7591234000056', 'Queso Blanco Llanero', 'Quesos', 'kg', 3.90, 6.50, 0, 5, 50, 2, 6, 'COVENIN 1813', 'RS-Q-2102'],
    ['QUE-003', '7591234000063', 'Queso Mozzarella', 'Quesos', 'kg', 5.30, 8.20, 0, 3, 30, 2, 6, 'COVENIN 3822', 'RS-Q-2103'],
    ['QUE-004', '7591234000070', 'Queso Gouda Importado', 'Charcutería Importada', 'kg', 12.50, 19.50, 0, 1, 12, 2, 8, 'COVENIN 3822', 'RS-Q-3302'],
    ['EMB-001', '7591234000087', 'Mortadela Especial', 'Embutidos', 'kg', 2.80, 4.60, 0, 5, 50, 0, 4, 'COVENIN 1088', 'RS-E-1501'],
    ['EMB-002', '7591234000094', 'Mortadela con Aceitunas', 'Embutidos', 'kg', 3.10, 5.10, 0, 4, 40, 0, 4, 'COVENIN 1088', 'RS-E-1502'],
    ['EMB-003', '7591234000100', 'Salchichón Cervecero', 'Embutidos', 'kg', 4.20, 6.90, 0, 3, 30, 0, 4, 'COVENIN 1088', 'RS-E-1503'],
    ['EMB-004', '7591234000117', 'Salchichas tipo Viena', 'Embutidos', 'kg', 3.50, 5.80, 0, 4, 40, 0, 4, 'COVENIN 1088', 'RS-E-1504'],
    ['CHO-001', '7591234000124', 'Chorizo Ahumado', 'Chorizos y Longanizas', 'kg', 4.60, 7.50, 0, 3, 25, 0, 4, 'COVENIN 1088', 'RS-C-1601'],
    ['CHO-002', '7591234000131', 'Longaniza Casera', 'Chorizos y Longanizas', 'kg', 4.10, 6.80, 0, 3, 25, 0, 4, 'COVENIN 1088', 'RS-C-1602'],
    ['TOC-001', '7591234000148', 'Tocineta Ahumada', 'Tocinetas y Ahumados', 'kg', 5.50, 8.90, 0, 2, 20, 0, 4, 'COVENIN 1088', 'RS-T-1701'],
    ['TOC-002', '7591234000155', 'Pernil Ahumado', 'Tocinetas y Ahumados', 'kg', 6.20, 9.80, 0, 2, 15, 0, 4, 'COVENIN 1088', 'RS-T-1702'],
    ['LAC-001', '7591234000162', 'Mantequilla con Sal', 'Lácteos y Untables', 'kg', 4.00, 6.50, 0, 3, 30, 2, 6, 'COVENIN 70', 'RS-L-1801'],
    ['LAC-002', '7591234000179', 'Queso Crema', 'Lácteos y Untables', 'kg', 4.40, 7.10, 0, 3, 25, 2, 6, 'COVENIN 3822', 'RS-L-1802'],
    ['ENC-001', '7591234000186', 'Aceitunas Rellenas', 'Encurtidos y Aceitunas', 'kg', 3.20, 5.50, 0, 4, 40, null, null, 'COVENIN 1315', 'RS-N-1901'],
    ['ENC-002', '7591234000193', 'Encurtidos Mixtos', 'Encurtidos y Aceitunas', 'kg', 2.50, 4.30, 0, 4, 40, null, null, 'COVENIN 1315', 'RS-N-1902'],
  ];
  const insProd = db.prepare(`INSERT INTO products (sku, barcode, name, category_id, unit, cost_price, sale_price, iva_exempt, min_stock, max_stock, storage_temp_min, storage_temp_max, covenin_norm, sanitary_reg) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const prodIds = {};
  for (const p of products) {
    prodIds[p[0]] = insProd.run(p[0], p[1], p[2], catIds[p[3]], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13]).lastInsertRowid;
  }

  // Lotes con fechas de caducidad variadas (incluye críticos y vencidos para demostrar FEFO)
  // [sku, supplierIdx, lotCode, qty, costOverride|null, expiresInDays, location]
  const batches = [
    ['JAM-001', 0, 'LP-2401', 20, null, 2, 'Nevera 1'],     // crítico
    ['JAM-001', 0, 'LP-2402', 25, null, 18, 'Nevera 1'],
    ['JAM-002', 0, 'LP-2410', 12, null, 7, 'Nevera 1'],     // advertencia
    ['JAM-003', 4, 'IMP-9901', 6, null, 45, 'Nevera 3'],
    ['QUE-001', 1, 'MS-3301', 30, null, 1, 'Nevera 2'],     // crítico (alto riesgo)
    ['QUE-001', 1, 'MS-3302', 25, null, 25, 'Nevera 2'],
    ['QUE-002', 3, 'LA-1101', 18, null, 4, 'Nevera 2'],     // advertencia
    ['QUE-003', 1, 'MS-3320', 15, null, 12, 'Nevera 2'],
    ['QUE-004', 4, 'IMP-9920', 10, null, 50, 'Nevera 3'],
    ['EMB-001', 0, 'PL-5501', 40, null, 9, 'Nevera 1'],     // advertencia
    ['EMB-001', 0, 'PL-5502', 30, null, 22, 'Nevera 1'],
    ['EMB-002', 0, 'PL-5510', 20, null, 6, 'Nevera 1'],
    ['EMB-003', 2, 'CA-7701', 12, null, 14, 'Nevera 1'],
    ['EMB-004', 0, 'PL-5520', 35, null, 16, 'Nevera 1'],
    ['CHO-001', 2, 'CA-7710', 14, null, 3, 'Nevera 1'],     // crítico
    ['CHO-002', 2, 'CA-7720', 10, null, 11, 'Nevera 1'],
    ['TOC-001', 0, 'PL-5530', 8, null, 5, 'Nevera 1'],
    ['TOC-002', 0, 'PL-5540', 6, null, 20, 'Nevera 1'],
    ['LAC-001', 3, 'LA-1110', 16, null, 30, 'Nevera 2'],
    ['LAC-002', 3, 'LA-1120', 12, null, 8, 'Nevera 2'],     // advertencia
    ['QUE-002', 3, 'LA-1102', 10, null, -1, 'Nevera 2'],    // VENCIDO (para barrido)
    ['ENC-001', 1, 'MS-3340', 24, null, 120, 'Anaquel A'],
    ['ENC-002', 1, 'MS-3341', 20, null, 90, 'Anaquel A'],
  ];
  const insBatch = db.prepare(`INSERT INTO batches (product_id, supplier_id, lot_code, trace_code, qty_received, qty_remaining, cost_price, received_date, manufacture_date, expiration_date, location, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insMov = db.prepare(`INSERT INTO movements (type, product_id, batch_id, qty, unit_cost, reference, note, user_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)`);
  let bi = 1;
  const batchIdsBySku = {};
  for (const [sku, supIdx, lot, qty, costOv, exp, loc] of batches) {
    const pid = prodIds[sku];
    const cost = costOv ?? products.find((p) => p[0] === sku)[5];
    const trace = genTrace(bi++);
    const expDate = daysFromNow(exp);
    const recv = dateTimeDaysAgo(Math.max(1, 25 - exp > 0 ? Math.min(20, 25 - exp) : 1));
    const status = exp < 0 ? 'activo' : 'activo'; // vencido se marca con barrido luego; lo dejamos activo para demostrar
    const id = insBatch.run(pid, supIds[supIdx], lot, trace, qty, qty, cost, recv.slice(0, 10), daysFromNow(exp - 25), expDate, loc, status).lastInsertRowid;
    insMov.run('entrada', pid, id, qty, cost, lot, 'Recepción inicial (seed)', 2, recv);
    (batchIdsBySku[sku] = batchIdsBySku[sku] || []).push(id);
  }

  // Ventas históricas (para velocidad de rotación, tendencias y dashboard)
  const settings = getSettings();
  const insSale = db.prepare(`INSERT INTO sales (code, customer, subtotal, discount_total, iva_total, total, total_bs, exchange_rate, payment_method, user_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const insItem = db.prepare(`INSERT INTO sale_items (sale_id, product_id, batch_id, qty, unit_price, discount_pct, line_total, is_anti_waste) VALUES (?,?,?,?,?,?,?,?)`);
  let saleNo = 1;
  const sellSkus = ['JAM-001', 'QUE-001', 'EMB-001', 'EMB-004', 'CHO-001', 'QUE-002', 'TOC-001', 'JAM-002', 'EMB-003'];
  for (let d = 14; d >= 0; d--) {
    const salesPerDay = 2 + Math.floor(Math.random() * 4);
    for (let s = 0; s < salesPerDay; s++) {
      const when = dateTimeDaysAgo(d);
      const nItems = 1 + Math.floor(Math.random() * 3);
      let subtotal = 0, iva = 0;
      const code = 'V-' + String(saleNo++).padStart(6, '0');
      const saleId = insSale.run(code, 'Contado', 0, 0, 0, 0, 0, settings.exchange_rate, 'efectivo_bs', 3, when).lastInsertRowid;
      for (let k = 0; k < nItems; k++) {
        const sku = sellSkus[Math.floor(Math.random() * sellSkus.length)];
        const pid = prodIds[sku];
        const prod = products.find((p) => p[0] === sku);
        const qty = Number((0.3 + Math.random() * 1.5).toFixed(2));
        const price = prod[6];
        const lineTotal = price * qty;
        const lineIva = lineTotal * (settings.iva_rate / 100);
        subtotal += lineTotal; iva += lineIva;
        const bid = (batchIdsBySku[sku] || [null])[0];
        insItem.run(saleId, pid, bid, qty, price, 0, lineTotal, 0);
        insMov.run('salida', pid, bid, qty, prod[5], code, 'Venta histórica (seed)', 3, when);
      }
      const total = subtotal + iva;
      db.prepare('UPDATE sales SET subtotal=?, iva_total=?, total=?, total_bs=? WHERE id=?')
        .run(round(subtotal), round(iva), round(total), round(total * settings.exchange_rate), saleId);
    }
  }

  console.log('✔ Datos de demostración cargados (Los Churuguaros).');
}

function round(n) { return Math.round(n * 100) / 100; }

/** Carga datos solo si la base está vacía. */
export function ensureSeed() {
  const n = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (n === 0) seed();
}

// Ejecución directa: node server/seed.js [--reset]
const isMain = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isMain) {
  if (process.argv.includes('--reset')) {
    const tables = ['sale_items', 'sales', 'movements', 'waste', 'batches', 'products', 'suppliers', 'categories', 'audit_log', 'users'];
    for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();
    db.prepare(`DELETE FROM sqlite_sequence`).run();
    console.log('↺ Base de datos reiniciada.');
  }
  const n = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (n === 0) seed();
  else console.log('La base ya contiene datos. Use --reset para reiniciar.');
}
