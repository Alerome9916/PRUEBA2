"""
Carga de datos demo para Los Churuguaros:
- Usuarios admin/cajero/almacén/sanitario
- Categorías típicas de una charcutería venezolana
- Productos representativos (queso de mano, jamón endiablado, mortadela, etc.)
- Proveedores y clientes
- Lotes con distintas fechas de vencimiento (algunos en rojo/amarillo/verde)
- Ventas históricas
- Configuración base
"""
from decimal import Decimal
from datetime import date, timedelta, datetime
import random

from .extensions import db
from .models import (
    Usuario, Rol, Categoria, UnidadMedida, Proveedor, Cliente,
    Producto, Lote, Venta, DetalleVenta, RegistroSanitario,
    Configuracion
)
from .utils import generar_codigo_lote, calcular_totales_venta, proximo_numero_factura


def _crear_usuarios():
    if Usuario.query.count():
        return
    for u, nombre, rol, pwd in [
        ("admin", "Administrador Principal", Rol.ADMIN, "admin123"),
        ("cajero", "María Aldana", Rol.CAJERO, "cajero123"),
        ("almacen", "Pedro Colina", Rol.ALMACEN, "almacen123"),
        ("sanitario", "Lcda. Yuranis Reyes", Rol.SANITARIO, "sanitario123"),
    ]:
        usr = Usuario(usuario=u, nombre=nombre, rol=rol)
        usr.set_password(pwd)
        db.session.add(usr)
    db.session.commit()


def _crear_catalogos():
    if not UnidadMedida.query.count():
        for c, d in [("KG", "Kilogramo"), ("G", "Gramo"),
                     ("UND", "Unidad"), ("LT", "Litro"),
                     ("ML", "Mililitro"), ("PAQ", "Paquete")]:
            db.session.add(UnidadMedida(codigo=c, descripcion=d))
        db.session.commit()

    if not Categoria.query.count():
        cats = [
            ("Embutidos", "Salchichones, salami, chorizos, longanizas"),
            ("Quesos", "Quesos artesanales y comerciales"),
            ("Jamones", "Jamón cocido, ahumado, serrano, endiablado"),
            ("Carnes Frías", "Pavo, pollo, mortadela, paté"),
            ("Aceitunas y Encurtidos", "Aceitunas, pepinillos, cebollitas"),
            ("Conservas", "Atún, sardinas, conservas en aceite"),
            ("Lácteos", "Mantequilla, yogurt, crema, leche"),
            ("Aderezos y Salsas", "Mayonesa, mostaza, salsas gourmet"),
            ("Panes Especiales", "Pan ciabatta, baguette, pan árabe"),
            ("Vinos y Bebidas", "Vinos, refrescos artesanales"),
        ]
        for n, d in cats:
            db.session.add(Categoria(nombre=n, descripcion=d))
        db.session.commit()


def _crear_proveedores():
    if Proveedor.query.count():
        return
    provs = [
        ("J-30123456-7", "Lácteos Falcón C.A.", "Luis Pérez", "0268-2451111", "INSAI-FAL-1023"),
        ("J-29876543-1", "Embutidos San Antonio", "Carlos Mendoza", "0212-5559876", "INSAI-DC-2008"),
        ("J-31112233-4", "Quesos de la Sierra", "Ana Pacheco", "0274-7771234", "INSAI-MER-3344"),
        ("J-30445566-7", "Charcutería Importadora Olimpo", "Roberto Bianchi", "0212-9990001", "INSAI-DC-5510"),
        ("J-29998877-6", "Aceitunas y Encurtidos La Mediterránea", "Sofía Russo", "0241-8884455", "INSAI-CAR-7720"),
    ]
    for rif, nombre, contacto, tel, reg in provs:
        db.session.add(Proveedor(
            rif=rif, nombre=nombre, contacto=contacto, telefono=tel,
            email=f"ventas@{nombre.split()[0].lower()}.com.ve",
            direccion="Venezuela", registro_sanitario=reg
        ))
    db.session.commit()


