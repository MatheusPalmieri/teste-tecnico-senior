from django import forms
from django.contrib import admin
from rest_framework import serializers

from .documents import normalize_document
from .models import Guest, only_digits
from .serializers import GuestWriteSerializer


class GuestAdminForm(forms.ModelForm):
    class Meta:
        model = Guest
        fields = ["name", "document", "phone", "email", "notes"]

    def _validated(self, field: str) -> str:
        validator = getattr(GuestWriteSerializer(), f"validate_{field}")
        try:
            return validator(self.cleaned_data[field])
        except serializers.ValidationError as exc:
            raise forms.ValidationError(exc.detail) from exc

    # Normaliza antes: a checagem de unicidade compara com o valor gravado.
    def clean_document(self) -> str:
        return normalize_document(self._validated("document"))

    def clean_phone(self) -> str:
        return only_digits(self._validated("phone"))


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    form = GuestAdminForm
    list_display = ["name", "document", "document_type", "phone", "created_at"]
    search_fields = ["name", "document", "phone"]
    list_filter = ["document_type"]
