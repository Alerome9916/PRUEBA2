from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Iterable


DATE_FMT = "%Y-%m-%d"


@dataclass(frozen=True)
class ComplianceIssue:
    code: str
    severity: str
    message: str


class VenezuelaComplianceProfile:
    """
    Perfil base de cumplimiento operativo para charcuteria en Venezuela.

    Las reglas son parametrizables y deben ser validadas por el responsable
    sanitario de cada establecimiento.
    """

    references = (
        "Ley Organica de Salud (inocuidad alimentaria y resguardo sanitario).",
        "Reglamentos sanitarios de alimentos para consumo humano (trazabilidad y rotulado).",
        "Normas COVENIN/INN de etiquetado y manipulacion aplicables por categoria.",
        "Lineamientos de autoridad sanitaria regional y municipal segun permisologia vigente.",
    )

    # Rangos base sugeridos para control de cadena de frio.
    temperature_by_category = {
        "refrigerado": (0.0, 4.0),
        "congelado": (-22.0, -18.0),
        "curado": (8.0, 14.0),
    }

    def validate_product(
        self,
        *,
        name: str,
        category: str,
        sanitary_registry: str,
        shelf_life_days: int,
        min_temp_c: float,
        max_temp_c: float,
    ) -> list[ComplianceIssue]:
        issues: list[ComplianceIssue] = []
        if not name.strip():
            issues.append(
                ComplianceIssue("PROD_NAME_REQUIRED", "critical", "El producto debe tener nombre.")
            )
        if not sanitary_registry.strip():
            issues.append(
                ComplianceIssue(
                    "PROD_SANITARY_REQUIRED",
                    "critical",
                    "El producto requiere registro sanitario.",
                )
            )
        if shelf_life_days <= 0:
            issues.append(
                ComplianceIssue(
                    "PROD_SHELF_LIFE_INVALID",
                    "critical",
                    "La vida util del producto debe ser mayor a 0 dias.",
                )
            )
        if min_temp_c >= max_temp_c:
            issues.append(
                ComplianceIssue(
                    "PROD_TEMP_RANGE_INVALID",
                    "critical",
                    "El rango termico del producto es invalido.",
                )
            )

        expected_range = self.temperature_by_category.get(category)
        if expected_range:
            expected_min, expected_max = expected_range
            if min_temp_c > expected_min or max_temp_c < expected_max:
                issues.append(
                    ComplianceIssue(
                        "PROD_TEMP_RANGE_NARROW",
                        "warning",
                        (
                            "El rango termico definido podria no cubrir el rango "
                            f"sugerido para {category}: {expected_min}C a {expected_max}C."
                        ),
                    )
                )
        return issues

    def validate_supplier(self, *, name: str, rif: str, sanitary_permit: str) -> list[ComplianceIssue]:
        issues: list[ComplianceIssue] = []
        if not name.strip():
            issues.append(
                ComplianceIssue("SUPPLIER_NAME_REQUIRED", "critical", "Proveedor sin nombre.")
            )
        if not rif.strip():
            issues.append(
                ComplianceIssue("SUPPLIER_RIF_REQUIRED", "critical", "Proveedor sin RIF.")
            )
        if not sanitary_permit.strip():
            issues.append(
                ComplianceIssue(
                    "SUPPLIER_PERMIT_REQUIRED",
                    "critical",
                    "Proveedor sin permiso sanitario.",
                )
            )
        return issues

    def validate_lot(
        self,
        *,
        lot_code: str,
        production_date: str,
        expiry_date: str,
        received_date: str,
        quantity_received: float,
        product_shelf_life_days: int,
    ) -> list[ComplianceIssue]:
        issues: list[ComplianceIssue] = []
        if not lot_code.strip():
            issues.append(
                ComplianceIssue("LOT_CODE_REQUIRED", "critical", "Todo lote requiere codigo.")
            )
        if quantity_received <= 0:
            issues.append(
                ComplianceIssue("LOT_QUANTITY_INVALID", "critical", "Cantidad de lote invalida.")
            )

        try:
            production = datetime.strptime(production_date, DATE_FMT).date()
            expiry = datetime.strptime(expiry_date, DATE_FMT).date()
            received = datetime.strptime(received_date, DATE_FMT).date()
        except ValueError:
            issues.append(
                ComplianceIssue(
                    "LOT_DATE_FORMAT_INVALID",
                    "critical",
                    "Formato de fecha invalido. Use YYYY-MM-DD.",
                )
            )
            return issues

        if expiry <= production:
            issues.append(
                ComplianceIssue(
                    "LOT_EXPIRY_BEFORE_PRODUCTION",
                    "critical",
                    "La fecha de vencimiento debe ser posterior a la elaboracion.",
                )
            )

        if received < production:
            issues.append(
                ComplianceIssue(
                    "LOT_RECEIVED_BEFORE_PRODUCTION",
                    "critical",
                    "La fecha de recepcion no puede ser anterior a elaboracion.",
                )
            )

        if received > expiry:
            issues.append(
                ComplianceIssue(
                    "LOT_RECEIVED_AFTER_EXPIRY",
                    "critical",
                    "No se puede recibir producto ya vencido.",
                )
            )

        nominal_life = max(1, product_shelf_life_days)
        remaining_life = (expiry - received).days
        min_remaining_ratio = 0.20
        if remaining_life / nominal_life < min_remaining_ratio:
            issues.append(
                ComplianceIssue(
                    "LOT_REMAINING_LIFE_TOO_LOW",
                    "warning",
                    (
                        "Lote recibido con vida util remanente inferior al 20% "
                        "de la vida util nominal."
                    ),
                )
            )
        return issues

    def validate_sale_date(self, expiry_date: date, sale_date: date) -> list[ComplianceIssue]:
        if expiry_date < sale_date:
            return [
                ComplianceIssue(
                    "SALE_EXPIRED_PRODUCT",
                    "critical",
                    "No se permite vender producto vencido.",
                )
            ]
        return []

    def summarize_issues(self, issues: Iterable[ComplianceIssue]) -> dict[str, int]:
        summary = {"critical": 0, "warning": 0, "info": 0}
        for issue in issues:
            summary[issue.severity] = summary.get(issue.severity, 0) + 1
        return summary
