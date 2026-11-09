from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.guests.factories import GuestFactory
from apps.reservations.factories import ReservationFactory
from apps.reservations.models import Status


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=UserFactory())
    return api_client


@pytest.mark.django_db
class TestListGuests:
    def test_requires_authentication(self) -> None:
        response = APIClient().get(reverse("guest-list"))
        assert response.status_code == 401

    def test_lists_guests(self, client: APIClient) -> None:
        GuestFactory.create_batch(3)
        response = client.get(reverse("guest-list"))
        assert response.status_code == 200
        assert response.data["count"] == 3


@pytest.mark.django_db
class TestOrderingGuests:
    def test_orders_by_allowed_field(self, client: APIClient) -> None:
        GuestFactory(name="Zulmira", document="11111111111")
        GuestFactory(name="Ana", document="22222222222")

        response = client.get(reverse("guest-list"), {"ordering": "-name"})

        assert [guest["name"] for guest in response.data["results"]] == ["Zulmira", "Ana"]

    def test_ignores_field_outside_the_allowed_list(self, client: APIClient) -> None:
        GuestFactory(name="Zulmira")
        GuestFactory(name="Ana")

        response = client.get(reverse("guest-list"), {"ordering": "reservations__notes"})

        assert response.status_code == 200
        assert [guest["name"] for guest in response.data["results"]] == ["Ana", "Zulmira"]


@pytest.mark.django_db
class TestCreateGuest:
    def test_creates_guest(self, client: APIClient) -> None:
        payload = {"name": "Carlos Eduardo", "document": "98765432100", "phone": "11977776666"}
        response = client.post(reverse("guest-list"), payload)
        assert response.status_code == 201
        assert response.data["document"] == "98765432100"

    def test_duplicate_document_returns_409_anchored_on_document_field(
        self, client: APIClient
    ) -> None:
        GuestFactory(document="98765432100")
        payload = {"name": "Outra Pessoa", "document": "98765432100", "phone": "11977776666"}
        response = client.post(reverse("guest-list"), payload)
        assert response.status_code == 409
        assert response.data["code"] == "guest_document_taken"
        assert "document" in response.data["fields"]


@pytest.mark.django_db
class TestDeleteGuest:
    def test_deleting_guest_with_active_reservation_returns_409(self, client: APIClient) -> None:
        reservation = ReservationFactory(status=Status.RESERVED)
        response = client.delete(reverse("guest-detail", args=[reservation.guest.pk]))
        assert response.status_code == 409
        assert response.data["code"] == "guest_has_active_reservation"

    def test_deleting_guest_without_active_reservation_returns_204(self, client: APIClient) -> None:
        guest = GuestFactory()
        response = client.delete(reverse("guest-detail", args=[guest.pk]))
        assert response.status_code == 204


@pytest.mark.django_db
class TestGuestDocumentValidationApi:
    def test_letters_in_document_return_400_and_nothing_is_saved(self, client: APIClient) -> None:
        from apps.guests.models import Guest

        response = client.post(
            reverse("guest-list"),
            {"name": "Ana Souza", "document": "ABC", "phone": "11988887777"},
        )
        assert response.status_code == 400
        assert "document" in response.data["fields"]
        assert not Guest.objects.exists()

    def test_editing_to_an_invalid_cpf_returns_400(self, client: APIClient) -> None:
        guest = GuestFactory()
        response = client.patch(
            reverse("guest-detail", args=[guest.pk]), {"document": "123.456.789-00"}
        )
        assert response.status_code == 400
        assert response.data["fields"]["document"] == ["CPF inválido."]

    def test_invalid_phone_returns_400(self, client: APIClient) -> None:
        response = client.post(
            reverse("guest-list"),
            {"name": "Ana Souza", "document": "529.982.247-25", "phone": "1234"},
        )
        assert response.status_code == 400
        assert "phone" in response.data["fields"]


@pytest.mark.django_db
class TestGuestUpdateInvalidatesDashboard:
    def test_update_schedules_the_dashboard_invalidation(
        self, client: APIClient, django_capture_on_commit_callbacks
    ) -> None:  # noqa: ANN001
        guest = GuestFactory()
        with django_capture_on_commit_callbacks() as callbacks:
            client.patch(reverse("guest-detail", args=[guest.pk]), {"name": "Novo Nome"})
        assert len(callbacks) == 1
