from __future__ import annotations

from datetime import date, timedelta

import pytest
from django.urls import reverse
from rest_framework import serializers
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.guests.factories import GuestFactory
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Reservation, Status
from apps.reservations.rooms import HOTEL_ROOMS
from apps.reservations.serializers import ReservationSerializer, ReservationWriteSerializer


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=UserFactory())
    return api_client


def _codes(response) -> set[str]:  # noqa: ANN001
    return {row["code"] for row in response.data["results"]}


@pytest.mark.django_db
class TestSearchFilter:
    def test_search_matches_guest_name(self, client: APIClient) -> None:
        wanted = ReservationFactory(guest=GuestFactory(name="Joana Ribeiro"))
        ReservationFactory(guest=GuestFactory(name="Carlos Souza"))

        response = client.get(reverse("reservation-list"), {"search": "Joana"})

        assert _codes(response) == {wanted.code}

    def test_search_matches_guest_document(self, client: APIClient) -> None:
        wanted = ReservationFactory(guest=GuestFactory(document="98765432100"))
        ReservationFactory(guest=GuestFactory(document="12312312312"))

        response = client.get(reverse("reservation-list"), {"search": "98765432100"})

        assert _codes(response) == {wanted.code}

    def test_search_matches_the_reservation_code(self, client: APIClient) -> None:
        wanted = ReservationFactory()
        ReservationFactory()

        response = client.get(reverse("reservation-list"), {"search": wanted.code})

        assert _codes(response) == {wanted.code}


@pytest.mark.django_db
class TestStatusFilter:
    def test_filters_by_a_single_status(self, client: APIClient) -> None:
        reserved = ReservationFactory(status=Status.RESERVED)
        ReservationFactory(status=Status.CHECKED_OUT)

        response = client.get(reverse("reservation-list"), {"status": Status.RESERVED})

        assert _codes(response) == {reserved.code}

    def test_accepts_multiple_status_values(self, client: APIClient) -> None:
        reserved = ReservationFactory(status=Status.RESERVED)
        checked_in = ReservationFactory(status=Status.CHECKED_IN)
        ReservationFactory(status=Status.CANCELLED)

        url = reverse("reservation-list")
        response = client.get(url + "?status=" + Status.RESERVED + "&status=" + Status.CHECKED_IN)

        assert _codes(response) == {reserved.code, checked_in.code}

    def test_unknown_status_is_400_not_an_empty_list(self, client: APIClient) -> None:
        response = client.get(reverse("reservation-list"), {"status": "RESERVADO"})
        assert response.status_code == 400
        assert "status" in response.data["fields"]


@pytest.mark.django_db
class TestDateRangeFilter:
    def _reservation(self, check_in: date, check_out: date, room: str) -> Reservation:
        return ReservationFactory(check_in_date=check_in, check_out_date=check_out, room=room)

    def test_date_from_keeps_stays_that_end_after_the_boundary(self, client: APIClient) -> None:
        crossing = self._reservation(date(2026, 9, 1), date(2026, 9, 10), HOTEL_ROOMS[0])
        finished = self._reservation(date(2026, 8, 1), date(2026, 8, 5), HOTEL_ROOMS[1])

        response = client.get(reverse("reservation-list"), {"date_from": "2026-09-05"})

        assert crossing.code in _codes(response)
        assert finished.code not in _codes(response)

    def test_date_to_keeps_stays_that_start_before_the_boundary(self, client: APIClient) -> None:
        crossing = self._reservation(date(2026, 9, 1), date(2026, 9, 10), HOTEL_ROOMS[0])
        future = self._reservation(date(2026, 12, 1), date(2026, 12, 5), HOTEL_ROOMS[1])

        response = client.get(reverse("reservation-list"), {"date_to": "2026-09-05"})

        assert crossing.code in _codes(response)
        assert future.code not in _codes(response)

    def test_both_boundaries_combine(self, client: APIClient) -> None:
        inside = self._reservation(date(2026, 9, 3), date(2026, 9, 6), HOTEL_ROOMS[0])
        outside = self._reservation(date(2026, 11, 3), date(2026, 11, 6), HOTEL_ROOMS[1])

        response = client.get(
            reverse("reservation-list"), {"date_from": "2026-09-01", "date_to": "2026-09-30"}
        )

        assert _codes(response) == {inside.code}
        assert outside.code not in _codes(response)


