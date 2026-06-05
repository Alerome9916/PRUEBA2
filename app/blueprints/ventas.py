"""POS - Punto de venta con asignación FEFO automática."""
from decimal import Decimal
from datetime import date, datetime, timedelta
from flask import (Blueprint, render_template, request, redirect, url_for,
                   flash, jsonify)
from flask_login import login_required, current_user
from sqlalchemy import func

from ..extensions import db
from ..models import (Venta, DetalleVenta, Producto, Lote, Cliente, Rol)
from ..fefo import asignar_fefo, descontar_stock
from ..utils import (calcular_totales_venta, proximo_numero_factura,
                     get_tasa_bcv, requiere_roles)

bp = Blueprint("ventas", __name__)


# -------------------------------------------------------------------
# Listado
# -------------------------------------------------------------------
@bp.route("/")
@login_required
def listar():
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")
    query = Venta.query
    if desde:
        query = query.filter(Venta.fecha >= datetime.strptime(desde, "%Y-%m-%d"))
    if hasta:
        h = datetime.strptime(hasta, "%Y-%m-%d") + timedelta(days=1)
        query = query.filter(Venta.fecha < h)
    ventas = query.order_by(Venta.fecha.desc()).limit(200).all()
    total = sum(Decimal(v.total) for v in ventas if not v.anulada)
    return render_template("ventas/listar.html", ventas=ventas, total=total,
                           desde=desde, hasta=hasta)


# -------------------------------------------------------------------
# POS
# -------------------------------------------------------------------
@bp.route("/pos")
@login_required
def pos():
    productos = Producto.query.filter_by(activo=True).order_by(Producto.nombre).all()
    clientes = Cliente.query.order_by(Cliente.nombre).limit(500).all()
    return render_template("ventas/pos.html", productos=productos,
                           clientes=clientes, tasa_bcv=get_tasa_bcv())


# -------------------------------------------------------------------
# AJAX: previsualización FEFO de un producto
# -------------------------------------------------------------------
@bp.route("/api/fefo/<int:producto_id>")
@login_required
def api_fefo(producto_id):
    cantidad = Decimal(request.args.get("cantidad", "1"))
    p = Producto.query.get_or_404(producto_id)
    asign, pendiente = asignar_fefo(p, cantidad)
    return jsonify({
        "producto": {
            "id": p.id,
            "nombre": p.nombre,
            "codigo": p.codigo,
            "iva_alicuota": float(p.iva_alicuota or 0),
            "precio_base": float(p.precio_venta or 0),
        },
        "asignaciones": [a.as_dict() for a in asign],
        "cantidad_no_cubierta": float(pendiente),
    })


# -------------------------------------------------------------------
# Confirmar venta
# -------------------------------------------------------------------
@bp.route("/confirmar", methods=["POST"])
@login_required
@requiere_roles(Rol.ADMIN, Rol.CAJERO)
def confirmar():
    """
    Espera JSON:
    {
      "cliente_id": int|null,
      "items": [{"producto_id":1,"cantidad":2.5}, ...],
      "metodo_pago":"bs_pago_movil",
      "paga_en_divisa": false
    }
    """
    data = request.get_json(silent=True) or {}
    items = data.get("items", [])
    if not items:
        return jsonify({"ok": False, "error": "Sin productos"}), 400

    paga_divisa = bool(data.get("paga_en_divisa", False))
    metodo = data.get("metodo_pago", "bs_efectivo")
    cliente_id = data.get("cliente_id")
    tasa = get_tasa_bcv()

    detalles_para_total = []
    detalles_db = []   # lista de DetalleVenta a guardar

    try:
        for it in items:
            prod = Producto.query.get(int(it["producto_id"]))
            if not prod:
                return jsonify({"ok": False, "error": f"Producto {it['producto_id']} no existe"}), 400
            cant_total = Decimal(str(it["cantidad"]))
            asignaciones, pendiente = asignar_fefo(prod, cant_total)
            if pendiente > 0:
                return jsonify({
                    "ok": False,
                    "error": f"Stock insuficiente para {prod.nombre} "
                             f"(faltan {pendiente})"
                }), 400

            # Por cada lote FEFO crear un detalle
            for a in asignaciones:
                # precio_base - precio_dinamico = descuento_unitario
                precio_base = Decimal(prod.precio_venta or 0)
                precio_unit = Decimal(a.precio_unit)
                desc_unit = (precio_base - precio_unit).quantize(Decimal("0.01"))
                if desc_unit < 0:
                    desc_unit = Decimal("0")

                detalles_para_total.append({
                    "cantidad": a.cantidad,
                    "precio_unitario": precio_base,
                    "descuento_unitario": desc_unit,
                    "iva_alicuota": prod.iva_alicuota or Decimal("0.16"),
                })
                detalles_db.append(DetalleVenta(
                    producto=prod,
                    lote=a.lote,
                    cantidad=a.cantidad,
                    precio_unitario=precio_base,
                    descuento_unitario=desc_unit,
                    iva_alicuota=prod.iva_alicuota or Decimal("0.16"),
                    subtotal=(Decimal(a.cantidad) *
                              (precio_base - desc_unit)).quantize(Decimal("0.01")),
                ))

            descontar_stock(asignaciones)

        totales = calcular_totales_venta(detalles_para_total, paga_divisa, tasa)
        venta = Venta(
            numero_factura=proximo_numero_factura(),
            cliente_id=cliente_id,
            usuario_id=current_user.id,
            subtotal=totales["subtotal"],
            descuento_total=totales["descuento_total"],
            base_imponible=totales["base_imponible"],
            iva=totales["iva"],
            igtf=totales["igtf"],
            total=totales["total"],
            tasa_bcv=tasa,
            total_usd=totales["total_usd"],
            metodo_pago=metodo,
            paga_en_divisa=paga_divisa,
        )
        for d in detalles_db:
            venta.detalles.append(d)
        db.session.add(venta)

        # Fidelización simple: 1 punto por cada Bs.100
        if cliente_id:
            cli = Cliente.query.get(cliente_id)
            if cli:
                cli.puntos_fidelidad = (cli.puntos_fidelidad or 0) + int(totales["total"] // 100)

        db.session.commit()
        return jsonify({"ok": True, "venta_id": venta.id, "numero": venta.numero_factura})
    except Exception as e:
        db.session.rollback()
        return jsonify({"ok": False, "error": str(e)}), 500


# -------------------------------------------------------------------
# Factura
# -------------------------------------------------------------------
@bp.route("/<int:id>")
@login_required
def factura(id):
    venta = Venta.query.get_or_404(id)
    return render_template("ventas/factura.html", venta=venta)


@bp.route("/<int:id>/anular", methods=["POST"])
@login_required
@requiere_roles(Rol.ADMIN)
def anular(id):
    venta = Venta.query.get_or_404(id)
    if venta.anulada:
        flash("La venta ya estaba anulada.", "warning")
        return redirect(url_for("ventas.factura", id=id))
    venta.anulada = True
    venta.motivo_anulacion = request.form.get("motivo", "Anulada manualmente")
    # Devolver stock a los lotes
    for d in venta.detalles:
        if d.lote:
            d.lote.cantidad_actual = Decimal(d.lote.cantidad_actual) + Decimal(d.cantidad)
    db.session.commit()
    flash("Venta anulada y stock restituido.", "info")
    return redirect(url_for("ventas.factura", id=id))
