from decimal import Decimal

import pytest
from django.db import models

from apps.common.clock import today_local
from apps.common.models import TimeStampedModel
from apps.guests.factories import GuestFactory
from apps.guests.models import Guest
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Reservation
from apps.reservations.rooms import HOTEL_ROOMS


@pytest.mark.django_db
class TestTimeStamped:
    def test_guest_and_reservation_inherit_timestamps(self) -> None:
        assert issubclass(Guest, TimeStampedModel)
        assert issubclass(Reservation, TimeStampedModel)

    def test_timestamps_are_populated_on_create(self) -> None:
        guest = GuestFactory()
        assert guest.created_at is not None
        assert guest.updated_at is not None

    def test_updated_at_moves_on_save(self) -> None:
        reservation = ReservationFactory()
        first = reservation.updated_at
        reservation.notes = "remarcado por telefone"
        reservation.save()
        reservation.refresh_from_db()
        assert reservation.updated_at > first


class TestMoneyFields:
    @pytest.mark.parametrize("field_name", ["total_amount"])
    def test_money_is_decimal_10_2_never_float(self, field_name: str) -> None:
        field = Reservation._meta.get_field(field_name)
        assert isinstance(field, models.DecimalField)
        assert not isinstance(field, models.FloatField)
        assert field.max_digits == 10
        assert field.decimal_places == 2

    @pytest.mark.django_db
    def test_persisted_total_round_trips_as_decimal(self) -> None:
        reservation = ReservationFactory(
            room=HOTEL_ROOMS[0],
            check_in_date=today_local(),
            total_amount=Decimal("470.00"),
        )
        reservation.refresh_from_db()
        assert isinstance(reservation.total_amount, Decimal)
        assert reservation.total_amount == Decimal("470.00")
