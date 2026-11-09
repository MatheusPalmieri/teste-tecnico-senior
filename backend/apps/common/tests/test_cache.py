from __future__ import annotations

from datetime import date
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.utils import timezone

from apps.common.cache import cache_set, invalidate_operational_caches
from apps.common.cache_keys import CACHE_VERSION, dashboard_summary_key
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status
from apps.reservations.services import preview_check_out


class TestCacheSet:
    def test_rejects_timeout_none(self) -> None:
        with pytest.raises(ValueError):
            cache_set("some-key", "value", timeout=None)  # type: ignore[arg-type]

    def test_sets_value_with_ttl(self) -> None:
        cache_set("some-key", "value", timeout=30)
        assert cache.get("some-key") == "value"


class TestCacheKeys:
    def test_keys_are_versioned(self) -> None:
        today = date(2026, 9, 6)
        assert dashboard_summary_key(today) == f"{CACHE_VERSION}:dashboard:summary:2026-09-06"


class TestInvalidateOperationalCaches:
    def test_deletes_dashboard_key(self) -> None:
        today = date(2026, 9, 6)
        cache_set(dashboard_summary_key(today), {"fake": "payload"}, timeout=60)

        invalidate_operational_caches(reference_date=today)

        assert cache.get(dashboard_summary_key(today)) is None


@pytest.mark.django_db
class TestNoPerRecordCaching:
    def test_check_out_preview_never_touches_the_cache(self) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_IN)

        with (
            patch("django.core.cache.cache.get") as mocked_get,
            patch("django.core.cache.cache.set") as mocked_set,
        ):
            preview_check_out(reservation=reservation, moment=timezone.now())

        mocked_get.assert_not_called()
        mocked_set.assert_not_called()
