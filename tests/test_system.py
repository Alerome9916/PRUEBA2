from __future__ import annotations

import os
import tempfile
import unittest
from datetime import UTC, datetime, timedelta

from los_churuguaros.system import CharcuteriaSystem


DATE_FMT = "%Y-%m-%d"


class CharcuteriaSystemTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmpdir.name, "test.db")
        self.system = CharcuteriaSystem(self.db_path)
        self.product_id = self.system.add_product(
            name="Jamon",
            category="refrigerado",
            unit="kg",
            sanitary_registry="RS-001",
            shelf_life_days=30,
            min_temp_c=0.0,
            max_temp_c=4.0,
        )
        self.supplier_id = self.system.add_supplier(
            name="Proveedor 1",
            rif="J-123456789",
            sanitary_permit="PERM-001",
        )

    def tearDown(self) -> None:
        self.tmpdir.cleanup()

    def _receive_lot(self, lot_code: str, expiry_offset_days: int, quantity: float) -> int:
        today = datetime.now(UTC).date()
        return self.system.receive_lot(
            product_id=self.product_id,
            supplier_id=self.supplier_id,
            lot_code=lot_code,
            production_date=(today - timedelta(days=5)).strftime(DATE_FMT),
            expiry_date=(today + timedelta(days=expiry_offset_days)).strftime(DATE_FMT),
            received_date=(today - timedelta(days=2)).strftime(DATE_FMT),
            purchase_cost=5.0,
            quantity_received=quantity,
            storage_location="Cava Test",
        )

    def test_sale_allocates_by_fefo(self) -> None:
        lot_early = self._receive_lot("LOT-EARLY", expiry_offset_days=4, quantity=3)
        lot_late = self._receive_lot("LOT-LATE", expiry_offset_days=10, quantity=10)

        result = self.system.create_sale(
            customer="Cliente FEFO",
            lines=[{"product_id": self.product_id, "quantity": 5, "unit_price": 6.0}],
        )

        allocations = result["allocations"]
        self.assertEqual(len(allocations), 2)
        self.assertEqual(allocations[0]["lot_id"], lot_early)
        self.assertEqual(allocations[0]["quantity"], 3)
        self.assertEqual(allocations[1]["lot_id"], lot_late)
        self.assertEqual(allocations[1]["quantity"], 2)

    def test_expired_lot_cannot_be_sold(self) -> None:
        today = datetime.now(UTC).date()
        self.system.receive_lot(
            product_id=self.product_id,
            supplier_id=self.supplier_id,
            lot_code="LOT-EXP",
            production_date=(today - timedelta(days=10)).strftime(DATE_FMT),
            expiry_date=(today - timedelta(days=1)).strftime(DATE_FMT),
            received_date=(today - timedelta(days=5)).strftime(DATE_FMT),
            purchase_cost=5.0,
            quantity_received=2,
            storage_location="Cava Test",
        )
        with self.assertRaises(ValueError):
            self.system.create_sale(
                customer="Cliente",
                lines=[{"product_id": self.product_id, "quantity": 1, "unit_price": 6.0}],
            )

    def test_temperature_deviation_generates_alert(self) -> None:
        lot_id = self._receive_lot("LOT-TEMP", expiry_offset_days=12, quantity=10)
        output = self.system.register_temperature(
            area="Cava Test",
            temperature_c=10.5,
            lot_id=lot_id,
        )
        self.assertEqual(output["deviations"], 1)
        alerts = self.system.list_open_alerts()
        self.assertTrue(any(alert["alert_type"] == "temperature_deviation" for alert in alerts))

    def test_idrs_scan_returns_scored_lots(self) -> None:
        self._receive_lot("LOT-RISK", expiry_offset_days=2, quantity=10)
        result = self.system.run_risk_scan()
        self.assertGreaterEqual(len(result), 1)
        self.assertIn("score", result[0])
        self.assertIn("recommendation", result[0])


if __name__ == "__main__":
    unittest.main()
