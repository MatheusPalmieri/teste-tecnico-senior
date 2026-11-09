from datetime import timedelta

import pytest
from django.db.models import ProtectedError

from apps.common.clock import today_local
from apps.guests.factories import GuestFactory
from apps.reservations.exceptions import RoomUnavailableError
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status
from apps.reservations.rooms import HOTEL_ROOMS
from apps.reservations.services import cancel_reservation, create_reservation


@pytest.mark.django_db
class TestGuestOverlap:
    def test_overlapping_reservation_for_same_guest_is_accepted_with_warning(self) -> None:
        guest = GuestFactory()
        today = today_local()
        first = create_reservation(
            guest=guest,
            room=HOTEL_ROOMS[0],
            check_in_date=today,
            check_out_date=today + timedelta(days=3),
        )
        second = create_reservation(
            guest=guest,
            room=HOTEL_ROOMS[1],
            check_in_date=today + timedelta(days=1),
            check_out_date=today + timedelta(days=4),
        )
        assert second.pk is not None
        assert [w.code for w in second.warnings] == ["reservation_overlaps"]
        assert second.warnings[0].context == {"conflicting_reservation": first.code}

    def test_non_overlapping_reservation_for_same_guest_has_no_warning(self) -> None:
        guest = GuestFactory()
        today = today_local()
        create_reservation(
            guest=guest,
            room=HOTEL_ROOMS[0],
            check_in_date=today,
            check_out_date=today + timedelta(days=2),
        )
        reservation = create_reservation(
            guest=guest,
            room=HOTEL_ROOMS[1],
            check_in_date=today + timedelta(days=5),
            check_out_date=today + timedelta(days=7),
        )
        assert reservation.pk is not None
        assert reservation.warnings == []

    def test_cancelled_overlapping_reservation_does_not_warn(self) -> None:
        guest = GuestFactory()
        today = today_local()
        first = create_reservation(
            guest=guest,
            room=HOTEL_ROOMS[0],
            check_in_date=today,
            check_out_date=today + timedelta(days=3),
        )
        cancel_reservation(reservation=first)

        second = create_reservation(
            guest=guest,
            room=HOTEL_ROOMS[1],
            check_in_date=today + timedelta(days=1),
            check_out_date=today + timedelta(days=4),
        )
        assert second.warnings == []


@pytest.mark.django_db
class TestRoomOverlap:
    def test_overlapping_reservation_for_same_room_is_rejected(self) -> None:
        today = today_local()
        create_reservation(
            guest=GuestFactory(),
            room="101",
            check_in_date=today,
            check_out_date=today + timedelta(days=3),
        )
        with pytest.raises(RoomUnavailableError):
            create_reservation(
                guest=GuestFactory(),
                room="101",
                check_in_date=today + timedelta(days=2),
                check_out_date=today + timedelta(days=5),
            )

    def test_adjacent_periods_in_same_room_are_accepted(self) -> None:
        today = today_local()
        create_reservation(
            guest=GuestFactory(),
            room="102",
            check_in_date=today,
            check_out_date=today + timedelta(days=2),
        )
        reservation = create_reservation(
            guest=GuestFactory(),
            room="102",
            check_in_date=today + timedelta(days=2),
            check_out_date=today + timedelta(days=4),
        )
        assert reservation.pk is not None

    def test_room_freed_by_cancelled_reservation_is_available_again(self) -> None:
        today = today_local()
        first = create_reservation(
            guest=GuestFactory(),
            room="103",
            check_in_date=today,
            check_out_date=today + timedelta(days=2),
        )
        cancel_reservation(reservation=first)

        reservation = create_reservation(
            guest=GuestFactory(),
            room="103",
            check_in_date=today,
            check_out_date=today + timedelta(days=2),
        )
        assert reservation.pk is not None


@pytest.mark.django_db
class TestGuestDeletionProtection:
    def test_deleting_guest_with_active_reservation_fails(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        with pytest.raises(ProtectedError):
            reservation.guest.delete()
