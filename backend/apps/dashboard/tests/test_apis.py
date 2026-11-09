from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.common.clock import today_local
from apps.guests.factories import GuestFactory
from apps.guests.selectors import list_guests
from apps.reservations import services as reservation_services
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Reservation, Status
from apps.reservations.rooms import TOTAL_ROOMS
from apps.reservations.selectors import arrivals


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=UserFactory())
    return api_client


@pytest.mark.django_db
class TestDashboardConsistency:
    def test_in_house_count_matches_guests_list_count(self, client: APIClient) -> None:
        ReservationFactory(status=Status.CHECKED_IN)
        ReservationFactory(status=Status.CHECKED_IN)
        ReservationFactory(status=Status.RESERVED)
        response = client.get(reverse("dashboard-summary"))
        assert response.data["in_house_count"] == list_guests(status="in_house").count()

    def test_awaiting_check_in_count_matches_guests_list_count(self, client: APIClient) -> None:
        ReservationFactory(status=Status.RESERVED)
        ReservationFactory(status=Status.RESERVED)
        response = client.get(reverse("dashboard-summary"))
        assert (
            response.data["awaiting_check_in_count"]
            == list_guests(status="awaiting_check_in").count()
        )

    def test_arrivals_today_count_matches_arrivals_selector(self, client: APIClient) -> None:
        today = today_local()
        ReservationFactory(status=Status.RESERVED, check_in_date=today)
        ReservationFactory(status=Status.RESERVED, check_in_date=today + timedelta(days=1))
        response = client.get(reverse("dashboard-summary"))
        assert (
            response.data["arrivals_today_count"]
            == arrivals(reference_date=today, scope="today").count()
        )


@pytest.mark.django_db
class TestDashboardTimezone:
    def test_today_uses_local_date_not_utc(self, client: APIClient) -> None:
        with freeze_time("2026-09-04 02:30:00+00:00"):
            ReservationFactory(status=Status.RESERVED, check_in_date=date(2026, 9, 3))
            response = client.get(reverse("dashboard-summary"))
        assert response.data["reference_date"] == "2026-09-03"
        assert response.data["arrivals_today_count"] == 1


@pytest.mark.django_db
class TestLateCheckOutCount:
    def test_zero_before_noon_and_one_after_with_same_data(self, client: APIClient) -> None:
        ReservationFactory(
            status=Status.CHECKED_IN,
            check_in_date=date(2026, 9, 3),
            check_out_date=date(2026, 9, 6),
        )
        with freeze_time("2026-09-06 11:00:00-03:00"):
            before = client.get(reverse("dashboard-summary"))
        with freeze_time("2026-09-06 12:30:00-03:00"):
            after = client.get(reverse("dashboard-summary"))
        assert before.data["late_check_out_count"] == 0
        assert after.data["late_check_out_count"] == 1


@pytest.mark.django_db
class TestRevenueMonth:
    def test_sums_only_current_month_checked_out_reservations(self, client: APIClient) -> None:
        with freeze_time("2026-09-15 10:00:00-03:00"):
            reservation = ReservationFactory(status=Status.CHECKED_IN)
            reservation.total_amount = Decimal("420.00")
            reservation.checked_out_at = None
            reservation.status = Status.CHECKED_OUT
            from apps.common.clock import now

            reservation.checked_out_at = now()
            reservation.save()

            response = client.get(reverse("dashboard-summary"))
        assert response.data["revenue_month"] == "420.00"

    def test_uses_frozen_total_amount_not_recalculated(self, client: APIClient) -> None:
        from apps.pricing.policy import PricingPolicy

        with freeze_time("2026-09-15 10:00:00-03:00"):
            from apps.common.clock import now

            reservation = ReservationFactory(
                status=Status.CHECKED_OUT,
                total_amount=Decimal("999.00"),
                checked_out_at=now(),
            )
            original_rate = PricingPolicy.WEEKDAY_RATE
            try:
                PricingPolicy.WEEKDAY_RATE = Decimal("1.00")
                response = client.get(reverse("dashboard-summary"))
            finally:
                PricingPolicy.WEEKDAY_RATE = original_rate
        assert response.data["revenue_month"] == "999.00"
        assert reservation.pk is not None


