"""Fábrica de la aplicación Los Churuguaros."""
import os
from decimal import Decimal
from datetime import datetime, date

from flask import Flask

from .extensions import db, login_manager


def create_app(config_class="config.Config"):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)

    os.makedirs(app.instance_path, exist_ok=True)
    os.makedirs(app.config["QR_OUTPUT_DIR"], exist_ok=True)

    db.init_app(app)
    login_manager.init_app(app)

    # === Blueprints ===
    from .blueprints.auth import bp as auth_bp
    from .blueprints.dashboard import bp as dashboard_bp
    from .blueprints.productos import bp as productos_bp
    from .blueprints.proveedores import bp as proveedores_bp
    from .blueprints.clientes import bp as clientes_bp
    from .blueprints.inventario import bp as inventario_bp
    from .blueprints.ventas import bp as ventas_bp
    from .blueprints.mermas import bp as mermas_bp
    from .blueprints.reportes import bp as reportes_bp
    from .blueprints.alertas import bp as alertas_bp
    from .blueprints.novedad import bp as novedad_bp
    from .blueprints.usuarios import bp as usuarios_bp
    from .blueprints.configuracion import bp as configuracion_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(productos_bp, url_prefix="/productos")
    app.register_blueprint(proveedores_bp, url_prefix="/proveedores")
    app.register_blueprint(clientes_bp, url_prefix="/clientes")
    app.register_blueprint(inventario_bp, url_prefix="/inventario")
    app.register_blueprint(ventas_bp, url_prefix="/ventas")
    app.register_blueprint(mermas_bp, url_prefix="/mermas")
    app.register_blueprint(reportes_bp, url_prefix="/reportes")
    app.register_blueprint(alertas_bp, url_prefix="/alertas")
    app.register_blueprint(novedad_bp, url_prefix="/novedad")
    app.register_blueprint(usuarios_bp, url_prefix="/usuarios")
    app.register_blueprint(configuracion_bp, url_prefix="/configuracion")

    # === Context processors ===
    from .utils import get_tasa_bcv

    @app.context_processor
    def inject_globals():
        return {
            "empresa": app.config["EMPRESA"],
            "tasa_bcv": get_tasa_bcv() if _has_db() else Decimal("36.50"),
            "now": datetime.utcnow(),
            "today": date.today(),
        }

    def _has_db():
        try:
            return os.path.exists(os.path.join(app.instance_path, "churuguaros.db"))
        except Exception:
            return False

    # === Filtros Jinja ===
    @app.template_filter("bs")
    def bs(value):
        try:
            return f"Bs. {Decimal(str(value)):,.2f}"
        except Exception:
            return value

    @app.template_filter("usd")
    def usd(value):
        try:
            return f"$ {Decimal(str(value)):,.2f}"
        except Exception:
            return value

    @app.template_filter("fecha")
    def fecha(value):
        if not value:
            return "-"
        if hasattr(value, "strftime"):
            return value.strftime("%d/%m/%Y")
        return str(value)

    @app.template_filter("fechahora")
    def fechahora(value):
        if not value:
            return "-"
        if hasattr(value, "strftime"):
            return value.strftime("%d/%m/%Y %H:%M")
        return str(value)

    # === CLI ===
    @app.cli.command("init-db")
    def init_db():
        """Crea tablas y carga datos de demo."""
        from .seed import seed_all
        with app.app_context():
            db.create_all()
            seed_all()
            print("Base de datos inicializada con datos de demo.")

    with app.app_context():
        db.create_all()

    return app
