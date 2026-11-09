from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.guests.factories import GuestFactory
from apps.guests.models import Guest
from apps.guests.selectors import guest_history, list_guests
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=UserFactory())
    return api_client


@pytest.mark.django_db
class TestUpdateGuest:
    def test_patch_returns_the_read_serializer(self, client: APIClient) -> None:
        guest = GuestFactory(name="Maria Antiga")

        response = client.patch(
            reverse("guest-detail", args=[guest.pk]), {"name": "Maria Atual"}, format="json"
        )

        assert response.status_code == 200
        assert response.data["name"] == "Maria Atual"
        assert "current_status" in response.data
        assert "current_reservation" in response.data
        guest.refresh_from_db()
        assert guest.name == "Maria Atual"

    def test_patch_normalizes_document_and_phone(self, client: APIClient) -> None:
        guest = GuestFactory()

        response = client.patch(
            reverse("guest-detail", args=[guest.pk]),
            {"document": "987.654.321-00", "phone": "(11) 98888-7777"},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["document"] == "98765432100"
        assert response.data["phone"] == "11988887777"

    def test_partial_patch_preserves_the_untouched_fields(self, client: APIClient) -> None:
        guest = GuestFactory(email="maria@exemplo.com", notes="Prefere andar alto")

        response = client.patch(
            reverse("guest-detail", args=[guest.pk]), {"phone": "11955554444"}, format="json"
        )

        assert response.status_code == 200
        guest.refresh_from_db()
        assert guest.phone == "11955554444"
        assert guest.email == "maria@exemplo.com"
        assert guest.notes == "Prefere andar alto"

    def test_patch_updates_the_email(self, client: APIClient) -> None:
        guest = GuestFactory(email="antigo@exemplo.com")

        response = client.patch(
            reverse("guest-detail", args=[guest.pk]),
            {"email": "novo@exemplo.com"},
            format="json",
        )

        assert response.status_code == 200
        guest.refresh_from_db()
        assert guest.email == "novo@exemplo.com"

    def test_patch_can_clear_an_optional_field(self, client: APIClient) -> None:
        guest = GuestFactory(notes="Prefere andar alto")

        response = client.patch(
            reverse("guest-detail", args=[guest.pk]), {"notes": ""}, format="json"
        )

        assert response.status_code == 200
        guest.refresh_from_db()
        assert guest.notes == ""

    def test_patch_with_an_invalid_name_returns_400(self, client: APIClient) -> None:
        guest = GuestFactory()

        response = client.patch(
            reverse("guest-detail", args=[guest.pk]), {"name": "Jo"}, format="json"
        )

        assert response.status_code == 400


@pytest.mark.django_db
class TestRetrieveGuest:
    def test_detail_includes_the_full_reservation_history(self, client: APIClient) -> None:
        guest = GuestFactory()
        ReservationFactory(guest=guest, status=Status.CHECKED_OUT)
        ReservationFactory(guest=guest, status=Status.CANCELLED)

        response = client.get(reverse("guest-detail", args=[guest.pk]))

        assert response.status_code == 200
        assert len(response.data["reservations"]) == 2


@pytest.mark.django_db
class TestParkingFilter:
    def test_filters_guests_with_an_active_parking_reservation(self, client: APIClient) -> None:
        with_parking = ReservationFactory(status=Status.CHECKED_IN, uses_parking=True).guest
        without_parking = ReservationFactory(status=Status.CHECKED_IN, uses_parking=False).guest

        response = client.get(reverse("guest-list"), {"uses_parking": "true"})

        names = [guest["name"] for guest in response.data["results"]]
        assert with_parking.name in names
        assert without_parking.name not in names

    def test_filters_guests_without_parking(self, client: APIClient) -> None:
        with_parking = ReservationFactory(status=Status.CHECKED_IN, uses_parking=True).guest
        without_parking = ReservationFactory(status=Status.CHECKED_IN, uses_parking=False).guest

        response = client.get(reverse("guest-list"), {"uses_parking": "false"})

        names = [guest["name"] for guest in response.data["results"]]
        assert without_parking.name in names
        assert with_parking.name not in names

    def test_absent_parameter_does_not_filter(self, client: APIClient) -> None:
        GuestFactory.create_batch(2)
        response = client.get(reverse("guest-list"))
        assert response.data["count"] == 2


@pytest.mark.django_db
class TestGuestSerializerDerivedFields:
    def test_guest_without_active_reservation_has_null_status(self, client: APIClient) -> None:
        guest = GuestFactory()
        ReservationFactory(guest=guest, status=Status.CHECKED_OUT)

        response = client.get(reverse("guest-detail", args=[guest.pk]))

        assert response.data["current_status"] is None
        assert response.data["current_reservation"] is None

    def test_guest_with_active_reservation_exposes_the_summary(self, client: APIClient) -> None:
        reservation = ReservationFactory(status=Status.CHECKED_IN)

        response = client.get(reverse("guest-detail", args=[reservation.guest.pk]))

        assert response.data["current_status"] == Status.CHECKED_IN
        assert response.data["current_reservation"]["code"] == reservation.code


@pytest.mark.django_db
class TestGuestWriteValidation:
    @pytest.mark.parametrize(
        ("field", "value"),
        [("name", "  Jo  "), ("document", "   "), ("phone", "   ")],
    )
    def test_blank_required_fields_return_400(
        self, client: APIClient, field: str, value: str
    ) -> None:
        payload = {"name": "Carlos Eduardo", "document": "98765432100", "phone": "11977776666"}
        payload[field] = value

        response = client.post(reverse("guest-list"), payload, format="json")

        assert response.status_code == 400
        assert field in response.data["fields"]


@pytest.mark.django_db
class TestGuestSelectorsWithoutPrefetch:
    def test_guest_history_returns_every_reservation(self) -> None:
        guest = GuestFactory()
        ReservationFactory(guest=guest, status=Status.CHECKED_OUT)
        ReservationFactory(guest=guest, status=Status.CANCELLED)

        assert guest_history(guest).count() == 2

    def test_uses_parking_filter_in_the_selector(self) -> None:
        ReservationFactory(status=Status.RESERVED, uses_parking=True)
        ReservationFactory(status=Status.RESERVED, uses_parking=False)

        assert list_guests(uses_parking=True).count() == 1


@pytest.mark.django_db
class TestGuestStr:
    def test_str_shows_name_and_document(self) -> None:
        guest = Guest(name="Ana Souza", document="12345678901")
        assert str(guest) == "Ana Souza (12345678901)"


@pytest.mark.django_db
class TestGuestStatusFilterValidation:
    def test_unknown_status_is_400_instead_of_ignored(self, client: APIClient) -> None:
        response = client.get(reverse("guest-list"), {"status": "hospedado"})
        assert response.status_code == 400
        assert "status" in response.data["fields"]

    def test_empty_status_means_no_filter(self, client: APIClient) -> None:
        GuestFactory()
        assert client.get(reverse("guest-list"), {"status": ""}).data["count"] == 1
