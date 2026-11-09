from __future__ import annotations

import pytest
from rest_framework import exceptions as drf_exceptions

from apps.common.exceptions import DomainError, exception_handler

CONTEXT: dict = {}


class TestExceptionHandler:
    def test_non_api_exception_is_not_swallowed(self) -> None:
        assert exception_handler(ValueError("falha inesperada"), CONTEXT) is None

    def test_validation_error_with_a_list_payload(self) -> None:
        response = exception_handler(drf_exceptions.ValidationError(["algo inválido"]), CONTEXT)

        assert response is not None
        assert response.data["detail"] == "Ocorreu um erro inesperado."
        assert response.data["code"] == "invalid"

    def test_validation_error_by_field_uses_the_generic_code(self) -> None:
        exc = drf_exceptions.ValidationError({"document": ["Documento é obrigatório."]})

        response = exception_handler(exc, CONTEXT)

        assert response is not None
        assert response.data["code"] == "validation_error"
        assert response.data["fields"] == {"document": ["Documento é obrigatório."]}

    def test_validation_error_with_non_field_errors_uses_them_as_detail(self) -> None:
        exc = drf_exceptions.ValidationError({"non_field_errors": ["Período inválido."]})

        response = exception_handler(exc, CONTEXT)

        assert response is not None
        assert response.data["detail"] == "Período inválido."
        assert "fields" not in response.data

    def test_throttled_uses_the_stable_code(self) -> None:
        response = exception_handler(drf_exceptions.Throttled(wait=30), CONTEXT)

        assert response is not None
        assert response.data["code"] == "too_many_attempts"

    def test_domain_error_carries_fields_and_context(self) -> None:
        exc = DomainError(
            detail="E-mail já em uso.",
            code="email_taken",
            context={"allowed_from": "14:00"},
            fields={"email": ["E-mail já em uso."]},
        )

        response = exception_handler(exc, CONTEXT)

        assert response is not None
        assert response.data == {
            "detail": "E-mail já em uso.",
            "code": "email_taken",
            "fields": {"email": ["E-mail já em uso."]},
            "context": {"allowed_from": "14:00"},
        }

    def test_domain_error_defaults(self) -> None:
        response = exception_handler(DomainError(), CONTEXT)

        assert response is not None
        assert response.data == {
            "detail": "Não foi possível concluir a operação.",
            "code": "domain_error",
        }


class TestDomainErrorRaisesAsApiException:
    def test_is_an_api_exception(self) -> None:
        with pytest.raises(drf_exceptions.APIException):
            raise DomainError()
