from __future__ import annotations

from datetime import timedelta

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.common.clock import today_local
from apps.guests.factories import GuestFactory
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status
from apps.reservations.rooms import HOTEL_ROOMS


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=UserFactory())
    return api_client


@pytest.mark.django_db
class TestCreateReservation:
    def test_requires_authentication(self) -> None:
        response = APIClient().get(reverse("reservation-list"))
        assert response.status_code == 401

    def test_creates_reservation_with_reserved_status(self, client: APIClient) -> None:
        guest = GuestFactory()
        today = today_local()
        payload = {
            "guest_id": str(guest.pk),
            "room": "101",
            "check_in_date": str(today),
            "check_out_date": str(today + timedelta(days=2)),
            "uses_parking": False,
        }
        response = client.post(reverse("reservation-list"), payload)
        assert response.status_code == 201
        assert response.data["status"] == "RESERVED"
        assert response.data["total_amount"] is None

    def test_check_out_before_check_in_returns_400_with_code(self, client: APIClient) -> None:
        guest = GuestFactory()
        today = today_local()
        payload = {
            "guest_id": str(guest.pk),
            "room": "101",
            "check_in_date": str(today),
            "check_out_date": str(today),
        }
        response = client.post(reverse("reservation-list"), payload)
        assert response.status_code == 400
        assert response.data["code"] == "check_out_before_check_in"

    def test_check_in_in_the_past_returns_400_with_code(self, client: APIClient) -> None:
        guest = GuestFactory()
        today = today_local()
        payload = {
            "guest_id": str(guest.pk),
            "room": "101",
            "check_in_date": str(today - timedelta(days=1)),
            "check_out_date": str(today + timedelta(days=1)),
        }
        response = client.post(reverse("reservation-list"), payload)
        assert response.status_code == 400
        assert response.data["code"] == "check_in_in_the_past"

    def test_stay_longer_than_365_nights_is_refused(self, client: APIClient) -> None:
        today = today_local()
        payload = {
            "guest_id": str(GuestFactory().pk),
            "room": "101",
            "check_in_date": str(today),
            "check_out_date": str(today + timedelta(days=366)),
        }
        response = client.post(reverse("reservation-list"), payload)
        assert response.status_code == 400
        assert response.data["code"] == "stay_too_long"
        assert "check_out_date" in response.data["fields"]

        payload["check_out_date"] = str(today + timedelta(days=365))
        assert client.post(reverse("reservation-list"), payload).status_code == 201

    def test_quote_refuses_a_stay_longer_than_365_nights(self, client: APIClient) -> None:
        response = client.post(
            reverse("reservation-quote"),
            {"check_in_date": "2026-01-01", "check_out_date": "9999-12-31"},
        )
        assert response.status_code == 400
        assert response.data["code"] == "stay_too_long"

    def test_overlapping_guest_reservation_returns_201_with_warning(
        self, client: APIClient
    ) -> None:
        today = today_local()
        existing = ReservationFactory(
            room="101", check_in_date=today, check_out_date=today + timedelta(days=3)
        )
        payload = {
            "guest_id": str(existing.guest.pk),
            "room": "203",
            "check_in_date": str(today + timedelta(days=1)),
            "check_out_date": str(today + timedelta(days=4)),
        }
        response = client.post(reverse("reservation-list"), payload)
        assert response.status_code == 201
        assert response.data["status"] == "RESERVED"
        warnings = response.data["warnings"]
        assert [warning["code"] for warning in warnings] == ["reservation_overlaps"]
        assert warnings[0]["context"]["conflicting_reservation"] == existing.code

    def test_reservation_without_overlap_returns_empty_warnings(self, client: APIClient) -> None:
        guest = GuestFactory()
        today = today_local()
        payload = {
            "guest_id": str(guest.pk),
            "room": "203",
            "check_in_date": str(today),
            "check_out_date": str(today + timedelta(days=2)),
        }
        response = client.post(reverse("reservation-list"), payload)
        assert response.status_code == 201
        assert response.data["warnings"] == []

    def test_patch_that_creates_an_overlap_returns_200_with_warning(
        self, client: APIClient
    ) -> None:
        today = today_local()
        existing = ReservationFactory(
            room="201", check_in_date=today, check_out_date=today + timedelta(days=3)
        )
        other = ReservationFactory(
            guest=existing.guest,
            room="202",
            check_in_date=today + timedelta(days=10),
            check_out_date=today + timedelta(days=12),
        )
        response = client.patch(
            reverse("reservation-detail", args=[other.pk]),
            {
                "room": other.room,
                "check_in_date": str(today + timedelta(days=1)),
                "check_out_date": str(today + timedelta(days=4)),
            },
        )
        assert response.status_code == 200
        assert response.data["warnings"][0]["context"]["conflicting_reservation"] == existing.code

    def test_room_out_of_catalog_returns_400(self, client: APIClient) -> None:
        guest = GuestFactory()
        today = today_local()
        payload = {
            "guest_id": str(guest.pk),
            "room": "999",
            "check_in_date": str(today),
            "check_out_date": str(today + timedelta(days=1)),
        }
        response = client.post(reverse("reservation-list"), payload)
        assert response.status_code == 400


