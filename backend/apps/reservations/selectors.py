from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from django.db.models import F, Q, QuerySet
from django.utils import timezone

from apps.common.clock import now
from apps.pricing.policy import PricingPolicy

from .models import Reservation, Status

ArrivalsScope = Literal["today", "overdue", "all_pending", "history"]
DeparturesScope = Literal["today", "late", "all_in_house", "history"]


def search_reservations(qs: QuerySet[Reservation], term: str | None) -> QuerySet[Reservation]:
    if not term:
        return qs
    return qs.filter(
        Q(guest__name__icontains=term)
        | Q(guest__document__icontains=term)
        | Q(code__icontains=term)
    )


def arrivals(
    *, reference_date: date, search: str | None = None, scope: ArrivalsScope = "today"
) -> QuerySet[Reservation]:
    if scope == "history":
        qs = (
            Reservation.objects.exclude(status=Status.RESERVED)
            .select_related("guest")
            .order_by(F("checked_in_at").desc(nulls_last=True), "-check_in_date", "-created_at")
        )
        return search_reservations(qs, search)

    qs = Reservation.objects.filter(status=Status.RESERVED).select_related("guest")
    if scope == "today":
        qs = qs.filter(check_in_date=reference_date)
    elif scope == "overdue":
        qs = qs.filter(check_in_date__lt=reference_date)
    return search_reservations(qs, search)


def is_overdue(reservation: Reservation, *, reference_date: date) -> bool:
    return reservation.status == Status.RESERVED and reservation.check_in_date < reference_date


def is_reservation_late_check_out(reservation: Reservation, *, moment: datetime) -> bool:
    if reservation.status != Status.CHECKED_IN:
        return False
    local_moment = timezone.localtime(moment)
    if reservation.check_out_date > local_moment.date():
        return False
    if reservation.check_out_date == local_moment.date():
        return local_moment.time() > PricingPolicy.CHECK_OUT_UNTIL
    return True


def departures(
    *, reference_date: date, search: str | None = None, scope: DeparturesScope = "today"
) -> QuerySet[Reservation]:
    if scope == "history":
        qs = (
            Reservation.objects.filter(status=Status.CHECKED_OUT)
            .select_related("guest")
            .order_by("-checked_out_at", "-check_out_date")
        )
        return search_reservations(qs, search)

    qs = Reservation.objects.filter(status=Status.CHECKED_IN).select_related("guest")
    qs = search_reservations(qs, search)
    if scope == "today":
        return qs.filter(check_out_date=reference_date)
    if scope == "late":
        moment = now()
        late_ids = [
            reservation.pk
            for reservation in qs.filter(check_out_date__lte=reference_date)
            if is_reservation_late_check_out(reservation, moment=moment)
        ]
        return qs.filter(pk__in=late_ids)
    return qs
