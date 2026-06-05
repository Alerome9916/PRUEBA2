"""
Modelos del sistema Los Churuguaros.

Implementa:
- Productos y categorías típicas de charcutería venezolana
- Lotes con fecha de caducidad (motor FEFO)
- Proveedores y clientes con RIF
- Ventas con IVA 16% e IGTF 3% (cuando se paga en divisa)
- Facturación SENIAT
- Mermas / bajas sanitarias
- Notificaciones a clientes (NOVEDAD)
- Trazabilidad sanitaria por lote (COVENIN)
"""
from __future__ import annotations
from datetime import datetime, date, timedelta
from decimal import Decimal
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func

from .extensions import db, login_manager


# =====================================================================
# USUARIOS Y ROLES
# =====================================================================
class Rol:
    ADMIN = "admin"
    ALMACEN = "almacen"
    CAJERO = "cajero"
    SANITARIO = "sanitario"
    ALL = (ADMIN, ALMACEN, CAJERO, SANITARIO)


class Usuario(UserMixin, db.Model):
    __tablename__ = "usuarios"
    id = db.Column(db.Integer, primary_key=True)
    usuario = db.Column(db.String(40), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(120), nullable=False)
    cedula = db.Column(db.String(20))
    email = db.Column(db.String(120))
    password_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default=Rol.CAJERO)
    activo = db.Column(db.Boolean, default=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def tiene_rol(self, *roles) -> bool:
        return self.rol == Rol.ADMIN or self.rol in roles


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(Usuario, int(user_id))


# =====================================================================
# CATÁLOGOS BÁSICOS
# =====================================================================
class Categoria(db.Model):
    """
    Categorías típicas de charcutería:
    Embutidos, Quesos, Jamones, Carnes Frías, Aceitunas, Encurtidos,
    Conservas, Lácteos, Vinos, Panes, Aderezos.
    """
    __tablename__ = "categorias"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), unique=True, nullable=False)
    descripcion = db.Column(db.String(200))
    productos = db.relationship("Producto", backref="categoria", lazy="dynamic")


class UnidadMedida(db.Model):
    __tablename__ = "unidades_medida"
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(10), unique=True, nullable=False)   # KG, G, UND, LT
    descripcion = db.Column(db.String(40), nullable=False)


class Proveedor(db.Model):
    __tablename__ = "proveedores"
    id = db.Column(db.Integer, primary_key=True)
    rif = db.Column(db.String(20), unique=True, nullable=False)       # J-12345678-9
    nombre = db.Column(db.String(160), nullable=False)
    contacto = db.Column(db.String(120))
    telefono = db.Column(db.String(30))
    email = db.Column(db.String(120))
    direccion = db.Column(db.String(255))
    registro_sanitario = db.Column(db.String(60))     # Registro INSAI
    activo = db.Column(db.Boolean, default=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)


class Cliente(db.Model):
    __tablename__ = "clientes"
    id = db.Column(db.Integer, primary_key=True)
    tipo_doc = db.Column(db.String(5), default="V")                  # V, E, J, G, P
    documento = db.Column(db.String(20), nullable=False, index=True) # cédula/RIF
    nombre = db.Column(db.String(160), nullable=False)
    telefono = db.Column(db.String(30))
    email = db.Column(db.String(120))
    direccion = db.Column(db.String(255))
    acepta_notificaciones = db.Column(db.Boolean, default=True)
    puntos_fidelidad = db.Column(db.Integer, default=0)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("tipo_doc", "documento"),)


