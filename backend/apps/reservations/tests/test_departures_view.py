from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.common.clock import _e2e_now_override
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status
from apps.reservations.selectors import departures

CHECK_IN = date(2026, 9, 3)
CHECK_OUT = date(2026, 9, 6)  # domingo


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=UserFactory())
    return api_client


@pytest.mark.django_db
class TestDeparturesView:
    def test_lists_only_checked_in_reservations(self, client: APIClient) -> None:
        ReservationFactory(
            status=Status.CHECKED_IN, check_in_date=CHECK_IN, check_out_date=CHECK_OUT
        )
        ReservationFactory(status=Status.RESERVED, check_in_date=CHECK_IN, check_out_date=CHECK_OUT)
        response = client.get(reverse("reservation-departures"), {"date": str(CHECK_OUT)})
        assert response.data["count"] == 1

    def test_is_late_check_out_follows_server_clock(self, client: APIClient) -> None:
        ReservationFactory(
            status=Status.CHECKED_IN, check_in_date=CHECK_IN, check_out_date=CHECK_OUT
        )
        with freeze_time("2026-09-06 14:30:00-03:00"):
            response = client.get(reverse("reservation-departures"), {"date": str(CHECK_OUT)})
        assert response.data["results"][0]["is_late_check_out"] is True

    def test_scope_late_returns_only_past_deadline(self, client: APIClient) -> None:
        ReservationFactory(
            status=Status.CHECKED_IN, check_in_date=CHECK_IN, check_out_date=CHECK_OUT
        )
        with freeze_time("2026-09-06 11:00:00-03:00"):
            response = client.get(
                reverse("reservation-departures"), {"scope": "late", "date": str(CHECK_OUT)}
            )
        assert response.data["count"] == 0

    def test_history_scope_lists_only_finished_stays(self, client: APIClient) -> None:
        for status in (Status.CHECKED_OUT, Status.CHECKED_IN, Status.RESERVED, Status.CANCELLED):
            ReservationFactory(status=status, check_in_date=CHECK_IN, check_out_date=CHECK_OUT)

        response = client.get(reverse("reservation-departures"), {"scope": "history"})

        assert response.data["count"] == 1
        assert response.data["results"][0]["status"] == Status.CHECKED_OUT

    def test_history_scope_orders_from_most_recent_check_out(self, client: APIClient) -> None:
        older = ReservationFactory(
            status=Status.CHECKED_OUT,
            check_in_date=CHECK_IN,
            check_out_date=CHECK_OUT,
            checked_out_at=timezone.now() - timedelta(days=7),
        )
        newer = ReservationFactory(
            status=Status.CHECKED_OUT,
            check_in_date=CHECK_IN,
            check_out_date=CHECK_OUT,
            checked_out_at=timezone.now() - timedelta(hours=2),
        )

        response = client.get(reverse("reservation-departures"), {"scope": "history"})

        assert [row["code"] for row in response.data["results"]] == [newer.code, older.code]


@pytest.mark.django_db
@pytest.mark.parametrize("url_name", ["reservation-arrivals", "reservation-departures"])
def test_history_is_paginated_but_work_queues_are_not(client: APIClient, url_name: str) -> None:
    ReservationFactory.create_batch(
        30, status=Status.CHECKED_OUT, check_in_date=CHECK_IN, check_out_date=CHECK_OUT
    )

    history = client.get(reverse(url_name), {"scope": "history"}).data
    assert history["count"] == 30
    assert len(history["results"]) == 25
    assert history["next"]

    queue = client.get(reverse(url_name)).data
    assert "next" not in queue


@pytest.mark.django_db
class TestLateScopeUsesInjectableClock:
    def test_late_scope_follows_the_e2e_clock_override(self, settings) -> None:  # noqa: ANN001
        settings.E2E_MODE = True
        late = ReservationFactory(
            status=Status.CHECKED_IN, check_in_date=CHECK_IN, check_out_date=CHECK_OUT
        )
        override = datetime(2026, 9, 6, 14, 30, tzinfo=ZoneInfo("America/Sao_Paulo"))
        token = _e2e_now_override.set(override)
        try:
            result = list(departures(reference_date=CHECK_OUT, scope="late"))
        finally:
            _e2e_now_override.reset(token)
        assert result == [late]
