from __future__ import annotations

from collections.abc import Iterable


def parse_ordering(value: str | None, allowed: Iterable[str]) -> str | None:
    if not value:
        return None

    field = value[1:] if value.startswith("-") else value
    return value if field in set(allowed) else None
