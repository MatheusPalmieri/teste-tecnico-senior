from __future__ import annotations

import hashlib
import time

from rest_framework.request import Request
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView


class _WindowThrottle(SimpleRateThrottle):
    limit: int
    window: int = 5 * 60

    def __init__(self) -> None:
        super().__init__()
        self.timer = time.time

    def get_rate(self) -> str:
        return f"{self.limit}/{self.window}s"

    def parse_rate(self, rate: str | None) -> tuple[int | None, int | None]:
        return (self.limit, self.window)


class LoginRateThrottle(_WindowThrottle):
    scope = "login"
    limit = 5

    def get_cache_key(self, request: Request, view: APIView) -> str | None:
        email = str(request.data.get("email", "")).strip().lower()
        email_hash = hashlib.sha256(email.encode()).hexdigest()[:16]
        ident = f"{self.get_ident(request)}:{email_hash}"
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginIpRateThrottle(_WindowThrottle):
    scope = "login_ip"
    limit = 20

    def get_cache_key(self, request: Request, view: APIView) -> str | None:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class RegisterRateThrottle(_WindowThrottle):
    scope = "register"
    limit = 5

    def get_cache_key(self, request: Request, view: APIView) -> str | None:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