def _crear_clientes():
    if Cliente.query.count():
        return
    cs = [
        ("V", "12345678", "Restaurante El Picnic"),
        ("V", "8765432", "Hotel Médanos Suites"),
        ("V", "15123987", "Carmen Vargas"),
        ("J", "300456789", "Catering Falconiano CA"),
        ("V", "20543210", "José Pérez"),
        ("V", "9876543", "Sra. Lucía Rivero"),
    ]
    for td, doc, nom in cs:
        db.session.add(Cliente(tipo_doc=td, documento=doc, nombre=nom,
                               telefono="0414-" + str(random.randint(1000000, 9999999)),
                               acepta_notificaciones=True))
    db.session.commit()


def _crear_productos():
    if Producto.query.count():
        return
    cat = {c.nombre: c.id for c in Categoria.query.all()}
    und = {u.codigo: u.id for u in UnidadMedida.query.all()}

    productos = [
        # (codigo, nombre, categoria, unidad, p_compra, p_venta, iva, vida_util, t_min, t_max, stock_min)
        ("QM001", "Queso de Mano artesanal", "Quesos", "KG", 35.00, 58.00, 0.16, 14, 2, 6, 2),
        ("QG001", "Queso Guayanés", "Quesos", "KG", 42.00, 68.00, 0.16, 20, 2, 6, 2),
        ("QP001", "Queso Paisa", "Quesos", "KG", 38.00, 60.00, 0.16, 25, 2, 6, 2),
        ("QPF001", "Queso Palmita Fresco", "Quesos", "KG", 45.00, 72.00, 0.16, 18, 2, 6, 2),
        ("QC001", "Queso Crema importado", "Quesos", "KG", 80.00, 130.00, 0.16, 60, 2, 8, 1),
        ("QM002", "Queso Mozzarella fior di latte", "Quesos", "KG", 95.00, 152.00, 0.16, 30, 2, 8, 1),

        ("JC001", "Jamón Cocido Plumrose", "Jamones", "KG", 110.00, 175.00, 0.16, 30, 0, 4, 2),
        ("JA001", "Jamón Ahumado Premium", "Jamones", "KG", 165.00, 260.00, 0.16, 45, 0, 4, 1),
        ("JE001", "Jamón Endiablado tarro", "Jamones", "UND", 22.00, 38.00, 0.16, 365, 5, 25, 10),
        ("JS001", "Jamón Serrano importado", "Jamones", "KG", 280.00, 440.00, 0.16, 120, 0, 4, 0.5),

        ("MV001", "Mortadela de Pavo", "Carnes Frías", "KG", 60.00, 95.00, 0.16, 21, 0, 4, 3),
        ("MB001", "Mortadela Bolonesa", "Carnes Frías", "KG", 55.00, 88.00, 0.16, 21, 0, 4, 3),
        ("PV001", "Pechuga de Pavo ahumada", "Carnes Frías", "KG", 130.00, 205.00, 0.16, 25, 0, 4, 1),
        ("PT001", "Paté de hígado", "Carnes Frías", "UND", 18.00, 32.00, 0.16, 90, 0, 4, 5),

        ("SS001", "Salchichón cervecero", "Embutidos", "KG", 75.00, 120.00, 0.16, 45, 0, 6, 2),
        ("SC001", "Salchicha Tipo Frankfurt", "Embutidos", "KG", 65.00, 105.00, 0.16, 30, 0, 4, 3),
        ("CH001", "Chorizo Carupanero", "Embutidos", "KG", 70.00, 115.00, 0.16, 21, 0, 4, 2),
        ("SA001", "Salami italiano", "Embutidos", "KG", 145.00, 230.00, 0.16, 90, 0, 8, 1),
        ("LO001", "Longaniza Falconiana", "Embutidos", "KG", 68.00, 110.00, 0.16, 18, 0, 4, 2),

        ("AV001", "Aceitunas Verdes rellenas (250g)", "Aceitunas y Encurtidos", "UND", 14.00, 24.00, 0.16, 365, 5, 25, 6),
        ("AC001", "Aceitunas Negras Kalamata", "Aceitunas y Encurtidos", "KG", 95.00, 155.00, 0.16, 90, 5, 18, 2),
        ("EP001", "Pepinillos en vinagre", "Aceitunas y Encurtidos", "UND", 10.00, 18.00, 0.16, 365, 5, 25, 8),

        ("AT001", "Atún en aceite (180g)", "Conservas", "UND", 8.00, 14.50, 0.16, 730, 5, 30, 12),
        ("SR001", "Sardinas en tomate (170g)", "Conservas", "UND", 6.50, 11.00, 0.16, 730, 5, 30, 10),

        ("MT001", "Mantequilla artesanal (200g)", "Lácteos", "UND", 14.00, 23.00, 0.16, 60, 0, 4, 8),
        ("YG001", "Yogurt griego natural (500g)", "Lácteos", "UND", 18.00, 29.00, 0.16, 25, 0, 6, 5),
        ("CL001", "Crema de Leche (500ml)", "Lácteos", "UND", 12.00, 20.00, 0.08, 30, 0, 6, 6),

        ("MY001", "Mayonesa Mavesa (445g)", "Aderezos y Salsas", "UND", 10.00, 17.00, 0.16, 365, 5, 28, 15),
        ("MO001", "Mostaza Dijon importada", "Aderezos y Salsas", "UND", 19.00, 32.00, 0.16, 365, 5, 25, 4),

        ("PB001", "Pan Baguette del día", "Panes Especiales", "UND", 6.00, 12.00, 0.16, 2, 15, 28, 6),
        ("PC001", "Pan Ciabatta artesanal", "Panes Especiales", "UND", 8.00, 16.00, 0.16, 2, 15, 28, 4),
        ("PA001", "Pan Árabe (paquete x6)", "Panes Especiales", "PAQ", 9.00, 15.00, 0.16, 5, 15, 28, 5),

        ("VR001", "Vino tinto Reserva (750ml)", "Vinos y Bebidas", "UND", 55.00, 92.00, 0.16, 1825, 5, 25, 4),
    ]
    for cod, nom, c, u, pc, pv, iva, vu, tmin, tmax, smin in productos:
        db.session.add(Producto(
            codigo=cod, nombre=nom, categoria_id=cat[c], unidad_id=und[u],
            precio_compra=Decimal(str(pc)), precio_venta=Decimal(str(pv)),
            iva_alicuota=Decimal(str(iva)), vida_util_dias=vu,
            temperatura_min=Decimal(str(tmin)), temperatura_max=Decimal(str(tmax)),
            stock_minimo=Decimal(str(smin)), es_refrigerado=(tmax <= 10)
        ))
    db.session.commit()


