from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum


class ChargeKind(StrEnum):
    NIGHTLY = "NIGHTLY"
    PARKING = "PARKING"
    LATE_CHECK_OUT = "LATE_CHECK_OUT"


class DayType(StrEnum):
    WEEKDAY = "WEEKDAY"
    WEEKEND = "WEEKEND"


@dataclass(frozen=True)
class ChargeLine:
    kind: ChargeKind
    description: str
    day_type: DayType | None
    quantity: int
    unit_amount: Decimal
    amount: Decimal


@dataclass(frozen=True)
class Breakdown:
    nights: int
    lines: tuple[ChargeLine, ...]
    nightly_subtotal: Decimal
    parking_subtotal: Decimal
    late_check_out_fee: Decimal
    total: Decimal
