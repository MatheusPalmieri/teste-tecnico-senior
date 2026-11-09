import pytest

from apps.guests.exceptions import GuestDocumentTakenError, GuestHasActiveReservationError
from apps.guests.factories import GuestFactory
from apps.guests.services import create_guest, delete_guest, update_guest
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status


@pytest.mark.django_db
class TestCreateGuest:
    def test_creates_guest_with_valid_data(self) -> None:
        guest = create_guest(name="Ana Paula", document="11122233344", phone="11988887777")
        assert guest.pk is not None
        assert guest.document == "11122233344"

    def test_duplicate_document_raises_409(self) -> None:
        GuestFactory(document="11122233344")
        with pytest.raises(GuestDocumentTakenError):
            create_guest(name="Outra Pessoa", document="111.222.333-44", phone="11988887777")


@pytest.mark.django_db
class TestUpdateGuest:
    def test_keeping_own_document_succeeds(self) -> None:
        guest = GuestFactory(document="11122233344")
        updated = update_guest(
            guest=guest, name="Novo Nome", document="11122233344", phone=guest.phone
        )
        assert updated.name == "Novo Nome"

    def test_using_another_guests_document_raises_409(self) -> None:
        GuestFactory(document="11122233344")
        guest = GuestFactory(document="55566677788")
        with pytest.raises(GuestDocumentTakenError):
            update_guest(guest=guest, name=guest.name, document="11122233344", phone=guest.phone)


@pytest.mark.django_db
class TestDeleteGuest:
    def test_deleting_guest_with_reserved_reservation_raises_409(self) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        with pytest.raises(GuestHasActiveReservationError):
            delete_guest(guest=reservation.guest)

    def test_deleting_guest_with_checked_in_reservation_raises_409(self) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_IN)
        with pytest.raises(GuestHasActiveReservationError):
            delete_guest(guest=reservation.guest)

    def test_deleting_guest_with_only_checked_out_reservation_is_still_blocked(self) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_OUT)
        with pytest.raises(GuestHasActiveReservationError):
            delete_guest(guest=reservation.guest)

    def test_deleting_guest_without_any_reservation_succeeds(self) -> None:
        guest = GuestFactory()
        delete_guest(guest=guest)
        assert guest.pk is None
