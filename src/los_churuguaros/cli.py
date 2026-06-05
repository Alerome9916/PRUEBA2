from __future__ import annotations

import argparse
import json
from pprint import pprint

from .db import init_db
from .system import CharcuteriaSystem


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="churuguaros",
        description="Sistema de inventario FEFO y caducidad para Los Churuguaros.",
    )
    parser.add_argument("--db", default="data/churuguaros.db", help="Ruta de base de datos SQLite.")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init-db", help="Inicializa la base de datos.")
    sub.add_parser("seed-demo", help="Carga datos demo.")
    sub.add_parser("dashboard", help="Muestra resumen operacional.")
    sub.add_parser("run-daily", help="Ejecuta controles diarios.")
    sub.add_parser("risk-scan", help="Ejecuta escaneo IDRS por lote.")
    sub.add_parser("compliance-report", help="Genera reporte de cumplimiento.")
    sub.add_parser("open-alerts", help="Lista alertas abiertas.")

    add_product = sub.add_parser("add-product", help="Registra producto.")
    add_product.add_argument("--name", required=True)
    add_product.add_argument("--category", required=True, choices=["refrigerado", "congelado", "curado"])
    add_product.add_argument("--unit", required=True, default="kg")
    add_product.add_argument("--sanitary-registry", required=True)
    add_product.add_argument("--shelf-life-days", required=True, type=int)
    add_product.add_argument("--min-temp-c", required=True, type=float)
    add_product.add_argument("--max-temp-c", required=True, type=float)

    add_supplier = sub.add_parser("add-supplier", help="Registra proveedor.")
    add_supplier.add_argument("--name", required=True)
    add_supplier.add_argument("--rif", required=True)
    add_supplier.add_argument("--sanitary-permit", required=True)

    receive_lot = sub.add_parser("receive-lot", help="Recibe lote en inventario.")
    receive_lot.add_argument("--product-id", required=True, type=int)
    receive_lot.add_argument("--supplier-id", required=True, type=int)
    receive_lot.add_argument("--lot-code", required=True)
    receive_lot.add_argument("--production-date", required=True, help="YYYY-MM-DD")
    receive_lot.add_argument("--expiry-date", required=True, help="YYYY-MM-DD")
    receive_lot.add_argument("--received-date", required=True, help="YYYY-MM-DD")
    receive_lot.add_argument("--purchase-cost", required=True, type=float)
    receive_lot.add_argument("--quantity", required=True, type=float)
    receive_lot.add_argument("--storage-location", required=True)

    sale = sub.add_parser("sale", help="Registra venta con asignacion FEFO.")
    sale.add_argument("--customer", required=True)
    sale.add_argument(
        "--lines",
        required=True,
        help="JSON array. Ej: [{\"product_id\":1,\"quantity\":5,\"unit_price\":4.2}]",
    )
    sale.add_argument("--sale-date", required=False, help="YYYY-MM-DD")

    temp = sub.add_parser("log-temp", help="Registra temperatura y evalua desviaciones.")
    temp.add_argument("--area", required=True)
    temp.add_argument("--temperature-c", required=True, type=float)
    temp.add_argument("--product-id", type=int)
    temp.add_argument("--lot-id", type=int)

    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    if args.command == "init-db":
        init_db(args.db)
        print("Base de datos inicializada.")
        return

    system = CharcuteriaSystem(args.db)

    if args.command == "seed-demo":
        pprint(system.seed_demo_data())
        return
    if args.command == "dashboard":
        pprint(system.dashboard())
        return
    if args.command == "run-daily":
        pprint(system.run_daily_controls())
        return
    if args.command == "risk-scan":
        pprint(system.run_risk_scan())
        return
    if args.command == "compliance-report":
        pprint(system.build_compliance_report())
        return
    if args.command == "open-alerts":
        pprint(system.list_open_alerts())
        return

    if args.command == "add-product":
        product_id = system.add_product(
            name=args.name,
            category=args.category,
            unit=args.unit,
            sanitary_registry=args.sanitary_registry,
            shelf_life_days=args.shelf_life_days,
            min_temp_c=args.min_temp_c,
            max_temp_c=args.max_temp_c,
        )
        print(f"Producto registrado: {product_id}")
        return

    if args.command == "add-supplier":
        supplier_id = system.add_supplier(
            name=args.name,
            rif=args.rif,
            sanitary_permit=args.sanitary_permit,
        )
        print(f"Proveedor registrado: {supplier_id}")
        return

    if args.command == "receive-lot":
        lot_id = system.receive_lot(
            product_id=args.product_id,
            supplier_id=args.supplier_id,
            lot_code=args.lot_code,
            production_date=args.production_date,
            expiry_date=args.expiry_date,
            received_date=args.received_date,
            purchase_cost=args.purchase_cost,
            quantity_received=args.quantity,
            storage_location=args.storage_location,
        )
        print(f"Lote recibido: {lot_id}")
        return

    if args.command == "sale":
        lines = json.loads(args.lines)
        result = system.create_sale(
            customer=args.customer,
            lines=lines,
            sale_date=args.sale_date,
        )
        pprint(result)
        return

    if args.command == "log-temp":
        result = system.register_temperature(
            area=args.area,
            temperature_c=args.temperature_c,
            product_id=args.product_id,
            lot_id=args.lot_id,
        )
        pprint(result)
        return

    parser.error("Comando no soportado.")


if __name__ == "__main__":
    main()
