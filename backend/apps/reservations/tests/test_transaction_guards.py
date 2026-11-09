from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from unittest import mock

import pytest
from django.db import IntegrityError, connection, transaction
from django.test.utils import CaptureQueriesContext
from freezegun import freeze_time

from apps.common.clock import now, today_local
from apps.guests.factories import GuestFactory
from apps.reservations.exceptions import (
    InvalidReservationStatusError,
    ReservationNotEditableError,
    RoomUnavailableError,
)
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import (
    ROOM_OVERLAP_CONSTRAINT,
    Reservation,
    Status,
    _next_code,
    violated_constraint,
)
from apps.reservations.rooms import HOTEL_ROOMS
from apps.reservations.services import (
    _assert_room_is_free,
    cancel_reservation,
    check_in,
    check_out,
    create_reservation,
    update_reservation,
)

BOOM = "apps.reservations.services._invalidate_dashboard_on_commit"


@pytest.mark.django_db
class TestCheckInIsAtomic:
    def test_exception_after_transition_leaves_no_partial_state(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=date(2026, 9, 3))

        with freeze_time("2026-09-03 15:00:00-03:00"):
            with mock.patch(BOOM, side_effect=RuntimeError("kaboom")):
                with pytest.raises(RuntimeError):
                    check_in(reservation=reservation, moment=now())

        fresh = Reservation.objects.get(pk=reservation.pk)
        assert fresh.status == Status.RESERVED
        assert fresh.checked_in_at is None
        assert fresh.early_check_in_authorized is False


@pytest.mark.django_db
class TestCheckOutIsAtomic:
    def test_rollback_keeps_reservation_checked_in(self) -> None:
        reservation = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=today_local() - timedelta(days=2),
            check_out_date=today_local(),
        )

        with freeze_time("2026-09-06 11:00:00-03:00"):
            with mock.patch(BOOM, side_effect=RuntimeError("kaboom")):
                with pytest.raises(RuntimeError):
                    check_out(reservation=reservation, moment=now())

        fresh = Reservation.objects.get(pk=reservation.pk)
        assert fresh.status == Status.CHECKED_IN
        assert fresh.checked_out_at is None
        assert fresh.total_amount is None
        assert fresh.charges_snapshot is None


@pytest.mark.django_db
class TestRoomOverlapUsesRowLock:
    def test_create_reservation_rolls_back_as_a_unit(self) -> None:
        before = Reservation.objects.count()
        with mock.patch(BOOM, side_effect=RuntimeError("kaboom")):
            with pytest.raises(RuntimeError):
                create_reservation(
                    guest=GuestFactory(),
                    room=HOTEL_ROOMS[0],
                    check_in_date=today_local(),
                    check_out_date=today_local() + timedelta(days=1),
                )
        assert Reservation.objects.count() == before

    def test_room_free_check_selects_for_update(self) -> None:
        captured: dict[str, object] = {}
        real_filter = Reservation.objects.select_for_update

        def spy() -> object:
            qs = real_filter()
            captured["select_for_update"] = qs.query.select_for_update
            return qs

        with mock.patch.object(Reservation.objects, "select_for_update", spy):
            _assert_room_is_free(
                room=HOTEL_ROOMS[1],
                check_in_date=today_local(),
                check_out_date=today_local() + timedelta(days=1),
            )
        assert captured["select_for_update"] is True

    def test_second_overlapping_create_loses_with_409(self) -> None:
        today = today_local()
        create_reservation(
            guest=GuestFactory(),
            room=HOTEL_ROOMS[2],
            check_in_date=today,
            check_out_date=today + timedelta(days=2),
        )
        with pytest.raises(RoomUnavailableError):
            create_reservation(
                guest=GuestFactory(),
                room=HOTEL_ROOMS[2],
                check_in_date=today + timedelta(days=1),
                check_out_date=today + timedelta(days=3),
            )


@pytest.mark.django_db
class TestStaleInstanceCannotOverwrite:
    def test_check_in_on_a_reservation_cancelled_meanwhile_is_refused(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=date(2026, 9, 3))
        stale = Reservation.objects.get(pk=reservation.pk)
        cancel_reservation(reservation=reservation)

        with freeze_time("2026-09-03 15:00:00-03:00"):
            with pytest.raises(InvalidReservationStatusError):
                check_in(reservation=stale, moment=now())

        fresh = Reservation.objects.get(pk=reservation.pk)
        assert fresh.status == Status.CANCELLED
        assert fresh.checked_in_at is None

    def test_cancel_after_a_concurrent_check_in_is_refused(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=date(2026, 9, 3))
        stale = Reservation.objects.get(pk=reservation.pk)
        with freeze_time("2026-09-03 15:00:00-03:00"):
            check_in(reservation=reservation, moment=now())

        with pytest.raises(ReservationNotEditableError):
            cancel_reservation(reservation=stale)
        assert Reservation.objects.get(pk=reservation.pk).status == Status.CHECKED_IN

    def test_second_check_out_with_a_stale_copy_does_not_charge_twice(self) -> None:
        reservation = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 6),
        )
        stale = Reservation.objects.get(pk=reservation.pk)
        with freeze_time("2026-09-06 11:00:00-03:00"):
            check_out(reservation=reservation, moment=now())
        with freeze_time("2026-09-06 15:00:00-03:00"):
            with pytest.raises(InvalidReservationStatusError):
                check_out(reservation=stale, moment=now())

        fresh = Reservation.objects.get(pk=reservation.pk)
        assert fresh.total_amount == Decimal("420.00")

    def test_update_on_a_reservation_checked_in_meanwhile_is_refused(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=date(2026, 9, 3))
        stale = Reservation.objects.get(pk=reservation.pk)
        with freeze_time("2026-09-03 15:00:00-03:00"):
            check_in(reservation=reservation, moment=now())

        with pytest.raises(ReservationNotEditableError):
            update_reservation(reservation=stale, notes="tarde demais")


