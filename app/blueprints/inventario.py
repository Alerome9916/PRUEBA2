"""Gestión de inventario por lotes con motor FEFO."""
from decimal import Decimal
from datetime import date, datetime, timedelta
from flask import Blueprint, render_template, request, redirect, url_for, flash, send_file
from flask_login import login_required, current_user

from ..extensions import db
from ..models import Lote, Producto, Proveedor, Rol, RegistroSanitario
from ..utils import requiere_roles, generar_qr_lote, generar_codigo_lote

bp = Blueprint("inventario", __name__)


@bp.route("/")
@login_required
def listar():
    """Vista FEFO: lotes ordenados por fecha de vencimiento ascendente."""
    semaforo = request.args.get("semaforo", "")
    q = request.args.get("q", "").strip()

    query = Lote.query.filter(Lote.activo.is_(True), Lote.cantidad_actual > 0)
    if q:
        query = query.join(Producto).filter(db.or_(
            Producto.nombre.ilike(f"%{q}%"),
            Lote.codigo.ilike(f"%{q}%"),
        ))
    lotes = query.order_by(Lote.fecha_vencimiento.asc()).all()
    if semaforo:
        lotes = [l for l in lotes if l.estado_semaforo() == semaforo]

    return render_template("inventario/listar.html", lotes=lotes,
                           semaforo=semaforo, q=q)


@bp.route("/ingreso", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.ALMACEN)
def ingreso():
    """Ingreso de mercancía: crea un nuevo lote y genera el QR de trazabilidad."""
    productos = Producto.query.filter_by(activo=True).order_by(Producto.nombre).all()
    proveedores = Proveedor.query.filter_by(activo=True).order_by(Proveedor.nombre).all()

    if request.method == "POST":
        try:
            producto = Producto.query.get_or_404(int(request.form["producto_id"]))
            f_venc = datetime.strptime(request.form["fecha_vencimiento"], "%Y-%m-%d").date()
            f_elab_raw = request.form.get("fecha_elaboracion")
            f_elab = datetime.strptime(f_elab_raw, "%Y-%m-%d").date() if f_elab_raw else None

            cantidad = Decimal(request.form["cantidad"])
            if cantidad <= 0:
                flash("La cantidad debe ser mayor a 0.", "danger")
                return redirect(url_for("inventario.ingreso"))
            if f_venc < date.today():
                flash("No se puede ingresar mercancía ya vencida.", "danger")
                return redirect(url_for("inventario.ingreso"))

            lote = Lote(
                codigo=request.form.get("codigo") or generar_codigo_lote(),
                producto=producto,
                proveedor_id=int(request.form["proveedor_id"]) if request.form.get("proveedor_id") else None,
                fecha_ingreso=date.today(),
                fecha_elaboracion=f_elab,
                fecha_vencimiento=f_venc,
                cantidad_inicial=cantidad,
                cantidad_actual=cantidad,
                costo_unitario=Decimal(request.form.get("costo_unitario") or "0"),
                temperatura_recepcion=Decimal(request.form.get("temperatura_recepcion") or "0"),
                documento_sanitario=request.form.get("documento_sanitario", "").strip(),
                observaciones=request.form.get("observaciones", "").strip(),
            )
            db.session.add(lote)
            db.session.flush()
            generar_qr_lote(lote)
            db.session.commit()
            flash(f"Lote {lote.codigo} ingresado correctamente. QR generado.", "success")
            return redirect(url_for("inventario.listar"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")

    return render_template("inventario/ingreso.html", productos=productos,
                           proveedores=proveedores,
                           hoy=date.today().isoformat())


@bp.route("/lote/<int:id>")
@login_required
def detalle_lote(id):
    lote = Lote.query.get_or_404(id)
    return render_template("inventario/detalle_lote.html", lote=lote)


@bp.route("/sanitario", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.ALMACEN, Rol.SANITARIO)
def sanitario():
    """Registro de cadena de frío (COVENIN)."""
    if request.method == "POST":
        try:
            r = RegistroSanitario(
                area=request.form["area"],
                temperatura=Decimal(request.form["temperatura"]),
                humedad=Decimal(request.form.get("humedad") or "0"),
                responsable_id=current_user.id,
                observaciones=request.form.get("observaciones", "").strip(),
            )
            db.session.add(r)
            db.session.commit()
            flash("Registro sanitario guardado.", "success")
            return redirect(url_for("inventario.sanitario"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    registros = RegistroSanitario.query.order_by(
        RegistroSanitario.fecha.desc()
    ).limit(60).all()
    return render_template("inventario/sanitario.html", registros=registros)
