"""O DRF isenta de CSRF quem não usa sessão; com JWT em cookie, isto reativa a checagem."""

from __future__ import annotations

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.middleware.csrf import CsrfViewMiddleware, RejectRequest
from django.utils.deprecation import MiddlewareMixin

SAFE_METHODS = ("GET", "HEAD", "OPTIONS", "TRACE")


class EnforceCsrfMiddleware(MiddlewareMixin):
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self._checker = CsrfViewMiddleware(get_response=lambda request: HttpResponse())

    def process_request(self, request: HttpRequest) -> None:
        self._checker.process_request(request)

    def process_view(self, request: HttpRequest, callback, callback_args, callback_kwargs):
        if not request.path.startswith("/api/"):
            return None
        if request.method in SAFE_METHODS:
            return None
        if getattr(request, "_dont_enforce_csrf_checks", False):
            return None
        if request.path.startswith("/api/_test/"):
            return None

        try:
            self._checker._check_token(request)  # type: ignore[attr-defined]
        except RejectRequest:
            return JsonResponse(
                {
                    "detail": "Falha na verificação de segurança. Recarregue a página.",
                    "code": "csrf_failed",
                },
                status=403,
            )
        return None
