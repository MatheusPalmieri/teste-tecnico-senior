from __future__ import annotations

from datetime import date

from rest_framework.exceptions import ValidationError


def parse_bool(value: str | None) -> bool | None:
    if value is None:
        return None
    return value.lower() in {"true", "1"}


def parse_date(value: str | None, *, param: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValidationError({param: ["Data inválida; use o formato AAAA-MM-DD."]}) from exc


def parse_choice(value: str | None, *, param: str, choices: tuple[str, ...], default: str) -> str:
    if value is None:
        return default
    if value not in choices:
        raise ValidationError({param: [f"Valor inválido; use um de: {', '.join(choices)}."]})
    return value
