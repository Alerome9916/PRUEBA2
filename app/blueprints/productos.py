"""Gestión de productos del catálogo."""
from decimal import Decimal
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required

from ..extensions import db
from ..models import Producto, Categoria, UnidadMedida, Rol
from ..utils import requiere_roles

bp = Blueprint("productos", __name__)


@bp.route("/")
@login_required
def listar():
    q = request.args.get("q", "").strip()
    cat = request.args.get("categoria", type=int)
    query = Producto.query.filter_by(activo=True)
    if q:
        query = query.filter(db.or_(
            Producto.nombre.ilike(f"%{q}%"),
            Producto.codigo.ilike(f"%{q}%"),
        ))
    if cat:
        query = query.filter_by(categoria_id=cat)
    productos = query.order_by(Producto.nombre).all()
    categorias = Categoria.query.order_by(Categoria.nombre).all()
    return render_template("productos/listar.html", productos=productos,
                           categorias=categorias, q=q, cat=cat)


@bp.route("/nuevo", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.ALMACEN)
def nuevo():
    categorias = Categoria.query.order_by(Categoria.nombre).all()
    unidades = UnidadMedida.query.order_by(UnidadMedida.codigo).all()
    if request.method == "POST":
        try:
            p = Producto(
                codigo=request.form["codigo"].strip(),
                nombre=request.form["nombre"].strip(),
                descripcion=request.form.get("descripcion", "").strip(),
                categoria_id=int(request.form["categoria_id"]),
                unidad_id=int(request.form["unidad_id"]),
                precio_compra=Decimal(request.form.get("precio_compra") or "0"),
                precio_venta=Decimal(request.form.get("precio_venta") or "0"),
                iva_alicuota=Decimal(request.form.get("iva_alicuota") or "0.16"),
                es_refrigerado=bool(request.form.get("es_refrigerado")),
                temperatura_min=Decimal(request.form.get("temperatura_min") or "0"),
                temperatura_max=Decimal(request.form.get("temperatura_max") or "4"),
                vida_util_dias=int(request.form.get("vida_util_dias") or 30),
                stock_minimo=Decimal(request.form.get("stock_minimo") or "0"),
            )
            db.session.add(p)
            db.session.commit()
            flash(f"Producto {p.nombre} creado correctamente.", "success")
            return redirect(url_for("productos.listar"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    return render_template("productos/form.html", p=None, categorias=categorias,
                           unidades=unidades)


@bp.route("/<int:id>/editar", methods=["GET", "POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.ALMACEN)
def editar(id):
    p = Producto.query.get_or_404(id)
    categorias = Categoria.query.order_by(Categoria.nombre).all()
    unidades = UnidadMedida.query.order_by(UnidadMedida.codigo).all()
    if request.method == "POST":
        try:
            p.codigo = request.form["codigo"].strip()
            p.nombre = request.form["nombre"].strip()
            p.descripcion = request.form.get("descripcion", "").strip()
            p.categoria_id = int(request.form["categoria_id"])
            p.unidad_id = int(request.form["unidad_id"])
            p.precio_compra = Decimal(request.form.get("precio_compra") or "0")
            p.precio_venta = Decimal(request.form.get("precio_venta") or "0")
            p.iva_alicuota = Decimal(request.form.get("iva_alicuota") or "0.16")
            p.es_refrigerado = bool(request.form.get("es_refrigerado"))
            p.temperatura_min = Decimal(request.form.get("temperatura_min") or "0")
            p.temperatura_max = Decimal(request.form.get("temperatura_max") or "4")
            p.vida_util_dias = int(request.form.get("vida_util_dias") or 30)
            p.stock_minimo = Decimal(request.form.get("stock_minimo") or "0")
            db.session.commit()
            flash("Producto actualizado.", "success")
            return redirect(url_for("productos.listar"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error: {e}", "danger")
    return render_template("productos/form.html", p=p, categorias=categorias,
                           unidades=unidades)


@bp.route("/<int:id>/eliminar", methods=["POST"])
@login_required
@requiere_roles(Rol.ADMIN)
def eliminar(id):
    p = Producto.query.get_or_404(id)
    p.activo = False
    db.session.commit()
    flash("Producto desactivado.", "info")
    return redirect(url_for("productos.listar"))


@bp.route("/<int:id>")
@login_required
def detalle(id):
    p = Producto.query.get_or_404(id)
    lotes = p.lotes.filter_by(activo=True).order_by(
        db.text("fecha_vencimiento asc")
    ).all()
    return render_template("productos/detalle.html", p=p, lotes=lotes)
