from __future__ import annotations

from typing import cast

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.factories import UserFactory
from apps.accounts.models import User

PASSWORD = "senha123-antiga"
NEW_PASSWORD = "Nova-Senha-2026!"


@pytest.fixture
def user():
    return UserFactory(email="atendente@hotel.com", name="Atendente Original", password=PASSWORD)


@pytest.fixture
def client(user) -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestUpdateProfile:
    def test_patch_me_updates_authenticated_users_name(self, client: APIClient, user) -> None:
        response = client.patch(reverse("auth-me"), {"name": "Maria Souza"})
        assert response.status_code == 200
        assert response.data["name"] == "Maria Souza"
        user.refresh_from_db()
        assert user.name == "Maria Souza"

    def test_id_in_payload_is_ignored(self, client: APIClient, user) -> None:
        other = UserFactory()
        response = client.patch(reverse("auth-me"), {"id": str(other.pk), "name": "Novo Nome"})
        assert response.status_code == 200
        assert str(response.data["id"]) == str(user.pk)
        other.refresh_from_db()
        assert other.name != "Novo Nome"

    def test_email_already_used_by_another_user_returns_400(self, client: APIClient) -> None:
        UserFactory(email="ocupado@hotel.com")
        response = client.patch(reverse("auth-me"), {"email": "ocupado@hotel.com"})
        assert response.status_code == 400

    def test_requires_authentication(self) -> None:
        response = APIClient().patch(reverse("auth-me"), {"name": "X"})
        assert response.status_code == 401


