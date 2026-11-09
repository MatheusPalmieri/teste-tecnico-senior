from __future__ import annotations

from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.response import Response
from rest_framework.test import APIClient
from rest_framework_simplejwt.exceptions import TokenError

from apps.accounts.cookies import set_auth_cookies
from apps.accounts.factories import UserFactory
from apps.accounts.models import User

PASSWORD = "senha123"


@pytest.fixture
def user():
    return UserFactory(email="atendente@hotel.com", password=PASSWORD)


@pytest.fixture
def client() -> APIClient:
    return APIClient()


def _login(client: APIClient, email: str = "atendente@hotel.com", password: str = PASSWORD):
    return client.post(reverse("auth-login"), {"email": email, "password": password})


@pytest.mark.django_db
class TestRefreshEdges:
    def test_without_refresh_cookie_returns_401(self, client: APIClient) -> None:
        response = client.post(reverse("auth-refresh"))
        assert response.status_code == 401

    def test_with_malformed_cookie_returns_401(self, client: APIClient) -> None:
        client.cookies["refresh_token"] = "isto-nao-e-um-jwt"
        response = client.post(reverse("auth-refresh"))
        assert response.status_code == 401

    def test_deactivated_user_cannot_refresh(self, client: APIClient, user) -> None:
        _login(client)
        user.is_active = False
        user.save(update_fields=["is_active"])

        response = client.post(reverse("auth-refresh"))

        assert response.status_code == 401

    def test_deleted_user_cannot_refresh(self, client: APIClient, user) -> None:
        _login(client)
        User.objects.filter(pk=user.pk).delete()

        response = client.post(reverse("auth-refresh"))

        assert response.status_code == 401

    def test_user_removed_between_token_check_and_lookup_returns_401(
        self, client: APIClient, user
    ) -> None:
        _login(client)

        def _fail_only_the_view_lookup(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
            if "is_active" in kwargs:
                raise User.DoesNotExist
            return real_get(*args, **kwargs)

        real_get = User.objects.get

        with patch.object(User.objects, "get", side_effect=_fail_only_the_view_lookup):
            response = client.post(reverse("auth-refresh"))

        assert response.status_code == 401

    def test_blacklist_failure_does_not_break_rotation(self, client: APIClient, user) -> None:
        _login(client)

        with patch(
            "rest_framework_simplejwt.tokens.BlacklistMixin.blacklist",
            side_effect=TokenError("blacklist indisponível"),
        ):
            response = client.post(reverse("auth-refresh"))

        assert response.status_code == 204
        assert response.cookies["refresh_token"].value


@pytest.mark.django_db
class TestLogoutEdges:
    def test_logout_without_refresh_cookie_still_clears_cookies(
        self, client: APIClient, user
    ) -> None:
        client.force_authenticate(user=user)

        response = client.post(reverse("auth-logout"))

        assert response.status_code == 204
        assert response.cookies["access_token"]["max-age"] in (0, "0")

    def test_logout_with_corrupted_refresh_cookie_returns_204(
        self, client: APIClient, user
    ) -> None:
        client.force_authenticate(user=user)
        client.cookies["refresh_token"] = "isto-nao-e-um-jwt"

        response = client.post(reverse("auth-logout"))

        assert response.status_code == 204


class TestAuthCookies:
    def test_set_auth_cookies_without_refresh_writes_only_the_access_cookie(self) -> None:
        response = Response()

        set_auth_cookies(response, access="token-de-acesso")

        assert "access_token" in response.cookies
        assert "refresh_token" not in response.cookies


@pytest.mark.django_db
class TestUserManagerValidation:
    def test_create_user_without_email_is_rejected(self) -> None:
        with pytest.raises(ValueError, match="e-mail"):
            User.objects.create_user(email="", password=PASSWORD)

    def test_create_superuser_requires_is_staff(self) -> None:
        with pytest.raises(ValueError, match="is_staff"):
            User.objects.create_superuser(email="root@hotel.com", password=PASSWORD, is_staff=False)

    def test_create_superuser_requires_is_superuser(self) -> None:
        with pytest.raises(ValueError, match="is_superuser"):
            User.objects.create_superuser(
                email="root@hotel.com", password=PASSWORD, is_superuser=False
            )

    def test_create_superuser_derives_name_from_email(self) -> None:
        user = User.objects.create_superuser(email="root@hotel.com", password=PASSWORD)
        assert user.name == "root"


class TestUserStr:
    def test_str_uses_the_name(self) -> None:
        assert str(User(email="a@hotel.com", name="Ana")) == "Ana"

    def test_str_falls_back_to_email_when_name_is_empty(self) -> None:
        assert str(User(email="a@hotel.com", name="")) == "a@hotel.com"


class TestUserFactory:
    def test_build_does_not_touch_the_database(self) -> None:
        user = UserFactory.build()
        assert user.pk is None
        assert user.check_password("senha123")
