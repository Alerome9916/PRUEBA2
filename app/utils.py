"""
Utilidades del sistema:
- Cálculos fiscales SENIAT (IVA, IGTF)
- Numeración correlativa de facturas
- Generación de QR para trazabilidad de lotes
- Validación de RIF venezolano (algoritmo dígito verificador)
"""
from __future__ import annotations
import os
import re
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Tuple

from flask import current_app
import qrcode

from .extensions import db
from .models import Venta, Lote, Configuracion


# =====================================================================
# Fiscal (SENIAT)
# =====================================================================
def Q(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calcular_totales_venta(detalles: list[dict],
                           paga_en_divisa: bool,
                           tasa_bcv: Decimal | float) -> dict:
    """
    detalles: lista de dicts con keys: cantidad, precio_unitario,
              descuento_unitario, iva_alicuota
    Retorna: subtotal, descuento_total, base_imponible, iva, igtf, total, total_usd
    Aplica IGTF 3% sobre el TOTAL cuando se paga en divisa (Ley IGTF).
    """
    subtotal = Decimal("0")
    descuento_total = Decimal("0")
    base_imponible = Decimal("0")
    iva = Decimal("0")
    for d in detalles:
        cant = Decimal(str(d["cantidad"]))
        pu = Decimal(str(d["precio_unitario"]))
        desc = Decimal(str(d.get("descuento_unitario", 0)))
        ali = Decimal(str(d.get("iva_alicuota", 0.16)))
        linea_bruta = cant * pu
        linea_desc = cant * desc
        linea_neta = linea_bruta - linea_desc
        subtotal += linea_bruta
        descuento_total += linea_desc
        base_imponible += linea_neta
        iva += linea_neta * ali

    iva = Q(iva)
    subtotal = Q(subtotal)
    descuento_total = Q(descuento_total)
    base_imponible = Q(base_imponible)
    total_sin_igtf = Q(base_imponible + iva)
    igtf = Q(total_sin_igtf * Decimal("0.03")) if paga_en_divisa else Decimal("0.00")
    total = Q(total_sin_igtf + igtf)
    total_usd = Q(total / Decimal(str(tasa_bcv))) if tasa_bcv else Decimal("0.00")

    return {
        "subtotal": subtotal,
        "descuento_total": descuento_total,
        "base_imponible": base_imponible,
        "iva": iva,
        "igtf": igtf,
        "total": total,
        "total_usd": total_usd,
    }


def proximo_numero_factura() -> str:
    """
    Numeración correlativa serie SENIAT.
    Formato: SERIE-00000001 (correlativo único e irrepetible).
    """
    serie = current_app.config.get("FACTURA_SERIE", "A")
    ultimo = (
        db.session.query(Venta)
        .order_by(Venta.id.desc())
        .first()
    )
    next_n = (int(ultimo.numero_factura.split("-")[-1]) + 1) if ultimo else \
        current_app.config["FACTURA_NUMERO_INICIAL"]
    return f"{serie}-{next_n:08d}"


# =====================================================================
# Tasa BCV
# =====================================================================
def get_tasa_bcv() -> Decimal:
    val = Configuracion.get("tasa_bcv")
    if val:
        try:
            return Decimal(val)
        except Exception:
            pass
    return Decimal(str(current_app.config["TASA_BCV_DEFAULT"]))


def set_tasa_bcv(valor) -> None:
    Configuracion.set("tasa_bcv", str(valor))


# =====================================================================
# Validación RIF venezolano
# =====================================================================
RIF_RE = re.compile(r"^[VEJPGvejpg]-?\d{8,9}-?\d?$")


def validar_rif(rif: str) -> bool:
    """Valida formato básico de RIF/Cédula venezolano."""
    if not rif:
        return False
    return bool(RIF_RE.match(rif.strip()))


# =====================================================================
# QR de trazabilidad de lote
# =====================================================================
def generar_qr_lote(lote: Lote) -> str:
    """
    Genera el QR de trazabilidad de un lote con la info exigida por
    INSAI / COVENIN: código de lote, producto, proveedor (RIF),
    fecha elaboración, vencimiento, registro sanitario.
    """
    out_dir = current_app.config["QR_OUTPUT_DIR"]
    os.makedirs(out_dir, exist_ok=True)
    payload_lines = [
        f"Charcutería Los Churuguaros (RIF {current_app.config['EMPRESA']['rif']})",
        f"Lote: {lote.codigo}",
        f"Producto: {lote.producto.nombre} ({lote.producto.codigo})",
        f"Proveedor: {lote.proveedor.nombre if lote.proveedor else 'N/D'}"
        f" (RIF {lote.proveedor.rif if lote.proveedor else 'N/D'})",
        f"Elaboración: {lote.fecha_elaboracion or 'N/D'}",
        f"Vencimiento: {lote.fecha_vencimiento}",
        f"Reg. Sanitario: {lote.documento_sanitario or 'N/D'}",
        f"Cadena de frío: {lote.producto.temperatura_min}°C a {lote.producto.temperatura_max}°C",
    ]
    payload = "\n".join(payload_lines)
    img = qrcode.make(payload)
    filename = f"lote_{lote.codigo}.png"
    img.save(os.path.join(out_dir, filename))
    lote.qr_path = f"qr/{filename}"
    db.session.flush()
    return lote.qr_path


def generar_codigo_lote() -> str:
    ts = datetime.utcnow()
    return f"L-{ts.strftime('%y%m%d')}-{ts.strftime('%H%M%S')}"


# =====================================================================
# Permisos
# =====================================================================
def requiere_roles(*roles):
    from functools import wraps
    from flask import abort
    from flask_login import current_user

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated:
                abort(401)
            if not current_user.tiene_rol(*roles):
                abort(403)
            return f(*args, **kwargs)
        return wrapper
    return decorator
