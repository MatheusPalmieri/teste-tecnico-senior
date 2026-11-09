from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest
from django.utils import timezone

from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status
from apps.reservations.selectors import (
    arrivals,
    departures,
    is_reservation_late_check_out,
)

_TZ = timezone.get_default_timezone()


def _local(year: int, month: int, day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=_TZ)


@pytest.mark.django_db
class TestIsReservationLateCheckOut:
    def test_not_late_when_departure_is_in_the_future(self) -> None:
        reservation = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 6),
        )

        assert is_reservation_late_check_out(reservation, moment=_local(2026, 9, 5, 18)) is False

    def test_not_late_before_noon_on_the_departure_day(self) -> None:
        reservation = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 6),
        )

        assert is_reservation_late_check_out(reservation, moment=_local(2026, 9, 6, 11)) is False

    def test_late_after_noon_on_the_departure_day(self) -> None:
        reservation = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 6),
        )

        assert is_reservation_late_check_out(reservation, moment=_local(2026, 9, 6, 12, 1)) is True

    def test_late_when_the_departure_day_already_passed(self) -> None:
        reservation = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 6),
        )

        assert is_reservation_late_check_out(reservation, moment=_local(2026, 9, 7, 9)) is True

    def test_a_reservation_not_checked_in_is_never_late(self) -> None:
        reservation = ReservationFactory(
            status=Status.RESERVED,
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 6),
        )

        assert is_reservation_late_check_out(reservation, moment=_local(2026, 9, 7, 9)) is False


@pytest.mark.django_db
class TestDeparturesAllInHouse:
    def test_all_in_house_ignores_the_reference_date(self) -> None:
        today = timezone.localdate()
        leaving_today = ReservationFactory(
            status=Status.CHECKED_IN, check_in_date=today - timedelta(days=2), check_out_date=today
        )
        leaving_later = ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=today - timedelta(days=1),
            check_out_date=today + timedelta(days=5),
        )
        ReservationFactory(status=Status.CHECKED_OUT)

        result = departures(reference_date=today, scope="all_in_house")

        assert set(result) == {leaving_today, leaving_later}

    def test_all_in_house_still_honors_the_search(self) -> None:
        today = timezone.localdate()
        wanted = ReservationFactory(status=Status.CHECKED_IN)
        ReservationFactory(status=Status.CHECKED_IN)

        result = departures(reference_date=today, search=wanted.code, scope="all_in_house")

        assert list(result) == [wanted]


@pytest.mark.django_db
class TestArrivalsAllPending:
    def test_all_pending_ignores_the_reference_date(self) -> None:
        today = timezone.localdate()
        overdue = ReservationFactory(
            status=Status.RESERVED,
            check_in_date=today - timedelta(days=3),
            check_out_date=today - timedelta(days=1),
        )
        future = ReservationFactory(
            status=Status.RESERVED,
            check_in_date=today + timedelta(days=5),
            check_out_date=today + timedelta(days=7),
        )
        ReservationFactory(status=Status.CHECKED_IN)

        result = arrivals(reference_date=today, scope="all_pending")

        assert set(result) == {overdue, future}
