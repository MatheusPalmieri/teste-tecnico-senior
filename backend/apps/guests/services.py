from __future__ import annotations

from django.db import IntegrityError, transaction
from django.db.models import ProtectedError

from apps.common.cache import invalidate_operational_caches
from apps.common.clock import today_local
from apps.reservations.models import ACTIVE_STATUSES

from .exceptions import GuestDocumentTakenError, GuestHasActiveReservationError
from .models import Guest


def _invalidate_dashboard_on_commit() -> None:
    transaction.on_commit(lambda: invalidate_operational_caches(reference_date=today_local()))


@transaction.atomic
def create_guest(
    *,
    name: str,
    document: str,
    phone: str,
    email: str = "",
    notes: str = "",
) -> Guest:
    guest = Guest(name=name, document=document, phone=phone, email=email, notes=notes)
    try:
        guest.save()
    except IntegrityError as exc:
        raise GuestDocumentTakenError from exc
    _invalidate_dashboard_on_commit()
    return guest


@transaction.atomic
def update_guest(
    *,
    guest: Guest,
    name: str | None = None,
    document: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    notes: str | None = None,
) -> Guest:
    if name is not None:
        guest.name = name
    if document is not None:
        guest.document = document
    if phone is not None:
        guest.phone = phone
    if email is not None:
        guest.email = email
    if notes is not None:
        guest.notes = notes
    try:
        guest.save()
    except IntegrityError as exc:
        raise GuestDocumentTakenError from exc
    _invalidate_dashboard_on_commit()
    return guest


def delete_guest(*, guest: Guest) -> None:
    if guest.reservations.filter(status__in=ACTIVE_STATUSES).exists():
        raise GuestHasActiveReservationError()
    try:
        guest.delete()
    except ProtectedError as exc:
        raise GuestHasActiveReservationError(
            detail="Este hóspede possui histórico de reservas e não pode ser excluído.",
        ) from exc
    _invalidate_dashboard_on_commit()