@pytest.mark.django_db
class TestChangePassword:
    def test_valid_new_password_returns_204_and_new_password_works(
        self, client: APIClient, user
    ) -> None:
        response = client.post(
            reverse("auth-change-password"),
            {"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        )
        assert response.status_code == 204
        user.refresh_from_db()
        assert user.check_password(NEW_PASSWORD)

    def test_weak_new_password_returns_400(self, client: APIClient) -> None:
        response = client.post(
            reverse("auth-change-password"),
            {"current_password": PASSWORD, "new_password": "12345678"},
        )
        assert response.status_code == 400

    def test_new_password_equal_to_email_returns_400(self, client: APIClient, user) -> None:
        response = client.post(
            reverse("auth-change-password"),
            {"current_password": PASSWORD, "new_password": user.email},
        )
        assert response.status_code == 400

    def test_previous_refresh_token_stops_working(self, client: APIClient, user) -> None:
        old_refresh = RefreshToken.for_user(user)
        client.post(
            reverse("auth-change-password"),
            {"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        )
        anonymous_client = APIClient()
        anonymous_client.cookies["refresh_token"] = str(old_refresh)
        response = anonymous_client.post(reverse("auth-refresh"))
        assert response.status_code == 401

    def test_query_count_does_not_grow_with_old_sessions(self) -> None:
        def change_password_queries(old_sessions: int) -> int:
            account = cast(User, UserFactory(password=PASSWORD))
            for _ in range(old_sessions):
                RefreshToken.for_user(account)
            api_client = APIClient()
            api_client.force_authenticate(user=account)
            with CaptureQueriesContext(connection) as ctx:
                response = api_client.post(
                    reverse("auth-change-password"),
                    {"current_password": PASSWORD, "new_password": NEW_PASSWORD},
                )
            assert response.status_code == 204
            return len(ctx)

        assert change_password_queries(10) == change_password_queries(1)

    def test_response_never_contains_password_fields(self, client: APIClient) -> None:
        response = client.post(
            reverse("auth-change-password"),
            {"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        )
        assert response.data is None or "password" not in str(response.data).lower()

    def test_requires_authentication(self) -> None:
        response = APIClient().post(
            reverse("auth-change-password"),
            {"new_password": "y"},
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestChangePasswordRequiresCurrentPassword:
    def test_missing_current_password_returns_400(self, client: APIClient, user) -> None:
        response = client.post(reverse("auth-change-password"), {"new_password": NEW_PASSWORD})
        assert response.status_code == 400
        user.refresh_from_db()
        assert user.check_password(PASSWORD)

    def test_wrong_current_password_returns_400_and_keeps_the_old_one(
        self, client: APIClient, user
    ) -> None:
        response = client.post(
            reverse("auth-change-password"),
            {"current_password": "chute", "new_password": NEW_PASSWORD},
        )
        assert response.status_code == 400
        assert response.data["code"] == "invalid_current_password"
        assert "current_password" in response.data["fields"]
        user.refresh_from_db()
        assert user.check_password(PASSWORD)

    def test_new_password_follows_the_same_policy_as_sign_up(self, client: APIClient) -> None:
        response = client.post(
            reverse("auth-change-password"),
            {"current_password": PASSWORD, "new_password": "nova-senha-bem-forte-2026"},
        )
        assert response.status_code == 400
        assert response.data["code"] == "password_too_weak"
        assert any("maiúscula" in message for message in response.data["fields"]["new_password"])


@pytest.mark.django_db
class TestEmailChangeRequiresCurrentPassword:
    def test_changing_email_without_password_returns_400(self, client: APIClient, user) -> None:
        response = client.patch(reverse("auth-me"), {"email": "novo@hotel.com"})
        assert response.status_code == 400
        assert response.data["code"] == "invalid_current_password"
        user.refresh_from_db()
        assert user.email == "atendente@hotel.com"

    def test_changing_email_with_wrong_password_returns_400(self, client: APIClient) -> None:
        response = client.patch(
            reverse("auth-me"), {"email": "novo@hotel.com", "current_password": "chute"}
        )
        assert response.status_code == 400

    def test_changing_email_with_current_password_succeeds(self, client: APIClient, user) -> None:
        response = client.patch(
            reverse("auth-me"), {"email": "Novo@Hotel.com", "current_password": PASSWORD}
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.email == "novo@hotel.com"

    def test_resending_the_same_email_does_not_ask_for_password(self, client: APIClient) -> None:
        response = client.patch(
            reverse("auth-me"), {"name": "Maria Souza", "email": "atendente@hotel.com"}
        )
        assert response.status_code == 200

    def test_email_taken_ignores_case(self, client: APIClient) -> None:
        UserFactory(email="ocupado@hotel.com")
        response = client.patch(
            reverse("auth-me"), {"email": "OCUPADO@hotel.com", "current_password": PASSWORD}
        )
        assert response.status_code == 400
        assert response.data["code"] == "email_taken"


@pytest.mark.django_db
class TestEmailRaces:
    def test_profile_update_race_returns_email_taken(self, client: APIClient) -> None:
        from unittest import mock

        from django.db import IntegrityError

        with mock.patch(
            "apps.accounts.serializers.UpdateProfileSerializer.save",
            side_effect=IntegrityError("duplicate key"),
        ):
            response = client.patch(
                reverse("auth-me"), {"email": "novo@hotel.com", "current_password": PASSWORD}
            )
        assert response.status_code == 400
        assert response.data["code"] == "email_taken"

    def test_register_race_returns_email_taken(self) -> None:
        from unittest import mock

        from django.db import IntegrityError

        with mock.patch(
            "apps.accounts.models.User.objects.create_user",
            side_effect=IntegrityError("duplicate key"),
        ):
            response = APIClient().post(
                reverse("auth-register"),
                {
                    "name": "Maria Souza",
                    "email": "maria@hotel.com",
                    "password": "Senha-Forte-2026!",
                },
            )
        assert response.status_code == 400
        assert response.data["code"] == "email_taken"


def test_password_policy_help_text_lists_every_rule() -> None:
    from apps.accounts.validators import PasswordComplexityValidator

    help_text = PasswordComplexityValidator().get_help_text()
    for rule in ("8 caracteres", "maiúscula", "minúscula", "número", "especial"):
        assert rule in help_text
