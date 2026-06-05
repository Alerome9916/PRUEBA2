from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RiskScore:
    lot_id: int
    lot_code: str
    score: float
    level: str
    recommendation: str
    components: dict[str, float]


def classify_risk(score: float) -> tuple[str, str]:
    if score >= 80:
        return (
            "critical",
            "Cuarentena preventiva y auditoria termica inmediata.",
        )
    if score >= 60:
        return (
            "high",
            "Aplicar descuento dinamico FEFO y venta prioritaria de mostrador.",
        )
    if score >= 40:
        return (
            "medium",
            "Reubicar lote en prioridad FEFO y monitorear dos veces al dia.",
        )
    return ("low", "Operacion estable. Continuar monitoreo diario.")


def compute_idrs(
    *,
    lot_id: int,
    lot_code: str,
    days_to_expiry: int,
    thermal_deviations_7d: int,
    days_without_rotation: int,
) -> RiskScore:
    expiry_component = min(55.0, max(0.0, (20 - days_to_expiry) * 2.75))
    thermal_component = min(30.0, max(0.0, thermal_deviations_7d * 6.0))
    rotation_component = min(15.0, max(0.0, (days_without_rotation - 1) * 2.5))

    score = round(expiry_component + thermal_component + rotation_component, 2)
    level, recommendation = classify_risk(score)
    return RiskScore(
        lot_id=lot_id,
        lot_code=lot_code,
        score=score,
        level=level,
        recommendation=recommendation,
        components={
            "expiry_component": round(expiry_component, 2),
            "thermal_component": round(thermal_component, 2),
            "rotation_component": round(rotation_component, 2),
        },
    )
