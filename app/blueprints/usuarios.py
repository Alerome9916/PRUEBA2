"""Gestión de usuarios del sistema."""
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required

from ..extensions import db
from ..models import Usuario, Rol
from ..utils import requiere_roles

bp = Blueprint("usuarios", __name__)


@bp.route("/")
@login_required
@requiere_roles(Rol.ADMIN)
def listar():
    usuarios = Usuario.query.order_by(Usuario.nombre).all()
    return render_template("usuarios/listar.html", usuarios=usuarios,
                           roles=Rol.ALL)


@bp.route("/nuevo", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN)
def nuevo():
    if request.method == "POST":
        try:
            u = Usuario(
                usuario=request.form["usuario"].strip(),
                nombre=request.form["nombre"].strip(),
                cedula=request.form.get("cedula", "").strip(),
                email=request.form.get("email", "").strip(),
                rol=request.form.get("rol", Rol.CAJERO),
            )
            u.set_password(request.form["password"])
            db.session.add(u)
            db.session.commit()
            flash("Usuario creado.", "success")
            return redirect(url_for("usuarios.listar"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    return render_template("usuarios/form.html", u=None, roles=Rol.ALL)


@bp.route("/<int:id>/editar", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN)
def editar(id):
    u = Usuario.query.get_or_404(id)
    if request.method == "POST":
        try:
            u.usuario = request.form["usuario"].strip()
            u.nombre = request.form["nombre"].strip()
            u.cedula = request.form.get("cedula", "").strip()
            u.email = request.form.get("email", "").strip()
            u.rol = request.form.get("rol", Rol.CAJERO)
            u.activo = bool(request.form.get("activo"))
            if request.form.get("password"):
                u.set_password(request.form["password"])
            db.session.commit()
            flash("Usuario actualizado.", "success")
            return redirect(url_for("usuarios.listar"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    return render_template("usuarios/form.html", u=u, roles=Rol.ALL)