@pytest.mark.django_db
class TestOccupancyRate:
    def test_full_hotel_returns_1_00(self, client: APIClient) -> None:
        from apps.reservations.rooms import HOTEL_ROOMS

        for room in HOTEL_ROOMS:
            ReservationFactory(status=Status.CHECKED_IN, room=room, guest=GuestFactory())
        response = client.get(reverse("dashboard-summary"))
        assert response.data["occupancy_rate"] == "1.00"

    def test_empty_hotel_returns_0_00_without_division_error(self, client: APIClient) -> None:
        response = client.get(reverse("dashboard-summary"))
        assert response.data["occupancy_rate"] == "0.00"

    def test_occupancy_denominator_is_total_rooms_constant(self, client: APIClient) -> None:
        ReservationFactory(status=Status.CHECKED_IN)
        response = client.get(reverse("dashboard-summary"))
        expected = (Decimal("1") / Decimal(TOTAL_ROOMS)).quantize(Decimal("0.01"))
        assert response.data["occupancy_rate"] == str(expected)


@pytest.mark.django_db
class TestSingleRequestAndQueryCount:
    def test_summary_is_served_by_a_single_request(self, client: APIClient) -> None:
        response = client.get(reverse("dashboard-summary"))
        assert response.status_code == 200
        for key in [
            "in_house_count",
            "arrivals_today_count",
            "departures_today_count",
            "awaiting_check_in_count",
            "late_check_out_count",
            "occupancy_rate",
            "revenue_month",
        ]:
            assert key in response.data

    def test_query_count_is_constant_regardless_of_volume(self, client: APIClient) -> None:
        ReservationFactory.create_batch(5, status=Status.CHECKED_IN)
        cache.clear()
        with CaptureQueriesContext(connection) as small:
            client.get(reverse("dashboard-summary"))
        for days_ago in range(1, 41):
            check_in_date = today_local() - timedelta(days=days_ago + 1)
            ReservationFactory(
                status=Status.CHECKED_OUT,
                check_in_date=check_in_date,
                check_out_date=check_in_date + timedelta(days=1),
            )
        cache.clear()
        with CaptureQueriesContext(connection) as large:
            client.get(reverse("dashboard-summary"))
        assert len(large.captured_queries) == len(small.captured_queries)

    def test_empty_database_returns_zeros(self, client: APIClient) -> None:
        response = client.get(reverse("dashboard-summary"))
        assert response.data["in_house_count"] == 0
        assert response.data["revenue_month"] == "0.00"

    def test_requires_authentication(self) -> None:
        response = APIClient().get(reverse("dashboard-summary"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestDashboardCache:
    def test_second_call_is_served_from_cache(self, client: APIClient) -> None:
        ReservationFactory.create_batch(3, status=Status.CHECKED_IN)
        client.get(reverse("dashboard-summary"))

        with CaptureQueriesContext(connection) as second_call:
            client.get(reverse("dashboard-summary"))

        assert len(second_call.captured_queries) == 0

    def test_check_in_invalidates_the_cached_summary(
        self, client: APIClient, django_capture_on_commit_callbacks
    ) -> None:
        with freeze_time("2026-09-05 15:00:00-03:00"):
            client.get(reverse("dashboard-summary"))
            reservation = ReservationFactory(status=Status.RESERVED)

            with django_capture_on_commit_callbacks(execute=True):
                reservation_services.check_in(reservation=reservation, moment=timezone.now())

            response = client.get(reverse("dashboard-summary"))

        assert (
            response.data["in_house_count"]
            == Reservation.objects.filter(status=Status.CHECKED_IN).count()
        )

    def test_create_reservation_invalidates_the_cached_summary(
        self, client: APIClient, django_capture_on_commit_callbacks
    ) -> None:
        client.get(reverse("dashboard-summary"))
        guest = GuestFactory()

        with django_capture_on_commit_callbacks(execute=True):
            reservation_services.create_reservation(
                guest=guest,
                room="101",
                check_in_date=today_local(),
                check_out_date=today_local() + timedelta(days=1),
            )

        response = client.get(reverse("dashboard-summary"))
        assert response.data["awaiting_check_in_count"] == 1
