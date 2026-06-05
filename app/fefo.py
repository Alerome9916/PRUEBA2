"""
Motor FEFO (First Expired, First Out) y Núcleo Predictivo.

Este es el corazón del sistema:

1. asignar_fefo(producto, cantidad)
   Distribuye la cantidad solicitada entre los lotes vigentes ordenados
   por fecha_vencimiento ASC. Es la regla obligatoria para charcutería
   (perecederos), conforme normativa COVENIN 2952 y guías INSAI.

2. proyectar_riesgo(producto, dias=30)
   NOVEDAD: predice qué cantidad del lote más próximo se va a vencer
   tomando la velocidad de consumo real (ventas/día). Devuelve riesgo
   y la cantidad sugerida a "rematar" (poner en oferta dinámica).

3. recomendar_combos(top=3)
   NOVEDAD: arma combos con productos en estado rojo/amarillo para
   moverlos antes del vencimiento (ej: tabla de quesos).

4. notificar_clientes_promo(lotes)
   NOVEDAD: genera notificaciones a clientes suscritos para mover
   productos a punto de vencer.
"""
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal
from datetime import date
from typing import List, Tuple

from .extensions import db
from .models import (
    Producto, Lote, Cliente, Notificacion, Combo, Merma
)


# =====================================================================
# 1. FEFO básico
# =====================================================================
@dataclass
class AsignacionFEFO:
    lote: Lote
    cantidad: Decimal
    precio_unit: Decimal     # precio con descuento dinámico aplicado

    def as_dict(self):
        return {
            "lote_id": self.lote.id,
            "lote_codigo": self.lote.codigo,
            "fecha_vencimiento": self.lote.fecha_vencimiento.isoformat(),
            "cantidad": float(self.cantidad),
            "precio_unit": float(self.precio_unit),
            "semaforo": self.lote.estado_semaforo(),
        }


def lotes_vigentes(producto: Producto):
    """Lotes activos con stock > 0, ordenados por fecha_vencimiento ASC (FEFO)."""
    return (
        producto.lotes
        .filter(Lote.activo.is_(True), Lote.cantidad_actual > 0)
        .order_by(Lote.fecha_vencimiento.asc())
        .all()
    )


def asignar_fefo(producto: Producto, cantidad_solicitada) -> Tuple[List[AsignacionFEFO], Decimal]:
    """
    Distribuye `cantidad_solicitada` entre lotes FEFO.
    Retorna (asignaciones, cantidad_no_cubierta).
    NO descuenta el stock; eso se hace al confirmar la venta.
    """
    pendiente = Decimal(str(cantidad_solicitada))
    asignaciones: List[AsignacionFEFO] = []
    for lote in lotes_vigentes(producto):
        if pendiente <= 0:
            break
        if lote.fecha_vencimiento < date.today():
            continue   # nunca vender vencido
        usable = min(lote.cantidad_actual, pendiente)
        asignaciones.append(
            AsignacionFEFO(
                lote=lote,
                cantidad=usable,
                precio_unit=lote.precio_dinamico(),
            )
        )
        pendiente -= usable
    return asignaciones, pendiente


def descontar_stock(asignaciones: List[AsignacionFEFO]):
    """Aplica el descuento de stock de los lotes; se usa al confirmar la venta."""
    for a in asignaciones:
        a.lote.cantidad_actual = Decimal(a.lote.cantidad_actual) - Decimal(a.cantidad)
        if a.lote.cantidad_actual < 0:
            a.lote.cantidad_actual = Decimal("0")
    db.session.flush()


# =====================================================================
# 2. NOVEDAD: Proyección predictiva FEFO
# =====================================================================
@dataclass
class RiesgoLote:
    lote: Lote
    cantidad_proyectada_vencer: Decimal
    velocidad_diaria: float
    riesgo: str   # "alto", "medio", "bajo"

    def as_dict(self):
        return {
            "lote_id": self.lote.id,
            "producto": self.lote.producto.nombre,
            "fecha_vencimiento": self.lote.fecha_vencimiento.isoformat(),
            "stock_actual": float(self.lote.cantidad_actual),
            "cantidad_proyectada_vencer": float(self.cantidad_proyectada_vencer),
            "velocidad_diaria": round(self.velocidad_diaria, 3),
            "riesgo": self.riesgo,
        }


