"""Gestión de clientes."""
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required

from ..extensions import db
from ..models import Cliente, Rol
from ..utils import requiere_roles

bp = Blueprint("clientes", __name__)


@bp.route("/")
@login_required
def listar():
    q = request.args.get("q", "").strip()
    query = Cliente.query
    if q:
        query = query.filter(db.or_(
            Cliente.nombre.ilike(f"%{q}%"),
            Cliente.documento.ilike(f"%{q}%"),
        ))
    clientes = query.order_by(Cliente.nombre).all()
    return render_template("clientes/listar.html", clientes=clientes, q=q)


@bp.route("/nuevo", methods=["GET", "POST"])
@login_required
def nuevo():
    if request.method == "POST":
        try:
            c = Cliente(
                tipo_doc=request.form.get("tipo_doc", "V"),
                documento=request.form["documento"].strip(),
                nombre=request.form["nombre"].strip(),
                telefono=request.form.get("telefono", "").strip(),
                email=request.form.get("email", "").strip(),
                direccion=request.form.get("direccion", "").strip(),
                acepta_notificaciones=bool(request.form.get("acepta_notificaciones")),
            )
            db.session.add(c)
            db.session.commit()
            flash("Cliente registrado.", "success")
            next_url = request.args.get("next") or url_for("clientes.listar")
            return redirect(next_url)
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    return render_template("clientes/form.html", c=None)


@bp.route("/<int:id>/editar", methods=["GET", "POST"])
@login_required
def editar(id):
    c = Cliente.query.get_or_404(id)
    if request.method == "POST":
        try:
            c.tipo_doc = request.form.get("tipo_doc", "V")
            c.documento = request.form["documento"].strip()
            c.nombre = request.form["nombre"].strip()
            c.telefono = request.form.get("telefono", "").strip()
            c.email = request.form.get("email", "").strip()
            c.direccion = request.form.get("direccion", "").strip()
            c.acepta_notificaciones = bool(request.form.get("acepta_notificaciones"))
            db.session.commit()
            flash("Cliente actualizado.", "success")
            return redirect(url_for("clientes.listar"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    return render_template("clientes/form.html", c=c)
