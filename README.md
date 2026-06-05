# Los Churuguaros - Sistema Integral de Charcuteria

Aplicacion web completa para administrar inventario, lotes, caducidad y despacho por metodo **FEFO** (*First Expired, First Out*) en la charcuteria **Los Churuguaros**.

El sistema esta pensado para operar productos perecederos como embutidos, jamones, quesos, lacteos y carnes procesadas, incorporando controles sanitarios, fiscales, de rotulado y de trazabilidad usados en Venezuela.

## Modulos incluidos

- **Panel gerencial**: KPIs de inventario apto, inventario bloqueado, valor al costo, valor de venta y productos con vencimiento cercano.
- **Inventario FEFO**: disponibilidad por producto, punto minimo, lote proximo a vencer y tabla de lotes ordenada para despacho.
- **Productos**: maestro de SKU, categoria, vida util, costo, precio, temperatura de conservacion y registro sanitario/ficha tecnica.
- **Lotes y caducidad**: recepcion de lotes, fecha de elaboracion, fecha de vencimiento, ubicacion, temperatura de recepcion, cuarentena y liberacion.
- **Compras**: recepciones asociadas a proveedor, factura, checklist sanitario/fiscal y trazabilidad.
- **Ventas**: despacho con asignacion automatica FEFO; descuenta inventario y conserva el lote usado.
- **Proveedores**: RIF, permiso sanitario, contacto, tiempo de entrega y score documental.
- **Mermas/decomisos**: registro controlado por lote, responsable, motivo y disposicion.
- **Cadena de frio**: bitacora de temperatura/humedad por equipo, deteccion de desviaciones y alertas.
- **Normativa VE**: matriz de control sanitario, fiscal y de rotulado aplicable a la operacion.
- **Reportes**: inventario CSV, respaldo JSON, valoracion, hallazgos documentales y kilos vencidos.
- **Auditoria**: bitacora local de altas, ventas, cuarentenas, mermas y cambios normativos.

## Novedad diferencial

El sistema incluye el **Radar FEFO Inteligente Los Churuguaros**, una capa de priorizacion que combina:

- dias para vencimiento;
- estado sanitario del lote;
- kilos y valor economico en riesgo;
- punto minimo del producto;
- ruta fisica sugerida de despacho;
- texto listo para copiar como instruccion de voz al operador.

Esto permite que el vendedor reciba instrucciones practicas como: lote, producto, fecha de vencimiento y ruta de picking antes de abrir inventario nuevo.

## Reglas FEFO implementadas

1. Solo se consideran vendibles los lotes con existencia positiva.
2. Lotes vencidos, en cuarentena, agotados o bajo retiro sanitario quedan excluidos del despacho.
3. Los lotes aptos se ordenan por:
   - fecha de vencimiento mas cercana;
   - fecha de recepcion mas antigua;
   - codigo de lote.
4. Si un lote no cubre la cantidad vendida, el sistema completa con el siguiente lote FEFO.
5. Si no existe inventario apto suficiente, la venta se bloquea y muestra faltante.

## Controles venezolanos considerados

La matriz del sistema modela controles operativos que suelen exigirse o auditarse en Venezuela para expendios de alimentos:

- permiso sanitario del establecimiento;
- registro sanitario o ficha tecnica cuando aplique;
- carnet/constancia de manipulacion de alimentos;
- limpieza, desinfeccion y control de plagas;
- cadena de frio documentada;
- lote, fecha de recepcion/elaboracion y vencimiento visibles;
- condiciones de conservacion;
- proveedor, RIF, permiso sanitario y documento fiscal;
- separacion de vencidos, cuarentena y decomisos;
- precios y unidad de medida visibles;
- bitacora de ajustes, mermas y anulaciones.

> Nota: la aplicacion ayuda a ejecutar controles internos y trazabilidad. La validacion legal final debe mantenerse con asesoria sanitaria y fiscal vigente segun la autoridad competente y la normativa aplicable al establecimiento.

## Ejecucion

No requiere instalar dependencias.

```bash
npm start
```

Luego abrir:

```text
http://localhost:4173
```

Tambien puede abrirse con cualquier servidor estatico, porque la aplicacion esta hecha con HTML, CSS y JavaScript nativo.

## Pruebas

```bash
npm test
```

Las pruebas cubren:

- asignacion FEFO;
- exclusion de lotes vencidos o en cuarentena;
- descuento de stock por venta;
- alertas de caducidad, cadena de frio y cumplimiento;
- resumen de inventario;
- validacion documental de lotes;
- priorizacion del Radar FEFO Inteligente.

## Persistencia

Los datos se guardan en `localStorage` del navegador:

- no requiere backend;
- permite operar en una caja o laptop local;
- incluye exportacion CSV y respaldo JSON;
- el boton **Reiniciar demo** restaura los datos iniciales.

## Estructura

```text
index.html          Entrada de la aplicacion
styles.css          Estilos del sistema
src/app.js          Interfaz, formularios y persistencia
src/domain.js       Reglas de negocio FEFO, inventario y cumplimiento
test/domain.test.js Pruebas automatizadas
```
