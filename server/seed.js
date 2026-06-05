'use strict';

const bcrypt = require('bcryptjs');
const { db, init } = require('./db');
const config = require('./config');

function hoyMas(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function genCodigoLote(prefijo) {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${prefijo}-${new Date().getFullYear()}${n}`;
}

/** Inserta los datos de demostración solo si la BD está vacía. */
function ensureSeed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM usuarios').get().c;
  if (count > 0) return false;
  seed();
  return true;
}

function seed() {
  const tx = db.transaction(() => {
    // ---- Usuarios ----
    const insUser = db.prepare(
      `INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)`
    );
    insUser.run('Administrador General', 'admin', bcrypt.hashSync('admin123', 10), 'admin');
    insUser.run('María Supervisora', 'supervisor', bcrypt.hashSync('super123', 10), 'supervisor');
    insUser.run('José Almacén', 'almacen', bcrypt.hashSync('almacen123', 10), 'almacenista');
    insUser.run('Carla Caja', 'cajero', bcrypt.hashSync('cajero123', 10), 'cajero');

    // ---- Configuración ----
    const insCfg = db.prepare(`INSERT OR REPLACE INTO config (clave, valor) VALUES (?, ?)`);
    insCfg.run('tasa_bcv', String(config.FISCAL.tasaBCVPorDefecto));

    // ---- Categorías ----
    const insCat = db.prepare(
      `INSERT INTO categorias (nombre, descripcion, conservacion) VALUES (?, ?, ?)`
    );
    const cats = {
      jamones: insCat.run('Jamones', 'Jamón cocido, ahumado, serrano', 'refrigeracion').lastInsertRowid,
      quesos: insCat.run('Quesos', 'Quesos blancos, amarillos y madurados', 'refrigeracion').lastInsertRowid,
      embutidos: insCat.run('Embutidos', 'Salchichas, chorizos, mortadela', 'refrigeracion').lastInsertRowid,
      salchichoneria: insCat.run('Salchichonería', 'Salami, peperoni, salchichón', 'refrigeracion').lastInsertRowid,
      congelados: insCat.run('Congelados', 'Productos cárnicos congelados', 'congelacion').lastInsertRowid,
      enlatados: insCat.run('Enlatados y secos', 'Conservas y abarrotes', 'ambiente').lastInsertRowid,
    };

    // ---- Proveedores ----
    const insProv = db.prepare(
      `INSERT INTO proveedores (nombre, rif, contacto, telefono, email, direccion, registro_sanitario)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const provs = {
      plumrose: insProv.run('Plumrose Venezuela', 'J-00012345-6', 'Luis Pérez', '+58 212-555-1010', 'ventas@plumrose.com.ve', 'Cagua, Aragua', 'INSAI-001').lastInsertRowid,
      delicarnes: insProv.run('Delicarnes Lara', 'J-30987654-3', 'Ana Rojas', '+58 251-555-2020', 'pedidos@delicarnes.ve', 'Barquisimeto, Lara', 'INSAI-114').lastInsertRowid,
      lacteoslara: insProv.run('Lácteos del Tocuyo', 'J-31223344-1', 'Pedro Mújica', '+58 253-555-3030', 'ventas@lacteostocuyo.ve', 'El Tocuyo, Lara', 'INSAI-220').lastInsertRowid,
      alimentospolar: insProv.run('Alimentos Polar', 'J-00006789-0', 'Distribución Centro', '+58 212-555-4040', 'b2b@polar.com', 'Caracas', 'INSAI-005').lastInsertRowid,
    };

    // ---- Productos ----
    const insProd = db.prepare(
      `INSERT INTO productos (codigo, nombre, descripcion, categoria_id, unidad, precio_venta, costo_promedio, stock_minimo, vida_util_dias, perecedero)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const productos = [
      ['7591001000017', 'Jamón Planchado Premium', 'Jamón cocido planchado', cats.jamones, 'kg', 120, 78, 5, 25, 1, provs.plumrose],
      ['7591001000024', 'Jamón Ahumado', 'Jamón ahumado en pieza', cats.jamones, 'kg', 145, 95, 4, 30, 1, provs.plumrose],
      ['7591002000018', 'Queso Blanco Llanero', 'Queso blanco semiduro', cats.quesos, 'kg', 95, 60, 6, 20, 1, provs.lacteoslara],
      ['7591002000025', 'Queso Amarillo Tajado', 'Queso amarillo para sándwich', cats.quesos, 'kg', 110, 72, 5, 30, 1, provs.lacteoslara],
      ['7591002000032', 'Queso Paisa', 'Queso paisa fresco', cats.quesos, 'kg', 88, 55, 4, 15, 1, provs.lacteoslara],
      ['7591003000019', 'Mortadela Especial', 'Mortadela con tocino', cats.embutidos, 'kg', 70, 42, 8, 25, 1, provs.delicarnes],
      ['7591003000026', 'Salchicha Tipo Viena', 'Salchicha para perros calientes', cats.embutidos, 'kg', 65, 40, 10, 20, 1, provs.plumrose],
      ['7591003000033', 'Chorizo Ahumado', 'Chorizo ahumado parrillero', cats.embutidos, 'kg', 98, 62, 5, 30, 1, provs.delicarnes],
      ['7591004000010', 'Salami Milano', 'Salami curado importado', cats.salchichoneria, 'kg', 165, 110, 3, 60, 1, provs.delicarnes],
      ['7591004000027', 'Peperoni', 'Peperoni para pizza', cats.salchichoneria, 'kg', 150, 98, 3, 45, 1, provs.delicarnes],
      ['7591005000011', 'Pechuga de Pollo Congelada', 'Pechuga deshuesada', cats.congelados, 'kg', 60, 38, 10, 180, 1, provs.delicarnes],
      ['7591006000012', 'Atún en Lata', 'Atún en aceite 140g', cats.enlatados, 'unidad', 18, 11, 24, 720, 0, provs.alimentospolar],
    ];
    const prodIds = [];
    for (const p of productos) {
      const id = insProd.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9]).lastInsertRowid;
      prodIds.push({ id, prov: p[10], costo: p[6], cat: p[3] });
    }

    // ---- Lotes (con caducidades variadas para demostrar el semáforo FEFO) ----
    const insLote = db.prepare(
      `INSERT INTO lotes (codigo_lote, producto_id, proveedor_id, fecha_produccion, fecha_caducidad, cantidad_inicial, cantidad_actual, costo_unitario, ubicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insMov = db.prepare(
      `INSERT INTO movimientos (lote_id, producto_id, tipo, cantidad, referencia, usuario_id)
       VALUES (?, ?, 'entrada', ?, 'Carga inicial demo', 3)`
    );

    // Distintos escenarios de caducidad por producto
    const escenarios = [
      [-2, 3, 8, 40],   // un lote ya vencido + uno crítico + alerta + óptimo
      [2, 12, 35],
      [5, 18, 25],
      [1, 22],
      [-1, 6, 14],
      [4, 10, 28, 55],
      [3, 9, 30],
      [7, 20, 45],
      [25, 58],
      [11, 40],
      [60, 150],
      [200, 600],
    ];

    prodIds.forEach((p, idx) => {
      const dias = escenarios[idx] || [10, 30];
      const ubic = p.cat === cats.congelados ? 'Cámara de congelación' : p.cat === cats.enlatados ? 'Anaquel seco' : 'Vitrina refrigerada';
      dias.forEach((d) => {
        const cantidad = Math.round((5 + Math.random() * 20) * 10) / 10;
        const lid = insLote.run(
          genCodigoLote('L'),
          p.id,
          p.prov,
          hoyMas(d - 25),
          hoyMas(d),
          cantidad,
          cantidad,
          p.costo,
          ubic
        ).lastInsertRowid;
        insMov.run(lid, p.id, cantidad);
      });
    });

    // ---- Equipos de cadena de frío ----
    const insEq = db.prepare(
      `INSERT INTO equipos_frio (nombre, tipo, ubicacion) VALUES (?, ?, ?)`
    );
    const eq1 = insEq.run('Vitrina Refrigerada 1', 'refrigeracion', 'Área de ventas').lastInsertRowid;
    const eq2 = insEq.run('Cámara de Congelación', 'congelacion', 'Almacén').lastInsertRowid;
    const eq3 = insEq.run('Nevera de Quesos', 'refrigeracion', 'Mostrador').lastInsertRowid;

    const insTemp = db.prepare(
      `INSERT INTO registros_temperatura (equipo_id, usuario_id, temperatura, fuera_rango, nota)
       VALUES (?, ?, ?, ?, ?)`
    );
    insTemp.run(eq1, 3, 4.2, 0, 'Lectura matutina');
    insTemp.run(eq1, 3, 5.1, 0, 'Lectura mediodía');
    insTemp.run(eq2, 3, -20.5, 0, 'Lectura matutina');
    insTemp.run(eq3, 3, 8.5, 1, 'Posible falla — fuera de rango');
  });

  tx();
  console.log('  ✔ Datos de demostración cargados (Los Churuguaros).');
}

// CLI: node server/seed.js [--reset]
if (require.main === module) {
  init();
  if (process.argv.includes('--reset')) {
    const tablas = ['movimientos', 'venta_items', 'ventas', 'entrada_items', 'entradas', 'mermas', 'registros_temperatura', 'equipos_frio', 'lotes', 'productos', 'proveedores', 'categorias', 'usuarios', 'config'];
    for (const t of tablas) db.exec(`DELETE FROM ${t};`);
    console.log('  ✔ Base de datos reiniciada.');
  }
  const did = ensureSeed();
  if (!did && !process.argv.includes('--reset')) console.log('  La base de datos ya tenía datos; no se sembró de nuevo.');
}

module.exports = { ensureSeed, seed };
