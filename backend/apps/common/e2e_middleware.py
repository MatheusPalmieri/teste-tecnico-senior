from __future__ import annotations

from collections.abc import Callable

from django.http import HttpRequest, HttpResponse
from django.utils.dateparse import parse_datetime

from .clock import _e2e_now_override

E2E_TIME_HEADER = "HTTP_X_E2E_NOW"


class E2EClockMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        raw = request.META.get(E2E_TIME_HEADER)
        token = None
        if raw:
            parsed = parse_datetime(raw)
            if parsed is not None:
                token = _e2e_now_override.set(parsed)
        try:
            return self.get_response(request)
        finally:
            if token is not None:
                _e2e_now_override.reset(token)
