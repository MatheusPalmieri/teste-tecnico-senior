from __future__ import annotations

from datetime import UTC, datetime

from django.test import override_settings
from rest_framework.test import APIRequestFactory

from apps.common.clock import _e2e_now_override, now, today_local
from apps.common.e2e_middleware import E2EClockMiddleware

factory = APIRequestFactory()
FROZEN = datetime(2026, 9, 3, 17, 30, tzinfo=UTC)


class TestClockOverrideUnderE2EMode:
    @override_settings(E2E_MODE=True)
    def test_now_honors_the_override(self) -> None:
        token = _e2e_now_override.set(FROZEN)
        try:
            assert now() == FROZEN
            assert today_local() == datetime(2026, 9, 3).date()
        finally:
            _e2e_now_override.reset(token)

    @override_settings(E2E_MODE=True)
    def test_without_override_falls_back_to_the_real_clock(self) -> None:
        assert now() != FROZEN


class TestE2EClockMiddleware:
    def _middleware(self) -> tuple[E2EClockMiddleware, list[datetime | None]]:
        seen: list[datetime | None] = []

        def get_response(request):  # noqa: ANN001, ANN202
            seen.append(_e2e_now_override.get())
            return "resposta"

        return E2EClockMiddleware(get_response), seen

    def test_populates_the_override_from_the_header(self) -> None:
        middleware, seen = self._middleware()
        request = factory.get("/api/health/", HTTP_X_E2E_NOW="2026-09-03T17:30:00Z")

        assert middleware(request) == "resposta"
        assert seen == [FROZEN]

    def test_resets_the_context_after_the_response(self) -> None:
        middleware, _ = self._middleware()
        middleware(factory.get("/api/health/", HTTP_X_E2E_NOW="2026-09-03T17:30:00Z"))

        assert _e2e_now_override.get() is None

    def test_resets_the_context_even_when_the_view_raises(self) -> None:
        def boom(request):  # noqa: ANN001, ANN202
            raise RuntimeError("falha na view")

        middleware = E2EClockMiddleware(boom)
        try:
            middleware(factory.get("/api/health/", HTTP_X_E2E_NOW="2026-09-03T17:30:00Z"))
        except RuntimeError:
            pass

        assert _e2e_now_override.get() is None

    def test_ignores_a_request_without_the_header(self) -> None:
        middleware, seen = self._middleware()
        middleware(factory.get("/api/health/"))
        assert seen == [None]

    def test_ignores_an_unparseable_header(self) -> None:
        middleware, seen = self._middleware()
        middleware(factory.get("/api/health/", HTTP_X_E2E_NOW="ontem à tarde"))
        assert seen == [None]
