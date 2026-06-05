"""Mermas y bajas sanitarias."""
from decimal import Decimal
from datetime import date
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from sqlalchemy import func

from ..extensions import db
from ..models import Merma, Lote, Rol
from ..utils import requiere_roles

bp = Blueprint("mermas", __name__)


@bp.route("/")
@login_required
def listar():
    mermas = Merma.query.order_by(Merma.fecha.desc()).limit(300).all()
    total = sum(Decimal(m.valor_perdido or 0) for m in mermas)
    return render_template("mermas/listar.html", mermas=mermas, total=total)


@bp.route("/nueva", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.ALMACEN, Rol.SANITARIO)
def nueva():
    lotes = Lote.query.filter(Lote.activo.is_(True), Lote.cantidad_actual > 0) \
        .order_by(Lote.fecha_vencimiento.asc()).all()
    if request.method == "POST":
        try:
            lote = Lote.query.get_or_404(int(request.form["lote_id"]))
            cantidad = Decimal(request.form["cantidad"])
            if cantidad <= 0 or cantidad > Decimal(lote.cantidad_actual):
                flash("Cantidad inválida (mayor a stock disponible).", "danger")
                return redirect(url_for("mermas.nueva"))
            valor = (cantidad * Decimal(lote.costo_unitario or 0)).quantize(Decimal("0.01"))
            m = Merma(
                lote=lote,
                producto=lote.producto,
                cantidad=cantidad,
                motivo=request.form.get("motivo", "vencido"),
                observaciones=request.form.get("observaciones", "").strip(),
                valor_perdido=valor,
                usuario_id=current_user.id,
            )
            lote.cantidad_actual = Decimal(lote.cantidad_actual) - cantidad
            if lote.cantidad_actual <= 0:
                lote.activo = False
            db.session.add(m)
            db.session.commit()
            flash(f"Merma registrada (pérdida Bs. {valor}).", "info")
            return redirect(url_for("mermas.listar"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    return render_template("mermas/form.html", lotes=lotes)


@bp.route("/baja-automatica-vencidos", methods=["POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.SANITARIO)
def baja_automatica():
    """Da de baja todos los lotes ya vencidos como mermas sanitarias."""
    vencidos = Lote.query.filter(Lote.activo.is_(True), Lote.cantidad_actual > 0).all()
    n = 0
    total = Decimal("0")
    for l in vencidos:
        if l.fecha_vencimiento < date.today():
            valor = (Decimal(l.cantidad_actual) * Decimal(l.costo_unitario or 0)).quantize(Decimal("0.01"))
            m = Merma(
                lote=l, producto=l.producto,
                cantidad=l.cantidad_actual,
                motivo="vencido",
                observaciones="Baja automática (COVENIN 2952)",
                valor_perdido=valor,
                usuario_id=current_user.id,
            )
            l.cantidad_actual = Decimal("0")
            l.activo = False
            db.session.add(m)
            n += 1
            total += valor
    db.session.commit()
    flash(f"{n} lotes vencidos dados de baja. Pérdida total: Bs. {total}", "info")
    return redirect(url_for("mermas.listar"))
