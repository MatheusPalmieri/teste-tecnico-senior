"""Mudar o formato de uma chave exige subir `CACHE_VERSION`."""

from __future__ import annotations

from datetime import date
from typing import Final

CACHE_VERSION: Final = "v1"


def dashboard_summary_key(reference_date: date) -> str:
    return f"{CACHE_VERSION}:dashboard:summary:{reference_date.isoformat()}"
