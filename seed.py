"""Script independiente para cargar la base de datos demo.

Uso:
    python seed.py
"""
from app import create_app
from app.extensions import db
from app.seed import seed_all

app = create_app()
with app.app_context():
    db.create_all()
    seed_all()
    print("✅ Base de datos lista. Usuarios demo:")
    print("   admin / admin123")
    print("   cajero / cajero123")
    print("   almacen / almacen123")
    print("   sanitario / sanitario123")
