from datetime import date
from decimal import Decimal

import pytest

from apps.pricing.calculator import is_weekend, nightly_rate
from apps.pricing.policy import PricingPolicy

WEEKDAYS = [
    date(2026, 8, 31),  # segunda
    date(2026, 9, 1),  # terca
    date(2026, 9, 2),  # quarta
    date(2026, 9, 3),  # quinta
    date(2026, 9, 4),  # sexta
]

WEEKENDS = [
    date(2026, 9, 5),  # sabado
    date(2026, 9, 6),  # domingo
]


@pytest.mark.parametrize("day", WEEKDAYS)
def test_nightly_rate_is_120_on_weekdays(day: date) -> None:
    assert nightly_rate(day) == Decimal("120.00") == PricingPolicy.WEEKDAY_RATE
    assert isinstance(nightly_rate(day), Decimal)


@pytest.mark.parametrize("day", WEEKENDS)
def test_nightly_rate_is_180_on_weekends(day: date) -> None:
    assert nightly_rate(day) == Decimal("180.00") == PricingPolicy.WEEKEND_RATE


@pytest.mark.parametrize("day", WEEKDAYS)
def test_is_weekend_false_on_weekdays(day: date) -> None:
    assert is_weekend(day) is False


@pytest.mark.parametrize("day", WEEKENDS)
def test_is_weekend_true_on_weekends(day: date) -> None:
    assert is_weekend(day) is True
