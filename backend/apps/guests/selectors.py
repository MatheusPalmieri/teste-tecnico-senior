from __future__ import annotations

import unicodedata
from typing import Literal

from django.db.models import Case, Prefetch, Q, QuerySet, Value, When

from apps.reservations.models import ACTIVE_STATUSES, Reservation, Status

from .models import Guest, only_digits, unaccented

GuestStatus = Literal["in_house", "awaiting_check_in"]

_ACTIVE_RESERVATIONS_ORDERED = Reservation.objects.filter(status__in=ACTIVE_STATUSES).order_by(
    Case(When(status=Status.CHECKED_IN, then=Value(0)), default=Value(1)),
    "-check_in_date",
)


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def _apply_search(qs: QuerySet[Guest], term: str) -> QuerySet[Guest]:
    digits = only_digits(term)
    qs = qs.annotate(unaccented_name=unaccented("name"))

    stripped = _strip_accents(term)
    condition = Q(unaccented_name__icontains=stripped)
    if digits:
        condition |= Q(document__startswith=digits)
        condition |= Q(phone__contains=digits)
    return qs.filter(condition)


def list_guests(
    *,
    search: str | None = None,
    status: GuestStatus | None = None,
    uses_parking: bool | None = None,
    ordering: str | None = None,
) -> QuerySet[Guest]:
    qs: QuerySet[Guest] = Guest.objects.prefetch_related(
        Prefetch(
            "reservations",
            queryset=_ACTIVE_RESERVATIONS_ORDERED,
            to_attr="active_reservations",
        )
    )

    if search:
        qs = _apply_search(qs, search)

    if status == "in_house":
        active_ids = Reservation.objects.filter(status=Status.CHECKED_IN).values("guest_id")
        qs = qs.filter(id__in=active_ids)
    elif status == "awaiting_check_in":
        pending_ids = Reservation.objects.filter(status=Status.RESERVED).values("guest_id")
        qs = qs.filter(id__in=pending_ids)

    if uses_parking is not None:
        qs = qs.filter(
            id__in=Reservation.objects.filter(
                status__in=ACTIVE_STATUSES, uses_parking=uses_parking
            ).values("guest_id")
        )

    if ordering:
        qs = qs.order_by(ordering)

    return qs


def get_current_reservation(guest: Guest) -> Reservation | None:
    active = getattr(guest, "active_reservations", None)
    if active is not None:
        return active[0] if active else None
    return _ACTIVE_RESERVATIONS_ORDERED.filter(guest=guest).first()


def guest_history(guest: Guest) -> QuerySet[Reservation]:
    return guest.reservations.all()
