from datetime import timedelta

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.common.clock import today_local
from apps.guests.factories import GuestFactory
from apps.guests.selectors import list_guests
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status
from apps.reservations.rooms import HOTEL_ROOMS


@pytest.mark.django_db
class TestUnifiedSearch:
    def test_name_search_can_use_the_trigram_index(self) -> None:
        GuestFactory(name="José Antônio")
        with connection.cursor() as cursor:
            cursor.execute("SET LOCAL enable_seqscan = off")
        assert "guest_name_unaccent_trgm" in list_guests(search="jose").explain()

    def test_accent_insensitive_search_still_works(self) -> None:
        GuestFactory(name="Conceição Núñez")
        assert list_guests(search="CONCEICAO nunez").count() == 1

    def test_search_by_partial_name_finds_guest(self) -> None:
        GuestFactory(name="Maria Fernanda Souza")
        assert list_guests(search="Fernanda").count() == 1

    def test_search_by_document_with_and_without_mask_finds_same_guest(self) -> None:
        GuestFactory(document="12345678900")
        assert list_guests(search="123.456.789-00").count() == 1
        assert list_guests(search="12345678900").count() == 1
        assert list_guests(search="123456789-00").count() == 1

    def test_search_by_phone_with_and_without_area_code_finds_guest(self) -> None:
        GuestFactory(phone="11988887777")
        assert list_guests(search="11 98888").count() == 1
        assert list_guests(search="988887777").count() == 1

    def test_search_without_accent_finds_accented_name(self) -> None:
        GuestFactory(name="José Antônio")
        assert list_guests(search="jose").count() == 1


@pytest.mark.django_db
class TestOperationalSegments:
    def test_status_in_house_returns_only_checked_in_guests(self) -> None:
        in_house = ReservationFactory(status=Status.CHECKED_IN).guest
        ReservationFactory(status=Status.RESERVED)
        result = list_guests(status="in_house")
        assert list(result) == [in_house]

    def test_status_awaiting_check_in_returns_only_reserved_guests(self) -> None:
        awaiting = ReservationFactory(status=Status.RESERVED).guest
        ReservationFactory(status=Status.CHECKED_IN)
        result = list_guests(status="awaiting_check_in")
        assert list(result) == [awaiting]

    def test_checked_out_guest_appears_in_neither_segment(self) -> None:
        ReservationFactory(status=Status.CHECKED_OUT)
        assert list_guests(status="in_house").count() == 0
        assert list_guests(status="awaiting_check_in").count() == 0


@pytest.mark.django_db
class TestPaginationAndQueries:
    def test_sixty_guests_paginate_in_twenty_five(self) -> None:
        from apps.common.pagination import DefaultPagination

        GuestFactory.create_batch(60)
        assert DefaultPagination.page_size == 25

    def test_listing_does_not_trigger_n_plus_one(self) -> None:
        today = today_local()
        for _ in range(len(HOTEL_ROOMS)):
            ReservationFactory(
                status=Status.CHECKED_IN,
                check_in_date=today - timedelta(days=1),
                check_out_date=today + timedelta(days=1),
            )

        with CaptureQueriesContext(connection) as small:
            list(list_guests())
        GuestFactory.create_batch(15)
        with CaptureQueriesContext(connection) as large:
            list(list_guests())

        assert len(large.captured_queries) == len(small.captured_queries)
