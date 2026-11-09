from __future__ import annotations

import re
from typing import Any

from django.core.validators import MinLengthValidator
from django.db import models
from django.db.models import CharField, F, Func

from apps.common.models import TimeStampedModel, UUIDModel

from .documents import normalize_document

_DIGITS_ONLY = re.compile(r"\D+")


def unaccented(field: str) -> Func:
    return Func(F(field), function="hotel_unaccent", output_field=CharField())


def only_digits(value: str) -> str:
    return _DIGITS_ONLY.sub("", value or "")


class DocumentType(models.TextChoices):
    CPF = "CPF", "CPF"
    RG = "RG", "RG"


class Guest(UUIDModel, TimeStampedModel):
    name = models.CharField(max_length=120, validators=[MinLengthValidator(3)])
    document_type = models.CharField(max_length=3, choices=DocumentType.choices, editable=False)
    document = models.CharField(max_length=30, unique=True, db_index=True)
    phone = models.CharField(max_length=20, db_index=True)
    email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        # O índice trigram da busca por nome é criado por SQL na migration 0002.
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.document})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.document = normalize_document(self.document)
        self.phone = only_digits(self.phone)
        is_cpf = len(self.document) == 11 and self.document.isdigit()
        self.document_type = DocumentType.CPF if is_cpf else DocumentType.RG
        super().save(*args, **kwargs)
