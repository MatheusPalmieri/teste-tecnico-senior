import contextvars
from datetime import date, datetime

from django.conf import settings
from django.utils import timezone

_e2e_now_override: contextvars.ContextVar[datetime | None] = contextvars.ContextVar(
    "_e2e_now_override", default=None
)


def now() -> datetime:
    if settings.E2E_MODE:
        override = _e2e_now_override.get()
        if override is not None:
            return override
    return timezone.now()


def local(value: datetime) -> datetime:
    return timezone.localtime(value)


def today_local() -> date:
    return local(now()).date()
