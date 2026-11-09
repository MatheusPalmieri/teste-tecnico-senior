from __future__ import annotations

from datetime import timedelta

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.common.clock import today_local
from apps.guests.factories import GuestFactory
from apps.guests.models import Guest
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Reservation, Status


def _fingerprint() -> tuple:
    return (
        Guest.objects.count(),
        Reservation.objects.count(),
        list(
            Reservation.objects.order_by("pk").values_list("status", "updated_at", "total_amount")
        ),
        list(Guest.objects.order_by("pk").values_list("name", "updated_at")),
    )


@pytest.mark.django_db
class TestGetEndpointsDoNotMutate:
    @pytest.fixture
    def client(self) -> APIClient:
        api = APIClient()
        api.force_authenticate(user=UserFactory())
        return api

    @pytest.fixture
    def world(self) -> Reservation:
        guest = GuestFactory()
        return ReservationFactory(
            guest=guest,
            status=Status.RESERVED,
            check_in_date=today_local(),
            check_out_date=today_local() + timedelta(days=2),
        )

    def test_every_read_endpoint_leaves_the_database_untouched(
        self, client: APIClient, world: Reservation
    ) -> None:
        get_urls = [
            reverse("guest-list"),
            reverse("guest-detail", args=[world.guest.pk]),
            reverse("reservation-list"),
            reverse("reservation-detail", args=[world.pk]),
            reverse("reservation-arrivals"),
            reverse("reservation-departures"),
            reverse("rooms-available")
            + f"?check_in_date={world.check_in_date}&check_out_date={world.check_out_date}",
            reverse("dashboard-summary"),
            reverse("auth-me"),
        ]

        before = _fingerprint()
        for url in get_urls:
            response = client.get(url)
            assert response.status_code in (200, 400), f"{url} → {response.status_code}"
        assert _fingerprint() == before

    def test_check_out_preview_is_a_get_and_writes_nothing(self, client: APIClient) -> None:
        stay = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=today_local() - timedelta(days=1),
            check_out_date=today_local() + timedelta(days=1),
        )
        before = _fingerprint()
        response = client.get(reverse("reservation-check-out-preview", args=[stay.pk]))
        assert response.status_code == 200
        assert response.data["total"] is not None
        assert _fingerprint() == before
