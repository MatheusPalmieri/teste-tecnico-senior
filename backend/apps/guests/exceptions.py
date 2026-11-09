from apps.common.exceptions import DomainError


class GuestDocumentTakenError(DomainError):
    status_code = 409
    default_detail = "Já existe um hóspede com este documento."
    default_code = "guest_document_taken"

    def __init__(self, detail: str | None = None) -> None:
        message = detail or self.default_detail
        super().__init__(detail=message, fields={"document": [message]})


class GuestHasActiveReservationError(DomainError):
    status_code = 409
    default_detail = "Este hóspede possui uma reserva ativa e não pode ser excluído."
    default_code = "guest_has_active_reservation"
