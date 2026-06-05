"""Autenticación de usuarios."""
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user

from ..models import Usuario

bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))
    if request.method == "POST":
        usuario = request.form.get("usuario", "").strip()
        password = request.form.get("password", "")
        u = Usuario.query.filter_by(usuario=usuario, activo=True).first()
        if u and u.check_password(password):
            login_user(u, remember=True)
            flash(f"Bienvenido, {u.nombre}", "success")
            return redirect(url_for("dashboard.index"))
        flash("Usuario o contraseña incorrectos", "danger")
    return render_template("auth/login.html")


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Sesión cerrada", "info")
    return redirect(url_for("auth.login"))