def _crear_lotes():
    if Lote.query.count():
        return
    productos = Producto.query.all()
    proveedores = Proveedor.query.all()
    random.seed(42)
    hoy = date.today()

    # Para CADA producto creamos 2-3 lotes con distintas fechas
    # Algunos próximos a vencer para mostrar el sistema
    for p in productos:
        n_lotes = random.randint(2, 3)
        for i in range(n_lotes):
            prov = random.choice(proveedores)
            if i == 0:
                # primer lote: cerca de vencimiento (semáforo rojo/amarillo)
                offset = random.choice([1, 2, 4, 6, 9])
            elif i == 1:
                offset = random.randint(15, 45)
            else:
                offset = random.randint(60, max(60, p.vida_util_dias))
            f_venc = hoy + timedelta(days=offset)
            cant = Decimal(str(round(random.uniform(8, 35), 2)))
            cu = Decimal(p.precio_compra or 0)
            lote = Lote(
                codigo=generar_codigo_lote() + f"-{p.id}-{i}",
                producto=p, proveedor=prov,
                fecha_ingreso=hoy - timedelta(days=random.randint(0, 5)),
                fecha_elaboracion=hoy - timedelta(days=random.randint(5, 15)),
                fecha_vencimiento=f_venc,
                cantidad_inicial=cant,
                cantidad_actual=cant,
                costo_unitario=cu,
                temperatura_recepcion=Decimal(str(round(random.uniform(2, 6), 1))),
                documento_sanitario=f"INSAI-{random.randint(1000,9999)}",
                observaciones="Lote demo",
            )
            db.session.add(lote)
    db.session.commit()

    # Generar QR para cada lote
    from .utils import generar_qr_lote
    for l in Lote.query.all():
        try:
            generar_qr_lote(l)
        except Exception:
            pass
    db.session.commit()


