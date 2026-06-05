# Sistema integral para Charcuteria Los Churuguaros

Aplicacion web para controlar inventario, caducidad, ventas y cumplimiento operativo de una charcuteria venezolana. El sistema esta orientado a productos perecederos y usa el metodo **FEFO (First Expired, First Out)** para priorizar la salida de los lotes que vencen primero.

## Modulos incluidos

- **Tablero ejecutivo:** stock total, valor referencial, alertas FEFO, cumplimiento e incidentes.
- **Inventario por producto:** SKU, categoria, zona de almacenamiento, punto de reposicion y compra sugerida.
- **Lotes y caducidad:** semaforo de vencimiento, ubicacion, proveedor, temperatura de recepcion y bloqueo preventivo.
- **Ventas FEFO:** asignacion automatica de lote por fecha de caducidad y vida util minima.
- **Compras/recepcion:** ingreso de lotes con proveedor, permiso sanitario, costo, cantidad, vencimiento y temperatura.
- **Centro de alertas:** acciones recomendadas para vencidos, criticos, cuarentena o vigilancia.
- **Trazabilidad y retiro:** reporte de origen-destino por lote y pasos de retiro preventivo.
- **Cadena de frio:** bitacora de temperaturas e incidentes fuera de rango.
- **BPM/POES:** tareas de saneamiento de rebanadora, vitrinas y balanza etiquetadora.
- **Cumplimiento venezolano:** matriz referencial para SACS, BPM/POES, cadena de frio, etiquetado, SENIAT y trazabilidad.
- **Etiquetado interno:** etiquetas para productos fraccionados con lote, vencimiento, empaque y QR interno simulado.
- **Radar Churuguaros anti-merma:** novedad del sistema que calcula margen en riesgo y propone combos/descuentos FEFO antes de que se pierda producto.

> La matriz normativa es una guia operativa referencial. Debe validarse con asesoria legal, sanitaria y fiscal vigente en Venezuela antes de usarla como criterio definitivo.

## Requisitos

- Node.js 20 o superior.
- Navegador moderno.

## Ejecutar

```bash
npm start
```

Luego abrir:

```text
http://localhost:4173
```

## Pruebas

```bash
npm test
```

Las pruebas cubren:

- Ordenamiento FEFO por vencimiento y recepcion.
- Asignacion de ventas a lotes que vencen primero.
- Rechazo de ventas sin stock con vida util minima.
- Descuento de inventario y trazabilidad por lote.
- Alertas de caducidad y Radar Churuguaros.
- Incidentes de temperatura y score de cumplimiento.

## Estructura

```text
public/
  index.html      Interfaz SPA con todos los modulos
  app.js          Estado, formularios, renderizado y persistencia local
  styles.css      Estilos responsivos e impresion
src/domain/
  charcuteria-core.js  Logica FEFO, inventario, alertas, cumplimiento y trazabilidad
test/
  charcuteria-core.test.js
server.js         Servidor estatico sin dependencias externas
```

## Datos demo

La aplicacion trae datos semilla de productos, proveedores, lotes, ventas, temperaturas y tareas sanitarias. Desde la interfaz se pueden restaurar con **"Restaurar datos demo"**. Los cambios se guardan en `localStorage` del navegador para simular una operacion diaria sin backend.
