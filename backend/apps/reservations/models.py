from __future__ import annotations

from typing import Any, Final

from django.conf import settings
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import DateRangeField, RangeOperators
from django.db import IntegrityError, models, transaction
from django.db.models import F, Func, IntegerField, Max, Q, Value
from django.db.models.functions import Cast, Substr

from apps.common.models import TimeStampedModel, UUIDModel

from .exceptions import InvalidTransitionError
from .rooms import HOTEL_ROOMS, ROOM_CHOICES
from .warnings import ReservationWarning


class Status(models.TextChoices):
    RESERVED = "RESERVED", "Aguardando check-in"
    CHECKED_IN = "CHECKED_IN", "No hotel"
    CHECKED_OUT = "CHECKED_OUT", "Check-out realizado"
    CANCELLED = "CANCELLED", "Cancelada"


ALLOWED_TRANSITIONS: Final[dict[str, frozenset[str]]] = {
    Status.RESERVED: frozenset({Status.CHECKED_IN, Status.CANCELLED}),
    Status.CHECKED_IN: frozenset({Status.CHECKED_OUT}),
    Status.CHECKED_OUT: frozenset(),
    Status.CANCELLED: frozenset(),
}

ACTIVE_STATUSES: Final[list[str]] = [Status.RESERVED, Status.CHECKED_IN]

_MAX_CODE_ATTEMPTS: Final[int] = 3
_CODE_UNIQUE_CONSTRAINT: Final[str] = "reservations_reservation_code_key"

ROOM_OVERLAP_CONSTRAINT: Final[str] = "reservation_room_no_overlap"


class _DateRange(Func):
    function = "daterange"
    output_field = DateRangeField()


def violated_constraint(exc: IntegrityError) -> str | None:
    diag = getattr(exc.__cause__, "diag", None)
    return getattr(diag, "constraint_name", None)


def _next_code() -> str:
    last = Reservation.objects.filter(code__regex=r"^R-[0-9]+$").aggregate(
        last=Max(Cast(Substr("code", 3), IntegerField()))
    )["last"]
    return f"R-{(last or 0) + 1:04d}"


class Reservation(UUIDModel, TimeStampedModel):
    warnings: list[ReservationWarning]

    code = models.CharField(max_length=12, unique=True, editable=False)
    guest = models.ForeignKey("guests.Guest", on_delete=models.PROTECT, related_name="reservations")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.RESERVED)
    check_in_date = models.DateField()
    check_out_date = models.DateField()
    room = models.CharField(max_length=10, choices=ROOM_CHOICES)
    uses_parking = models.BooleanField(default=False)
    vehicle_plate = models.CharField(max_length=10, blank=True)
    notes = models.TextField(blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)
    early_check_in_authorized = models.BooleanField(default=False)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    charges_snapshot = models.JSONField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        indexes = [
            models.Index(fields=["status", "check_in_date"], name="reservation_status_checkin"),
            models.Index(fields=["status", "check_out_date"], name="reservation_status_checkout"),
            models.Index(fields=["room", "status"], name="reservation_room_status"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(check_out_date__gt=F("check_in_date")),
                name="reservation_period_is_positive",
            ),
            models.CheckConstraint(
                condition=Q(room__in=HOTEL_ROOMS),
                name="reservation_room_valid",
            ),
            ExclusionConstraint(
                name=ROOM_OVERLAP_CONSTRAINT,
                expressions=[
                    (
                        _DateRange("check_in_date", "check_out_date", Value("[)")),
                        RangeOperators.OVERLAPS,
                    ),
                    ("room", RangeOperators.EQUAL),
                ],
                condition=Q(status__in=ACTIVE_STATUSES),
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.code} — {self.guest.name} ({self.status})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if self.code:
            super().save(*args, **kwargs)
            return
        self._save_with_generated_code(*args, **kwargs)

    def _save_with_generated_code(self, *args: Any, **kwargs: Any) -> None:
        for attempt in range(_MAX_CODE_ATTEMPTS):  # pragma: no branch
            self.code = _next_code()
            try:
                with transaction.atomic():
                    super().save(*args, **kwargs)
                return
            except IntegrityError as exc:
                if violated_constraint(exc) != _CODE_UNIQUE_CONSTRAINT:
                    raise
                if attempt == _MAX_CODE_ATTEMPTS - 1:
                    raise

    def transition_to(self, new_status: str) -> None:
        allowed = ALLOWED_TRANSITIONS.get(self.status, frozenset())
        if new_status not in allowed:
            raise InvalidTransitionError(
                detail=f"Não é possível mudar de '{self.status}' para '{new_status}'.",
            )
        self.status = new_status
