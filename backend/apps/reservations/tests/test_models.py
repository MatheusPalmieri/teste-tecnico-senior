from datetime import timedelta
from itertools import product

import pytest
from django.db import IntegrityError, transaction

from apps.common.clock import today_local
from apps.guests.factories import GuestFactory
from apps.reservations.exceptions import InvalidTransitionError
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import ALLOWED_TRANSITIONS, Reservation, Status


def _all_status_pairs() -> list[tuple[str, str]]:
    return list(product(Status.values, Status.values))


VALID_TRANSITIONS = [
    (origin, target) for origin, targets in ALLOWED_TRANSITIONS.items() for target in targets
]
INVALID_TRANSITIONS = [pair for pair in _all_status_pairs() if pair not in VALID_TRANSITIONS]


@pytest.mark.django_db
class TestStateMachine:
    @pytest.mark.parametrize("origin,target", VALID_TRANSITIONS)
    def test_valid_transition_succeeds(self, origin: str, target: str) -> None:
        reservation = ReservationFactory(status=origin)
        reservation.transition_to(target)
        assert reservation.status == target

    @pytest.mark.parametrize("origin,target", INVALID_TRANSITIONS)
    def test_invalid_transition_raises(self, origin: str, target: str) -> None:
        reservation = ReservationFactory(status=origin)
        with pytest.raises(InvalidTransitionError):
            reservation.transition_to(target)

    def test_duplicate_check_in_is_blocked(self) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_IN)
        with pytest.raises(InvalidTransitionError):
            reservation.transition_to(Status.CHECKED_IN)

    def test_check_out_without_check_in_is_blocked(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        with pytest.raises(InvalidTransitionError):
            reservation.transition_to(Status.CHECKED_OUT)


@pytest.mark.django_db
class TestPeriodConstraint:
    def test_database_rejects_check_out_before_check_in(self) -> None:
        today = today_local()
        reservation = ReservationFactory.build(
            check_in_date=today, check_out_date=today - timedelta(days=1)
        )
        with pytest.raises(IntegrityError), transaction.atomic():
            Reservation.objects.bulk_create([reservation])

    def test_database_rejects_zero_night_stay(self) -> None:
        today = today_local()
        reservation = ReservationFactory.build(check_in_date=today, check_out_date=today)
        with pytest.raises(IntegrityError), transaction.atomic():
            Reservation.objects.bulk_create([reservation])


@pytest.mark.django_db
class TestRoomChoiceConstraint:
    def test_room_outside_catalog_is_rejected(self) -> None:
        reservation = ReservationFactory.build(room="999")
        with pytest.raises(Exception):  # noqa: B017
            reservation.full_clean()


@pytest.mark.django_db
class TestSoftDeleteHistory:
    def test_cancelled_reservation_stays_queryable(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        reservation.transition_to(Status.CANCELLED)
        reservation.save()
        assert Reservation.objects.filter(id=reservation.id, status=Status.CANCELLED).exists()


@pytest.mark.django_db
class TestCodeGeneration:
    def test_collision_retries_with_a_new_code(self, monkeypatch: pytest.MonkeyPatch) -> None:
        existing = ReservationFactory()
        codes = iter([existing.code, "R-9999"])
        monkeypatch.setattr("apps.reservations.models._next_code", lambda: next(codes))

        reservation = ReservationFactory.build(code="", guest=GuestFactory())
        reservation.save()

        assert reservation.code == "R-9999"
        assert Reservation.objects.filter(code="R-9999").exists()

    def test_exhausting_attempts_propagates_the_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        existing = ReservationFactory()
        monkeypatch.setattr("apps.reservations.models._next_code", lambda: existing.code)

        reservation = ReservationFactory.build(code="", guest=GuestFactory())
        with pytest.raises(IntegrityError):
            reservation.save()
