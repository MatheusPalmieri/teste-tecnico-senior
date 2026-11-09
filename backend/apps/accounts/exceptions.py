from __future__ import annotations

from apps.common.exceptions import DomainError


class EmailTakenError(DomainError):
    status_code = 400
    default_detail = "Este e-mail já está em uso."
    default_code = "email_taken"

    def __init__(self) -> None:
        super().__init__(fields={"email": [self.default_detail]})


class WeakPasswordError(DomainError):
    status_code = 400
    default_detail = "Dados inválidos."
    default_code = "password_too_weak"

    def __init__(self, messages: list[str], *, field: str = "password") -> None:
        super().__init__(fields={field: messages})


class InvalidCurrentPasswordError(DomainError):
    status_code = 400
    default_detail = "Senha atual incorreta."
    default_code = "invalid_current_password"

    def __init__(self) -> None:
        super().__init__(fields={"current_password": [self.default_detail]})
