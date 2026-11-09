from __future__ import annotations

from typing import Any

from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class DomainError(drf_exceptions.APIException):
    status_code = 400
    default_detail = "Não foi possível concluir a operação."
    default_code = "domain_error"

    def __init__(
        self,
        detail: str | None = None,
        code: str | None = None,
        context: dict[str, Any] | None = None,
        fields: dict[str, list[str]] | None = None,
    ) -> None:
        super().__init__(detail=detail or self.default_detail, code=code or self.default_code)
        self.context = context
        self.fields = fields


def _extract_code(exc: drf_exceptions.APIException) -> str:
    codes = exc.get_codes()
    if isinstance(codes, dict):
        return "validation_error"
    if isinstance(codes, list):
        return str(codes[0]) if codes else "error"
    return str(codes)


def exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    fields: dict[str, Any] | None = None

    if isinstance(exc, drf_exceptions.ValidationError) and isinstance(data, dict):
        fields = {k: v for k, v in data.items() if k != "non_field_errors"}
        non_field = data.get("non_field_errors")
        detail = str(non_field[0]) if non_field else "Dados inválidos."
    elif isinstance(data, dict) and "detail" in data:
        detail = str(data["detail"])
    else:
        detail = "Ocorreu um erro inesperado."

    if isinstance(exc, drf_exceptions.Throttled):
        code = "too_many_attempts"
    else:
        code = _extract_code(exc) if isinstance(exc, drf_exceptions.APIException) else "error"

    if isinstance(exc, DomainError) and exc.fields:
        fields = exc.fields

    payload: dict[str, Any] = {"detail": detail, "code": code}
    if fields:
        payload["fields"] = fields
    if isinstance(exc, DomainError) and exc.context:
        payload["context"] = exc.context

    response.data = payload
    return response
