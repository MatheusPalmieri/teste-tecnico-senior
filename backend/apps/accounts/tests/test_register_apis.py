from __future__ import annotations

import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.accounts.models import User

STRONG_PASSWORD = "Hotel@2026rec"


@pytest.fixture
def client() -> APIClient:
    cache.clear()
    return APIClient()


def _register(
    client: APIClient,
    *,
    name: str = "Maria Souza",
    email: str = "maria@hotel.com",
    password: str = STRONG_PASSWORD,
):
    return client.post(
        reverse("auth-register"),
        {"name": name, "email": email, "password": password},
    )


@pytest.mark.django_db
class TestRegister:
    def test_anonymous_can_register_and_gets_201(self, client: APIClient) -> None:
        response = _register(client)

        assert response.status_code == 201
        assert response.data["user"]["email"] == "maria@hotel.com"
        assert User.objects.filter(email="maria@hotel.com").exists()

    def test_register_creates_session_cookies_without_tokens_in_body(
        self, client: APIClient
    ) -> None:
        response = _register(client)

        assert "access" not in response.data
        assert "refresh" not in response.data
        assert "password" not in str(response.data).lower()
        assert response.cookies["access_token"]["httponly"] is True
        assert response.cookies["refresh_token"]["httponly"] is True

    def test_registered_user_is_authenticated_on_next_request(self, client: APIClient) -> None:
        _register(client)

        response = client.get(reverse("auth-me"))
        assert response.status_code == 200
        assert response.data["email"] == "maria@hotel.com"

    def test_new_account_has_no_admin_privileges(self, client: APIClient) -> None:
        _register(client)

        user = User.objects.get(email="maria@hotel.com")
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False

    def test_privilege_flags_in_payload_are_ignored(self, client: APIClient) -> None:
        response = client.post(
            reverse("auth-register"),
            {
                "name": "Maria Souza",
                "email": "maria@hotel.com",
                "password": STRONG_PASSWORD,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        assert response.status_code == 201
        user = User.objects.get(email="maria@hotel.com")
        assert user.is_staff is False
        assert user.is_superuser is False


@pytest.mark.django_db
class TestRegisterEmail:
    def test_invalid_email_format_returns_400(self, client: APIClient) -> None:
        response = _register(client, email="maria@")

        assert response.status_code == 400
        assert "email" in response.data["fields"]
        assert not User.objects.exists()

    def test_email_is_normalized_before_saving(self, client: APIClient) -> None:
        response = _register(client, email="  Maria@Hotel.COM  ")

        assert response.status_code == 201
        assert User.objects.filter(email="maria@hotel.com").exists()

    def test_duplicate_email_returns_400_email_taken(self, client: APIClient) -> None:
        UserFactory(email="maria@hotel.com")

        response = _register(client)

        assert response.status_code == 400
        assert response.data["code"] == "email_taken"
        assert response.data["fields"]["email"]
        assert User.objects.filter(email="maria@hotel.com").count() == 1

    def test_duplicate_email_differing_by_case_returns_400(self, client: APIClient) -> None:
        UserFactory(email="maria@hotel.com")

        response = _register(client, email="MARIA@HOTEL.COM")

        assert response.status_code == 400
        assert response.data["code"] == "email_taken"
        assert User.objects.count() == 1


@pytest.mark.django_db
class TestRegisterPasswordPolicy:
    @pytest.mark.parametrize(
        ("password", "reason"),
        [
            ("Ab1@efg", "curta demais"),
            ("hotel@2026rec", "sem maiúscula"),
            ("HOTEL@2026REC", "sem minúscula"),
            ("Hotel@Recepcao", "sem número"),
            ("Hotel2026rec", "sem caractere especial"),
        ],
    )
    def test_password_missing_a_requirement_returns_400(
        self, client: APIClient, password: str, reason: str
    ) -> None:
        response = _register(client, password=password)

        assert response.status_code == 400, reason
        assert response.data["code"] == "password_too_weak"
        assert response.data["fields"]["password"]
        assert not User.objects.exists()

    def test_common_password_returns_400(self, client: APIClient) -> None:
        response = _register(client, password="P@ssw0rd")

        assert response.status_code == 400
        assert response.data["code"] == "password_too_weak"

    def test_password_similar_to_email_returns_400(self, client: APIClient) -> None:
        response = _register(client, email="maria@hotel.com", password="Maria@Hotel1")

        assert response.status_code == 400
        assert response.data["code"] == "password_too_weak"

    def test_strong_password_is_accepted_and_hashed(self, client: APIClient) -> None:
        response = _register(client)

        assert response.status_code == 201
        user = User.objects.get(email="maria@hotel.com")
        assert user.check_password(STRONG_PASSWORD)
        assert user.password != STRONG_PASSWORD


@pytest.mark.django_db
class TestRegisterThrottle:
    def test_sixth_attempt_from_same_ip_returns_429(self, client: APIClient) -> None:
        for index in range(5):
            _register(client, email=f"atendente{index}@hotel.com")

        response = _register(client, email="atendente5@hotel.com")

        assert response.status_code == 429
        assert response.data["code"] == "too_many_attempts"
