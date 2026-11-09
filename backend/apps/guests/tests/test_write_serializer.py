from __future__ import annotations

import pytest
from rest_framework import serializers

from apps.guests.serializers import GuestWriteSerializer


class TestValidateName:
    def test_rejects_a_name_shorter_than_three_characters(self) -> None:
        with pytest.raises(serializers.ValidationError):
            GuestWriteSerializer().validate_name("  Jo  ")

    def test_accepts_a_valid_name(self) -> None:
        assert GuestWriteSerializer().validate_name("Ana Souza") == "Ana Souza"


class TestValidateDocument:
    def test_rejects_a_blank_document(self) -> None:
        with pytest.raises(serializers.ValidationError):
            GuestWriteSerializer().validate_document("   ")

    def test_accepts_a_document(self) -> None:
        assert GuestWriteSerializer().validate_document("98765432100") == "98765432100"


class TestValidatePhone:
    def test_rejects_a_blank_phone(self) -> None:
        with pytest.raises(serializers.ValidationError):
            GuestWriteSerializer().validate_phone("   ")

    def test_accepts_a_phone(self) -> None:
        assert GuestWriteSerializer().validate_phone("11977776666") == "11977776666"


class TestDocumentIsNeverSilentlyCorrupted:
    @pytest.mark.parametrize("value", ["ABC", "12a45678", "123.456.789-0!", "X1234567"])
    def test_rejects_characters_that_are_not_part_of_a_document(self, value: str) -> None:
        with pytest.raises(serializers.ValidationError):
            GuestWriteSerializer().validate_document(value)

    @pytest.mark.parametrize("value", ["1234", "123456789012345"])
    def test_rejects_documents_too_short_or_too_long(self, value: str) -> None:
        with pytest.raises(serializers.ValidationError):
            GuestWriteSerializer().validate_document(value)

    @pytest.mark.parametrize("value", ["123.456.789-00", "111.111.111-11", "98765432101"])
    def test_rejects_cpf_with_wrong_check_digits(self, value: str) -> None:
        with pytest.raises(serializers.ValidationError, match="CPF inválido"):
            GuestWriteSerializer().validate_document(value)

    @pytest.mark.parametrize("value", ["529.982.247-25", "52998224725", "12.345.678-X", "1234567x"])
    def test_accepts_valid_cpf_and_rg_with_mask(self, value: str) -> None:
        assert GuestWriteSerializer().validate_document(value) == value


class TestPhoneIsValidated:
    @pytest.mark.parametrize("value", ["abc", "1234", "(11) 9999", "11 98888-7777 ramal 2"])
    def test_rejects_phone_without_area_code_or_with_letters(self, value: str) -> None:
        with pytest.raises(serializers.ValidationError):
            GuestWriteSerializer().validate_phone(value)

    @pytest.mark.parametrize("value", ["(11) 98888-7777", "1133334444", "+55 11 98888-7777"])
    def test_accepts_brazilian_phone_formats(self, value: str) -> None:
        assert GuestWriteSerializer().validate_phone(value) == value
