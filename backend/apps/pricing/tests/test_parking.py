from datetime import date
from decimal import Decimal

import pytest

from apps.pricing.calculator import build_breakdown, parking_rate
from apps.pricing.models import ChargeKind


def test_parking_rate_is_15_on_weekday() -> None:
    assert parking_rate(date(2026, 9, 3)) == Decimal("15.00")  # quinta


def test_parking_rate_is_20_on_weekend() -> None:
    assert parking_rate(date(2026, 9, 5)) == Decimal("20.00")  # sabado


@pytest.mark.parametrize(
    "check_in,check_out,expected",
    [
        (date(2026, 9, 3), date(2026, 9, 4), Decimal("15.00")),  # 1 noite útil
        (date(2026, 9, 5), date(2026, 9, 6), Decimal("20.00")),  # 1 noite fim de semana
    ],
)
def test_breakdown_parking_subtotal(check_in: date, check_out: date, expected: Decimal) -> None:
    breakdown = build_breakdown(check_in_date=check_in, check_out_date=check_out, uses_parking=True)
    assert breakdown.parking_subtotal == expected


def test_breakdown_without_parking_has_no_parking_line() -> None:
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 3), check_out_date=date(2026, 9, 6), uses_parking=False
    )
    assert breakdown.parking_subtotal == Decimal("0.00")
    assert not any(line.kind == ChargeKind.PARKING for line in breakdown.lines)


def test_breakdown_with_parking_has_parking_lines() -> None:
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 3), check_out_date=date(2026, 9, 6), uses_parking=True
    )
    assert any(line.kind == ChargeKind.PARKING for line in breakdown.lines)
