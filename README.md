# 🥩 Los Churuguaros — Sistema de Inventario y Caducidad (FEFO)

Sistema integral de gestión para la **Charcutería Los Churuguaros** (Venezuela),
centrado en el **control de inventario** y la **caducidad de productos** mediante
el método **FEFO** (*First Expired, First Out* — el primero en vencer es el
primero en salir), con cumplimiento de normas venezolanas y una funcionalidad
novedosa de **precios dinámicos anti-desperdicio**.

---

## ✨ Novedad — Motor de Precios Dinámicos Anti-Desperdicio

A diferencia de los sistemas tradicionales de charcutería (que solo *alertan*
sobre vencimientos), este sistema **calcula y aplica automáticamente descuentos
escalonados** sobre el lote más próximo a vencer (según FEFO), para liquidar la
mercancía **antes** de que se convierta en merma:

| Vida útil restante | Descuento | Etiqueta            |
| ------------------ | --------- | ------------------- |
| ≤ 3 días           | 50%       | LIQUIDACIÓN −50%    |
| ≤ 7 días           | 35%       | OFERTA FLASH −35%   |
| ≤ 15 días          | 20%       | PRONTO A VENCER −20%|
| ≤ 30 días          | 10%       | PROMOCIÓN −10%      |

El descuento se refleja en el **Punto de Venta**, en las **alertas** y en el
**inventario**, y el sistema contabiliza el *ahorro anti-desperdicio* generado.

---

## 🧩 Módulos

- **Panel de Control** — KPIs, semáforo de caducidad FEFO, ventas e inventario por categoría.
- **Centro de Alertas** — lotes críticos/vencidos, bajo stock y fallas de cadena de frío.
- **Punto de Venta (POS)** — venta con descuento FEFO automático, IVA y conversión a divisa.
- **Recepción / Entradas** — cada compra genera lotes con su caducidad; recalcula el costo promedio.
- **Mermas** — registro de pérdidas (vencimiento, daño, robo, rotura de frío) con costeo.
- **Productos** — catálogo con categorías, unidades, stock mínimo y vida útil.
- **Lotes (FEFO)** — control de existencias por lote ordenado por caducidad.
- **Trazabilidad / QR** — historial completo de cada lote + código QR verificable.
- **Proveedores** — datos fiscales (RIF) y registro sanitario (INSAI).
- **Cadena de Frío** — equipos y registros de temperatura con detección de desviaciones.
- **Normativa Venezuela** — documentación de cumplimiento (COVENIN, IVA, trazabilidad).
- **Reportes** — inventario valorizado, ventas, top productos, mermas y tasa BCV.
- **Usuarios** — gestión con roles (admin, supervisor, almacenista, cajero).

## 🇻🇪 Cumplimiento normativo (Venezuela)

- **FEFO** como método obligatorio de rotación de perecederos.
- **COVENIN 2952** (rotulado: lote, fecha de producción y caducidad).
- **COVENIN 3802** (BPF: cadena de frío con registros de temperatura).
- **Trazabilidad sanitaria** (INSAI / SENCAMER) con QR por lote.
- **IVA 16%** automático en ventas + soporte de **IGTF** y conversión **BCV**.
- Retiro y registro de mermas de productos vencidos.

---

## 🚀 Puesta en marcha

Requisitos: **Node.js 18+**.

```bash
npm install      # instala dependencias
npm start        # inicia el servidor (crea y siembra la BD automáticamente)
```

Luego abre **http://localhost:3000**.

> La primera ejecución crea `data.sqlite` con datos de demostración.
> Para reiniciar los datos: `npm run reset`.

### 👤 Usuarios de prueba

| Usuario      | Contraseña   | Rol           |
| ------------ | ------------ | ------------- |
| `admin`      | `admin123`   | Administrador |
| `supervisor` | `super123`   | Supervisor    |
| `almacen`    | `almacen123` | Almacenista   |
| `cajero`     | `cajero123`  | Cajero        |

---

## 🛠️ Arquitectura

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`), JWT, bcrypt, QRCode.
- **Frontend:** SPA en JavaScript (ES Modules) sin framework, diseño moderno propio.
- **Base de datos:** archivo SQLite local (sin servidor externo).

```
server/
  index.js            # servidor Express y registro de rutas
  config.js           # parámetros del negocio y normativos
  db.js               # esquema SQLite
  seed.js             # datos de demostración
  auth.js             # JWT + control de roles
  services/
    fefo.js           # lógica FEFO y semáforo de caducidad
    preciosDinamicos.js  # motor anti-desperdicio (novedad)
  routes/             # API REST por módulo
public/
  index.html, css/, js/, js/views/   # interfaz SPA
```

## 🔌 API (resumen)

| Método | Ruta                          | Descripción                          |
| ------ | ----------------------------- | ------------------------------------ |
| POST   | `/api/auth/login`             | Autenticación (JWT)                  |
| GET    | `/api/dashboard`              | KPIs y semáforo FEFO                 |
| GET    | `/api/productos`              | Productos con stock y precio dinámico|
| GET    | `/api/lotes`                  | Lotes con estado de caducidad        |
| POST   | `/api/entradas`               | Recepción (crea lotes)               |
| POST   | `/api/ventas/cotizar`         | Cotización FEFO sin persistir        |
| POST   | `/api/ventas`                 | Venta (descuenta por FEFO)           |
| POST   | `/api/mermas`                 | Registro de merma                    |
| GET    | `/api/alertas`                | Centro de alertas                    |
| GET    | `/api/trazabilidad/lote/:id`  | Trazabilidad de un lote              |
| GET    | `/api/trazabilidad/lote/:id/qr` | Código QR del lote                 |
| GET    | `/api/reportes/*`             | Reportes varios                      |

---

Hecho para **Charcutería Los Churuguaros, C.A.** · RIF J-40512378-9
