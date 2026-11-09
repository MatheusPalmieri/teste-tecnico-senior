from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Final, cast

from apps.accounts.models import User
from apps.guests.factories import GuestFactory
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Reservation, Status
from apps.reservations.rooms import HOTEL_ROOMS


def _make_reservation(**kwargs: Any) -> Reservation:
    return cast(Reservation, ReservationFactory(**kwargs))


ATTENDANT_EMAIL: Final = "atendente@hotel.com"
ATTENDANT_PASSWORD: Final = "senha123"

CANONICAL_CHECK_IN: Final = date(2026, 9, 3)
CANONICAL_CHECK_OUT: Final = date(2026, 9, 6)


def _attendant() -> User:
    user, created = User.objects.get_or_create(
        email=ATTENDANT_EMAIL, defaults={"name": "Atendente Demo"}
    )
    if created:
        user.set_password(ATTENDANT_PASSWORD)
        user.save(update_fields=["password"])
    return user


def _seed_empty() -> None:
    _attendant()


def _seed_canonical_stay() -> None:
    attendant = _attendant()
    guest = GuestFactory(name="José Antônio Silva")
    reservation = _make_reservation(
        guest=guest,
        room=HOTEL_ROOMS[0],
        check_in_date=CANONICAL_CHECK_IN,
        check_out_date=CANONICAL_CHECK_OUT,
        uses_parking=True,
        created_by=attendant,
    )
    reservation.transition_to(Status.CHECKED_IN)
    reservation.checked_in_at = reservation.created_at
    reservation.save()


def _seed_arrivals_today() -> None:
    attendant = _attendant()
    today = CANONICAL_CHECK_IN
    for index in range(3):
        ReservationFactory(
            guest=GuestFactory(),
            room=HOTEL_ROOMS[index],
            check_in_date=today,
            check_out_date=today + timedelta(days=2),
            status=Status.RESERVED,
            created_by=attendant,
        )
    ReservationFactory(
        guest=GuestFactory(),
        room=HOTEL_ROOMS[3],
        check_in_date=today - timedelta(days=1),
        check_out_date=today + timedelta(days=1),
        status=Status.RESERVED,
        created_by=attendant,
    )


def _seed_future_arrival() -> None:
    attendant = _attendant()
    ReservationFactory(
        guest=GuestFactory(name="Carla Futura"),
        room=HOTEL_ROOMS[0],
        check_in_date=CANONICAL_CHECK_IN + timedelta(days=2),
        check_out_date=CANONICAL_CHECK_IN + timedelta(days=4),
        status=Status.RESERVED,
        created_by=attendant,
    )


def _seed_departures_today() -> None:
    attendant = _attendant()
    today = CANONICAL_CHECK_IN
    for index in range(3):
        reservation = _make_reservation(
            guest=GuestFactory(),
            room=HOTEL_ROOMS[index],
            check_in_date=today - timedelta(days=2),
            check_out_date=today,
            created_by=attendant,
        )
        reservation.transition_to(Status.CHECKED_IN)
        reservation.checked_in_at = reservation.created_at
        reservation.save()


def _seed_mixed_statuses() -> None:
    attendant = _attendant()
    today = CANONICAL_CHECK_IN
    statuses_and_offsets = [
        (Status.RESERVED, 1),
        (Status.CHECKED_IN, -1),
        (Status.CHECKED_OUT, -3),
        (Status.CANCELLED, 2),
    ]
    for index, (status, offset) in enumerate(statuses_and_offsets):
        check_in = today + timedelta(days=offset)
        reservation = _make_reservation(
            guest=GuestFactory(),
            room=HOTEL_ROOMS[index],
            check_in_date=check_in,
            check_out_date=check_in + timedelta(days=2),
            created_by=attendant,
        )
        if status in (Status.CHECKED_IN, Status.CHECKED_OUT):
            reservation.transition_to(Status.CHECKED_IN)
            reservation.checked_in_at = reservation.created_at
        if status == Status.CHECKED_OUT:
            reservation.transition_to(Status.CHECKED_OUT)
            reservation.checked_out_at = reservation.updated_at
        if status == Status.CANCELLED:
            reservation.transition_to(Status.CANCELLED)
        reservation.save()


def _seed_search_fixtures() -> None:
    _attendant()
    GuestFactory(name="José Antônio Silva", document="11122233396", phone="11988887777")
    GuestFactory(name="João da Conceição", document="22233344405", phone="11977776666")
    GuestFactory(name="Maria José Núñez", document="33344455508", phone="11966665555")


SCENARIOS: Final = {
    "empty": _seed_empty,
    "canonical-stay": _seed_canonical_stay,
    "arrivals-today": _seed_arrivals_today,
    "future-arrival": _seed_future_arrival,
    "departures-today": _seed_departures_today,
    "mixed-statuses": _seed_mixed_statuses,
    "search-fixtures": _seed_search_fixtures,
}
