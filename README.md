# Sistema Integral FEFO - Charcuteria Los Churuguaros

Sistema web completo, modular y sin dependencias para la gestion de inventario por lotes,
caducidad bajo metodologia **FEFO (First Expired, First Out)**, cadena de frio, trazabilidad y
cumplimiento sanitario en una charcuteria venezolana.

## Modulos incluidos

1. **Tablero gerencial**
   - KPI de valor de inventario, alertas, lotes por vencer y riesgo de cadena de frio.
   - Cola operativa FEFO y tareas accionables.

2. **Inventario por lotes**
   - Registro de recepcion de lotes.
   - Stock consolidado por producto.
   - Control de lote, proveedor, fecha de recepcion, fecha de caducidad y temperatura.

3. **Motor FEFO**
   - Priorizacion por vencimiento.
   - Ajuste por riesgo sanitario, desviacion termica, rotulado incompleto y rotacion esperada.
   - Activacion de tareas de rescate comercial o cuarentena.

4. **Cadena de frio**
   - Monitoreo por area (vitrina, cava, congelador, camion).
   - Registro de lecturas de temperatura y humedad.
   - Actualizacion inmediata del riesgo de los lotes afectados.

5. **Cumplimiento sanitario**
   - Radar documental y regulatorio.
   - Seguimiento de permisos, certificados y planes internos.
   - Reglas base alineadas con el contexto venezolano.

6. **Proveedores y recepcion**
   - Perfil de proveedores y nivel de riesgo.
   - Checklist operativo para recepcion higienico-sanitaria.

7. **Trazabilidad**
   - Bitacora por lote.
   - Registro manual de recepcion, movimiento, inspeccion, despacho o cuarentena.

## Novedad diferencial

El sistema incorpora un **simulador de contingencia electrica** que recalcula el impacto sobre los
lotes de un area afectada, proyecta temperatura, determina riesgo sanitario y genera acciones FEFO.
Esta funcionalidad esta pensada para contextos operativos reales donde la continuidad electrica
puede comprometer la cadena de frio.

## Marco normativo de referencia

La aplicacion toma como base operativa:

- **Reglamento General de Alimentos de Venezuela**
- **Normas de Buenas Practicas de Fabricacion, Almacenamiento y Transporte de Alimentos para Consumo Humano** (Gaceta Oficial N. 36.081)

### Importante

Este sistema incluye criterios y controles base para charcuteria, pero los limites finales de
temperatura, documentacion, rotulado y vida util deben validarse con:

- ficha tecnica de cada fabricante,
- autoridad sanitaria competente,
- condiciones reales de almacenamiento del establecimiento,
- procedimientos internos auditables de Los Churuguaros.

## Ejecucion local

### Iniciar servidor

```bash
npm start
```

Luego abrir:

```text
http://localhost:4173
```

### Ejecutar pruebas

```bash
npm test
```

## Estructura principal

- `index.html`: shell de la aplicacion
- `styles.css`: estilos del dashboard
- `data.js`: datos semilla y reglas operativas
- `logic.js`: motor FEFO, cumplimiento, alertas y simulador
- `app.js`: interfaz, formularios, persistencia local y trazabilidad
- `inventory.test.mjs`: pruebas de logica
