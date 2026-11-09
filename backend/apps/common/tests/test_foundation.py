import importlib

import pytest
from django.conf import settings
from django.urls import reverse
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.factories import UserFactory
from apps.common.clock import local, now, today_local
from apps.pricing import calculator


class TestTimezone:
    def test_settings_timezone_is_sao_paulo(self) -> None:
        assert settings.TIME_ZONE == "America/Sao_Paulo"
        assert settings.USE_TZ is True

    def test_pricing_rules_use_the_same_timezone_as_django(self) -> None:
        assert str(calculator._LOCAL_TZ) == settings.TIME_ZONE

    def test_clock_now_is_aware_and_converts_to_local(self) -> None:
        with freeze_time("2026-01-15 03:00:00"):
            instant = now()
            assert instant.tzinfo is not None
            local_instant = local(instant)
            assert local_instant.hour == 0
            assert today_local() == local_instant.date()


class TestSecretKeyGuard:
    def test_settings_requires_secret_key(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import environ

        import config.settings.base as base_settings

        monkeypatch.delenv("DJANGO_SECRET_KEY", raising=False)
        monkeypatch.setattr(environ.Env, "read_env", staticmethod(lambda *a, **kw: None))
        with pytest.raises(Exception):  # noqa: B017
            importlib.reload(base_settings)
        monkeypatch.undo()
        importlib.reload(base_settings)


class TestE2ESettingsIsolation:
    def test_e2e_never_uses_the_dev_database_or_redis(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import config.settings.base as base_settings
        import config.settings.dev as dev_settings

        monkeypatch.setenv("POSTGRES_DB", "hotel")
        monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
        monkeypatch.setenv("CACHE_ENABLED", "True")
        monkeypatch.delenv("E2E_POSTGRES_DB", raising=False)
        monkeypatch.delenv("E2E_REDIS_URL", raising=False)
        try:
            importlib.reload(base_settings)
            importlib.reload(dev_settings)
            e2e_settings = importlib.import_module("config.settings.e2e")
            importlib.reload(e2e_settings)

            assert e2e_settings.DATABASES["default"]["NAME"] == "hotel_e2e"
            assert e2e_settings.CACHES["default"]["LOCATION"] == "redis://localhost:6379/1"
            assert base_settings.DATABASES["default"]["NAME"] == "hotel"
        finally:
            monkeypatch.undo()
            importlib.reload(base_settings)
            importlib.reload(dev_settings)


@pytest.mark.django_db
class TestHealthCheck:
    def test_health_check_responds_ok(self) -> None:
        client = APIClient()
        response = client.get(reverse("health-check"))
        assert response.status_code == 200
        assert response.data == {"status": "ok"}


class TestApiDocs:
    @pytest.mark.django_db
    def test_openapi_schema_is_served(self) -> None:
        client = APIClient()
        client.force_authenticate(UserFactory())
        response = client.get(reverse("schema"))
        assert response.status_code == 200
        assert "openapi" in response.headers["content-type"].lower()
        assert response.data["info"]["title"]

    def test_schema_requires_login_outside_dev(self) -> None:
        assert APIClient().get(reverse("schema")).status_code == 401


@pytest.mark.django_db
class TestErrorFormat:
    def test_unauthenticated_error_uses_standard_shape(self) -> None:
        client = APIClient()
        response = client.get(reverse("auth-me"))
        assert response.status_code == 401
        assert set(response.data.keys()) >= {"detail", "code"}
        assert response.data["code"] == "not_authenticated"
