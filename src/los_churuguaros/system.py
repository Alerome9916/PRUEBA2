from __future__ import annotations

import json
from dataclasses import asdict
from datetime import UTC, date, datetime, timedelta
from typing import Any

from .compliance import DATE_FMT, ComplianceIssue, VenezuelaComplianceProfile
from .db import connect, init_db
from .fefo import FefoAllocation, LotAvailability, allocate_fefo
from .risk import RiskScore, compute_idrs


class CharcuteriaSystem:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self.compliance = VenezuelaComplianceProfile()
        init_db(self.db_path)

    def _conn(self):
        return connect(self.db_path)

    def _now(self) -> str:
        return datetime.now(UTC).replace(microsecond=0).isoformat()

    def _today(self) -> date:
        return datetime.now(UTC).date()

    def _insert_alert(
        self,
        *,
        conn,
        alert_type: str,
        severity: str,
        entity: str,
        entity_id: int,
        message: str,
        dedupe: bool = True,
    ) -> None:
        if dedupe:
            existing = conn.execute(
                """
                SELECT id FROM alerts
                WHERE alert_type = ? AND entity = ? AND entity_id = ? AND message = ? AND status = 'open'
                """,
                (alert_type, entity, entity_id, message),
            ).fetchone()
            if existing:
                return

        conn.execute(
            """
            INSERT INTO alerts (alert_type, severity, entity, entity_id, message, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'open', ?)
            """,
            (alert_type, severity, entity, entity_id, message, self._now()),
        )

    def _audit(self, conn, event_type: str, payload: dict[str, Any]) -> None:
        conn.execute(
            "INSERT INTO audit_events (event_type, payload, created_at) VALUES (?, ?, ?)",
            (event_type, json.dumps(payload, ensure_ascii=True), self._now()),
        )

    def _raise_if_critical(self, issues: list[ComplianceIssue]) -> None:
        critical = [i for i in issues if i.severity == "critical"]
        if critical:
            raise ValueError("; ".join(i.message for i in critical))

    def add_product(
        self,
        *,
        name: str,
        category: str,
        unit: str,
        sanitary_registry: str,
        shelf_life_days: int,
        min_temp_c: float,
        max_temp_c: float,
    ) -> int:
        issues = self.compliance.validate_product(
            name=name,
            category=category,
            sanitary_registry=sanitary_registry,
            shelf_life_days=shelf_life_days,
            min_temp_c=min_temp_c,
            max_temp_c=max_temp_c,
        )
        self._raise_if_critical(issues)
        with self._conn() as conn:
            cur = conn.execute(
                """
                INSERT INTO products (
                    name, category, unit, sanitary_registry, shelf_life_days, min_temp_c, max_temp_c, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    name.strip(),
                    category.strip().lower(),
                    unit.strip(),
                    sanitary_registry.strip(),
                    shelf_life_days,
                    min_temp_c,
                    max_temp_c,
                    self._now(),
                ),
            )
            product_id = int(cur.lastrowid)
            for issue in issues:
                if issue.severity != "critical":
                    self._insert_alert(
                        conn=conn,
                        alert_type="compliance_product",
                        severity=issue.severity,
                        entity="product",
                        entity_id=product_id,
                        message=issue.message,
                    )
            self._audit(conn, "product_created", {"product_id": product_id, "name": name})
            conn.commit()
            return product_id

    def add_supplier(self, *, name: str, rif: str, sanitary_permit: str) -> int:
        issues = self.compliance.validate_supplier(
            name=name,
            rif=rif,
            sanitary_permit=sanitary_permit,
        )
        self._raise_if_critical(issues)
        with self._conn() as conn:
            cur = conn.execute(
                """
                INSERT INTO suppliers (name, rif, sanitary_permit, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (name.strip(), rif.strip().upper(), sanitary_permit.strip(), self._now()),
            )
            supplier_id = int(cur.lastrowid)
            self._audit(conn, "supplier_created", {"supplier_id": supplier_id, "name": name})
            conn.commit()
            return supplier_id

    def receive_lot(
        self,
        *,
        product_id: int,
        supplier_id: int,
        lot_code: str,
        production_date: str,
        expiry_date: str,
        received_date: str,
        purchase_cost: float,
        quantity_received: float,
        storage_location: str,
    ) -> int:
        with self._conn() as conn:
            product = conn.execute(
                "SELECT id, shelf_life_days FROM products WHERE id = ?",
                (product_id,),
            ).fetchone()
            if not product:
                raise ValueError("Producto no existe.")
            supplier = conn.execute("SELECT id FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
            if not supplier:
                raise ValueError("Proveedor no existe.")

            issues = self.compliance.validate_lot(
                lot_code=lot_code,
                production_date=production_date,
                expiry_date=expiry_date,
                received_date=received_date,
                quantity_received=quantity_received,
                product_shelf_life_days=int(product["shelf_life_days"]),
            )
            self._raise_if_critical(issues)

            cur = conn.execute(
                """
                INSERT INTO lots (
                    product_id, supplier_id, lot_code, production_date, expiry_date, received_date,
                    purchase_cost, quantity_received, quantity_available, status, storage_location, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                """,
                (
                    product_id,
                    supplier_id,
                    lot_code.strip().upper(),
                    production_date,
                    expiry_date,
                    received_date,
                    purchase_cost,
                    quantity_received,
                    quantity_received,
                    storage_location.strip(),
                    self._now(),
                ),
            )
            lot_id = int(cur.lastrowid)

            conn.execute(
                """
                INSERT INTO stock_movements (lot_id, movement_type, quantity, reason, reference, created_at)
                VALUES (?, 'in', ?, 'recepcion_lote', ?, ?)
                """,
                (lot_id, quantity_received, lot_code.strip().upper(), self._now()),
            )

            for issue in issues:
                if issue.severity != "critical":
                    self._insert_alert(
                        conn=conn,
                        alert_type="compliance_lot",
                        severity=issue.severity,
                        entity="lot",
                        entity_id=lot_id,
                        message=issue.message,
                    )

            self._audit(
                conn,
                "lot_received",
                {
                    "lot_id": lot_id,
                    "product_id": product_id,
                    "quantity_received": quantity_received,
                },
            )
            conn.commit()
            return lot_id

    def _available_lots_for_sale(self, conn, product_id: int, sale_date: date) -> list[LotAvailability]:
        rows = conn.execute(
            """
            SELECT id, lot_code, expiry_date, quantity_available
            FROM lots
            WHERE product_id = ?
              AND status = 'active'
              AND quantity_available > 0
              AND expiry_date >= ?
            ORDER BY expiry_date ASC, id ASC
            """,
            (product_id, sale_date.strftime(DATE_FMT)),
        ).fetchall()
        return [
            LotAvailability(
                lot_id=int(row["id"]),
                lot_code=str(row["lot_code"]),
                expiry_date=str(row["expiry_date"]),
                quantity_available=float(row["quantity_available"]),
            )
            for row in rows
        ]

    def create_sale(
        self,
        *,
        customer: str,
        lines: list[dict[str, float]],
        sale_date: str | None = None,
    ) -> dict[str, Any]:
        if not lines:
            raise ValueError("La venta requiere al menos una linea.")

        sale_day = (
            datetime.strptime(sale_date, DATE_FMT).date() if sale_date else self._today()
        )

        with self._conn() as conn:
            sale_cur = conn.execute(
                "INSERT INTO sales (customer, created_at) VALUES (?, ?)",
                (customer.strip(), self._now()),
            )
            sale_id = int(sale_cur.lastrowid)
            output_allocations: list[dict[str, Any]] = []

            for line in lines:
                product_id = int(line["product_id"])
                quantity = float(line["quantity"])
                unit_price = float(line["unit_price"])
                if quantity <= 0:
                    raise ValueError("La cantidad de cada linea debe ser mayor a 0.")

                product = conn.execute(
                    "SELECT id, name FROM products WHERE id = ?",
                    (product_id,),
                ).fetchone()
                if not product:
                    raise ValueError(f"Producto {product_id} no existe.")

                lots = self._available_lots_for_sale(conn, product_id=product_id, sale_date=sale_day)
                allocations = allocate_fefo(lots, quantity)

                item_cur = conn.execute(
                    """
                    INSERT INTO sales_items (sale_id, product_id, quantity, unit_price)
                    VALUES (?, ?, ?, ?)
                    """,
                    (sale_id, product_id, quantity, unit_price),
                )
                sales_item_id = int(item_cur.lastrowid)

                for allocation in allocations:
                    self._register_sale_allocation(
                        conn=conn,
                        sales_item_id=sales_item_id,
                        allocation=allocation,
                        sale_day=sale_day,
                    )
                    output_allocations.append(
                        {
                            "product_id": product_id,
                            "sales_item_id": sales_item_id,
                            "lot_id": allocation.lot_id,
                            "lot_code": allocation.lot_code,
                            "expiry_date": allocation.expiry_date,
                            "quantity": allocation.quantity,
                        }
                    )

            self._audit(conn, "sale_created", {"sale_id": sale_id, "customer": customer, "lines": lines})
            conn.commit()

        return {"sale_id": sale_id, "allocations": output_allocations}

    def _register_sale_allocation(
        self,
        *,
        conn,
        sales_item_id: int,
        allocation: FefoAllocation,
        sale_day: date,
    ) -> None:
        expiry = datetime.strptime(allocation.expiry_date, DATE_FMT).date()
        issues = self.compliance.validate_sale_date(expiry, sale_day)
        self._raise_if_critical(issues)

        conn.execute(
            """
            INSERT INTO sales_allocations (sales_item_id, lot_id, quantity, expiry_date)
            VALUES (?, ?, ?, ?)
            """,
            (sales_item_id, allocation.lot_id, allocation.quantity, allocation.expiry_date),
        )
        conn.execute(
            "UPDATE lots SET quantity_available = quantity_available - ? WHERE id = ?",
            (allocation.quantity, allocation.lot_id),
        )
        conn.execute(
            """
            INSERT INTO stock_movements (lot_id, movement_type, quantity, reason, reference, created_at)
            VALUES (?, 'sale', ?, 'venta_fefo', ?, ?)
            """,
            (allocation.lot_id, allocation.quantity, str(sales_item_id), self._now()),
        )

    def register_temperature(
        self,
        *,
        area: str,
        temperature_c: float,
        logged_at: str | None = None,
        product_id: int | None = None,
        lot_id: int | None = None,
    ) -> dict[str, int]:
        log_ts = logged_at or self._now()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO temperature_logs (area, product_id, lot_id, temperature_c, logged_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (area.strip(), product_id, lot_id, temperature_c, log_ts),
            )

            affected_rows = self._fetch_affected_lots_for_temp(
                conn=conn,
                product_id=product_id,
                lot_id=lot_id,
            )

            deviations = 0
            for row in affected_rows:
                p_min = float(row["min_temp_c"])
                p_max = float(row["max_temp_c"])
                if temperature_c < p_min or temperature_c > p_max:
                    deviations += 1
                    self._insert_alert(
                        conn=conn,
                        alert_type="temperature_deviation",
                        severity="critical",
                        entity="lot",
                        entity_id=int(row["lot_id"]),
                        message=(
                            f"Desviacion termica en {area}: {temperature_c}C fuera de "
                            f"rango {p_min}C-{p_max}C para lote {row['lot_code']}."
                        ),
                    )
            self._audit(
                conn,
                "temperature_logged",
                {
                    "area": area,
                    "temperature_c": temperature_c,
                    "product_id": product_id,
                    "lot_id": lot_id,
                    "deviations": deviations,
                },
            )
            conn.commit()
            return {"affected_lots": len(affected_rows), "deviations": deviations}

    def _fetch_affected_lots_for_temp(self, *, conn, product_id: int | None, lot_id: int | None):
        if lot_id is not None:
            return conn.execute(
                """
                SELECT l.id AS lot_id, l.lot_code, p.min_temp_c, p.max_temp_c
                FROM lots l
                JOIN products p ON p.id = l.product_id
                WHERE l.id = ?
                """,
                (lot_id,),
            ).fetchall()
        if product_id is not None:
            return conn.execute(
                """
                SELECT l.id AS lot_id, l.lot_code, p.min_temp_c, p.max_temp_c
                FROM lots l
                JOIN products p ON p.id = l.product_id
                WHERE l.product_id = ? AND l.status = 'active' AND l.quantity_available > 0
                """,
                (product_id,),
            ).fetchall()
        return conn.execute(
            """
            SELECT l.id AS lot_id, l.lot_code, p.min_temp_c, p.max_temp_c
            FROM lots l
            JOIN products p ON p.id = l.product_id
            WHERE l.status = 'active' AND l.quantity_available > 0
            """
        ).fetchall()

    def run_daily_controls(self, reference_date: str | None = None) -> dict[str, Any]:
        today = datetime.strptime(reference_date, DATE_FMT).date() if reference_date else self._today()
        expiry_alerts = self._run_expiry_controls(today)
        risk_results = self.run_risk_scan(reference_date=reference_date)
        compliance_report = self.build_compliance_report()
        return {
            "date": today.strftime(DATE_FMT),
            "expiry_alerts_generated": expiry_alerts,
            "high_or_critical_risk_lots": len([r for r in risk_results if r["level"] in {"high", "critical"}]),
            "compliance_summary": compliance_report["summary"],
        }

    def _run_expiry_controls(self, today: date) -> int:
        generated = 0
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT id, lot_code, expiry_date, quantity_available
                FROM lots
                WHERE status = 'active' AND quantity_available > 0
                """
            ).fetchall()

            for row in rows:
                lot_id = int(row["id"])
                expiry = datetime.strptime(str(row["expiry_date"]), DATE_FMT).date()
                days_to_expiry = (expiry - today).days
                if days_to_expiry < 0:
                    severity = "critical"
                    message = f"Lote {row['lot_code']} vencido hace {abs(days_to_expiry)} dias."
                elif days_to_expiry <= 3:
                    severity = "critical"
                    message = f"Lote {row['lot_code']} vence en {days_to_expiry} dias."
                elif days_to_expiry <= 7:
                    severity = "warning"
                    message = f"Lote {row['lot_code']} proximo a vencer (<= 7 dias)."
                elif days_to_expiry <= 15:
                    severity = "warning"
                    message = f"Lote {row['lot_code']} en ventana preventiva (<= 15 dias)."
                else:
                    continue

                before = conn.total_changes
                self._insert_alert(
                    conn=conn,
                    alert_type="expiry",
                    severity=severity,
                    entity="lot",
                    entity_id=lot_id,
                    message=message,
                )
                if conn.total_changes > before:
                    generated += 1

            self._audit(conn, "daily_expiry_control", {"date": today.strftime(DATE_FMT), "alerts": generated})
            conn.commit()
        return generated

    def run_risk_scan(self, reference_date: str | None = None) -> list[dict[str, Any]]:
        today = datetime.strptime(reference_date, DATE_FMT).date() if reference_date else self._today()
        output: list[dict[str, Any]] = []
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT l.id AS lot_id, l.lot_code, l.expiry_date, p.min_temp_c, p.max_temp_c
                FROM lots l
                JOIN products p ON p.id = l.product_id
                WHERE l.status = 'active' AND l.quantity_available > 0
                """
            ).fetchall()

            for row in rows:
                lot_id = int(row["lot_id"])
                lot_code = str(row["lot_code"])
                expiry = datetime.strptime(str(row["expiry_date"]), DATE_FMT).date()
                days_to_expiry = (expiry - today).days

                thermal_deviations = int(
                    conn.execute(
                        """
                        SELECT COUNT(*) AS c
                        FROM temperature_logs
                        WHERE lot_id = ?
                          AND date(logged_at) >= date(?, '-7 days')
                          AND (temperature_c < ? OR temperature_c > ?)
                        """,
                        (
                            lot_id,
                            today.strftime(DATE_FMT),
                            float(row["min_temp_c"]),
                            float(row["max_temp_c"]),
                        ),
                    ).fetchone()["c"]
                )

                movement_date_row = conn.execute(
                    """
                    SELECT created_at
                    FROM stock_movements
                    WHERE lot_id = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (lot_id,),
                ).fetchone()
                if movement_date_row:
                    last_move = datetime.fromisoformat(str(movement_date_row["created_at"])).date()
                else:
                    last_move = today
                days_without_rotation = max(0, (today - last_move).days)

                risk: RiskScore = compute_idrs(
                    lot_id=lot_id,
                    lot_code=lot_code,
                    days_to_expiry=days_to_expiry,
                    thermal_deviations_7d=thermal_deviations,
                    days_without_rotation=days_without_rotation,
                )
                output.append(asdict(risk))

                if risk.level in {"high", "critical"}:
                    self._insert_alert(
                        conn=conn,
                        alert_type="idrs",
                        severity="critical" if risk.level == "critical" else "warning",
                        entity="lot",
                        entity_id=lot_id,
                        message=(
                            f"IDRS={risk.score} ({risk.level}) en lote {lot_code}. "
                            f"Accion: {risk.recommendation}"
                        ),
                    )
            conn.commit()
        return sorted(output, key=lambda item: item["score"], reverse=True)

    def build_compliance_report(self) -> dict[str, Any]:
        with self._conn() as conn:
            open_alerts = conn.execute(
                """
                SELECT severity, COUNT(*) AS c
                FROM alerts
                WHERE status = 'open'
                GROUP BY severity
                """
            ).fetchall()
            summary = {"critical": 0, "warning": 0, "info": 0}
            for row in open_alerts:
                summary[str(row["severity"])] = int(row["c"])

            expiring_rows = conn.execute(
                """
                SELECT COUNT(*) AS c
                FROM lots
                WHERE status = 'active' AND quantity_available > 0
                  AND date(expiry_date) <= date('now', '+7 days')
                """
            ).fetchone()
            expired_rows = conn.execute(
                """
                SELECT COUNT(*) AS c
                FROM lots
                WHERE status = 'active' AND quantity_available > 0
                  AND date(expiry_date) < date('now')
                """
            ).fetchone()

            return {
                "summary": summary,
                "references": list(self.compliance.references),
                "operational_indicators": {
                    "lots_expiring_7_days": int(expiring_rows["c"]),
                    "lots_expired_active": int(expired_rows["c"]),
                },
            }

    def dashboard(self) -> dict[str, Any]:
        with self._conn() as conn:
            products = int(conn.execute("SELECT COUNT(*) AS c FROM products").fetchone()["c"])
            suppliers = int(conn.execute("SELECT COUNT(*) AS c FROM suppliers").fetchone()["c"])
            active_lots = int(
                conn.execute(
                    """
                    SELECT COUNT(*) AS c FROM lots
                    WHERE status = 'active' AND quantity_available > 0
                    """
                ).fetchone()["c"]
            )
            pending_alerts = int(
                conn.execute("SELECT COUNT(*) AS c FROM alerts WHERE status = 'open'").fetchone()["c"]
            )
            inventory_value = float(
                conn.execute(
                    """
                    SELECT COALESCE(SUM(quantity_available * purchase_cost), 0) AS v
                    FROM lots
                    WHERE status = 'active'
                    """
                ).fetchone()["v"]
            )

        high_risk = [r for r in self.run_risk_scan() if r["level"] in {"high", "critical"}]
        return {
            "products": products,
            "suppliers": suppliers,
            "active_lots": active_lots,
            "open_alerts": pending_alerts,
            "inventory_value_estimate": round(inventory_value, 2),
            "high_risk_lots": len(high_risk),
        }

    def seed_demo_data(self) -> dict[str, int]:
        with self._conn() as conn:
            existing = int(conn.execute("SELECT COUNT(*) AS c FROM products").fetchone()["c"])
            if existing > 0:
                return {"products": existing, "suppliers": 0, "lots": 0}

        p1 = self.add_product(
            name="Jamon de Pierna Premium",
            category="refrigerado",
            unit="kg",
            sanitary_registry="RS-VEN-JP-2026-001",
            shelf_life_days=60,
            min_temp_c=0.0,
            max_temp_c=4.0,
        )
        p2 = self.add_product(
            name="Queso Gouda Rebanado",
            category="refrigerado",
            unit="kg",
            sanitary_registry="RS-VEN-QG-2026-004",
            shelf_life_days=45,
            min_temp_c=0.0,
            max_temp_c=4.0,
        )
        supplier = self.add_supplier(
            name="Distribuidora Andina 2026, C.A.",
            rif="J-412345678",
            sanitary_permit="PS-AND-7788",
        )
        today = self._today()
        self.receive_lot(
            product_id=p1,
            supplier_id=supplier,
            lot_code="JP-A1",
            production_date=(today - timedelta(days=15)).strftime(DATE_FMT),
            expiry_date=(today + timedelta(days=12)).strftime(DATE_FMT),
            received_date=(today - timedelta(days=8)).strftime(DATE_FMT),
            purchase_cost=4.5,
            quantity_received=40,
            storage_location="Cava 1",
        )
        self.receive_lot(
            product_id=p1,
            supplier_id=supplier,
            lot_code="JP-A2",
            production_date=(today - timedelta(days=8)).strftime(DATE_FMT),
            expiry_date=(today + timedelta(days=25)).strftime(DATE_FMT),
            received_date=(today - timedelta(days=2)).strftime(DATE_FMT),
            purchase_cost=4.7,
            quantity_received=30,
            storage_location="Cava 1",
        )
        self.receive_lot(
            product_id=p2,
            supplier_id=supplier,
            lot_code="QG-B1",
            production_date=(today - timedelta(days=12)).strftime(DATE_FMT),
            expiry_date=(today + timedelta(days=9)).strftime(DATE_FMT),
            received_date=(today - timedelta(days=4)).strftime(DATE_FMT),
            purchase_cost=5.1,
            quantity_received=35,
            storage_location="Cava 2",
        )
        return {"products": 2, "suppliers": 1, "lots": 3}

    def list_open_alerts(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT id, alert_type, severity, entity, entity_id, message, created_at
                FROM alerts
                WHERE status = 'open'
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
            return [dict(row) for row in rows]
