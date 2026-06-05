"""Configuración general: tasa BCV, parámetros FEFO, etc."""
from decimal import Decimal
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required

from ..models import Configuracion, Rol
from ..utils import get_tasa_bcv, set_tasa_bcv, requiere_roles

bp = Blueprint("configuracion", __name__)


@bp.route("/", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN)
def index():
    if request.method == "POST":
        try:
            set_tasa_bcv(Decimal(request.form["tasa_bcv"]))
            Configuracion.set("dias_alerta_rojo", request.form.get("dias_alerta_rojo", "3"))
            Configuracion.set("dias_alerta_amarillo", request.form.get("dias_alerta_amarillo", "7"))
            Configuracion.set("descuento_dias_inicio", request.form.get("descuento_dias_inicio", "14"))
            Configuracion.set("descuento_max_pct", request.form.get("descuento_max_pct", "0.5"))
            flash("Configuración actualizada.", "success")
        except Exception as e:
            flash(f"Error: {e}", "danger")
        return redirect(url_for("configuracion.index"))
    return render_template("configuracion/index.html",
                           tasa_bcv=get_tasa_bcv(),
                           dias_rojo=Configuracion.get("dias_alerta_rojo", "3"),
                           dias_amarillo=Configuracion.get("dias_alerta_amarillo", "7"),
                           desc_inicio=Configuracion.get("descuento_dias_inicio", "14"),
                           desc_max=Configuracion.get("descuento_max_pct", "0.5"))
