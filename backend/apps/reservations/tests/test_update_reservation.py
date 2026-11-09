from datetime import timedelta

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.common.clock import today_local
from apps.guests.factories import GuestFactory
from apps.reservations.exceptions import ReservationNotEditableError
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status
from apps.reservations.services import cancel_reservation, update_reservation


@pytest.mark.django_db
class TestUpdateReservation:
    def test_editing_a_reserved_reservation_succeeds(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, room="101")
        today = today_local()
        updated = update_reservation(
            reservation=reservation,
            room="102",
            check_in_date=today,
            check_out_date=today + timedelta(days=2),
            uses_parking=True,
        )
        assert updated.room == "102"
        assert updated.uses_parking is True

    def test_changing_the_guest_is_persisted(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        other_guest = GuestFactory()
        updated = update_reservation(reservation=reservation, guest=other_guest)
        updated.refresh_from_db()
        assert updated.guest == other_guest

    def test_omitted_fields_keep_their_stored_values(self) -> None:
        reservation = ReservationFactory(
            status=Status.RESERVED, room="101", uses_parking=True, notes="berco"
        )
        updated = update_reservation(reservation=reservation, room="102")
        updated.refresh_from_db()
        assert updated.room == "102"
        assert updated.uses_parking is True
        assert updated.notes == "berco"

    def test_editing_a_checked_in_reservation_raises_409(self) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_IN)
        with pytest.raises(ReservationNotEditableError):
            update_reservation(
                reservation=reservation,
                room=reservation.room,
                check_in_date=reservation.check_in_date,
                check_out_date=reservation.check_out_date,
            )


@pytest.mark.django_db
class TestCancelReservation:
    def test_cancelling_a_reserved_reservation_succeeds(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        cancelled = cancel_reservation(reservation=reservation)
        assert cancelled.status == Status.CANCELLED
        assert cancelled.pk is not None

    def test_cancelling_a_checked_in_reservation_raises_409(self) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_IN)
        with pytest.raises(ReservationNotEditableError):
            cancel_reservation(reservation=reservation)


@pytest.mark.django_db
class TestUpdateCheckInDate:
    def _client(self) -> APIClient:
        client = APIClient()
        client.force_authenticate(user=UserFactory())
        return client

    def test_moving_check_in_to_the_past_is_refused(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        today = today_local()
        response = self._client().patch(
            reverse("reservation-detail", args=[reservation.pk]),
            {"check_in_date": str(today - timedelta(days=1))},
        )
        assert response.status_code == 400
        assert response.data["code"] == "check_in_in_the_past"

    def test_overdue_reservation_stays_editable_without_touching_check_in(self) -> None:
        today = today_local()
        reservation = ReservationFactory(
            status=Status.RESERVED,
            check_in_date=today - timedelta(days=1),
            check_out_date=today + timedelta(days=1),
        )
        response = self._client().patch(
            reverse("reservation-detail", args=[reservation.pk]),
            {"check_in_date": str(reservation.check_in_date), "notes": "chega à noite"},
        )
        assert response.status_code == 200
        assert response.data["notes"] == "chega à noite"
