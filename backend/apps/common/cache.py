from __future__ import annotations

from datetime import date
from typing import Any, Final

from django.core.cache import cache

from . import cache_keys

DASHBOARD_SUMMARY_TTL: Final = 60


def cache_set(key: str, value: Any, timeout: int) -> None:
    if timeout is None:
        raise ValueError("cache_set exige timeout explícito.")
    cache.set(key, value, timeout=timeout)


def invalidate_operational_caches(*, reference_date: date) -> None:
    """Chamar via `transaction.on_commit`, senão outra requisição repõe o valor antigo."""
    cache.delete(cache_keys.dashboard_summary_key(reference_date))
