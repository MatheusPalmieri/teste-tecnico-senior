from datetime import UTC, datetime
from zoneinfo import ZoneInfo

import pytest

from apps.pricing.calculator import is_check_in_allowed
from apps.pricing.errors import NaiveDatetimeError

SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def test_check_in_not_allowed_at_13_59() -> None:
    moment = datetime(2026, 9, 3, 13, 59, tzinfo=SAO_PAULO)
    assert is_check_in_allowed(moment) is False


def test_check_in_allowed_at_14_00() -> None:
    moment = datetime(2026, 9, 3, 14, 0, tzinfo=SAO_PAULO)
    assert is_check_in_allowed(moment) is True


def test_check_in_allowed_at_14_01() -> None:
    moment = datetime(2026, 9, 3, 14, 1, tzinfo=SAO_PAULO)
    assert is_check_in_allowed(moment) is True


def test_check_in_allowed_evaluated_in_sao_paulo_timezone_even_with_utc_input() -> None:
    moment_utc = datetime(2026, 9, 3, 16, 59, tzinfo=UTC)
    assert is_check_in_allowed(moment_utc) is False

    moment_utc = datetime(2026, 9, 3, 17, 0, tzinfo=UTC)
    assert is_check_in_allowed(moment_utc) is True


def test_naive_datetime_raises() -> None:
    naive_moment = datetime(2026, 9, 3, 14, 0)
    with pytest.raises(NaiveDatetimeError):
        is_check_in_allowed(naive_moment)