@pytest.mark.django_db
class TestParkingFilter:
    def test_filters_reservations_with_parking(self, client: APIClient) -> None:
        with_parking = ReservationFactory(uses_parking=True)
        without_parking = ReservationFactory(uses_parking=False)

        response = client.get(reverse("reservation-list"), {"uses_parking": "true"})

        assert _codes(response) == {with_parking.code}
        assert without_parking.code not in _codes(response)

    def test_filters_reservations_without_parking(self, client: APIClient) -> None:
        ReservationFactory(uses_parking=True)
        without_parking = ReservationFactory(uses_parking=False)

        response = client.get(reverse("reservation-list"), {"uses_parking": "false"})

        assert _codes(response) == {without_parking.code}

    def test_absent_parameter_returns_both(self, client: APIClient) -> None:
        ReservationFactory(uses_parking=True)
        ReservationFactory(uses_parking=False)

        response = client.get(reverse("reservation-list"))

        assert response.data["count"] == 2


@pytest.mark.django_db
class TestQuoteInvalidStay:
    def test_zero_night_stay_returns_400_with_code(self, client: APIClient) -> None:
        response = client.post(
            reverse("reservation-quote"),
            {
                "check_in_date": "2026-09-03",
                "check_out_date": "2026-09-03",
                "uses_parking": False,
            },
            format="json",
        )

        assert response.status_code == 400
        assert response.data["code"] == "invalid_stay"


@pytest.mark.django_db
class TestReservationSerializerEstimatedTotal:
    def test_estimated_total_is_null_for_an_invalid_stay(self) -> None:
        reservation = ReservationFactory.build(
            guest=GuestFactory.build(),
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 3),
        )

        assert ReservationSerializer(reservation).data["estimated_total"] is None

    def test_checked_out_reservation_reports_the_charged_amount(self, client: APIClient) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_OUT, total_amount="470.00")

        response = client.get(reverse("reservation-detail", args=[reservation.pk]))

        assert response.data["estimated_total"] == "470.00"


@pytest.mark.django_db
class TestRoomCatalogValidationOnUpdate:
    def test_patch_with_a_room_outside_the_catalog_returns_400(self, client: APIClient) -> None:
        reservation = ReservationFactory()

        response = client.patch(
            reverse("reservation-detail", args=[reservation.pk]),
            {"room": "999"},
            format="json",
        )

        assert response.status_code == 400
        assert "room" in response.data["fields"]


@pytest.mark.django_db
class TestPartialUpdateOptionalFields:
    def test_patch_updates_parking_plate_and_notes(self, client: APIClient) -> None:
        reservation = ReservationFactory(uses_parking=False)

        response = client.patch(
            reverse("reservation-detail", args=[reservation.pk]),
            {"uses_parking": True, "vehicle_plate": "ABC1D23", "notes": "Chega tarde"},
            format="json",
        )

        assert response.status_code == 200
        reservation.refresh_from_db()
        assert reservation.uses_parking is True
        assert reservation.vehicle_plate == "ABC1D23"
        assert reservation.notes == "Chega tarde"

    def test_patch_of_a_single_field_preserves_the_others(self, client: APIClient) -> None:
        reservation = ReservationFactory(
            uses_parking=True, vehicle_plate="ABC1D23", notes="Chega tarde"
        )
        new_check_out = reservation.check_out_date + timedelta(days=2)

        response = client.patch(
            reverse("reservation-detail", args=[reservation.pk]),
            {"check_out_date": new_check_out.isoformat()},
            format="json",
        )

        assert response.status_code == 200
        reservation.refresh_from_db()
        assert reservation.check_out_date == new_check_out
        assert reservation.vehicle_plate == "ABC1D23"
        assert reservation.notes == "Chega tarde"


class TestValidateRoom:
    def test_rejects_a_room_outside_the_catalog(self) -> None:
        with pytest.raises(serializers.ValidationError):
            ReservationWriteSerializer().validate_room("999")

    def test_accepts_a_room_from_the_catalog(self) -> None:
        assert ReservationWriteSerializer().validate_room(HOTEL_ROOMS[0]) == HOTEL_ROOMS[0]


@pytest.mark.django_db
class TestInvalidDateParams:
    @pytest.mark.parametrize(
        ("url_name", "param"),
        [
            ("reservation-list", "date_from"),
            ("reservation-list", "date_to"),
            ("reservation-arrivals", "date"),
            ("reservation-departures", "date"),
        ],
    )
    def test_malformed_date_returns_400(self, client: APIClient, url_name: str, param: str) -> None:
        response = client.get(reverse(url_name), {param: "06/09/2026"})
        assert response.status_code == 400
        assert param in response.data["fields"]

    @pytest.mark.parametrize("url_name", ["reservation-arrivals", "reservation-departures"])
    def test_unknown_queue_scope_returns_400(self, client: APIClient, url_name: str) -> None:
        response = client.get(reverse(url_name), {"scope": "xyz"})
        assert response.status_code == 400
        assert "scope" in response.data["fields"]
