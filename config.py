"""
Configuración del Sistema Los Churuguaros
Cumple con normativas SENIAT, COVENIN e INSAI (Venezuela)
"""
import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    # === Flask ===
    SECRET_KEY = os.environ.get("SECRET_KEY", "churuguaros-charcuteria-ve-2026-secret")
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)

    # === Base de datos ===
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(basedir, "instance", "churuguaros.db"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # === Empresa ===
    EMPRESA = {
        "nombre": "Charcutería Los Churuguaros, C.A.",
        "rif": "J-50123456-7",
        "direccion": "Av. Bolívar, Local 12, Churuguara, Estado Falcón, Venezuela",
        "telefono": "+58 268-555-1234",
        "email": "ventas@loschuruguaros.com.ve",
        "registro_sanitario": "INSAI-CH-2026-0042",
        "permiso_sanitario": "MS-CH-2026-1187",
    }

    # === Normativa Fiscal Venezuela ===
    IVA_ALICUOTA = 0.16                # IVA general 16% (Ley IVA)
    IVA_REDUCIDO = 0.08                # IVA reducido para algunos alimentos
    IGTF_ALICUOTA = 0.03               # IGTF 3% (pagos en divisa, conforme Ley IGTF)
    MONEDA_LOCAL = "Bs"
    MONEDA_REFERENCIA = "USD"
    TASA_BCV_DEFAULT = 36.50           # Tasa BCV referencial editable en config

    # Serie de facturación SENIAT (Providencia 00071)
    FACTURA_SERIE = "A"
    FACTURA_NUMERO_INICIAL = 1
    MAQUINA_FISCAL_SERIAL = "Z1B5000000"

    # === FEFO y Caducidad (Norma COVENIN 2952) ===
    # Umbrales de alerta de caducidad en días
    DIAS_ALERTA_ROJO = 3          # Crítico - retirar y rematar
    DIAS_ALERTA_AMARILLO = 7      # Próximo a vencer
    DIAS_ALERTA_VERDE = 30        # Vigilancia

    # Motor de descuento dinámico (NOVEDAD)
    DESCUENTO_DINAMICO_HABILITADO = True
    DESCUENTO_DIAS_INICIO = 14    # A partir de cuántos días al vencimiento aplica
    DESCUENTO_MAXIMO_PCT = 0.50   # 50% es el máximo descuento aplicable

    # === Almacenamiento ===
    QR_OUTPUT_DIR = os.path.join(basedir, "app", "static", "qr")
    UPLOAD_FOLDER = os.path.join(basedir, "app", "static", "img")
