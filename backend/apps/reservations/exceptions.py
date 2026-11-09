from apps.common.exceptions import DomainError


class InvalidTransitionError(DomainError):
    status_code = 409
    default_detail = "Transição de status inválida para esta reserva."
    default_code = "invalid_transition"


class RoomUnavailableError(DomainError):
    status_code = 409
    default_detail = "Este quarto já está reservado neste período."
    default_code = "room_unavailable"


class ReservationNotEditableError(DomainError):
    status_code = 409
    default_detail = "Esta reserva não pode mais ser editada."
    default_code = "reservation_not_editable"


class InvalidReservationStatusError(DomainError):
    status_code = 409
    default_detail = "Esta reserva não está no status esperado para esta operação."
    default_code = "invalid_reservation_status"


class CheckInBeforeAllowedTimeError(DomainError):
    status_code = 409
    default_detail = "O check-in é permitido a partir das 14h00."
    default_code = "check_in_before_allowed_time"


class CheckOutBeforeCheckInError(DomainError):
    status_code = 400
    default_detail = "A data de saída deve ser posterior à data de entrada."
    default_code = "check_out_before_check_in"


class StayTooLongError(DomainError):
    status_code = 400
    default_detail = "A estadia pode ter no máximo 365 noites."
    default_code = "stay_too_long"

    def __init__(self) -> None:
        super().__init__(fields={"check_out_date": [self.default_detail]})


class CheckInInThePastError(DomainError):
    status_code = 400
    default_detail = "A data de entrada não pode ser no passado."
    default_code = "check_in_in_the_past"


class CheckInBeforeReservedDateError(DomainError):
    status_code = 409
    default_detail = "O check-in só pode ser feito a partir da data de entrada da reserva."
    default_code = "check_in_before_reserved_date"


class CheckInAfterCheckOutDateError(DomainError):
    status_code = 409
    default_detail = "O período desta reserva já terminou; não é possível fazer o check-in."
    default_code = "check_in_after_check_out_date"


class CheckOutTotalChangedError(DomainError):
    status_code = 409
    default_detail = "O valor do check-out mudou desde que foi exibido. Confira o novo total."
    default_code = "check_out_total_changed"
