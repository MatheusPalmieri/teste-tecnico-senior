from __future__ import annotations

import pytest
from rest_framework.test import APIRequestFactory

from apps.common import e2e_apis
from apps.guests.models import Guest
from apps.reservations.models import Reservation, Status

factory = APIRequestFactory()


@pytest.mark.django_db
class TestReset:
    def test_truncates_guests_and_reservations(self) -> None:
        from apps.guests.factories import GuestFactory
        from apps.reservations.factories import ReservationFactory

        ReservationFactory()
        GuestFactory()
        assert Guest.objects.exists()
        assert Reservation.objects.exists()

        response = e2e_apis.reset(factory.post("/api/_test/reset/"))

        assert response.status_code == 204
        assert not Guest.objects.exists()
        assert not Reservation.objects.exists()

    def test_restores_the_attendant_instead_of_deleting_it(self) -> None:
        from apps.accounts.models import User

        from ..e2e_scenarios import ATTENDANT_EMAIL, ATTENDANT_PASSWORD

        e2e_apis.seed(factory.post("/api/_test/seed/", {"scenario": "empty"}))
        attendant = User.objects.get(email=ATTENDANT_EMAIL)
        attendant.name = "Nome Alterado no Teste Anterior"
        attendant.set_password("outra-senha")
        attendant.save()
        original_id = attendant.pk

        e2e_apis.reset(factory.post("/api/_test/reset/"))

        restored = User.objects.get(email=ATTENDANT_EMAIL)
        assert restored.pk == original_id
        assert restored.name == "Atendente Demo"
        assert restored.check_password(ATTENDANT_PASSWORD)


@pytest.mark.django_db
class TestSeed:
    def test_unknown_scenario_returns_400(self) -> None:
        response = e2e_apis.seed(factory.post("/api/_test/seed/", {"scenario": "não-existe"}))
        assert response.status_code == 400
        assert response.data["code"] == "unknown_scenario"

    def test_empty_scenario_creates_only_the_attendant(self) -> None:
        from apps.accounts.models import User

        response = e2e_apis.seed(factory.post("/api/_test/seed/", {"scenario": "empty"}))
        assert response.status_code == 204
        assert User.objects.filter(email="atendente@hotel.com").exists()
        assert not Guest.objects.exists()

    def test_canonical_stay_is_thursday_to_sunday_with_parking(self) -> None:
        from datetime import date

        response = e2e_apis.seed(factory.post("/api/_test/seed/", {"scenario": "canonical-stay"}))
        assert response.status_code == 204

        reservation = Reservation.objects.get()
        assert reservation.check_in_date == date(2026, 9, 3)
        assert reservation.check_out_date == date(2026, 9, 6)
        assert reservation.uses_parking is True
        assert reservation.status == Status.CHECKED_IN

    def test_arrivals_today_seeds_four_reservations_including_one_overdue(self) -> None:
        response = e2e_apis.seed(factory.post("/api/_test/seed/", {"scenario": "arrivals-today"}))
        assert response.status_code == 204
        assert Reservation.objects.filter(status=Status.RESERVED).count() == 4

    def test_future_arrival_starts_two_days_after_the_canonical_check_in(self) -> None:
        from datetime import date

        response = e2e_apis.seed(factory.post("/api/_test/seed/", {"scenario": "future-arrival"}))
        assert response.status_code == 204
        reservation = Reservation.objects.get()
        assert reservation.guest.name == "Carla Futura"
        assert reservation.check_in_date == date(2026, 9, 5)
        assert reservation.status == Status.RESERVED

    def test_departures_today_seeds_three_checked_in_reservations(self) -> None:
        response = e2e_apis.seed(factory.post("/api/_test/seed/", {"scenario": "departures-today"}))
        assert response.status_code == 204
        assert Reservation.objects.filter(status=Status.CHECKED_IN).count() == 3

    def test_mixed_statuses_covers_the_four_statuses(self) -> None:
        response = e2e_apis.seed(factory.post("/api/_test/seed/", {"scenario": "mixed-statuses"}))
        assert response.status_code == 204
        statuses = set(Reservation.objects.values_list("status", flat=True))
        assert statuses == {
            Status.RESERVED,
            Status.CHECKED_IN,
            Status.CHECKED_OUT,
            Status.CANCELLED,
        }

    def test_search_fixtures_seeds_guests_with_known_accented_names(self) -> None:
        response = e2e_apis.seed(factory.post("/api/_test/seed/", {"scenario": "search-fixtures"}))
        assert response.status_code == 204
        assert Guest.objects.filter(name__icontains="José").exists()


@pytest.mark.django_db
class TestAttendantIsIdempotent:
    def test_seeding_twice_reuses_the_existing_attendant(self) -> None:
        from apps.accounts.models import User
        from apps.common.e2e_scenarios import ATTENDANT_EMAIL, _attendant

        first = _attendant()
        second = _attendant()

        assert first.pk == second.pk
        assert User.objects.filter(email=ATTENDANT_EMAIL).count() == 1
