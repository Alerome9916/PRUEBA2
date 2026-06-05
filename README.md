# Sistema Integral de Charcuteria "Los Churuguaros"

Plataforma operativa de inventario y control de caducidad para charcuteria, con:

- Metodo FEFO (First Expire, First Out) en despacho de lotes.
- Controles de cumplimiento sanitario y trazabilidad para operacion en Venezuela.
- Alertas operativas de vencimiento, cadena de frio y no conformidades.
- Motor de novedad: **IDRS** (Indice Dinamico de Riesgo Sanitario) con acciones anti-merma.

---

## Modulos incluidos

1. **Catalogo de productos**
   - Registro sanitario del producto.
   - Categoria y rango de temperatura objetivo.
   - Vida util nominal.

2. **Proveedores y lotes**
   - Registro de proveedor con RIF y permiso sanitario.
   - Recepcion de lotes con lote, fecha de elaboracion, fecha de caducidad y costo.
   - Estado de lote: activo, cuarentena o dispuesto.

3. **Inventario y movimientos**
   - Entradas, salidas por venta, ajustes, merma y transferencias.
   - Kardex por lote para trazabilidad completa.

4. **Despacho FEFO**
   - Asignacion automatica por fecha de vencimiento mas cercana.
   - Bloqueo de lotes vencidos para venta.
   - Reserva y descuento de stock por lote.

5. **Alertas de caducidad y temperatura**
   - Semaforo por dias a vencimiento.
   - Alertas de cadena de frio por desviaciones termicas.
   - Alertas de incumplimiento normativo.

6. **Cumplimiento normativo Venezuela (parametrizable)**
   - Campos minimos de trazabilidad (lote, registro sanitario, proveedor, RIF).
   - Validaciones de etiquetado operativo y fechas.
   - Restriccion de venta de producto vencido.
   - Referencias regulatorias base documentadas en el sistema.

7. **Novedad: Motor IDRS (anti-merma inteligente)**
   - Puntaje de riesgo sanitario por lote (0-100).
   - Variables: proximidad de vencimiento, desviaciones termicas, rotacion.
   - Recomendaciones automáticas:
     - prioridad de exhibicion FEFO,
     - descuento dinamico,
     - cuarentena preventiva,
     - activacion de plan solidario/donacion (si aplica politicas internas).

8. **Reportes**
   - Dashboard operativo resumido.
   - Reporte de cumplimiento y hallazgos.
   - Escaneo de riesgo por lote.

---

## Estructura tecnica

```text
src/los_churuguaros/
  db.py
  compliance.py
  fefo.py
  risk.py
  system.py
  cli.py
tests/
  test_system.py
```

- Base de datos: SQLite.
- Interfaz: CLI (`churuguaros`).
- Dependencias externas: ninguna (solo libreria estandar).

---

## Instalacion

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

---

## Uso rapido

Inicializar BD:

```bash
churuguaros init-db --db data/churuguaros.db
```

Poblar datos demo:

```bash
churuguaros seed-demo --db data/churuguaros.db
```

Ver dashboard:

```bash
churuguaros dashboard --db data/churuguaros.db
```

Registrar venta FEFO:

```bash
churuguaros sale \
  --db data/churuguaros.db \
  --customer "Mostrador Principal" \
  --lines '[{"product_id":1,"quantity":6,"unit_price":5.2}]'
```

Control diario (caducidad + temperatura + cumplimiento):

```bash
churuguaros run-daily --db data/churuguaros.db
```

Escaneo de riesgo IDRS:

```bash
churuguaros risk-scan --db data/churuguaros.db
```

Reporte de cumplimiento:

```bash
churuguaros compliance-report --db data/churuguaros.db
```

---

## Nota regulatoria

Este sistema incorpora reglas base orientadas a operacion sanitaria y trazabilidad en Venezuela (control de lotes, cadena de frio, registro sanitario, no comercializacion de vencidos).

La normativa puede cambiar o variar por rubro/municipio/ente fiscalizador. Se recomienda validacion legal y tecnica final por el responsable sanitario y asesor regulatorio antes de uso en produccion.
