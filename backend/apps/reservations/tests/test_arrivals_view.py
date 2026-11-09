from __future__ import annotations

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.common.clock import today_local
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=UserFactory())
    return api_client


@pytest.mark.django_db
class TestArrivalsView:
    def test_lists_only_reserved_reservations(self, client: APIClient) -> None:
        today = today_local()
        ReservationFactory(status=Status.RESERVED, check_in_date=today)
        ReservationFactory(status=Status.CHECKED_IN, check_in_date=today)
        response = client.get(reverse("reservation-arrivals"), {"date": str(today)})
        assert response.data["count"] == 1

    def test_overdue_reservation_has_is_overdue_true(self, client: APIClient) -> None:
        today = today_local()
        ReservationFactory(status=Status.RESERVED, check_in_date=today - timedelta(days=1))
        response = client.get(
            reverse("reservation-arrivals"), {"scope": "overdue", "date": str(today)}
        )
        assert response.data["results"][0]["is_overdue"] is True

    def test_search_filters_by_guest_name(self, client: APIClient) -> None:
        from apps.guests.factories import GuestFactory

        today = today_local()
        ReservationFactory(
            status=Status.RESERVED, check_in_date=today, guest=GuestFactory(name="Fernanda Lima")
        )
        ReservationFactory(
            status=Status.RESERVED, check_in_date=today, guest=GuestFactory(name="Bruno Alves")
        )
        response = client.get(
            reverse("reservation-arrivals"), {"date": str(today), "search": "Fernanda"}
        )
        assert response.data["count"] == 1

    def test_history_scope_excludes_reservations_still_in_the_queue(
        self, client: APIClient
    ) -> None:
        today = today_local()
        ReservationFactory(status=Status.RESERVED, check_in_date=today)
        ReservationFactory(status=Status.RESERVED, check_in_date=today - timedelta(days=2))
        for status in (Status.CHECKED_IN, Status.CHECKED_OUT, Status.CANCELLED):
            ReservationFactory(status=status, check_in_date=today - timedelta(days=1))

        response = client.get(reverse("reservation-arrivals"), {"scope": "history"})

        assert response.data["count"] == 3
        assert {row["status"] for row in response.data["results"]} == {
            Status.CHECKED_IN,
            Status.CHECKED_OUT,
            Status.CANCELLED,
        }

    def test_history_scope_orders_from_most_recent_check_in(self, client: APIClient) -> None:
        today = today_local()
        older = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=today - timedelta(days=5),
            checked_in_at=timezone.now() - timedelta(days=5),
        )
        newer = ReservationFactory(
            status=Status.CHECKED_OUT,
            check_in_date=today - timedelta(days=1),
            checked_in_at=timezone.now() - timedelta(days=1),
        )

        response = client.get(reverse("reservation-arrivals"), {"scope": "history"})

        assert [row["code"] for row in response.data["results"]] == [newer.code, older.code]
