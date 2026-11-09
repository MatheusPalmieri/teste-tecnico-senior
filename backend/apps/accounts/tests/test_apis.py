from __future__ import annotations

from unittest.mock import patch

import pytest
from django.urls import reverse
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory

PASSWORD = "senha123"


@pytest.fixture
def user():
    return UserFactory(email="atendente@hotel.com", password=PASSWORD)


@pytest.fixture
def client() -> APIClient:
    return APIClient()


def _login(
    client: APIClient,
    email: str = "atendente@hotel.com",
    password: str = PASSWORD,
    csrf_token: str | None = None,
):
    headers = {"HTTP_X_CSRFTOKEN": csrf_token} if csrf_token else {}
    return client.post(reverse("auth-login"), {"email": email, "password": password}, **headers)


@pytest.mark.django_db
class TestLogin:
    def test_correct_credentials_return_200_and_set_cookies(self, client, user) -> None:
        response = _login(client)
        assert response.status_code == 200
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    def test_response_body_never_contains_tokens(self, client, user) -> None:
        response = _login(client)
        assert "access" not in response.data
        assert "refresh" not in response.data
        assert response.data["user"]["email"] == user.email

    def test_session_cookies_are_httponly_and_samesite_lax(self, client, user) -> None:
        response = _login(client)
        access_cookie = response.cookies["access_token"]
        refresh_cookie = response.cookies["refresh_token"]
        assert access_cookie["httponly"] is True
        assert access_cookie["samesite"] == "Lax"
        assert refresh_cookie["httponly"] is True

    def test_refresh_cookie_has_restricted_path(self, client, user) -> None:
        response = _login(client)
        assert response.cookies["refresh_token"]["path"] == "/api/auth"

    def test_unknown_email_and_wrong_password_return_identical_response(self, client, user) -> None:
        unknown_response = _login(client, email="ninguem@hotel.com")
        wrong_password_response = _login(client, password="senhaerrada")

        assert unknown_response.status_code == wrong_password_response.status_code == 401
        assert unknown_response.data == wrong_password_response.data
        assert unknown_response.data["code"] == "invalid_credentials"

    def test_response_never_contains_password_field(self, client, user) -> None:
        response = _login(client)
        assert "password" not in response.data
        assert "password" not in response.data["user"]


@pytest.mark.django_db
class TestSessionRequirement:
    def test_protected_endpoint_without_cookie_returns_401(self, client) -> None:
        response = client.post(reverse("auth-logout"))
        assert response.status_code == 401

    def test_protected_endpoint_with_valid_cookie_succeeds(self, client, user) -> None:
        _login(client)
        response = client.post(reverse("auth-logout"))
        assert response.status_code == 204

    def test_authorization_header_does_not_authenticate(self, client, user) -> None:
        login_response = _login(client)
        access = login_response.cookies["access_token"].value
        anonymous_client = APIClient()
        anonymous_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = anonymous_client.post(reverse("auth-logout"))
        assert response.status_code == 401

    def test_expired_access_token_returns_401(self, client, user) -> None:
        _login(client)
        with freeze_time("2026-06-01 12:20:00"):
            response = client.post(reverse("auth-logout"))
        assert response.status_code == 401


@pytest.mark.django_db
class TestRefresh:
    def test_refresh_rotates_cookies_and_blacklists_previous_token(self, client, user) -> None:
        login_response = _login(client)
        old_refresh = login_response.cookies["refresh_token"].value

        refresh_response = client.post(reverse("auth-refresh"))
        assert refresh_response.status_code == 204
        assert refresh_response.cookies["refresh_token"].value != old_refresh

        stale_client = APIClient()
        stale_client.cookies["refresh_token"] = old_refresh
        stale_response = stale_client.post(reverse("auth-refresh"))
        assert stale_response.status_code == 401


@pytest.mark.django_db
class TestLogout:
    def test_logout_expires_cookies_and_blacklists_refresh(self, client, user) -> None:
        login_response = _login(client)
        refresh_value = login_response.cookies["refresh_token"].value

        logout_response = client.post(reverse("auth-logout"))
        assert logout_response.status_code == 204
        assert logout_response.cookies["access_token"]["max-age"] in (0, "0")

        reuse_client = APIClient()
        reuse_client.cookies["refresh_token"] = refresh_value
        reuse_response = reuse_client.post(reverse("auth-refresh"))
        assert reuse_response.status_code == 401


@pytest.mark.django_db
class TestMeBootstrap:
    def test_me_anonymous_returns_401_and_csrf_cookie(self, client) -> None:
        response = client.get(reverse("auth-me"))
        assert response.status_code == 401
        assert "csrftoken" in response.cookies

    def test_me_authenticated_returns_user(self, client, user) -> None:
        _login(client)
        response = client.get(reverse("auth-me"))
        assert response.status_code == 200
        assert response.data["email"] == user.email