def _locks_the_reservation_row(action) -> bool:
    with CaptureQueriesContext(connection) as ctx:
        action()
    return any(
        "FOR UPDATE" in query["sql"] and 'WHERE "reservations_reservation"."id" =' in query["sql"]
        for query in ctx.captured_queries
    )


@pytest.mark.django_db
class TestMutationsLockTheRow:
    def test_check_in_locks(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED, check_in_date=date(2026, 9, 3))
        with freeze_time("2026-09-03 15:00:00-03:00"):
            assert _locks_the_reservation_row(
                lambda: check_in(reservation=reservation, moment=now())
            )

    def test_check_out_locks(self) -> None:
        reservation = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 6),
        )
        with freeze_time("2026-09-06 11:00:00-03:00"):
            assert _locks_the_reservation_row(
                lambda: check_out(reservation=reservation, moment=now())
            )

    def test_cancel_locks(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        assert _locks_the_reservation_row(lambda: cancel_reservation(reservation=reservation))

    def test_update_locks(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        assert _locks_the_reservation_row(
            lambda: update_reservation(reservation=reservation, notes="ok")
        )


@pytest.mark.django_db
class TestRoomOverlapConstraint:
    def test_database_rejects_overlapping_active_reservations(self) -> None:
        today = today_local()
        ReservationFactory(
            room="101", check_in_date=today, check_out_date=today + timedelta(days=3)
        )
        with pytest.raises(IntegrityError) as exc_info, transaction.atomic():
            Reservation.objects.create(
                guest=GuestFactory(),
                room="101",
                code="R-9999",
                check_in_date=today + timedelta(days=1),
                check_out_date=today + timedelta(days=2),
            )
        assert violated_constraint(exc_info.value) == ROOM_OVERLAP_CONSTRAINT

    def test_cancelled_or_finished_stays_do_not_block_the_room(self) -> None:
        today = today_local()
        for status in (Status.CANCELLED, Status.CHECKED_OUT):
            ReservationFactory(
                status=status,
                room="101",
                check_in_date=today,
                check_out_date=today + timedelta(days=2),
            )
        created = create_reservation(
            guest=GuestFactory(),
            room="101",
            check_in_date=today,
            check_out_date=today + timedelta(days=2),
        )
        assert created.room == "101"

    def test_back_to_back_stays_share_the_room(self) -> None:
        today = today_local()
        ReservationFactory(
            room="101", check_in_date=today, check_out_date=today + timedelta(days=2)
        )
        created = create_reservation(
            guest=GuestFactory(),
            room="101",
            check_in_date=today + timedelta(days=2),
            check_out_date=today + timedelta(days=4),
        )
        assert created.room == "101"

    def test_race_on_create_becomes_room_unavailable(self) -> None:
        today = today_local()
        ReservationFactory(
            room="102", check_in_date=today, check_out_date=today + timedelta(days=2)
        )
        with (
            mock.patch("apps.reservations.services._assert_room_is_free"),
            mock.patch.object(Reservation, "full_clean"),
            pytest.raises(RoomUnavailableError),
        ):
            create_reservation(
                guest=GuestFactory(),
                room="102",
                check_in_date=today,
                check_out_date=today + timedelta(days=1),
            )

    def test_race_on_update_becomes_room_unavailable(self) -> None:
        today = today_local()
        ReservationFactory(
            room="103", check_in_date=today, check_out_date=today + timedelta(days=2)
        )
        other = ReservationFactory(
            room="201", check_in_date=today, check_out_date=today + timedelta(days=2)
        )
        with (
            mock.patch("apps.reservations.services._assert_room_is_free"),
            mock.patch.object(Reservation, "full_clean"),
            pytest.raises(RoomUnavailableError),
        ):
            update_reservation(reservation=other, room="103")

    def test_room_conflict_is_not_retried_as_a_code_collision(self) -> None:
        today = today_local()
        ReservationFactory(
            room="202", check_in_date=today, check_out_date=today + timedelta(days=2)
        )
        reservation = Reservation(
            guest=GuestFactory(),
            room="202",
            check_in_date=today,
            check_out_date=today + timedelta(days=1),
        )
        with (
            mock.patch("apps.reservations.models._next_code", wraps=_next_code) as next_code,
            pytest.raises(IntegrityError),
            transaction.atomic(),
        ):
            reservation.save()
        assert next_code.call_count == 1

    def test_other_integrity_errors_propagate_from_the_service(self) -> None:
        today = today_local()
        with (
            mock.patch.object(Reservation, "full_clean"),
            mock.patch.object(Reservation, "save", side_effect=IntegrityError("outra")),
            pytest.raises(IntegrityError),
        ):
            create_reservation(
                guest=GuestFactory(),
                room="203",
                check_in_date=today,
                check_out_date=today + timedelta(days=1),
            )
