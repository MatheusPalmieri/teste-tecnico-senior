from __future__ import annotations

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .exceptions import EmailTakenError, InvalidCurrentPasswordError, WeakPasswordError
from .models import User


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _validate_password(password: str, user: User, *, field: str) -> None:
    try:
        password_validation.validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise WeakPasswordError(exc.messages, field=field) from exc


def _check_current_password(user: User, value: str | None) -> None:
    if not value or not user.check_password(value):
        raise InvalidCurrentPasswordError()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value: str) -> str:
        return _normalize_email(value)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "date_joined"]
        read_only_fields = fields


class UpdateProfileSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta:
        model = User
        fields = ["name", "email", "current_password"]
        extra_kwargs: dict[str, dict[str, list[object]]] = {"email": {"validators": []}}

    def validate_email(self, value: str) -> str:
        email = _normalize_email(value)
        if User.objects.filter(email__iexact=email).exclude(pk=self.instance.pk).exists():
            raise EmailTakenError()
        return email

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        current_password = attrs.pop("current_password", None)
        if "email" in attrs and attrs["email"] != self.instance.email:
            _check_current_password(self.instance, current_password)  # type: ignore[arg-type]
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs: dict[str, str]) -> dict[str, str]:
        user: User = self.context["user"]
        _check_current_password(user, attrs["current_password"])
        _validate_password(attrs["new_password"], user, field="new_password")
        return attrs


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value: str) -> str:
        email = _normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise EmailTakenError()
        return email

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        # Aqui e não em validate_password: a checagem de similaridade precisa de nome e e-mail.
        user = User(email=str(attrs["email"]), name=str(attrs["name"]))
        _validate_password(str(attrs["password"]), user, field="password")
        return attrs