@pytest.mark.django_db
class TestOrderingReservations:
    def test_orders_by_guest_name(self, client: APIClient) -> None:
        ReservationFactory(guest=GuestFactory(name="Ana"))
        ReservationFactory(guest=GuestFactory(name="Zulmira"))

        response = client.get(reverse("reservation-list"), {"ordering": "-guest__name"})

        assert [item["guest"]["name"] for item in response.data["results"]] == ["Zulmira", "Ana"]

    def test_ignores_field_outside_the_allowed_list(self, client: APIClient) -> None:
        ReservationFactory(guest=GuestFactory(name="Ana"))

        response = client.get(reverse("reservation-list"), {"ordering": "guest__email"})

        assert response.status_code == 200
        assert response.data["count"] == 1


@pytest.mark.django_db
class TestPatchStatusIsReadOnly:
    def test_patch_with_status_does_not_change_status(self, client: APIClient) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        response = client.patch(
            reverse("reservation-detail", args=[reservation.pk]),
            {
                "status": "CHECKED_IN",
                "room": reservation.room,
                "check_in_date": str(reservation.check_in_date),
                "check_out_date": str(reservation.check_out_date),
            },
        )
        assert response.status_code == 200
        reservation.refresh_from_db()
        assert reservation.status == Status.RESERVED


@pytest.mark.django_db
class TestCancelAction:
    def test_cancel_reserved_reservation_returns_200(self, client: APIClient) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        response = client.post(reverse("reservation-cancel", args=[reservation.pk]))
        assert response.status_code == 200
        assert response.data["status"] == "CANCELLED"

    def test_cancel_checked_in_reservation_returns_409(self, client: APIClient) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_IN)
        response = client.post(reverse("reservation-cancel", args=[reservation.pk]))
        assert response.status_code == 409
        assert response.data["code"] == "reservation_not_editable"


@pytest.mark.django_db
class TestQuote:
    def test_canonical_scenario_returns_470(self, client: APIClient) -> None:
        payload = {
            "check_in_date": "2026-09-03",
            "check_out_date": "2026-09-06",
            "uses_parking": True,
        }
        response = client.post(reverse("reservation-quote"), payload)
        assert response.status_code == 200
        assert response.data["total"] == "470.00"
        assert response.data["late_check_out_fee"] == "0.00"

    def test_without_parking_omits_parking_lines(self, client: APIClient) -> None:
        payload = {
            "check_in_date": "2026-09-03",
            "check_out_date": "2026-09-06",
            "uses_parking": False,
        }
        response = client.post(reverse("reservation-quote"), payload)
        kinds = [line["kind"] for line in response.data["lines"]]
        assert "PARKING" not in kinds


@pytest.mark.django_db
class TestAvailableRoomsView:
    def test_returns_available_and_occupied_rooms(self, client: APIClient) -> None:
        today = today_local()
        taken = ReservationFactory(
            room="101", check_in_date=today, check_out_date=today + timedelta(days=2)
        )
        response = client.get(
            reverse("rooms-available"),
            {"check_in_date": str(today), "check_out_date": str(today + timedelta(days=2))},
        )
        assert response.status_code == 200
        assert taken.room in response.data["occupied"]
        assert taken.room not in response.data["available"]
        assert response.data["total_rooms"] == len(HOTEL_ROOMS)
