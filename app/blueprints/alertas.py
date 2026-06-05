"""Centro de alertas: vencimientos, stock bajo, cadena de frío."""
from decimal import Decimal
from datetime import date, timedelta
from flask import Blueprint, render_template
from flask_login import login_required

from ..extensions import db
from ..models import Lote, Producto, RegistroSanitario

bp = Blueprint("alertas", __name__)


@bp.route("/")
@login_required
def index():
    lotes = Lote.query.filter(Lote.activo.is_(True), Lote.cantidad_actual > 0) \
        .order_by(Lote.fecha_vencimiento.asc()).all()

    vencidos = [l for l in lotes if l.estado_semaforo() == "vencido"]
    rojo = [l for l in lotes if l.estado_semaforo() == "rojo"]
    amarillo = [l for l in lotes if l.estado_semaforo() == "amarillo"]

    bajo_stock = []
    for p in Producto.query.filter_by(activo=True).all():
        s = p.stock_total()
        if s < (p.stock_minimo or 0):
            bajo_stock.append((p, s))

    # Cadena de frío: últimas 24h, alerta si fuera de rango
    desde = db.session.query(db.func.max(RegistroSanitario.fecha)).scalar()
    fuera_rango = []
    if desde:
        regs = RegistroSanitario.query.filter(
            RegistroSanitario.fecha >= (desde - timedelta(hours=24))
        ).all()
        for r in regs:
            if r.temperatura is not None and (r.temperatura < 0 or r.temperatura > 6):
                fuera_rango.append(r)

    return render_template("alertas/index.html",
                           vencidos=vencidos, rojo=rojo, amarillo=amarillo,
                           bajo_stock=bajo_stock, fuera_rango=fuera_rango)
