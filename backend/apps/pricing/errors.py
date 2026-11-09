from __future__ import annotations


class PricingError(Exception):
    pass


class NaiveDatetimeError(PricingError):
    def __init__(self, *, param_name: str = "moment") -> None:
        super().__init__(f"'{param_name}' precisa ser timezone-aware; datetime naive não é aceito.")


class InvalidStayError(PricingError):
    def __init__(self, *, check_in_date: object, check_out_date: object) -> None:
        super().__init__(
            f"Estadia inválida: check_out_date ({check_out_date}) deve ser posterior "
            f"a check_in_date ({check_in_date})."
        )