def _crear_registros_sanitarios():
    if RegistroSanitario.query.count():
        return
    user = Usuario.query.filter_by(rol=Rol.SANITARIO).first()
    for d in range(0, 5):
        f = datetime.utcnow() - timedelta(days=d, hours=random.randint(0, 12))
        for area in ["nevera_principal", "vitrina_jamones", "vitrina_quesos"]:
            db.session.add(RegistroSanitario(
                fecha=f, area=area,
                temperatura=Decimal(str(round(random.uniform(1.5, 5.5), 1))),
                humedad=Decimal(str(round(random.uniform(60, 80), 1))),
                responsable_id=user.id if user else None,
                observaciones="Lectura rutinaria"
            ))
    db.session.commit()


def _crear_ventas_historicas():
    """Genera unas ventas para que el motor predictivo tenga velocidad de consumo."""
    if Venta.query.count():
        return
    cajero = Usuario.query.filter_by(rol=Rol.CAJERO).first()
    if not cajero:
        return
    clientes = Cliente.query.all()
    productos = Producto.query.all()
    if not productos:
        return

    random.seed(7)
    tasa = Decimal("36.50")
    n_ventas = 40
    for i in range(n_ventas):
        fecha_v = datetime.utcnow() - timedelta(days=random.randint(0, 28),
                                                hours=random.randint(8, 19),
                                                minutes=random.randint(0, 59))
        # 2-4 ítems por venta
        items_detalle = []
        detalles_db = []
        for _ in range(random.randint(2, 4)):
            p = random.choice(productos)
            # tomar el lote FEFO
            lote = (Lote.query.filter_by(producto=p, activo=True)
                    .filter(Lote.cantidad_actual > 0)
                    .order_by(Lote.fecha_vencimiento.asc()).first())
            if not lote:
                continue
            cant = Decimal(str(round(random.uniform(0.3, 2.5), 2)))
            if cant > lote.cantidad_actual:
                cant = lote.cantidad_actual
            pu = Decimal(p.precio_venta or 0)
            items_detalle.append({
                "cantidad": cant, "precio_unitario": pu,
                "descuento_unitario": Decimal("0"), "iva_alicuota": p.iva_alicuota,
            })
            detalles_db.append(DetalleVenta(
                producto=p, lote=lote, cantidad=cant, precio_unitario=pu,
                descuento_unitario=Decimal("0"), iva_alicuota=p.iva_alicuota,
                subtotal=(cant * pu).quantize(Decimal("0.01")),
            ))
            lote.cantidad_actual = Decimal(lote.cantidad_actual) - cant
        if not items_detalle:
            continue
        paga_div = random.random() < 0.25
        tot = calcular_totales_venta(items_detalle, paga_div, tasa)
        v = Venta(
            numero_factura=proximo_numero_factura(),
            fecha=fecha_v,
            cliente_id=random.choice(clientes).id if (clientes and random.random() > 0.4) else None,
            usuario_id=cajero.id,
            subtotal=tot["subtotal"], descuento_total=tot["descuento_total"],
            base_imponible=tot["base_imponible"], iva=tot["iva"],
            igtf=tot["igtf"], total=tot["total"],
            tasa_bcv=tasa, total_usd=tot["total_usd"],
            metodo_pago="divisa_efectivo" if paga_div else "bs_pago_movil",
            paga_en_divisa=paga_div,
        )
        for d in detalles_db:
            v.detalles.append(d)
        db.session.add(v)
    db.session.commit()


def _crear_configuracion():
    if not Configuracion.get("tasa_bcv"):
        Configuracion.set("tasa_bcv", "36.50")


def seed_all():
    _crear_usuarios()
    _crear_catalogos()
    _crear_proveedores()
    _crear_clientes()
    _crear_productos()
    _crear_lotes()
    _crear_registros_sanitarios()
    _crear_ventas_historicas()
    _crear_configuracion()