# =====================================================================
# PRODUCTOS Y LOTES
# =====================================================================
class Producto(db.Model):
    __tablename__ = "productos"
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(40), unique=True, nullable=False)       # SKU / código barras
    nombre = db.Column(db.String(160), nullable=False)
    descripcion = db.Column(db.Text)
    categoria_id = db.Column(db.Integer, db.ForeignKey("categorias.id"))
    unidad_id = db.Column(db.Integer, db.ForeignKey("unidades_medida.id"))
    unidad = db.relationship("UnidadMedida")

    # Precios en Bolívares (referencia BCV en venta)
    precio_compra = db.Column(db.Numeric(12, 2), default=0)
    precio_venta = db.Column(db.Numeric(12, 2), default=0)
    iva_alicuota = db.Column(db.Numeric(4, 2), default=0.16)             # 0.00, 0.08, 0.16
    es_refrigerado = db.Column(db.Boolean, default=True)
    temperatura_min = db.Column(db.Numeric(4, 1), default=0.0)           # COVENIN
    temperatura_max = db.Column(db.Numeric(4, 1), default=4.0)
    vida_util_dias = db.Column(db.Integer, default=30)                   # Vida útil estándar
    stock_minimo = db.Column(db.Numeric(12, 3), default=0)               # Para alertas

    activo = db.Column(db.Boolean, default=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    lotes = db.relationship("Lote", backref="producto", lazy="dynamic",
                            cascade="all, delete-orphan")

    # === Métricas calculadas ===
    def stock_total(self) -> Decimal:
        total = db.session.query(func.coalesce(func.sum(Lote.cantidad_actual), 0)) \
            .filter(Lote.producto_id == self.id, Lote.activo.is_(True)).scalar()
        return Decimal(total or 0)

    def lote_proximo_vencer(self):
        return self.lotes.filter(Lote.cantidad_actual > 0, Lote.activo.is_(True)) \
            .order_by(Lote.fecha_vencimiento.asc()).first()

    def velocidad_consumo_diaria(self, dias: int = 30) -> float:
        """Promedio diario de unidades vendidas (para motor predictivo FEFO)."""
        desde = datetime.utcnow() - timedelta(days=dias)
        total = db.session.query(func.coalesce(func.sum(DetalleVenta.cantidad), 0)) \
            .join(Venta).filter(DetalleVenta.producto_id == self.id,
                                Venta.fecha >= desde,
                                Venta.anulada.is_(False)).scalar()
        return float(total or 0) / max(dias, 1)


class Lote(db.Model):
    """
    Lote (Batch) FEFO: cada entrada de mercancía es un lote
    con su fecha de caducidad. El FEFO se aplica ordenando por
    fecha_vencimiento ascendente al hacer cualquier salida.
    """
    __tablename__ = "lotes"
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(40), unique=True, nullable=False)       # L-AAMMDD-XXXX
    producto_id = db.Column(db.Integer, db.ForeignKey("productos.id"), nullable=False)
    proveedor_id = db.Column(db.Integer, db.ForeignKey("proveedores.id"))
    proveedor = db.relationship("Proveedor")

    fecha_ingreso = db.Column(db.Date, default=date.today, nullable=False)
    fecha_elaboracion = db.Column(db.Date)
    fecha_vencimiento = db.Column(db.Date, nullable=False, index=True)   # CLAVE FEFO

    cantidad_inicial = db.Column(db.Numeric(12, 3), nullable=False)
    cantidad_actual = db.Column(db.Numeric(12, 3), nullable=False)
    costo_unitario = db.Column(db.Numeric(12, 2), default=0)

    # Trazabilidad sanitaria (COVENIN)
    temperatura_recepcion = db.Column(db.Numeric(4, 1))
    documento_sanitario = db.Column(db.String(80))      # Permiso INSAI
    observaciones = db.Column(db.Text)
    qr_path = db.Column(db.String(255))                 # Imagen QR generada

    activo = db.Column(db.Boolean, default=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    # === Helpers FEFO ===
    def dias_para_vencer(self) -> int:
        return (self.fecha_vencimiento - date.today()).days

    def estado_semaforo(self) -> str:
        from flask import current_app
        d = self.dias_para_vencer()
        if d < 0:
            return "vencido"
        if d <= current_app.config["DIAS_ALERTA_ROJO"]:
            return "rojo"
        if d <= current_app.config["DIAS_ALERTA_AMARILLO"]:
            return "amarillo"
        if d <= current_app.config["DIAS_ALERTA_VERDE"]:
            return "verde"
        return "ok"

    def precio_dinamico(self) -> Decimal:
        """
        NOVEDAD: Motor de descuento dinámico por proximidad al vencimiento.
        A menos días restantes, mayor descuento (hasta DESCUENTO_MAXIMO_PCT).
        """
        from flask import current_app
        precio = Decimal(self.producto.precio_venta or 0)
        if not current_app.config["DESCUENTO_DINAMICO_HABILITADO"]:
            return precio
        d = self.dias_para_vencer()
        inicio = current_app.config["DESCUENTO_DIAS_INICIO"]
        max_desc = Decimal(str(current_app.config["DESCUENTO_MAXIMO_PCT"]))
        if d >= inicio or d < 0:
            return precio
        # Escala lineal: a 0 días = descuento máximo, a 'inicio' días = 0%
        factor = Decimal(str((inicio - d) / inicio))
        descuento = (precio * max_desc * factor).quantize(Decimal("0.01"))
        return (precio - descuento).quantize(Decimal("0.01"))


# =====================================================================
# VENTAS (POS)
# =====================================================================
class Venta(db.Model):
    __tablename__ = "ventas"
    id = db.Column(db.Integer, primary_key=True)
    numero_factura = db.Column(db.String(20), unique=True, nullable=False)  # Serie SENIAT
    fecha = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("clientes.id"))
    cliente = db.relationship("Cliente")
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"))
    usuario = db.relationship("Usuario")

    # Montos en Bs
    subtotal = db.Column(db.Numeric(14, 2), default=0)
    descuento_total = db.Column(db.Numeric(14, 2), default=0)
    base_imponible = db.Column(db.Numeric(14, 2), default=0)
    iva = db.Column(db.Numeric(14, 2), default=0)
    igtf = db.Column(db.Numeric(14, 2), default=0)                 # 3% si paga en divisa
    total = db.Column(db.Numeric(14, 2), default=0)

    tasa_bcv = db.Column(db.Numeric(10, 4), default=0)
    total_usd = db.Column(db.Numeric(14, 2), default=0)

    metodo_pago = db.Column(db.String(30))                          # bs_efectivo, bs_pago_movil, transferencia, divisa_efectivo, zelle, punto
    paga_en_divisa = db.Column(db.Boolean, default=False)           # dispara IGTF

    anulada = db.Column(db.Boolean, default=False)
    motivo_anulacion = db.Column(db.String(255))

    detalles = db.relationship("DetalleVenta", backref="venta",
                               cascade="all, delete-orphan", lazy="joined")


