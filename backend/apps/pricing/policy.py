from __future__ import annotations

from datetime import time
from decimal import Decimal
from typing import Final


class PricingPolicy:
    WEEKDAY_RATE: Final[Decimal] = Decimal("120.00")
    WEEKEND_RATE: Final[Decimal] = Decimal("180.00")

    WEEKDAY_PARKING: Final[Decimal] = Decimal("15.00")
    WEEKEND_PARKING: Final[Decimal] = Decimal("20.00")

    CHECK_IN_FROM: Final[time] = time(14, 0)
    CHECK_OUT_UNTIL: Final[time] = time(12, 0)
    LATE_CHECK_OUT_RATE: Final[Decimal] = Decimal("0.50")
