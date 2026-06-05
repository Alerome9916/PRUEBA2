"""Extensiones Flask compartidas."""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = "auth.login"
login_manager.login_message = "Debe iniciar sesión para acceder al sistema."
login_manager.login_message_category = "warning"
