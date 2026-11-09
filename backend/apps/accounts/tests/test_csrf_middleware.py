from __future__ import annotations

from rest_framework.test import APIRequestFactory

from apps.accounts.csrf import EnforceCsrfMiddleware

factory = APIRequestFactory()


def _middleware() -> EnforceCsrfMiddleware:
    return EnforceCsrfMiddleware(get_response=lambda request: None)


def _process(path: str, *, method: str = "post"):
    request = getattr(factory, method)(path)
    request._dont_enforce_csrf_checks = False  # noqa: SLF001
    middleware = _middleware()
    middleware.process_request(request)
    return middleware.process_view(request, lambda r: None, (), {})


class TestEnforceCsrfMiddlewareScope:
    def test_ignores_paths_outside_the_api(self) -> None:
        assert _process("/admin/login/") is None

    def test_ignores_safe_methods(self) -> None:
        assert _process("/api/guests/", method="get") is None

    def test_ignores_requests_marked_as_exempt(self) -> None:
        request = factory.post("/api/guests/")
        request._dont_enforce_csrf_checks = True  # noqa: SLF001
        middleware = _middleware()
        middleware.process_request(request)

        assert middleware.process_view(request, lambda r: None, (), {}) is None

    def test_ignores_the_e2e_test_routes(self) -> None:
        assert _process("/api/_test/seed/") is None

    def test_rejects_an_api_write_without_token(self) -> None:
        response = _process("/api/guests/")

        assert response is not None
        assert response.status_code == 403
        assert b"csrf_failed" in response.content
