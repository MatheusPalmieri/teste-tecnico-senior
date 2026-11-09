from __future__ import annotations

from dataclasses import dataclass, field

GUEST_OVERLAP_CODE = "reservation_overlaps"
GUEST_OVERLAP_DETAIL = "Este hóspede já possui outra reserva ativa neste período."


@dataclass(frozen=True)
class ReservationWarning:
    code: str
    detail: str
    context: dict[str, str] = field(default_factory=dict)

    def as_dict(self) -> dict[str, object]:
        return {"code": self.code, "detail": self.detail, "context": self.context}


def guest_overlap_warning(*, conflicting_code: str) -> ReservationWarning:
    return ReservationWarning(
        code=GUEST_OVERLAP_CODE,
        detail=GUEST_OVERLAP_DETAIL,
        context={"conflicting_reservation": conflicting_code},
    )
