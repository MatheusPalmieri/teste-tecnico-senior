from __future__ import annotations

import pytest
from django.core.management import call_command

from apps.accounts.models import User
from apps.common.clock import today_local
from apps.guests.documents import is_valid_cpf
from apps.guests.models import Guest
from apps.reservations.models import Reservation, Status


@pytest.mark.django_db
class TestSeedDemo:
    def test_is_idempotent(self) -> None:
        call_command("seed_demo")
        counts = (Guest.objects.count(), Reservation.objects.count())
        call_command("seed_demo")
        assert (Guest.objects.count(), Reservation.objects.count()) == counts

    def test_guest_cpfs_pass_the_form_validation(self) -> None:
        call_command("seed_demo")
        assert all(
            is_valid_cpf(document) for document in Guest.objects.values_list("document", flat=True)
        )

    def test_no_guest_is_checked_in_before_the_reservation_starts(self) -> None:
        call_command("seed_demo")
        in_house = Reservation.objects.filter(status=Status.CHECKED_IN)
        assert in_house.exists()
        assert all(r.check_in_date <= today_local() for r in in_house)

    def test_has_a_departure_due_today(self) -> None:
        call_command("seed_demo")
        assert Reservation.objects.filter(
            status=Status.CHECKED_IN, check_out_date=today_local()
        ).exists()

    def test_demo_attendant_has_no_admin_access(self) -> None:
        call_command("seed_demo")
        attendant = User.objects.get(email="atendente@hotel.com")
        assert attendant.is_staff is False
        assert attendant.check_password("senha123")
