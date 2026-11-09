from __future__ import annotations

from datetime import date

from rest_framework import serializers

from apps.common.clock import now, today_local
from apps.guests.models import Guest
from apps.pricing.calculator import build_breakdown
from apps.pricing.errors import InvalidStayError
from apps.pricing.models import Breakdown

from . import selectors
from .exceptions import CheckInInThePastError, CheckOutBeforeCheckInError, StayTooLongError
from .models import Reservation
from .rooms import HOTEL_ROOMS

MAX_STAY_NIGHTS = 365


def _too_long(check_in: date, check_out: date) -> bool:
    return (check_out - check_in).days > MAX_STAY_NIGHTS


def serialize_breakdown(breakdown: Breakdown) -> dict:
    return {
        "nights": breakdown.nights,
        "lines": [
            {
                "kind": str(line.kind),
                "day_type": str(line.day_type) if line.day_type else None,
                "description": line.description,
                "quantity": line.quantity,
                "unit_amount": str(line.unit_amount),
                "amount": str(line.amount),
            }
            for line in breakdown.lines
        ],
        "nightly_subtotal": str(breakdown.nightly_subtotal),
        "parking_subtotal": str(breakdown.parking_subtotal),
        "late_check_out_fee": str(breakdown.late_check_out_fee),
        "total": str(breakdown.total),
    }


class ReservationGuestSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = ["id", "name", "document", "phone"]
        read_only_fields = fields


class ReservationSerializer(serializers.ModelSerializer):
    guest = ReservationGuestSummarySerializer(read_only=True)
    estimated_total = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            "id",
            "code",
            "guest",
            "status",
            "check_in_date",
            "check_out_date",
            "room",
            "uses_parking",
            "vehicle_plate",
            "notes",
            "checked_in_at",
            "checked_out_at",
            "early_check_in_authorized",
            "total_amount",
            "charges_snapshot",
            "estimated_total",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "code",
            "guest",
            "status",
            "checked_in_at",
            "checked_out_at",
            "early_check_in_authorized",
            "total_amount",
            "charges_snapshot",
            "estimated_total",
            "created_at",
        ]

    def get_estimated_total(self, reservation: Reservation) -> str | None:
        if reservation.total_amount is not None:
            return str(reservation.total_amount)
        try:
            breakdown = build_breakdown(
                check_in_date=reservation.check_in_date,
                check_out_date=reservation.check_out_date,
                uses_parking=reservation.uses_parking,
            )
        except InvalidStayError:
            return None
        return str(breakdown.total)


class ReservationWriteSerializer(serializers.ModelSerializer):
    guest_id = serializers.PrimaryKeyRelatedField(source="guest", queryset=Guest.objects.all())

    class Meta:
        model = Reservation
        fields = [
            "guest_id",
            "room",
            "check_in_date",
            "check_out_date",
            "uses_parking",
            "vehicle_plate",
            "notes",
        ]

    def validate_room(self, value: str) -> str:
        if value not in HOTEL_ROOMS:
            raise serializers.ValidationError("Quarto fora do catálogo do hotel.")
        return value

    def validate(self, attrs: dict) -> dict:
        check_in = attrs.get("check_in_date") or getattr(self.instance, "check_in_date", None)
        check_out = attrs.get("check_out_date") or getattr(self.instance, "check_out_date", None)
        if check_in and check_out and check_out <= check_in:
            raise CheckOutBeforeCheckInError()
        if check_in and check_out and _too_long(check_in, check_out):
            raise StayTooLongError()
        # Só a data alterada é validada: reserva atrasada continua editável.
        check_in_changed = not self.instance or check_in != self.instance.check_in_date
        if check_in_changed and check_in and check_in < today_local():
            raise CheckInInThePastError()
        return attrs


class QuoteRequestSerializer(serializers.Serializer):
    check_in_date = serializers.DateField()
    check_out_date = serializers.DateField()
    uses_parking = serializers.BooleanField(default=False)

    def validate(self, attrs: dict) -> dict:
        if _too_long(attrs["check_in_date"], attrs["check_out_date"]):
            raise StayTooLongError()
        return attrs


class AvailableRoomsRequestSerializer(serializers.Serializer):
    check_in_date = serializers.DateField()
    check_out_date = serializers.DateField()
    exclude_reservation = serializers.UUIDField(required=False, allow_null=True)


class ArrivalSerializer(serializers.ModelSerializer):
    guest = ReservationGuestSummarySerializer(read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            "id",
            "code",
            "guest",
            "status",
            "check_in_date",
            "check_out_date",
            "room",
            "uses_parking",
            "is_overdue",
        ]
        read_only_fields = fields

    def get_is_overdue(self, reservation: Reservation) -> bool:
        return selectors.is_overdue(reservation, reference_date=today_local())


class DepartureSerializer(serializers.ModelSerializer):
    guest = ReservationGuestSummarySerializer(read_only=True)
    is_late_check_out = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            "id",
            "code",
            "guest",
            "status",
            "check_in_date",
            "check_out_date",
            "room",
            "uses_parking",
            "is_late_check_out",
        ]
        read_only_fields = fields

    def get_is_late_check_out(self, reservation: Reservation) -> bool:
        return selectors.is_reservation_late_check_out(reservation, moment=now())


class CheckInRequestSerializer(serializers.Serializer):
    authorize_early = serializers.BooleanField(default=False)
    uses_parking = serializers.BooleanField(required=False, allow_null=True, default=None)
    vehicle_plate = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, default=None
    )


class CheckOutRequestSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    expected_total = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True, default=None
    )
