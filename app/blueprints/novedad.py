"""
NOVEDAD - El módulo que ningún sistema típico de inventario trae:

1) Motor Predictivo FEFO: anticipa cuánto vencerá según ventas reales
2) Pricing dinámico: precio que baja a medida que se acerca el vencimiento
3) Score de Frescura del inventario completo (gamificación)
4) Recomendador de combos anti-desperdicio
5) Notificaciones a clientes (CRM FEFO)
6) Trazabilidad QR por lote
"""
from decimal import Decimal
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user

from ..extensions import db
from ..models import Producto, Lote, Combo, Notificacion, Rol
from ..fefo import (proyectar_riesgo, sugerir_combos, score_frescura_global,
                    notificar_clientes_promo)
from ..utils import requiere_roles

bp = Blueprint("novedad", __name__)


@bp.route("/")
@login_required
def panel():
    """Panel maestro de la inteligencia FEFO."""
    productos = Producto.query.filter_by(activo=True).all()
    proyecciones = []
    for p in productos:
        r = proyectar_riesgo(p)
        if any(x.riesgo in ("alto", "medio") for x in r):
            proyecciones.append((p, r))

    score = score_frescura_global()
    combos = sugerir_combos(top_n=5)
    notifs = Notificacion.query.order_by(Notificacion.fecha.desc()).limit(20).all()
    combos_guardados = Combo.query.filter_by(activo=True).order_by(Combo.creado_en.desc()).all()

    # Precios dinámicos: lotes con descuento activo
    descuentos_activos = []
    for l in Lote.query.filter(Lote.activo.is_(True), Lote.cantidad_actual > 0).all():
        pd = l.precio_dinamico()
        base = Decimal(l.producto.precio_venta or 0)
        if pd < base:
            descuentos_activos.append({
                "lote": l,
                "precio_base": base,
                "precio_dinamico": pd,
                "ahorro": (base - pd).quantize(Decimal("0.01")),
                "pct": float(((base - pd) / base) * 100) if base else 0,
            })
    descuentos_activos.sort(key=lambda x: -x["pct"])

    return render_template("novedad/panel.html",
                           proyecciones=proyecciones,
                           score=score, combos=combos,
                           notifs=notifs,
                           combos_guardados=combos_guardados,
                           descuentos_activos=descuentos_activos)


@bp.route("/notificar", methods=["POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.CAJERO)
def notificar():
    mensaje = request.form.get("mensaje", "").strip()
    canal = request.form.get("canal", "whatsapp")
    if not mensaje:
        flash("Mensaje vacío.", "danger")
        return redirect(url_for("novedad.panel"))
    n = notificar_clientes_promo(mensaje, canal)
    flash(f"Notificación enviada a {n} clientes vía {canal}.", "success")
    return redirect(url_for("novedad.panel"))


@bp.route("/combo/guardar", methods=["POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.CAJERO)
def guardar_combo():
    """Toma la sugerencia y la persiste como combo activo."""
    nombre = request.form["nombre"]
    descripcion = request.form.get("descripcion", "")
    productos = request.form.get("productos", "")
    precio = Decimal(request.form.get("precio_combo") or "0")
    c = Combo(nombre=nombre, descripcion=descripcion,
              productos=productos, precio_combo=precio)
    db.session.add(c)
    db.session.commit()
    flash(f"Combo «{nombre}» guardado en catálogo.", "success")
    return redirect(url_for("novedad.panel"))