@pytest.mark.django_db
class TestCsrfEnforcement:
    def test_write_without_csrf_header_is_rejected(self, user) -> None:
        strict_client = APIClient(enforce_csrf_checks=True)
        me_response = strict_client.get(reverse("auth-me"))
        csrf_token = me_response.cookies["csrftoken"].value
        _login(strict_client, csrf_token=csrf_token)

        response = strict_client.post(reverse("auth-logout"))
        assert response.status_code == 403
        assert response.json()["code"] == "csrf_failed"

    def test_write_with_mismatched_csrf_header_is_rejected(self, user) -> None:
        strict_client = APIClient(enforce_csrf_checks=True)
        me_response = strict_client.get(reverse("auth-me"))
        csrf_token = me_response.cookies["csrftoken"].value
        _login(strict_client, csrf_token=csrf_token)

        response = strict_client.post(reverse("auth-logout"), HTTP_X_CSRFTOKEN="token-inválido")
        assert response.status_code == 403

    def test_write_with_correct_csrf_header_succeeds(self, user) -> None:
        strict_client = APIClient(enforce_csrf_checks=True)
        me_response = strict_client.get(reverse("auth-me"))
        csrf_token = me_response.cookies["csrftoken"].value
        _login(strict_client, csrf_token=csrf_token)

        response = strict_client.post(reverse("auth-logout"), HTTP_X_CSRFTOKEN=csrf_token)
        assert response.status_code == 204


@pytest.mark.django_db
class TestCors:
    def test_disallowed_origin_is_not_echoed_back(self, client, user) -> None:
        _login(client)
        response = client.get(reverse("auth-me"), HTTP_ORIGIN="https://attacker.example.com")
        assert response.get("Access-Control-Allow-Origin") is None

    def test_cors_never_allows_wildcard_origin(self, client) -> None:
        response = client.get(reverse("auth-me"), HTTP_ORIGIN="https://attacker.example.com")
        assert response.get("Access-Control-Allow-Origin") != "*"


@pytest.mark.django_db
class TestLoginThrottle:
    def test_sixth_attempt_in_5_minutes_returns_429_with_retry_after(self, client, user) -> None:
        for _ in range(5):
            _login(client, password="senha-errada")

        response = _login(client, password="senha-errada")

        assert response.status_code == 429
        assert response.data["code"] == "too_many_attempts"
        assert "Retry-After" in response

    def test_throttle_is_scoped_by_email_not_only_by_ip(self, client, user) -> None:
        UserFactory(email="outro@hotel.com", password=PASSWORD)
        for _ in range(5):
            _login(client, email="atendente@hotel.com", password="senha-errada")

        response = _login(client, email="outro@hotel.com", password=PASSWORD)

        assert response.status_code == 200

    def test_successful_login_still_counts_toward_the_limit(self, client, user) -> None:
        for _ in range(5):
            _login(client)

        response = _login(client)

        assert response.status_code == 429

    def test_fails_open_when_redis_is_down(self, client, user) -> None:
        from django.core.cache import cache as django_cache

        def _miss(key, default=None, *args, **kwargs):
            return default

        with (
            patch.object(django_cache, "get", side_effect=_miss),
            patch.object(django_cache, "set", return_value=None),
        ):
            for _ in range(10):
                response = _login(client, password="senha-errada")

        assert response.status_code == 401


@pytest.mark.django_db
class TestLoginIpThrottle:
    def test_21st_attempt_from_the_same_ip_returns_429_even_with_different_emails(
        self, client
    ) -> None:
        for index in range(20):
            _login(client, email=f"alvo{index}@hotel.com", password="Senha-Comum-1")

        response = _login(client, email="mais-um@hotel.com", password="Senha-Comum-1")

        assert response.status_code == 429
        assert response.data["code"] == "too_many_attempts"


@pytest.mark.django_db
class TestThrottleIgnoresForwardedFor:
    def test_rotating_x_forwarded_for_still_hits_429(self, client, user) -> None:
        for index in range(5):
            client.post(
                reverse("auth-login"),
                {"email": "atendente@hotel.com", "password": "senha-errada"},
                HTTP_X_FORWARDED_FOR=f"10.0.0.{index}",
            )

        response = client.post(
            reverse("auth-login"),
            {"email": "atendente@hotel.com", "password": "senha-errada"},
            HTTP_X_FORWARDED_FOR="10.0.0.99",
        )

        assert response.status_code == 429


@pytest.mark.django_db
class TestLoginEmailIsCaseInsensitive:
    def test_login_with_uppercase_email_succeeds(self, client, user) -> None:
        response = _login(client, email="Atendente@HOTEL.com")
        assert response.status_code == 200

    def test_login_updates_last_login(self, client, user) -> None:
        assert user.last_login is None
        _login(client)
        user.refresh_from_db()
        assert user.last_login is not None
