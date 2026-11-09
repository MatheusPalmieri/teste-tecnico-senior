from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from rest_framework.response import Response


def _lifetime_seconds(key: str) -> int:
    lifetime = settings.SIMPLE_JWT[key]
    assert isinstance(lifetime, timedelta)
    return int(lifetime.total_seconds())


def set_auth_cookies(response: Response, *, access: str, refresh: str | None = None) -> None:
    access_lifetime = _lifetime_seconds("ACCESS_TOKEN_LIFETIME")
    response.set_cookie(
        settings.AUTH_COOKIE_ACCESS,
        access,
        max_age=access_lifetime,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/api",
    )
    if refresh is not None:
        refresh_lifetime = _lifetime_seconds("REFRESH_TOKEN_LIFETIME")
        response.set_cookie(
            settings.AUTH_COOKIE_REFRESH,
            refresh,
            max_age=refresh_lifetime,
            httponly=True,
            secure=settings.AUTH_COOKIE_SECURE,
            samesite=settings.AUTH_COOKIE_SAMESITE,
            path=settings.AUTH_COOKIE_REFRESH_PATH,
        )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(settings.AUTH_COOKIE_ACCESS, path="/api")
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path=settings.AUTH_COOKIE_REFRESH_PATH)
