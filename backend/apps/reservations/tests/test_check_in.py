from __future__ import annotations

from datetime import date, timedelta

import pytest
from django.urls import reverse
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.common.clock import now, today_local
from apps.reservations.exceptions import (
    CheckInAfterCheckOutDateError,
    CheckInBeforeAllowedTimeError,
    CheckInBeforeReservedDateError,
    InvalidReservationStatusError,
)
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status
from apps.reservations.selectors import arrivals
from apps.reservations.services import check_in


@pytest.fixture(autouse=True)
def _on_check_in_day():
    with freeze_time("2026-09-03 10:00:00-03:00"):
        yield


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=UserFactory())
    return api_client


@pytest.mark.django_db
class TestCheckInTimeGuard:
    def test_check_in_at_1359_without_authorization_raises_409(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today_local())
        with freeze_time("2026-09-03 13:59:00-03:00"):
            with pytest.raises(CheckInBeforeAllowedTimeError) as exc_info:
                check_in(reservation=reservation, moment=now())
        assert exc_info.value.context["allowed_from"] == "14:00"
        assert exc_info.value.context["current_time"] == "13:59"

    def test_check_in_at_1400_succeeds(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today_local())
        with freeze_time("2026-09-03 14:00:00-03:00"):
            result = check_in(reservation=reservation, moment=now())
        assert result.status == Status.CHECKED_IN
        assert result.early_check_in_authorized is False

    def test_check_in_at_1359_with_authorization_succeeds(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today_local())
        with freeze_time("2026-09-03 13:59:00-03:00"):
            result = check_in(reservation=reservation, moment=now(), authorize_early=True)
        assert result.status == Status.CHECKED_IN
        assert result.early_check_in_authorized is True

    def test_early_check_in_authorized_is_false_when_not_early(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today_local())
        with freeze_time("2026-09-03 15:00:00-03:00"):
            result = check_in(reservation=reservation, moment=now(), authorize_early=True)
        assert result.early_check_in_authorized is False


@pytest.mark.django_db
class TestCheckInStatusGuard:
    @pytest.mark.parametrize("status", [Status.CHECKED_IN, Status.CHECKED_OUT, Status.CANCELLED])
    def test_check_in_on_non_reserved_status_raises_409(self, status: str) -> None:
        reservation = ReservationFactory(status=status)
        with freeze_time("2026-09-03 15:00:00-03:00"):
            with pytest.raises(InvalidReservationStatusError):
                check_in(reservation=reservation, moment=now(), authorize_early=True)


@pytest.mark.django_db
class TestCheckInTimestamp:
    def test_checked_in_at_uses_server_moment(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today_local())
        with freeze_time("2026-09-03 15:00:00-03:00"):
            result = check_in(reservation=reservation, moment=now())
        assert result.checked_in_at is not None


@pytest.mark.django_db
class TestArrivalsQueue:
    def test_reservation_disappears_from_arrivals_after_check_in(self) -> None:
        today = today_local()
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today)
        assert reservation in arrivals(reference_date=today, scope="today")

        with freeze_time("2026-09-03 15:00:00-03:00"):
            check_in(reservation=reservation, moment=now())

        assert reservation not in arrivals(reference_date=today, scope="today")

    def test_guest_appears_in_house_after_check_in(self) -> None:
        from apps.guests.selectors import list_guests

        today = today_local()
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today)
        with freeze_time("2026-09-03 15:00:00-03:00"):
            check_in(reservation=reservation, moment=now())

        assert reservation.guest in list_guests(status="in_house")

    def test_scope_overdue_returns_only_past_check_in_dates(self) -> None:
        today = today_local()
        overdue = ReservationFactory(
            status=Status.RESERVED, check_in_date=today - timedelta(days=2)
        )
        ReservationFactory(status=Status.RESERVED, check_in_date=today)
        result = list(arrivals(reference_date=today, scope="overdue"))
        assert result == [overdue]

    def test_check_in_before_reserved_date_is_refused(self) -> None:
        reservation = ReservationFactory(
            status=Status.RESERVED, check_in_date=today_local() + timedelta(days=1)
        )
        with freeze_time("2026-09-03 15:00:00-03:00"):
            with pytest.raises(CheckInBeforeReservedDateError) as exc_info:
                check_in(reservation=reservation, moment=now(), authorize_early=True)
        assert exc_info.value.context == {"check_in_date": "2026-09-04"}
        reservation.refresh_from_db()
        assert reservation.status == Status.RESERVED

    def test_overdue_reservation_can_still_check_in(self) -> None:
        reservation = ReservationFactory(
            status=Status.RESERVED,
            check_in_date=today_local() - timedelta(days=1),
            check_out_date=today_local() + timedelta(days=1),
        )
        with freeze_time("2026-09-03 15:00:00-03:00"):
            result = check_in(reservation=reservation, moment=now())
        assert result.status == Status.CHECKED_IN

    def test_check_in_from_the_check_out_date_on_is_refused(self) -> None:
        expired = ReservationFactory(
            room="101", check_in_date=date(2026, 9, 1), check_out_date=date(2026, 9, 3)
        )
        next_guest = ReservationFactory(
            room="101", check_in_date=date(2026, 9, 3), check_out_date=date(2026, 9, 6)
        )
        with freeze_time("2026-09-03 15:00:00-03:00"):
            check_in(reservation=next_guest, moment=now())
            with pytest.raises(CheckInAfterCheckOutDateError) as exc_info:
                check_in(reservation=expired, moment=now(), authorize_early=True)
        assert exc_info.value.context == {"check_out_date": "2026-09-03"}
        expired.refresh_from_db()
        assert expired.status == Status.RESERVED


@pytest.mark.django_db
class TestCheckInApi:
    def test_requires_authentication(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        response = APIClient().post(reverse("reservation-check-in", args=[reservation.pk]))
        assert response.status_code == 401

    def test_check_in_endpoint_returns_200_and_payload(self, client: APIClient) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today_local())
        with freeze_time("2026-09-03 15:00:00-03:00"):
            response = client.post(
                reverse("reservation-check-in", args=[reservation.pk]),
                {"authorize_early": False, "uses_parking": True},
            )
        assert response.status_code == 200
        assert response.data["status"] == "CHECKED_IN"

    def test_before_allowed_time_returns_409_with_context(self, client: APIClient) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today_local())
        with freeze_time("2026-09-03 11:32:00-03:00"):
            response = client.post(reverse("reservation-check-in", args=[reservation.pk]))
        assert response.status_code == 409
        assert response.data["code"] == "check_in_before_allowed_time"
        assert response.data["context"]["current_time"] == "11:32"

    def test_before_reserved_date_returns_409(self, client: APIClient) -> None:
        reservation = ReservationFactory(
            status=Status.RESERVED, check_in_date=today_local() + timedelta(days=2)
        )
        with freeze_time("2026-09-03 15:00:00-03:00"):
            response = client.post(
                reverse("reservation-check-in", args=[reservation.pk]), {"authorize_early": True}
            )
        assert response.status_code == 409
        assert response.data["code"] == "check_in_before_reserved_date"

    def test_client_sent_checked_in_at_is_ignored(self, client: APIClient) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=today_local())
        with freeze_time("2026-09-03 15:00:00-03:00"):
            response = client.post(
                reverse("reservation-check-in", args=[reservation.pk]),
                {"checked_in_at": "2000-01-01T00:00:00Z"},
            )
        assert response.status_code == 200
        assert not response.data["checked_in_at"].startswith("2000")
