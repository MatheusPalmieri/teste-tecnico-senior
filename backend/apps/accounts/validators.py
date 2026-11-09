from __future__ import annotations

import re
from typing import Any

from django.core.exceptions import ValidationError

MIN_LENGTH = 8

_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"[A-ZÀ-Þ]"), "A senha precisa ter ao menos uma letra maiúscula."),
    (re.compile(r"[a-zà-þ]"), "A senha precisa ter ao menos uma letra minúscula."),
    (re.compile(r"\d"), "A senha precisa ter ao menos um número."),
    (
        re.compile(r"[^A-Za-zÀ-ÿ0-9]"),
        "A senha precisa ter ao menos um caractere especial (ex.: !@#$%).",
    ),
]


class PasswordComplexityValidator:
    def __init__(self, min_length: int = MIN_LENGTH) -> None:
        self.min_length = min_length

    def validate(self, password: str, user: Any = None) -> None:
        errors: list[str] = []

        if len(password) < self.min_length:
            errors.append(f"A senha precisa ter ao menos {self.min_length} caracteres.")

        for pattern, message in _RULES:
            if not pattern.search(password):
                errors.append(message)

        if errors:
            raise ValidationError(errors, code="password_too_weak")

    def get_help_text(self) -> str:
        return (
            f"A senha precisa ter ao menos {self.min_length} caracteres, "
            "incluindo maiúscula, minúscula, número e caractere especial."
        )
