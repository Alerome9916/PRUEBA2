"""Reportes ejecutivos."""
from decimal import Decimal
from datetime import date, datetime, timedelta
from flask import Blueprint, render_template, request
from flask_login import login_required
from sqlalchemy import func

from ..extensions import db
from ..models import (Venta, DetalleVenta, Producto, Lote, Merma,
                      RegistroSanitario, Cliente, Categoria)

bp = Blueprint("reportes", __name__)


@bp.route("/")
@login_required
def index():
    return render_template("reportes/index.html")


# -----------------------------------------------------------------
# Ventas
# -----------------------------------------------------------------
@bp.route("/ventas")
@login_required
def ventas():
    desde = request.args.get("desde", (date.today() - timedelta(days=30)).isoformat())
    hasta = request.args.get("hasta", date.today().isoformat())
    d1 = datetime.strptime(desde, "%Y-%m-%d")
    d2 = datetime.strptime(hasta, "%Y-%m-%d") + timedelta(days=1)

    ventas = Venta.query.filter(
        Venta.fecha >= d1, Venta.fecha < d2, Venta.anulada.is_(False)
    ).order_by(Venta.fecha.asc()).all()

    total = sum(Decimal(v.total) for v in ventas)
    total_iva = sum(Decimal(v.iva) for v in ventas)
    total_igtf = sum(Decimal(v.igtf) for v in ventas)
    total_usd = sum(Decimal(v.total_usd) for v in ventas)

    # Por día
    por_dia = {}
    for v in ventas:
        k = v.fecha.date().isoformat()
        por_dia[k] = por_dia.get(k, Decimal("0")) + Decimal(v.total)

    # Top productos
    rows = db.session.query(
        Producto.nombre,
        func.sum(DetalleVenta.cantidad).label("cantidad"),
        func.sum(DetalleVenta.subtotal).label("monto"),
    ).join(DetalleVenta).join(Venta).filter(
        Venta.fecha >= d1, Venta.fecha < d2, Venta.anulada.is_(False)
    ).group_by(Producto.nombre).order_by(db.desc("monto")).limit(10).all()

    return render_template("reportes/ventas.html",
                           ventas=ventas, total=total, total_iva=total_iva,
                           total_igtf=total_igtf, total_usd=total_usd,
                           desde=desde, hasta=hasta, por_dia=por_dia,
                           top_productos=rows)


# -----------------------------------------------------------------
# Vencimientos (FEFO)
# -----------------------------------------------------------------
@bp.route("/vencimientos")
@login_required
def vencimientos():
    lotes = Lote.query.filter(Lote.activo.is_(True), Lote.cantidad_actual > 0) \
        .order_by(Lote.fecha_vencimiento.asc()).all()
    grupos = {"vencido": [], "rojo": [], "amarillo": [], "verde": [], "ok": []}
    for l in lotes:
        grupos[l.estado_semaforo()].append(l)
    return render_template("reportes/vencimientos.html", grupos=grupos)


# -----------------------------------------------------------------
# Mermas
# -----------------------------------------------------------------
@bp.route("/mermas")
@login_required
def mermas():
    desde = request.args.get("desde", (date.today() - timedelta(days=30)).isoformat())
    hasta = request.args.get("hasta", date.today().isoformat())
    d1 = datetime.strptime(desde, "%Y-%m-%d")
    d2 = datetime.strptime(hasta, "%Y-%m-%d") + timedelta(days=1)

    mermas = Merma.query.filter(Merma.fecha >= d1, Merma.fecha < d2) \
        .order_by(Merma.fecha.desc()).all()
    total = sum(Decimal(m.valor_perdido or 0) for m in mermas)

    por_motivo = {}
    for m in mermas:
        por_motivo[m.motivo] = por_motivo.get(m.motivo, Decimal("0")) + Decimal(m.valor_perdido or 0)

    return render_template("reportes/mermas.html", mermas=mermas, total=total,
                           desde=desde, hasta=hasta, por_motivo=por_motivo)


# -----------------------------------------------------------------
# Inventario
# -----------------------------------------------------------------
@bp.route("/inventario")
@login_required
def inventario():
    productos = Producto.query.filter_by(activo=True).order_by(Producto.nombre).all()
    valor_total = Decimal("0")
    filas = []
    for p in productos:
        stock = p.stock_total()
        valor = (Decimal(stock) * Decimal(p.precio_compra or 0)).quantize(Decimal("0.01"))
        valor_total += valor
        filas.append({"producto": p, "stock": stock, "valor": valor})
    return render_template("reportes/inventario.html", filas=filas, valor_total=valor_total)


# -----------------------------------------------------------------
# Sanitario (COVENIN)
# -----------------------------------------------------------------
@bp.route("/sanitario")
@login_required
def sanitario():
    registros = RegistroSanitario.query.order_by(RegistroSanitario.fecha.desc()).limit(200).all()
    return render_template("reportes/sanitario.html", registros=registros)
