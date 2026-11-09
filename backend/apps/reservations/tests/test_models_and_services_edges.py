from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest
from django.utils import timezone

from apps.guests.factories import GuestFactory
from apps.reservations import services
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Reservation, Status, _next_code
from apps.reservations.rooms import HOTEL_ROOMS


@pytest.mark.django_db
class TestNextCode:
    def test_first_code_starts_at_one(self) -> None:
        assert _next_code() == "R-0001"

    def test_increments_from_the_last_code(self) -> None:
        ReservationFactory()
        ReservationFactory(room=HOTEL_ROOMS[1])

        assert _next_code() == "R-0003"

    def test_ignores_a_legacy_code_outside_the_pattern(self) -> None:
        reservation = ReservationFactory()
        Reservation.objects.filter(pk=reservation.pk).update(code="LEGADO")
        ReservationFactory(room=HOTEL_ROOMS[1], code="R-0007")

        assert _next_code() == "R-0008"

    def test_uses_the_highest_number_not_the_latest_row(self) -> None:
        newer = ReservationFactory(code="R-0005")
        older = ReservationFactory(room=HOTEL_ROOMS[1], code="R-0009")
        Reservation.objects.filter(pk=older.pk).update(
            created_at=newer.created_at - timedelta(days=1)
        )

        assert _next_code() == "R-0010"

    def test_numbers_past_9999_keep_growing(self) -> None:
        ReservationFactory(code="R-9999")
        ReservationFactory(room=HOTEL_ROOMS[1], code="R-10000")

        assert _next_code() == "R-10001"

    def test_an_explicit_code_is_preserved_on_save(self) -> None:
        reservation = ReservationFactory(code="R-9999")
        reservation.refresh_from_db()

        assert reservation.code == "R-9999"


@pytest.mark.django_db
class TestReservationStr:
    def test_str_shows_code_guest_and_status(self) -> None:
        reservation = ReservationFactory(guest=GuestFactory(name="Ana Souza"))

        assert str(reservation) == f"{reservation.code} — Ana Souza (RESERVED)"


@pytest.mark.django_db
class TestUpdateReservationOptionalFields:
    def test_updates_plate_and_notes_without_touching_the_rest(self) -> None:
        reservation = ReservationFactory(uses_parking=True, vehicle_plate="AAA0A00", notes="antes")

        updated = services.update_reservation(
            reservation=reservation,
            guest=reservation.guest,
            room=reservation.room,
            check_in_date=reservation.check_in_date,
            check_out_date=reservation.check_out_date,
            vehicle_plate="ABC1D23",
            notes="depois",
        )

        assert updated.vehicle_plate == "ABC1D23"
        assert updated.notes == "depois"
        assert updated.uses_parking is True

    def test_omitted_optional_fields_keep_their_value(self) -> None:
        reservation = ReservationFactory(uses_parking=True, vehicle_plate="AAA0A00", notes="antes")

        updated = services.update_reservation(
            reservation=reservation,
            guest=reservation.guest,
            room=reservation.room,
            check_in_date=reservation.check_in_date,
            check_out_date=reservation.check_out_date + timedelta(days=1),
        )

        assert updated.uses_parking is True
        assert updated.vehicle_plate == "AAA0A00"
        assert updated.notes == "antes"


@pytest.mark.django_db
class TestCheckInOptionalFields:
    def test_check_in_can_add_parking_and_plate(self) -> None:
        today = timezone.localdate()
        reservation = ReservationFactory(
            status=Status.RESERVED,
            uses_parking=False,
            check_in_date=today,
            check_out_date=today + timedelta(days=1),
        )
        moment = timezone.make_aware(datetime.combine(today, datetime.min.time()).replace(hour=15))

        updated = services.check_in(
            reservation=reservation,
            moment=moment,
            uses_parking=True,
            vehicle_plate="ABC1D23",
        )

        assert updated.status == Status.CHECKED_IN
        assert updated.uses_parking is True
        assert updated.vehicle_plate == "ABC1D23"


@pytest.mark.django_db
class TestCheckOutNotes:
    def test_check_out_records_the_notes(self) -> None:
        today = timezone.localdate()
        reservation = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=today - timedelta(days=1),
            check_out_date=today,
        )
        moment = timezone.make_aware(datetime.combine(today, datetime.min.time()).replace(hour=10))

        updated = services.check_out(
            reservation=reservation,
            moment=moment,
            notes="Levou a chave por engano",
        )

        assert updated.status == Status.CHECKED_OUT
        assert updated.notes == "Levou a chave por engano"

    def test_check_out_without_notes_keeps_the_existing_ones(self) -> None:
        today = timezone.localdate()
        reservation = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=today - timedelta(days=1),
            check_out_date=today,
            notes="Observação da reserva",
        )
        moment = timezone.make_aware(datetime.combine(today, datetime.min.time()).replace(hour=10))

        updated = services.check_out(reservation=reservation, moment=moment)

        assert updated.notes == "Observação da reserva"


@pytest.mark.django_db
class TestAvailableRoomsExcludingAReservation:
    def test_the_reservation_being_edited_does_not_block_its_own_room(self) -> None:
        reservation = ReservationFactory(
            check_in_date=date(2026, 9, 3), check_out_date=date(2026, 9, 6)
        )

        without_exclusion = services.available_rooms(
            check_in_date=date(2026, 9, 3), check_out_date=date(2026, 9, 6)
        )
        with_exclusion = services.available_rooms(
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 6),
            exclude_pk=str(reservation.pk),
        )

        assert reservation.room not in without_exclusion
        assert reservation.room in with_exclusion
