"""Listagens com número constante de queries: 2 ou 12 linhas custam o mesmo."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status

URLS = [
    "/api/reservations/",
    "/api/guests/",
    "/api/reservations/arrivals/?scope=all_pending",
    "/api/reservations/arrivals/?scope=history",
    "/api/reservations/departures/?scope=all_in_house",
    "/api/reservations/departures/?scope=late",
    "/api/reservations/departures/?scope=history",
]


def _seed(rows: int, start: date) -> None:
    for index in range(rows):
        day = start + timedelta(days=index * 3)
        ReservationFactory(check_in_date=day, check_out_date=day + timedelta(days=2))
        ReservationFactory(
            status=Status.CHECKED_OUT, check_in_date=day, check_out_date=day + timedelta(days=1)
        )
    # Hóspedes no hotel, com saída já vencida (aba "late").
    ReservationFactory(
        status=Status.CHECKED_IN, check_in_date=date(2026, 9, 7), check_out_date=date(2026, 9, 9)
    )


@pytest.mark.django_db
@freeze_time("2026-09-10 15:00:00-03:00")
@pytest.mark.parametrize("url", URLS)
def test_listing_query_count_is_constant(url: str) -> None:
    client = APIClient()
    client.force_authenticate(UserFactory())

    _seed(2, date(2026, 10, 1))
    with CaptureQueriesContext(connection) as small:
        assert client.get(url).status_code == 200

    _seed(10, date(2027, 1, 1))
    with CaptureQueriesContext(connection) as large:
        assert client.get(url).status_code == 200

    assert len(large) == len(small)
