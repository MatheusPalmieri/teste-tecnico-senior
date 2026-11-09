from __future__ import annotations

import re
from typing import Any

from rest_framework import serializers

from apps.reservations.models import Reservation

from .documents import is_valid_cpf, normalize_document
from .models import Guest, only_digits
from .selectors import get_current_reservation

_DOCUMENT_INPUT = re.compile(r"[\d.\-/\s]*[\dXx]")
_PHONE_INPUT = re.compile(r"[\d\s()+\-.]+")
DOCUMENT_LENGTH = (5, 14)
PHONE_DIGITS = (10, 13)  # DDD + número, com ou sem o 55 do país


class GuestReservationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = ["id", "code", "check_in_date", "check_out_date", "room", "uses_parking", "status"]
        read_only_fields = fields


class GuestSerializer(serializers.ModelSerializer):
    current_status = serializers.SerializerMethodField()
    current_reservation = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = [
            "id",
            "name",
            "document_type",
            "document",
            "phone",
            "email",
            "notes",
            "current_status",
            "current_reservation",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "document_type",
            "current_status",
            "current_reservation",
            "created_at",
            "updated_at",
        ]

    def get_current_reservation(self, guest: Guest) -> dict[str, Any] | None:
        reservation = get_current_reservation(guest)
        if reservation is None:
            return None
        return GuestReservationSummarySerializer(reservation).data

    def get_current_status(self, guest: Guest) -> str | None:
        reservation = get_current_reservation(guest)
        return reservation.status if reservation else None


class GuestDetailSerializer(GuestSerializer):
    reservations = GuestReservationSummarySerializer(many=True, read_only=True)

    class Meta(GuestSerializer.Meta):
        fields = [*GuestSerializer.Meta.fields, "reservations"]


class GuestWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = ["id", "name", "document", "phone", "email", "notes"]
        read_only_fields = ["id"]
        extra_kwargs: dict[str, dict[str, list[object]]] = {"document": {"validators": []}}

    def validate_name(self, value: str) -> str:
        if len(value.strip()) < 3:
            raise serializers.ValidationError("O nome precisa ter ao menos 3 caracteres.")
        return value

    def validate_document(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Documento é obrigatório.")
        if not _DOCUMENT_INPUT.fullmatch(value.strip()):
            raise serializers.ValidationError(
                "Use apenas números no documento (o RG pode terminar em X)."
            )
        document = normalize_document(value)
        low, high = DOCUMENT_LENGTH
        if not low <= len(document) <= high:
            raise serializers.ValidationError(f"O documento deve ter de {low} a {high} dígitos.")
        if len(document) == 11 and document.isdigit() and not is_valid_cpf(document):
            raise serializers.ValidationError("CPF inválido.")
        return value

    def validate_phone(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Telefone é obrigatório.")
        low, high = PHONE_DIGITS
        if not _PHONE_INPUT.fullmatch(value.strip()) or not low <= len(only_digits(value)) <= high:
            raise serializers.ValidationError("Telefone inválido: informe DDD e número.")
        return value
