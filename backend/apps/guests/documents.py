from __future__ import annotations

import re

_NOT_DOCUMENT_CHAR = re.compile(r"[^0-9X]")


def normalize_document(value: str) -> str:
    """Mantém o `X` final do RG: ele faz parte do documento."""
    return _NOT_DOCUMENT_CHAR.sub("", (value or "").upper())


def cpf_check_digits(base: str) -> str:
    digits = [int(char) for char in base]
    for _ in range(2):
        weight = len(digits) + 1
        remainder = sum(d * (weight - i) for i, d in enumerate(digits)) * 10 % 11
        digits.append(0 if remainder == 10 else remainder)
    return f"{digits[-2]}{digits[-1]}"


def is_valid_cpf(digits: str) -> bool:
    if len(digits) != 11 or not digits.isdigit() or len(set(digits)) == 1:
        return False
    return cpf_check_digits(digits[:9]) == digits[9:]
