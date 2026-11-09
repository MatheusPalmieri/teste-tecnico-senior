"""O admin não pode ser um atalho em volta das regras da API."""

from __future__ import annotations

import pytest

from apps.guests.admin import GuestAdminForm
from apps.reservations.admin import ReservationAdmin


def test_reservation_status_and_totals_are_read_only_in_admin() -> None:
    assert {"status", "total_amount", "charges_snapshot", "checked_out_at"} <= set(
        ReservationAdmin.readonly_fields
    )


@pytest.mark.django_db
class TestGuestAdminForm:
    def _form(self, **overrides: str) -> GuestAdminForm:
        data = {"name": "Ana Souza", "document": "529.982.247-25", "phone": "(11) 98888-7777"}
        return GuestAdminForm(data={**data, **overrides})

    def test_valid_guest_is_saved_normalized(self) -> None:
        form = self._form()
        assert form.is_valid(), form.errors
        guest = form.save()
        assert (guest.document, guest.phone) == ("52998224725", "11988887777")

    def test_invalid_cpf_is_refused(self) -> None:
        form = self._form(document="111.444.777-00")
        assert not form.is_valid()
        assert "document" in form.errors

    def test_phone_without_area_code_is_refused(self) -> None:
        form = self._form(phone="98888-7777")
        assert not form.is_valid()
        assert "phone" in form.errors

    def test_masked_duplicate_document_hits_the_unique_check(self) -> None:
        assert self._form().save()
        form = self._form(name="Outra Pessoa")
        assert not form.is_valid()
        assert "document" in form.errors
