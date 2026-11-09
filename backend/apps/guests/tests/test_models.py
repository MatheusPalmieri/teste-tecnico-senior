import pytest
from django.db import IntegrityError

from apps.guests.factories import GuestFactory
from apps.guests.models import DocumentType, Guest


@pytest.mark.django_db
class TestDocumentNormalization:
    def test_document_is_normalized_to_digits_only(self) -> None:
        guest = GuestFactory(document="123.456.789-00")
        assert guest.document == "12345678900"

    def test_document_with_eleven_digits_is_cpf(self) -> None:
        guest = GuestFactory(document="123.456.789-00")
        assert guest.document_type == DocumentType.CPF

    def test_document_with_other_length_is_rg(self) -> None:
        guest = GuestFactory(document="12.345.678-9")
        assert guest.document_type == DocumentType.RG

    def test_duplicate_document_is_rejected(self) -> None:
        GuestFactory(document="12345678900")
        with pytest.raises(IntegrityError):
            GuestFactory(document="123.456.789-00")


@pytest.mark.django_db
class TestPhoneNormalization:
    def test_phone_is_normalized_to_digits_only(self) -> None:
        guest = GuestFactory(phone="(11) 98888-7777")
        assert guest.phone == "11988887777"


@pytest.mark.django_db
class TestNameSearch:
    def test_search_without_accent_finds_accented_name(self) -> None:
        GuestFactory(name="José da Silva")
        results = Guest.objects.extra(
            where=["unaccent(name) ILIKE unaccent(%s)"], params=["%jose%"]
        )
        assert results.exists()


@pytest.mark.django_db
class TestRgCheckDigit:
    def test_rg_keeps_its_x_check_digit(self) -> None:
        guest = GuestFactory(document="12.345.678-x")
        guest.refresh_from_db()
        assert guest.document == "12345678X"
        assert guest.document_type == DocumentType.RG