def proyectar_riesgo(producto: Producto) -> List[RiesgoLote]:
    """
    Por cada lote vigente, calcula cuánta cantidad se va a vencer SIN VENDER
    asumiendo la velocidad histórica de consumo (últimos 30 días).
    """
    v = producto.velocidad_consumo_diaria(30)
    resultados = []
    consumo_disponible = Decimal(str(v)) * Decimal("999999")  # capacidad teórica
    for lote in lotes_vigentes(producto):
        dias_restantes = max(lote.dias_para_vencer(), 0)
        capacidad_consumo = Decimal(str(v)) * Decimal(dias_restantes)
        consumira = min(lote.cantidad_actual, capacidad_consumo)
        vencera = Decimal(lote.cantidad_actual) - consumira
        if vencera < 0:
            vencera = Decimal("0")

        # Clasificación de riesgo
        ratio = float(vencera) / float(lote.cantidad_actual or 1)
        if ratio >= 0.5:
            riesgo = "alto"
        elif ratio >= 0.2:
            riesgo = "medio"
        else:
            riesgo = "bajo"
        resultados.append(RiesgoLote(lote, vencera, v, riesgo))
    return resultados


# =====================================================================
# 3. NOVEDAD: Recomendador de Combos
# =====================================================================
def sugerir_combos(top_n: int = 3) -> List[dict]:
    """
    Arma combos con los productos con lotes en semáforo rojo/amarillo
    para acelerar su venta. Ejemplo: combina queso + jamón + aceitunas
    si los tres están próximos a vencer.
    """
    proximos = (
        Lote.query
        .filter(Lote.activo.is_(True), Lote.cantidad_actual > 0)
        .all()
    )
    proximos = [l for l in proximos if l.estado_semaforo() in ("rojo", "amarillo")]
    proximos.sort(key=lambda l: l.dias_para_vencer())

    if not proximos:
        return []

    combos = []
    # Agrupamos de 3 en 3 para hacer "tablitas" combinadas
    for i in range(0, min(len(proximos), top_n * 3), 3):
        grupo = proximos[i:i + 3]
        if not grupo:
            break
        nombre = "Combo Anti-Desperdicio #{}".format(len(combos) + 1)
        productos = ", ".join({l.producto.nombre for l in grupo})
        precio_base = sum(Decimal(l.precio_dinamico()) for l in grupo)
        precio_combo = (precio_base * Decimal("0.85")).quantize(Decimal("0.01"))
        combos.append({
            "nombre": nombre,
            "descripcion": "Aproveche productos próximos a vencer con 15% adicional",
            "productos": productos,
            "lote_ids": [l.id for l in grupo],
            "precio_combo": float(precio_combo),
            "ahorro": float((precio_base - precio_combo).quantize(Decimal("0.01"))),
        })
        if len(combos) >= top_n:
            break
    return combos


# =====================================================================
# 4. NOVEDAD: Notificación a clientes
# =====================================================================
def notificar_clientes_promo(mensaje: str, canal: str = "whatsapp") -> int:
    """
    Crea registros de notificación para todos los clientes que aceptaron
    notificaciones. En producción enviaría WhatsApp/SMS reales; aquí queda
    el registro auditable (cumple LOPCYMAT en gestión de datos).
    """
    clientes = Cliente.query.filter_by(acepta_notificaciones=True).all()
    count = 0
    for c in clientes:
        db.session.add(Notificacion(cliente=c, canal=canal, mensaje=mensaje))
        count += 1
    db.session.commit()
    return count


# =====================================================================
# 5. NOVEDAD: Score de Frescura del Inventario
# =====================================================================
def score_frescura_global() -> dict:
    """
    Score de 0-100 del inventario completo según proporción de lotes
    en cada semáforo. Es la "salud" del inventario.
    """
    lotes = Lote.query.filter(Lote.activo.is_(True), Lote.cantidad_actual > 0).all()
    if not lotes:
        return {"score": 100, "total": 0, "rojo": 0, "amarillo": 0, "verde": 0, "ok": 0, "vencido": 0}
    pesos = {"ok": 1.0, "verde": 0.85, "amarillo": 0.5, "rojo": 0.15, "vencido": 0.0}
    distrib = {"rojo": 0, "amarillo": 0, "verde": 0, "ok": 0, "vencido": 0}
    suma = 0.0
    for l in lotes:
        e = l.estado_semaforo()
        distrib[e] = distrib.get(e, 0) + 1
        suma += pesos.get(e, 0.5)
    score = round(suma / len(lotes) * 100, 1)
    distrib["score"] = score
    distrib["total"] = len(lotes)
    return distrib