class DetalleVenta(db.Model):
    __tablename__ = "detalles_venta"
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey("ventas.id"), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey("productos.id"), nullable=False)
    producto = db.relationship("Producto")
    lote_id = db.Column(db.Integer, db.ForeignKey("lotes.id"))
    lote = db.relationship("Lote")
    cantidad = db.Column(db.Numeric(12, 3), nullable=False)
    precio_unitario = db.Column(db.Numeric(12, 2), nullable=False)
    descuento_unitario = db.Column(db.Numeric(12, 2), default=0)
    iva_alicuota = db.Column(db.Numeric(4, 2), default=0.16)
    subtotal = db.Column(db.Numeric(14, 2), default=0)


# =====================================================================
# MERMAS / BAJAS SANITARIAS
# =====================================================================
class Merma(db.Model):
    __tablename__ = "mermas"
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    lote_id = db.Column(db.Integer, db.ForeignKey("lotes.id"), nullable=False)
    lote = db.relationship("Lote")
    producto_id = db.Column(db.Integer, db.ForeignKey("productos.id"), nullable=False)
    producto = db.relationship("Producto")
    cantidad = db.Column(db.Numeric(12, 3), nullable=False)
    motivo = db.Column(db.String(40))   # vencido, dañado, rotura_frio, contaminacion, devolucion
    observaciones = db.Column(db.Text)
    valor_perdido = db.Column(db.Numeric(14, 2), default=0)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"))
    usuario = db.relationship("Usuario")


# =====================================================================
# CONTROL SANITARIO COVENIN (cadena de frío)
# =====================================================================
class RegistroSanitario(db.Model):
    __tablename__ = "registros_sanitarios"
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    area = db.Column(db.String(60))                  # nevera_1, vitrina, congelador
    temperatura = db.Column(db.Numeric(4, 1))
    humedad = db.Column(db.Numeric(4, 1))
    responsable_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"))
    responsable = db.relationship("Usuario")
    observaciones = db.Column(db.Text)


# =====================================================================
# NOVEDAD - Notificaciones a clientes
# =====================================================================
class Notificacion(db.Model):
    """
    Sistema de notificaciones para clientes sobre promociones FEFO.
    Permite avisar a clientes (vía WhatsApp/SMS/Email registro)
    cuando hay productos con descuento por proximidad al vencimiento.
    """
    __tablename__ = "notificaciones"
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    cliente_id = db.Column(db.Integer, db.ForeignKey("clientes.id"))
    cliente = db.relationship("Cliente")
    canal = db.Column(db.String(20))                 # whatsapp, sms, email, sistema
    mensaje = db.Column(db.Text, nullable=False)
    leida = db.Column(db.Boolean, default=False)


# =====================================================================
# NOVEDAD - Combo / Recomendación
# =====================================================================
class Combo(db.Model):
    """
    Recomendaciones de combos para uso de productos próximos a vencer.
    Ej: "Tabla de Quesos Falconiana" con productos cercanos a vencimiento.
    """
    __tablename__ = "combos"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    descripcion = db.Column(db.Text)
    productos = db.Column(db.String(400))            # CSV de IDs de producto
    precio_combo = db.Column(db.Numeric(12, 2))
    activo = db.Column(db.Boolean, default=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)


# =====================================================================
# CONFIGURACIÓN VARIABLE
# =====================================================================
class Configuracion(db.Model):
    __tablename__ = "configuracion"
    clave = db.Column(db.String(60), primary_key=True)
    valor = db.Column(db.String(255))

    @classmethod
    def get(cls, clave, default=None):
        row = db.session.get(cls, clave)
        return row.valor if row else default

    @classmethod
    def set(cls, clave, valor):
        row = db.session.get(cls, clave)
        if row:
            row.valor = str(valor)
        else:
            db.session.add(cls(clave=clave, valor=str(valor)))
        db.session.commit()
