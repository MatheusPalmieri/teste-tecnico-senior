import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest

from apps.pricing.calculator import build_breakdown, stay_nights
from apps.pricing.errors import InvalidStayError
from apps.pricing.models import ChargeKind, DayType

SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def test_stay_of_three_nights_from_thursday_to_sunday() -> None:
    nights = stay_nights(date(2026, 9, 3), date(2026, 9, 6))
    assert nights == [date(2026, 9, 3), date(2026, 9, 4), date(2026, 9, 5)]


def test_stay_of_one_night_generates_one_nightly() -> None:
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 3), check_out_date=date(2026, 9, 4), uses_parking=False
    )
    assert breakdown.nights == 1


def test_stay_of_seven_nights_covers_five_weekdays_and_two_weekend_nights() -> None:
    # segunda 31/08 a segunda 07/09: 5 dias úteis + sabado e domingo.
    breakdown = build_breakdown(
        check_in_date=date(2026, 8, 31), check_out_date=date(2026, 9, 7), uses_parking=False
    )
    assert breakdown.nights == 7
    weekday_line = next(line for line in breakdown.lines if line.day_type == DayType.WEEKDAY)
    weekend_line = next(line for line in breakdown.lines if line.day_type == DayType.WEEKEND)
    assert weekday_line.quantity == 5
    assert weekend_line.quantity == 2


def test_stay_entirely_on_weekend_charges_only_180() -> None:
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 5), check_out_date=date(2026, 9, 6), uses_parking=False
    )
    assert breakdown.nightly_subtotal == Decimal("180.00")
    assert breakdown.total == Decimal("180.00")


def test_check_out_not_after_check_in_raises() -> None:
    with pytest.raises(InvalidStayError):
        stay_nights(date(2026, 9, 3), date(2026, 9, 3))

    with pytest.raises(InvalidStayError):
        build_breakdown(
            check_in_date=date(2026, 9, 3), check_out_date=date(2026, 9, 2), uses_parking=False
        )


def test_lines_with_zero_quantity_are_omitted() -> None:
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 3), check_out_date=date(2026, 9, 4), uses_parking=True
    )
    day_types = [line.day_type for line in breakdown.lines]
    assert DayType.WEEKEND not in day_types


def test_canonical_scenario() -> None:
    check_out_moment = datetime(2026, 9, 6, 14, 30, tzinfo=SAO_PAULO)
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 3),
        check_out_date=date(2026, 9, 6),
        uses_parking=True,
        check_out_moment=check_out_moment,
    )

    assert breakdown.nights == 3
    assert breakdown.nightly_subtotal == Decimal("420.00")
    assert breakdown.parking_subtotal == Decimal("50.00")
    assert breakdown.late_check_out_fee == Decimal("90.00")
    assert breakdown.total == Decimal("560.00")


def test_estimate_without_check_out_moment_has_no_late_fee() -> None:
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 3), check_out_date=date(2026, 9, 6), uses_parking=True
    )
    assert breakdown.late_check_out_fee == Decimal("0.00")
    assert not any(line.kind == ChargeKind.LATE_CHECK_OUT for line in breakdown.lines)


def test_all_returned_amounts_have_two_decimal_places() -> None:
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 3),
        check_out_date=date(2026, 9, 6),
        uses_parking=True,
        check_out_moment=datetime(2026, 9, 6, 14, 30, tzinfo=SAO_PAULO),
    )
    for value in (
        breakdown.nightly_subtotal,
        breakdown.parking_subtotal,
        breakdown.late_check_out_fee,
        breakdown.total,
    ):
        exponent = value.as_tuple().exponent
        assert isinstance(exponent, int)
        assert -exponent == 2


def test_no_returned_amount_is_float() -> None:
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 3),
        check_out_date=date(2026, 9, 6),
        uses_parking=True,
        check_out_moment=datetime(2026, 9, 6, 14, 30, tzinfo=SAO_PAULO),
    )
    values = (
        [
            breakdown.nightly_subtotal,
            breakdown.parking_subtotal,
            breakdown.late_check_out_fee,
            breakdown.total,
        ]
        + [line.amount for line in breakdown.lines]
        + [line.unit_amount for line in breakdown.lines]
    )
    assert all(isinstance(v, Decimal) for v in values)
    assert not any(isinstance(v, float) for v in values)


@pytest.mark.parametrize("seed", range(500))
def test_sum_of_lines_equals_total_for_random_combinations(seed: int) -> None:
    rng = random.Random(seed)
    check_in = date(2026, 1, 1) + timedelta(days=rng.randint(0, 700))
    check_out = check_in + timedelta(days=rng.randint(1, 30))
    uses_parking = rng.choice([True, False])
    has_check_out_moment = rng.choice([True, False])

    check_out_moment = None
    if has_check_out_moment:
        hour = rng.randint(0, 23)
        minute = rng.randint(0, 59)
        check_out_moment = datetime(
            check_out.year, check_out.month, check_out.day, hour, minute, tzinfo=SAO_PAULO
        )

    breakdown = build_breakdown(
        check_in_date=check_in,
        check_out_date=check_out,
        uses_parking=uses_parking,
        check_out_moment=check_out_moment,
    )

    lines_sum = sum((line.amount for line in breakdown.lines), Decimal("0.00"))
    assert lines_sum == breakdown.total
    assert breakdown.total == breakdown.nightly_subtotal + breakdown.parking_subtotal + (
        breakdown.late_check_out_fee
    )


def test_line_descriptions_are_spelled_correctly() -> None:
    breakdown = build_breakdown(
        check_in_date=date(2026, 9, 4),  # sexta
        check_out_date=date(2026, 9, 7),  # segunda
        uses_parking=True,
    )
    assert [line.description for line in breakdown.lines] == [
        "Diárias de segunda a sexta",
        "Diárias de sábado e domingo",
        "Vaga de garagem — segunda a sexta",
        "Vaga de garagem — sábado e domingo",
    ]
