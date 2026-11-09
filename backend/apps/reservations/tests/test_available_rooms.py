from datetime import timedelta

import pytest

from apps.common.clock import today_local
from apps.guests.factories import GuestFactory
from apps.reservations.factories import ReservationFactory
from apps.reservations.rooms import HOTEL_ROOMS, TOTAL_ROOMS
from apps.reservations.services import available_rooms, create_reservation


@pytest.mark.django_db
class TestAvailableRooms:
    def test_excludes_occupied_rooms_and_keeps_free_ones(self) -> None:
        today = today_local()
        reservation = ReservationFactory(
            room="101", check_in_date=today, check_out_date=today + timedelta(days=2)
        )
        result = available_rooms(check_in_date=today, check_out_date=today + timedelta(days=2))
        assert reservation.room not in result
        assert "102" in result

    def test_editing_includes_the_reservations_own_room(self) -> None:
        today = today_local()
        reservation = ReservationFactory(
            room="101", check_in_date=today, check_out_date=today + timedelta(days=2)
        )
        result = available_rooms(
            check_in_date=today,
            check_out_date=today + timedelta(days=2),
            exclude_pk=str(reservation.pk),
        )
        assert "101" in result

    def test_fully_booked_hotel_returns_empty_list(self) -> None:
        today = today_local()
        for room in HOTEL_ROOMS:
            create_reservation(
                guest=GuestFactory(),
                room=room,
                check_in_date=today,
                check_out_date=today + timedelta(days=1),
            )
        result = available_rooms(check_in_date=today, check_out_date=today + timedelta(days=1))
        assert result == []
        assert len(HOTEL_ROOMS) == TOTAL_ROOMS
