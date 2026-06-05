# Los Churuguaros - Sistema integral de inventario FEFO

Aplicacion web completa para una charcuteria venezolana con foco en inventario por lotes, fecha de caducidad, control sanitario, trazabilidad y contingencia electrica. El sistema fue modelado especificamente para **Los Churuguaros** y usa **FEFO (First Expired, First Out)** como regla central de salida.

## Modulos incluidos

1. **Dashboard ejecutivo** con inventario disponible, valor estimado, riesgo FEFO, lotes bloqueados y salud de zonas frias.
2. **Centro de captura operativa** para registrar lotes, temperaturas, tareas de limpieza y contingencias electricas.
3. **Inventario por lotes** con filtro por producto, estado comercial y observaciones sanitarias.
4. **Simulador de despacho FEFO** que sugiere de que lote debe salir cada cantidad solicitada.
5. **Centro de alertas de caducidad** con semaforo operativo y lotes en hold.
6. **Cumplimiento sanitario y documental** con reglas sobre rotulado, soporte sanitario, apertura, cadena de frio y BPM.
7. **Contingencia electrica y cadena de frio** como novedad diferencial: estima cuarentenas preventivas para lotes expuestos a cortes de energia o desviaciones termicas.
8. **Trazabilidad y retiros** por lote, proveedor, factura, batch y observaciones.
9. **Reportes CSV** para inventario y alertas, con posibilidad de restaurar el demo base.

## Novedad diferencial

El sistema incorpora un **Radar anti-merma y contingencia** que mezcla:

- dias restantes para caducidad,
- demanda diaria estimada,
- cantidad disponible,
- aperturas de producto,
- y eventos de corte electrico o sobretemperatura.

Esto genera acciones practicas que muchos sistemas simples no traen: promociones inmediatas, traslado interno, cuarentena preventiva o hold sanitario.

## Base regulatoria considerada para Venezuela

La aplicacion incluye una capa de cumplimiento inspirada en estas referencias regulatorias:

- **Reglamento General de Alimentos** (Gaceta Oficial N. 25.864). Se toma especialmente como referencia la exigencia de rotulado en castellano, indicacion de fecha de expiracion para productos de duracion limitada y condiciones de conservacion.
- **Norma COVENIN 2952:2001** (rotulado general de alimentos envasados), incluyendo el concepto de fecha de vencimiento/expiracion/caducidad y su declaracion legible.
- **Normas de Buenas Practicas de Fabricacion, Almacenamiento y Transporte de Alimentos** (Gaceta Oficial N. 36.081), utilizadas como base operativa para limpieza, almacenamiento y control de cadena de frio.
- Referencia institucional al sistema de calidad y normalizacion coordinado por **SENCAMER** y a la necesidad de permisos y validaciones sanitarias del establecimiento ante la autoridad competente.

> Importante: esta solucion entrega criterios operativos y preventivos. Para produccion real, Los Churuguaros debe ajustar parametros de temperatura, vida util tras apertura, fichas tecnicas y permisos segun su responsable sanitario, fabricante y autoridades aplicables.

## Como usarlo

### Opcion 1: abrir en navegador con servidor local

```bash
npm run start
```

Luego abre `http://localhost:4173`.

### Opcion 2: ejecutar pruebas de la logica de negocio

```bash
npm test
```

## Estructura

```text
.
├── index.html
├── styles/main.css
├── src/
│   ├── app.js
│   ├── data/seed.js
│   ├── domain/
│   │   ├── analytics.js
│   │   ├── compliance.js
│   │   └── fefo.js
│   ├── lib/
│   │   ├── date.js
│   │   └── format.js
│   ├── state/store.js
│   └── ui/templates.js
└── tests/fefo.test.js
```

## Flujo funcional clave

- Cada lote se registra con producto, proveedor, zona fria, fecha de recepcion, fecha de caducidad y controles documentales.
- El motor FEFO solo permite despachar lotes comerciales y sanitariamente habilitados.
- Si hay cortes electricos por encima de la tolerancia o temperaturas fuera de rango, el lote queda sugerido para **cuarentena preventiva**.
- Los lotes con rotulado incompleto o soporte sanitario pendiente quedan en **hold comercial**.
- Los reportes CSV sirven como respaldo de cierre de turno.

## Ideas de siguiente etapa si quieres escalarlo

- autenticacion multiusuario por rol,
- persistencia real con base de datos,
- impresion de etiquetas internas,
- integracion con balanza o punto de venta,
- panel multi-sucursal,
- aprobaciones formales del responsable sanitario.
