from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest

from apps.pricing.calculator import is_late_check_out, late_check_out_fee
from apps.pricing.errors import NaiveDatetimeError

SAO_PAULO = ZoneInfo("America/Sao_Paulo")
SCHEDULED = date(2026, 9, 6)  # domingo, saída prevista


def test_not_late_at_11_59() -> None:
    moment = datetime(2026, 9, 6, 11, 59, tzinfo=SAO_PAULO)  # domingo
    assert is_late_check_out(moment, scheduled_check_out_date=SCHEDULED) is False


def test_not_late_at_12_00_exactly() -> None:
    moment = datetime(2026, 9, 6, 12, 0, tzinfo=SAO_PAULO)  # domingo
    assert is_late_check_out(moment, scheduled_check_out_date=SCHEDULED) is False


def test_late_at_12_01() -> None:
    moment = datetime(2026, 9, 6, 12, 1, tzinfo=SAO_PAULO)  # domingo
    assert is_late_check_out(moment, scheduled_check_out_date=SCHEDULED) is True


def test_not_late_when_leaving_before_scheduled_date() -> None:
    moment = datetime(2026, 9, 5, 23, 59, tzinfo=SAO_PAULO)  # sabado, vespera
    assert is_late_check_out(moment, scheduled_check_out_date=SCHEDULED) is False
    assert late_check_out_fee(moment, scheduled_check_out_date=SCHEDULED) == Decimal("0.00")


def test_late_when_staying_past_the_scheduled_date() -> None:
    moment = datetime(2026, 9, 7, 12, 1, tzinfo=SAO_PAULO)  # segunda
    assert is_late_check_out(moment, scheduled_check_out_date=SCHEDULED) is True
    assert late_check_out_fee(moment, scheduled_check_out_date=SCHEDULED) == Decimal("60.00")


def test_fee_is_zero_within_deadline() -> None:
    moment = datetime(2026, 9, 3, 12, 0, tzinfo=SAO_PAULO)
    assert late_check_out_fee(moment, scheduled_check_out_date=date(2026, 9, 3)) == Decimal("0.00")


def test_fee_is_60_on_weekday() -> None:
    moment = datetime(2026, 9, 3, 12, 1, tzinfo=SAO_PAULO)  # quinta
    assert late_check_out_fee(moment, scheduled_check_out_date=date(2026, 9, 3)) == Decimal("60.00")


def test_fee_is_90_on_weekend() -> None:
    moment = datetime(2026, 9, 6, 12, 1, tzinfo=SAO_PAULO)  # domingo
    assert late_check_out_fee(moment, scheduled_check_out_date=SCHEDULED) == Decimal("90.00")


def test_naive_datetime_raises_for_late_check_out() -> None:
    with pytest.raises(NaiveDatetimeError):
        is_late_check_out(datetime(2026, 9, 6, 12, 1), scheduled_check_out_date=SCHEDULED)


def test_naive_datetime_raises_for_fee() -> None:
    with pytest.raises(NaiveDatetimeError):
        late_check_out_fee(datetime(2026, 9, 6, 12, 1), scheduled_check_out_date=SCHEDULED)
