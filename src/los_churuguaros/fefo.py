from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable


DATE_FMT = "%Y-%m-%d"


@dataclass(frozen=True)
class LotAvailability:
    lot_id: int
    lot_code: str
    expiry_date: str
    quantity_available: float


@dataclass(frozen=True)
class FefoAllocation:
    lot_id: int
    lot_code: str
    expiry_date: str
    quantity: float


def sort_fefo(lots: Iterable[LotAvailability]) -> list[LotAvailability]:
    return sorted(
        lots,
        key=lambda lot: (
            datetime.strptime(lot.expiry_date, DATE_FMT).date(),
            lot.lot_id,
        ),
    )


def allocate_fefo(lots: Iterable[LotAvailability], requested_quantity: float) -> list[FefoAllocation]:
    if requested_quantity <= 0:
        raise ValueError("La cantidad solicitada debe ser mayor a 0.")

    ordered = sort_fefo(lots)
    remaining = requested_quantity
    allocations: list[FefoAllocation] = []

    for lot in ordered:
        if remaining <= 0:
            break
        if lot.quantity_available <= 0:
            continue
        qty = min(lot.quantity_available, remaining)
        allocations.append(
            FefoAllocation(
                lot_id=lot.lot_id,
                lot_code=lot.lot_code,
                expiry_date=lot.expiry_date,
                quantity=qty,
            )
        )
        remaining -= qty

    if remaining > 0:
        raise ValueError(
            f"Inventario insuficiente bajo FEFO. Faltante: {remaining:.2f} unidades."
        )
    return allocations
