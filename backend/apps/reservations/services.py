from __future__ import annotations

from dataclasses import asdict
from datetime import date, datetime
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.common.cache import invalidate_operational_caches
from apps.common.clock import today_local
from apps.guests.models import Guest
from apps.pricing.calculator import build_breakdown, is_check_in_allowed
from apps.pricing.models import Breakdown
from apps.pricing.policy import PricingPolicy

from .exceptions import (
    CheckInAfterCheckOutDateError,
    CheckInBeforeAllowedTimeError,
    CheckInBeforeReservedDateError,
    CheckOutTotalChangedError,
    InvalidReservationStatusError,
    ReservationNotEditableError,
    RoomUnavailableError,
)
from .models import (
    ACTIVE_STATUSES,
    ROOM_OVERLAP_CONSTRAINT,
    Reservation,
    Status,
    violated_constraint,
)
from .rooms import HOTEL_ROOMS
from .warnings import ReservationWarning, guest_overlap_warning


def _invalidate_dashboard_on_commit() -> None:
    transaction.on_commit(lambda: invalidate_operational_caches(reference_date=today_local()))


def _locked(reservation: Reservation) -> Reservation:
    return Reservation.objects.select_for_update().get(pk=reservation.pk)


def _save_checking_room(reservation: Reservation) -> None:
    try:
        reservation.save()
    except IntegrityError as exc:
        if violated_constraint(exc) == ROOM_OVERLAP_CONSTRAINT:
            raise RoomUnavailableError() from exc
        raise


def _overlapping(check_in_date: date, check_out_date: date) -> Q:
    return Q(check_in_date__lt=check_out_date) & Q(check_out_date__gt=check_in_date)


def _guest_overlap(
    *, guest: Guest, check_in_date: date, check_out_date: date, exclude_id: str | None = None
) -> ReservationWarning | None:
    qs = (
        Reservation.objects.select_for_update()
        .filter(guest=guest, status__in=ACTIVE_STATUSES)
        .filter(_overlapping(check_in_date, check_out_date))
    )
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    conflict = qs.first()
    if conflict is None:
        return None
    return guest_overlap_warning(conflicting_code=conflict.code)


def _assert_room_is_free(
    *, room: str, check_in_date: date, check_out_date: date, exclude_id: str | None = None
) -> None:
    qs = (
        Reservation.objects.select_for_update()
        .filter(room=room, status__in=ACTIVE_STATUSES)
        .filter(_overlapping(check_in_date, check_out_date))
    )
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    conflict = qs.first()
    if conflict:
        raise RoomUnavailableError(context={"conflicting_reservation": conflict.code})


@transaction.atomic
def create_reservation(
    *,
    guest: Guest,
    room: str,
    check_in_date: date,
    check_out_date: date,
    uses_parking: bool = False,
    vehicle_plate: str = "",
    notes: str = "",
    created_by: User | None = None,
) -> Reservation:
    warning = _guest_overlap(
        guest=guest, check_in_date=check_in_date, check_out_date=check_out_date
    )
    _assert_room_is_free(room=room, check_in_date=check_in_date, check_out_date=check_out_date)

    reservation = Reservation(
        guest=guest,
        room=room,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        uses_parking=uses_parking,
        vehicle_plate=vehicle_plate,
        notes=notes,
        created_by=created_by,
    )
    reservation.full_clean()
    _save_checking_room(reservation)
    reservation.warnings = [warning] if warning else []
    _invalidate_dashboard_on_commit()
    return reservation


@transaction.atomic
def update_reservation(
    *,
    reservation: Reservation,
    guest: Guest | None = None,
    room: str | None = None,
    check_in_date: date | None = None,
    check_out_date: date | None = None,
    uses_parking: bool | None = None,
    vehicle_plate: str | None = None,
    notes: str | None = None,
) -> Reservation:
    reservation = _locked(reservation)
    if reservation.status != Status.RESERVED:
        raise ReservationNotEditableError()

    new_guest = guest if guest is not None else reservation.guest
    new_room = room if room is not None else reservation.room
    new_check_in = check_in_date if check_in_date is not None else reservation.check_in_date
    new_check_out = check_out_date if check_out_date is not None else reservation.check_out_date

    warning = _guest_overlap(
        guest=new_guest,
        check_in_date=new_check_in,
        check_out_date=new_check_out,
        exclude_id=str(reservation.pk),
    )
    _assert_room_is_free(
        room=new_room,
        check_in_date=new_check_in,
        check_out_date=new_check_out,
        exclude_id=str(reservation.pk),
    )

    reservation.guest = new_guest
    reservation.room = new_room
    reservation.check_in_date = new_check_in
    reservation.check_out_date = new_check_out
    if uses_parking is not None:
        reservation.uses_parking = uses_parking
    if vehicle_plate is not None:
        reservation.vehicle_plate = vehicle_plate
    if notes is not None:
        reservation.notes = notes
    reservation.full_clean()
    _save_checking_room(reservation)
    reservation.warnings = [warning] if warning else []
    _invalidate_dashboard_on_commit()
    return reservation


