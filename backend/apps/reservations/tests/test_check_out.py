from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.common.clock import now
from apps.reservations.exceptions import (
    CheckOutTotalChangedError,
    InvalidReservationStatusError,
)
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status
from apps.reservations.services import check_out, preview_check_out

CHECK_IN = date(2026, 9, 3)  # quinta
CHECK_OUT = date(2026, 9, 6)  # domingo


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=UserFactory())
    return api_client


def _checked_in_reservation(**overrides):
    defaults = {
        "status": Status.CHECKED_IN,
        "check_in_date": CHECK_IN,
        "check_out_date": CHECK_OUT,
    }
    defaults.update(overrides)
    return ReservationFactory(**defaults)


@pytest.mark.django_db
class TestCheckOutStatusGuard:
    @pytest.mark.parametrize("status", [Status.RESERVED, Status.CHECKED_OUT, Status.CANCELLED])
    def test_check_out_on_non_checked_in_status_raises_409(self, status: str) -> None:
        reservation = ReservationFactory(status=status)
        with pytest.raises(InvalidReservationStatusError):
            check_out(reservation=reservation, moment=now())

    def test_check_out_on_checked_in_succeeds(self) -> None:
        reservation = _checked_in_reservation(uses_parking=True)
        with freeze_time("2026-09-06 11:00:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.status == Status.CHECKED_OUT


@pytest.mark.django_db
class TestLateCheckOutFee:
    def test_check_out_at_1159_has_no_fee(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 11:59:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.total_amount == Decimal("420.00")
        assert result.charges_snapshot["late_check_out_fee"] == "0.00"

    def test_check_out_at_1200_has_no_fee(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 12:00:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.charges_snapshot["late_check_out_fee"] == "0.00"

    def test_check_out_at_1201_on_weekday_charges_60(self) -> None:
        reservation = _checked_in_reservation(check_out_date=date(2026, 9, 7))
        with freeze_time("2026-09-07 12:01:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.charges_snapshot["late_check_out_fee"] == "60.00"

    def test_check_out_at_1201_on_weekend_charges_90(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 12:01:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.charges_snapshot["late_check_out_fee"] == "90.00"

    def test_early_check_out_after_noon_has_no_fee(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-05 23:46:00-03:00"):
            preview = preview_check_out(reservation=reservation, moment=now())
            result = check_out(reservation=reservation, moment=now())
        assert preview.late_check_out_fee == Decimal("0.00")
        assert result.charges_snapshot["late_check_out_fee"] == "0.00"
        assert result.total_amount == Decimal("420.00")


@pytest.mark.django_db
class TestPreviewMatchesCheckOut:
    def test_preview_and_check_out_produce_same_total_at_same_instant(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 14:30:00-03:00"):
            preview = preview_check_out(reservation=reservation, moment=now())
            result = check_out(reservation=reservation, moment=now())
        assert str(preview.total) == str(result.total_amount)


@pytest.mark.django_db
class TestFrozenSnapshot:
    def test_total_amount_and_snapshot_are_persisted(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 11:00:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.total_amount is not None
        assert result.charges_snapshot is not None

    def test_changing_pricing_policy_does_not_change_already_checked_out_total(self) -> None:
        from apps.pricing.policy import PricingPolicy

        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 11:00:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        original_total = result.total_amount

        original_rate = PricingPolicy.WEEKDAY_RATE
        try:
            PricingPolicy.WEEKDAY_RATE = Decimal("999.00")
            result.refresh_from_db()
            assert result.total_amount == original_total
        finally:
            PricingPolicy.WEEKDAY_RATE = original_rate

    def test_lines_sum_matches_total_amount(self) -> None:
        reservation = _checked_in_reservation(uses_parking=True)
        with freeze_time("2026-09-06 11:00:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        lines_total = sum(Decimal(line["amount"]) for line in result.charges_snapshot["lines"])
        assert lines_total == result.total_amount


@pytest.mark.django_db
class TestCheckOutTimestamp:
    def test_checked_out_at_uses_server_moment(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 11:00:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.checked_out_at is not None


@pytest.mark.django_db
class TestEffectiveCheckOutDate:
    def test_early_departure_is_charged_the_contracted_period(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-04 11:00:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.total_amount == Decimal("420.00")

    def test_late_departure_charges_extra_nights(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-07 11:00:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.total_amount == Decimal("600.00")


@pytest.mark.django_db
class TestCanonicalScenario:
    def test_canonical_scenario_results_in_560(self) -> None:
        reservation = _checked_in_reservation(uses_parking=True)
        with freeze_time("2026-09-06 14:30:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        assert result.total_amount == Decimal("560.00")


@pytest.mark.django_db
class TestIdempotency:
    def test_second_check_out_returns_409_without_changing_total(self) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 11:00:00-03:00"):
            result = check_out(reservation=reservation, moment=now())
        original_total = result.total_amount
        with freeze_time("2026-09-06 12:30:00-03:00"), pytest.raises(InvalidReservationStatusError):
            check_out(reservation=reservation, moment=now())
        result.refresh_from_db()
        assert result.total_amount == original_total


@pytest.mark.django_db
class TestCheckOutApi:
    def test_requires_authentication(self) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_IN)
        response = APIClient().post(reverse("reservation-check-out", args=[reservation.pk]))
        assert response.status_code == 401

    def test_check_out_endpoint_returns_frozen_total(self, client: APIClient) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 11:00:00-03:00"):
            response = client.post(reverse("reservation-check-out", args=[reservation.pk]))
        assert response.status_code == 200
        assert response.data["total_amount"] == "420.00"

    def test_client_sent_checked_out_at_is_ignored(self, client: APIClient) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 11:00:00-03:00"):
            response = client.post(
                reverse("reservation-check-out", args=[reservation.pk]),
                {"checked_out_at": "2000-01-01T00:00:00Z"},
            )
        assert not response.data["checked_out_at"].startswith("2000")


@pytest.mark.django_db
class TestCheckOutPreviewApi:
    def test_preview_includes_breakdown_and_late_flag(self, client: APIClient) -> None:
        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 14:30:00-03:00"):
            response = client.get(reverse("reservation-check-out-preview", args=[reservation.pk]))
        assert response.status_code == 200
        assert response.data["is_late_check_out"] is True
        assert "total" in response.data


@pytest.mark.django_db
class TestDeparturesQueue:
    def test_guest_leaves_in_house_after_check_out(self) -> None:
        from apps.guests.selectors import list_guests

        reservation = _checked_in_reservation()
        with freeze_time("2026-09-06 11:00:00-03:00"):
            check_out(reservation=reservation, moment=now())
        assert reservation.guest not in list_guests(status="in_house")


@pytest.mark.django_db
class TestExpectedTotal:
    def test_matching_expected_total_checks_out(self) -> None:
        reservation = _checked_in_reservation(uses_parking=True)
        with freeze_time("2026-09-06 11:00:00-03:00"):
            result = check_out(
                reservation=reservation, moment=now(), expected_total=Decimal("470.00")
            )
        assert result.status == Status.CHECKED_OUT
        assert result.total_amount == Decimal("470.00")

    def test_total_that_changed_after_noon_is_refused(self) -> None:
        reservation = _checked_in_reservation(uses_parking=True)
        with freeze_time("2026-09-06 12:01:00-03:00"):
            with pytest.raises(CheckOutTotalChangedError) as exc_info:
                check_out(reservation=reservation, moment=now(), expected_total=Decimal("470.00"))
        assert exc_info.value.context == {"expected_total": "470.00", "total": "560.00"}
        reservation.refresh_from_db()
        assert reservation.status == Status.CHECKED_IN
        assert reservation.total_amount is None

    def test_api_returns_409_with_the_new_total(self, client: APIClient) -> None:
        reservation = _checked_in_reservation(uses_parking=True)
        with freeze_time("2026-09-06 12:01:00-03:00"):
            response = client.post(
                reverse("reservation-check-out", args=[reservation.pk]),
                {"expected_total": "470.00"},
            )
        assert response.status_code == 409
        assert response.data["code"] == "check_out_total_changed"
        assert response.data["context"]["total"] == "560.00"
