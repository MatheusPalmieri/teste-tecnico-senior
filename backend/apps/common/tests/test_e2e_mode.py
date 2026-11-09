from __future__ import annotations

from datetime import UTC, datetime

import pytest
from django.conf import settings
from django.urls import Resolver404, resolve

from apps.common.clock import _e2e_now_override, now


class TestClockOverrideRequiresE2EMode:
    def test_header_override_is_ignored_without_e2e_mode(self) -> None:
        assert settings.E2E_MODE is False

        fake_instant = datetime(2020, 1, 1, tzinfo=UTC)
        token = _e2e_now_override.set(fake_instant)
        try:
            instant = now()
        finally:
            _e2e_now_override.reset(token)

        assert instant != fake_instant


class TestTestEndpointsRequireE2EMode:
    def test_reset_endpoint_does_not_exist_without_e2e_mode(self) -> None:
        assert settings.E2E_MODE is False
        with pytest.raises(Resolver404):
            resolve("/api/_test/reset/")

    def test_seed_endpoint_does_not_exist_without_e2e_mode(self) -> None:
        with pytest.raises(Resolver404):
            resolve("/api/_test/seed/")
