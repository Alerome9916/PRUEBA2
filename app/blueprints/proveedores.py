"""Gestión de proveedores."""
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required

from ..extensions import db
from ..models import Proveedor, Rol
from ..utils import requiere_roles, validar_rif

bp = Blueprint("proveedores", __name__)


@bp.route("/")
@login_required
def listar():
    q = request.args.get("q", "").strip()
    query = Proveedor.query
    if q:
        query = query.filter(db.or_(
            Proveedor.nombre.ilike(f"%{q}%"),
            Proveedor.rif.ilike(f"%{q}%"),
        ))
    proveedores = query.order_by(Proveedor.nombre).all()
    return render_template("proveedores/listar.html", proveedores=proveedores, q=q)


@bp.route("/nuevo", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.ALMACEN)
def nuevo():
    if request.method == "POST":
        rif = request.form["rif"].strip().upper()
        if not validar_rif(rif):
            flash("RIF inválido. Formato esperado: J-12345678-9", "danger")
            return render_template("proveedores/form.html", p=None)
        try:
            p = Proveedor(
                rif=rif,
                nombre=request.form["nombre"].strip(),
                contacto=request.form.get("contacto", "").strip(),
                telefono=request.form.get("telefono", "").strip(),
                email=request.form.get("email", "").strip(),
                direccion=request.form.get("direccion", "").strip(),
                registro_sanitario=request.form.get("registro_sanitario", "").strip(),
            )
            db.session.add(p)
            db.session.commit()
            flash("Proveedor creado.", "success")
            return redirect(url_for("proveedores.listar"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    return render_template("proveedores/form.html", p=None)


@bp.route("/<int:id>/editar", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.ALMACEN)
def editar(id):
    p = Proveedor.query.get_or_404(id)
    if request.method == "POST":
        try:
            p.rif = request.form["rif"].strip().upper()
            p.nombre = request.form["nombre"].strip()
            p.contacto = request.form.get("contacto", "").strip()
            p.telefono = request.form.get("telefono", "").strip()
            p.email = request.form.get("email", "").strip()
            p.direccion = request.form.get("direccion", "").strip()
            p.registro_sanitario = request.form.get("registro_sanitario", "").strip()
            db.session.commit()
            flash("Proveedor actualizado.", "success")
            return redirect(url_for("proveedores.listar"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    return render_template("proveedores/form.html", p=p)
