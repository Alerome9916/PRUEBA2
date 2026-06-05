"""Dashboard principal."""
from datetime import date, timedelta
from decimal import Decimal
from flask import Blueprint, render_template
from flask_login import login_required
from sqlalchemy import func

from ..extensions import db
from ..models import (Producto, Lote, Venta, DetalleVenta, Merma, Cliente)
from ..fefo import score_frescura_global, sugerir_combos

bp = Blueprint("dashboard", __name__)


@bp.route("/")
@login_required
def index():
    hoy = date.today()
    hace_30 = hoy - timedelta(days=30)

    # KPIs principales
    total_productos = Producto.query.filter_by(activo=True).count()
    total_lotes = Lote.query.filter(Lote.activo.is_(True), Lote.cantidad_actual > 0).count()
    total_clientes = Cliente.query.count()

    ventas_hoy = db.session.query(func.coalesce(func.sum(Venta.total), 0)) \
        .filter(func.date(Venta.fecha) == hoy, Venta.anulada.is_(False)).scalar() or 0
    ventas_mes = db.session.query(func.coalesce(func.sum(Venta.total), 0)) \
        .filter(Venta.fecha >= hace_30, Venta.anulada.is_(False)).scalar() or 0

    # Lotes próximos a vencer
    lotes = Lote.query.filter(Lote.activo.is_(True), Lote.cantidad_actual > 0).all()
    lotes_rojo = [l for l in lotes if l.estado_semaforo() == "rojo"]
    lotes_amarillo = [l for l in lotes if l.estado_semaforo() == "amarillo"]
    lotes_vencidos = [l for l in lotes if l.estado_semaforo() == "vencido"]

    valor_riesgo = sum(
        Decimal(l.cantidad_actual) * Decimal(l.costo_unitario or 0)
        for l in lotes_rojo + lotes_amarillo
    )

    # Productos con stock bajo
    bajo_stock = []
    for p in Producto.query.filter_by(activo=True).all():
        if p.stock_total() < (p.stock_minimo or 0):
            bajo_stock.append(p)

    # Mermas del mes
    mermas_mes = db.session.query(func.coalesce(func.sum(Merma.valor_perdido), 0)) \
        .filter(Merma.fecha >= hace_30).scalar() or 0

    # Score de frescura (NOVEDAD)
    score = score_frescura_global()

    # Combos sugeridos (NOVEDAD)
    combos = sugerir_combos(top_n=3)

    return render_template(
        "dashboard/index.html",
        total_productos=total_productos,
        total_lotes=total_lotes,
        total_clientes=total_clientes,
        ventas_hoy=ventas_hoy,
        ventas_mes=ventas_mes,
        lotes_rojo=lotes_rojo,
        lotes_amarillo=lotes_amarillo,
        lotes_vencidos=lotes_vencidos,
        bajo_stock=bajo_stock,
        mermas_mes=mermas_mes,
        valor_riesgo=valor_riesgo,
        score=score,
        combos=combos,
    )
