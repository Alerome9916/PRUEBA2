# 🥓 Los Churuguaros — Sistema de Inventario y Caducidad FEFO

Sistema **completo** de gestión para una **charcutería en Venezuela**, con:
- Inventario por **lotes** y control de **caducidad (FEFO)**
- Cumplimiento **SENIAT** (IVA 16%, IGTF 3%, factura serializada, doble moneda Bs/USD tasa BCV)
- Cumplimiento **INSAI / COVENIN 2952** (cadena de frío, trazabilidad sanitaria)
- POS para venta, gestión de clientes y proveedores, mermas, reportes
- **NOVEDAD**: Motor *FEFO Inteligente* con predicción, descuento dinámico,
  combos anti-desperdicio, score de frescura, QR de trazabilidad y CRM
  de notificaciones a clientes (algo que los sistemas comerciales típicos no incluyen).

---

## 🧠 ¿Qué es FEFO y por qué es la base?
**FEFO (First Expired, First Out)** = "lo que vence primero, sale primero".
Es la regla obligatoria para perecederos según la norma sanitaria venezolana
(COVENIN 2952 y guías INSAI). El sistema lo aplica automáticamente:
en cada venta, el algoritmo asigna las cantidades a los lotes con **menor**
fecha de vencimiento, evitando que mercancía caduque en estantería.

---

## ✨ La novedad (lo que NO traen los sistemas comunes)

El módulo **FEFO Inteligente** (`/novedad`) incluye:

1. **🔮 Motor Predictivo FEFO** — Cruza la velocidad real de ventas (últimos 30 días)
   con el stock y la fecha de vencimiento para anticipar **cuánta mercancía va a
   vencer sin venderse** y clasifica el riesgo (alto/medio/bajo).
2. **💸 Descuento Dinámico** — A medida que un lote se acerca al vencimiento,
   el precio cae automáticamente (escala lineal con tope configurable, p. ej. 50%).
3. **🍽️ Recomendador de Combos Anti-desperdicio** — Agrupa productos próximos a
   vencer en "tablitas" para venderlos como combo (queso + jamón + aceitunas).
4. **🟢🟡🔴⚫ Score de Frescura** — Indicador 0-100 de la salud del inventario completo,
   gamificación para el equipo.
5. **📲 CRM de Notificaciones FEFO** — Envía a clientes suscritos avisos por
   WhatsApp/SMS/Email/sistema con las promociones FEFO del día.
6. **📦 QR de Trazabilidad por Lote** — Cada lote ingresado genera un QR con
   producto, proveedor (RIF), elaboración, vencimiento, registro sanitario y
   cadena de frío exigida.
7. **🌡️ Bitácora de Cadena de Frío** — Registro periódico de temperaturas por área
   (COVENIN), con alertas si están fuera de rango.

---

## 📦 Módulos del sistema

| Módulo | Descripción |
|---|---|
| **Tablero** | KPIs, lotes en riesgo, ventas del día/mes, score de frescura |
| **Punto de Venta (POS)** | Carrito con asignación FEFO automática y precio dinámico |
| **Ventas / Facturación** | Factura SENIAT con IVA, IGTF, doble moneda, anulación |
| **Inventario FEFO** | Listado por semáforo de vencimiento, ingreso de lotes con QR |
| **Productos** | Catálogo con IVA, vida útil, refrigeración, cadena de frío |
| **Proveedores** | RIF, registro sanitario INSAI |
| **Clientes** | Cédula/RIF, puntos de fidelidad, opt-in notificaciones |
| **Mermas** | Bajas por vencimiento, daño, rotura de frío + baja automática |
| **Cadena de frío** | Bitácora sanitaria (COVENIN) |
| **Alertas** | Centro único: vencimientos, stock bajo, temperaturas |
| **Reportes** | Ventas, vencimientos, mermas, inventario valorizado, sanitario |
| **FEFO Inteligente** | Toda la novedad descrita arriba |
| **Usuarios y roles** | Admin, almacén, cajero, sanitario |
| **Configuración** | Tasa BCV, parámetros FEFO, descuento dinámico |

---

## 🚀 Instalación y arranque

```bash
# 1. Crear y activar entorno virtual
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Inicializar la base de datos con datos demo
python seed.py

# 4. Arrancar el servidor
python run.py
# → http://localhost:5000
```

### Usuarios demo

| Usuario   | Contraseña      | Rol        |
|-----------|-----------------|------------|
| admin     | admin123        | Administrador |
| cajero    | cajero123       | Cajero (POS) |
| almacen   | almacen123      | Almacén (ingresos, lotes) |
| sanitario | sanitario123    | Sanitarista (cadena de frío) |

---

## 🇻🇪 Normativa venezolana implementada

- **IVA Ley de IVA** — alícuota general 16%, configurable por producto (también 0%, 8%).
- **IGTF Ley** — 3% sobre el total cuando el pago se hace en divisas.
- **Providencia SENIAT 00071** — numeración correlativa serie A-NNNNNNNN, factura impresa con todos los datos exigidos (RIF, dirección, base imponible, IVA desglosado).
- **Doble moneda** — todos los montos en Bs. con referencia USD a tasa BCV (editable).
- **Norma COVENIN 2952** — FEFO obligatorio para perecederos.
- **INSAI** — registro sanitario en productos y proveedores; trazabilidad por lote.
- **Cadena de frío** — bitácora con temperatura por área, alertas por desviación.

---

## 🧩 Stack técnico

- **Backend**: Python + Flask + SQLAlchemy
- **DB**: SQLite (cambiar `DATABASE_URL` para Postgres/MySQL)
- **Frontend**: Jinja2 + CSS3 (sin framework pesado), JS vanilla en el POS
- **QR**: librería `qrcode` con PIL
- **Seguridad**: Flask-Login, password hashing con Werkzeug, RBAC por rol

---

## 📁 Estructura

```
app/
├── __init__.py            # Fábrica de la app, filtros Jinja, context processors
├── extensions.py          # db, login_manager
├── models.py              # Usuario, Producto, Lote, Venta, Merma, etc.
├── fefo.py                # Motor FEFO + Predictivo + Combos + Notificación + Score
├── utils.py               # Cálculo IVA/IGTF, factura SENIAT, QR, RIF, RBAC
├── seed.py                # Datos demo (productos típicos venezolanos)
├── blueprints/            # auth, dashboard, productos, inventario, ventas, ...
├── templates/             # HTML Jinja
└── static/                # CSS, JS y QR generados
```

---

## 📷 Capturas conceptuales

- **Dashboard** con score, KPIs y lotes críticos
- **POS** con búsqueda en vivo y asignación FEFO automática mostrando el lote afectado y su semáforo
- **Factura SENIAT** imprimible con desglose IVA/IGTF en Bs y referencia USD
- **Panel FEFO Inteligente** con proyección predictiva y descuentos dinámicos

---

## 📝 Licencia

Sistema desarrollado para **Charcutería Los Churuguaros, C.A.**, Churuguara - Estado Falcón, Venezuela.
