# 🥩 Charcutería Los Churuguaros — Sistema de Inventario y Caducidad (FEFO)

Sistema **completo e integral** de gestión de inventario y control de fechas de
caducidad para la charcutería **Los Churuguaros**, diseñado conforme a la
**normativa venezolana** y construido sobre el método **FEFO**
(*First Expired, First Out* — primero en caducar, primero en salir).

> **Stack:** Node.js + Express + SQLite (`better-sqlite3`) en el backend y una
> SPA moderna (HTML/CSS/JavaScript ESM, sin paso de compilación) en el frontend.

---

## ✨ La novedad: Motor de Descuentos Dinámicos Anti‑Merma 🆕

Lo que **diferencia** este sistema de los inventarios tradicionales es un motor
predictivo que actúa **antes** de que el producto se pierda:

1. **Predicción de merma.** Para cada lote calcula la *velocidad de rotación*
   del producto (ventas/día de los últimos 30 días) y, teniendo en cuenta el
   stock que va por delante en la cola FEFO, **estima cuánto NO se venderá**
   antes de caducar.
2. **Descuento dinámico sugerido.** En función de la proximidad de la caducidad
   y del riesgo de merma, propone un **% de descuento** que crece a medida que
   se acerca el vencimiento, con un **tope de seguridad que nunca baja del
   costo** del producto.
3. **Recuperación de capital.** Desde el Punto de Venta el cajero aplica el
   descuento con un clic (botón ♻️), convirtiendo producto "a punto de perderse"
   en ventas. El sistema mide cuánto dinero se **recupera** que de otro modo
   sería pérdida.

Esto se traduce en un indicador real de negocio: **dinero recuperado vs. merma**
y una **tasa de merma** que mide la salud del FEFO.

---

## 🧩 Módulos (100% funcionales)

| Módulo | Descripción |
| --- | --- |
| 📊 **Panel de Control** | KPIs, semáforo de caducidad, tendencia de ventas, valor de inventario por categoría, recuperación anti‑merma. |
| 🧾 **Punto de Venta (FEFO)** | TPV que descuenta automáticamente los lotes por orden de caducidad, IVA, IGTF, doble moneda Bs/USD, descuento anti‑merma y comprobante con trazabilidad. |
| 🚦 **Alertas de Caducidad** | Semáforo (óptimo/aviso/advertencia/crítico/vencido), predicción de merma, descuentos sugeridos y stock bajo mínimo. |
| 📦 **Inventario y Lotes** | Recepción de mercancía, gestión de lotes, cuarentena, ajustes de conteo y mermas por lote. |
| 🗑️ **Mermas** | Registro de bajas por vencimiento, daño o contaminación + barrido automático de vencidos. |
| 🥩 **Productos** | Catálogo con SKU, código de barras, norma COVENIN, registro sanitario, temperaturas y stock mín/máx. |
| 🏷️ **Categorías** | Agrupación con requisitos de cadena de frío y vida útil. |
| 🚚 **Proveedores** | Registro con RIF y permiso sanitario (INSAI). |
| 📈 **Reportes** | Valoración de inventario, eficiencia anti‑merma, análisis de mermas, ventas y **Kardex** por producto. |
| 🔎 **Trazabilidad** | Consulta pública por código/QR del origen, lote y caducidad de cada producto. |
| 👥 **Usuarios** | Control de acceso por roles (administrador, almacén, ventas). |
| ⚙️ **Configuración** | Datos de empresa, impuestos, tasa BCV, umbrales del semáforo y bitácora de auditoría. |

---

## 🇻🇪 Cumplimiento de normativa venezolana

- **IVA 16 %** e **IGTF 3 %** (impuesto a transacciones en divisas) configurables.
- **Doble moneda**: precios en USD con equivalente automático en **Bs** según
  **tasa BCV**.
- **RIF** de la empresa, clientes y proveedores.
- **Normas COVENIN** de etiquetado por producto (p. ej. *COVENIN 1088* embutidos,
  *COVENIN 3822* quesos).
- **Registro sanitario** del producto y **permiso INSAI** del proveedor.
- **Cadena de frío**: rangos de temperatura por categoría y producto.
- **FEFO** como método obligatorio de rotación para productos perecederos.

---

## 🚀 Puesta en marcha

```bash
npm install        # instala dependencias
npm start          # inicia el servidor en http://localhost:3000
```

La primera ejecución crea la base de datos SQLite en `data/churuguaros.db` y
carga **datos de demostración** realistas (productos de charcutería, lotes con
distintas fechas de caducidad, proveedores y ventas históricas).

### Comandos útiles

```bash
npm run dev        # modo desarrollo (recarga con --watch)
npm run seed       # carga datos demo si la base está vacía
npm run reset      # reinicia la base y vuelve a cargar los datos demo
```

### Usuarios de demostración

| Usuario | Clave | Rol |
| --- | --- | --- |
| `admin` | `admin123` | Administrador (acceso total) |
| `almacen` | `almacen123` | Almacén (inventario, recepción, mermas) |
| `caja` | `caja123` | Ventas (punto de venta) |

---

## 🏗️ Arquitectura

```
server/
  index.js            # App Express + servidor estático
  db.js               # Esquema SQLite + conexión
  fefo.js             # Motor FEFO + predicción de merma + descuentos dinámicos
  auth.js             # Autenticación JWT + roles + auditoría
  seed.js             # Datos de demostración
  routes/             # API REST por módulo
public/
  index.html
  css/styles.css
  js/app.js           # Router + layout (SPA)
  js/core.js          # Cliente API, helpers, modales, toasts
  js/views/*.js       # Vistas por módulo
```

### Cómo funciona el FEFO

Al vender, `allocateFEFO()` reparte la cantidad solicitada entre los lotes
activos **ordenados por fecha de caducidad ascendente**, descontando primero el
que vence antes. Cada salida genera un movimiento en el *Kardex* y deja el lote
en `agotado` cuando llega a cero. Un barrido marca como `vencido` los lotes con
fecha pasada y genera su merma automáticamente (cumplimiento sanitario).

---

## 🔐 Seguridad

- Contraseñas con hash **bcrypt**.
- Sesión con **JWT** en cookie `httpOnly`.
- Autorización por **roles** en cada endpoint sensible.
- **Bitácora de auditoría** de acciones relevantes.

---

Hecho con cariño para la **Charcutería Los Churuguaros** · Venezuela 🇻🇪