@transaction.atomic
def cancel_reservation(*, reservation: Reservation) -> Reservation:
    reservation = _locked(reservation)
    if reservation.status != Status.RESERVED:
        raise ReservationNotEditableError()
    reservation.transition_to(Status.CANCELLED)
    reservation.save(update_fields=["status", "updated_at"])
    _invalidate_dashboard_on_commit()
    return reservation


def available_rooms(
    *, check_in_date: date, check_out_date: date, exclude_pk: str | None = None
) -> list[str]:
    qs = Reservation.objects.filter(status__in=ACTIVE_STATUSES).filter(
        _overlapping(check_in_date, check_out_date)
    )
    if exclude_pk:
        qs = qs.exclude(id=exclude_pk)
    taken = set(qs.values_list("room", flat=True))
    return [room for room in HOTEL_ROOMS if room not in taken]


@transaction.atomic
def check_in(
    *,
    reservation: Reservation,
    moment: datetime,
    authorize_early: bool = False,
    uses_parking: bool | None = None,
    vehicle_plate: str | None = None,
) -> Reservation:
    reservation = _locked(reservation)
    if reservation.status != Status.RESERVED:
        raise InvalidReservationStatusError(
            detail="Esta reserva não está aguardando check-in.",
            context={"current_status": reservation.status},
        )

    local_moment = timezone.localtime(moment)
    if local_moment.date() < reservation.check_in_date:
        raise CheckInBeforeReservedDateError(
            context={"check_in_date": reservation.check_in_date.isoformat()},
        )
    if local_moment.date() >= reservation.check_out_date:
        raise CheckInAfterCheckOutDateError(
            context={"check_out_date": reservation.check_out_date.isoformat()},
        )

    allowed = is_check_in_allowed(moment)
    if not allowed and not authorize_early:
        raise CheckInBeforeAllowedTimeError(
            detail=(
                f"O check-in é permitido a partir das 14h00. "
                f"Horário atual: {local_moment.strftime('%Hh%M')}."
            ),
            context={
                "allowed_from": PricingPolicy.CHECK_IN_FROM.strftime("%H:%M"),
                "current_time": local_moment.strftime("%H:%M"),
            },
        )

    reservation.transition_to(Status.CHECKED_IN)
    reservation.checked_in_at = moment
    reservation.early_check_in_authorized = not allowed
    if uses_parking is not None:
        reservation.uses_parking = uses_parking
    if vehicle_plate is not None:
        reservation.vehicle_plate = vehicle_plate
    reservation.save()
    _invalidate_dashboard_on_commit()
    return reservation


def effective_check_out_date(reservation: Reservation, moment: datetime) -> date:
    return max(reservation.check_out_date, timezone.localtime(moment).date())


def preview_check_out(*, reservation: Reservation, moment: datetime) -> Breakdown:
    return build_breakdown(
        check_in_date=reservation.check_in_date,
        check_out_date=effective_check_out_date(reservation, moment),
        uses_parking=reservation.uses_parking,
        check_out_moment=moment,
    )


@transaction.atomic
def check_out(
    *,
    reservation: Reservation,
    moment: datetime,
    notes: str | None = None,
    expected_total: Decimal | None = None,
) -> Reservation:
    reservation = _locked(reservation)
    if reservation.status != Status.CHECKED_IN:
        raise InvalidReservationStatusError(
            detail="Esta reserva não está com hóspede no hotel.",
            context={"current_status": reservation.status},
        )

    breakdown = preview_check_out(reservation=reservation, moment=moment)
    if expected_total is not None and expected_total != breakdown.total:
        raise CheckOutTotalChangedError(
            context={"expected_total": str(expected_total), "total": str(breakdown.total)},
        )

    reservation.transition_to(Status.CHECKED_OUT)
    reservation.checked_out_at = moment
    reservation.total_amount = breakdown.total
    reservation.charges_snapshot = _breakdown_to_json(breakdown)
    if notes is not None:
        reservation.notes = notes
    reservation.save()
    _invalidate_dashboard_on_commit()
    return reservation


def _breakdown_to_json(breakdown: Breakdown) -> dict:
    data = asdict(breakdown)
    data["nightly_subtotal"] = str(breakdown.nightly_subtotal)
    data["parking_subtotal"] = str(breakdown.parking_subtotal)
    data["late_check_out_fee"] = str(breakdown.late_check_out_fee)
    data["total"] = str(breakdown.total)
    data["lines"] = [
        {
            "kind": str(line.kind),
            "description": line.description,
            "day_type": str(line.day_type) if line.day_type else None,
            "quantity": line.quantity,
            "unit_amount": str(line.unit_amount),
            "amount": str(line.amount),
        }
        for line in breakdown.lines
    ]
    return data
