from __future__ import annotations

import pytest

from apps.guests.documents import cpf_check_digits, is_valid_cpf, normalize_document


def test_normalize_keeps_digits_and_uppercase_x() -> None:
    assert normalize_document(" 12.345.678-x ") == "12345678X"


def test_check_digits_of_a_known_cpf() -> None:
    assert cpf_check_digits("529982247") == "25"


@pytest.mark.parametrize(
    ("digits", "valid"),
    [
        ("52998224725", True),
        ("52998224724", False),
        ("00000000000", False),
        ("5299822472", False),
        ("5299822472X", False),
    ],
)
def test_is_valid_cpf(digits: str, valid: bool) -> None:
    assert is_valid_cpf(digits) is valid


def test_factory_generates_valid_cpfs() -> None:
    from apps.guests.factories import GuestFactory

    assert all(is_valid_cpf(GuestFactory.build().document) for _ in range(20))
