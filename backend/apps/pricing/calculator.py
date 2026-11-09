from __future__ import annotations

from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from .errors import InvalidStayError, NaiveDatetimeError
from .models import Breakdown, ChargeKind, ChargeLine, DayType
from .policy import PricingPolicy

_LOCAL_TZ = ZoneInfo("America/Sao_Paulo")
_CENTS = Decimal("0.01")

_WEEKEND_ISO_DAYS = (5, 6)  # sábado, domingo


def _quantize(value: Decimal) -> Decimal:
    return value.quantize(_CENTS, rounding=ROUND_HALF_UP)


def _to_local(moment: datetime) -> datetime:
    if moment.tzinfo is None or moment.tzinfo.utcoffset(moment) is None:
        raise NaiveDatetimeError(param_name="moment")
    return moment.astimezone(_LOCAL_TZ)


def is_weekend(day: date) -> bool:
    return day.weekday() in _WEEKEND_ISO_DAYS


def nightly_rate(day: date) -> Decimal:
    return PricingPolicy.WEEKEND_RATE if is_weekend(day) else PricingPolicy.WEEKDAY_RATE


def parking_rate(day: date) -> Decimal:
    return PricingPolicy.WEEKEND_PARKING if is_weekend(day) else PricingPolicy.WEEKDAY_PARKING


def stay_nights(check_in: date, check_out: date) -> list[date]:
    if check_out <= check_in:
        raise InvalidStayError(check_in_date=check_in, check_out_date=check_out)

    nights: list[date] = []
    current = check_in
    one_day = date.resolution
    while current < check_out:
        nights.append(current)
        current = current + one_day
    return nights


def is_check_in_allowed(moment: datetime) -> bool:
    local_moment = _to_local(moment)
    return local_moment.time() >= PricingPolicy.CHECK_IN_FROM


def is_late_check_out(moment: datetime, *, scheduled_check_out_date: date) -> bool:
    local_moment = _to_local(moment)
    if local_moment.date() < scheduled_check_out_date:
        return False
    return local_moment.time() > PricingPolicy.CHECK_OUT_UNTIL


def late_check_out_fee(moment: datetime, *, scheduled_check_out_date: date) -> Decimal:
    if not is_late_check_out(moment, scheduled_check_out_date=scheduled_check_out_date):
        return _quantize(Decimal("0"))
    local_moment = _to_local(moment)
    rate = nightly_rate(local_moment.date())
    return _quantize(rate * PricingPolicy.LATE_CHECK_OUT_RATE)


def _nightly_lines(nights: list[date]) -> tuple[list[ChargeLine], Decimal]:
    weekday_nights = [n for n in nights if not is_weekend(n)]
    weekend_nights = [n for n in nights if is_weekend(n)]

    lines: list[ChargeLine] = []
    subtotal = Decimal("0")

    if weekday_nights:
        amount = _quantize(PricingPolicy.WEEKDAY_RATE * len(weekday_nights))
        subtotal += amount
        lines.append(
            ChargeLine(
                kind=ChargeKind.NIGHTLY,
                description="Diárias de segunda a sexta",
                day_type=DayType.WEEKDAY,
                quantity=len(weekday_nights),
                unit_amount=PricingPolicy.WEEKDAY_RATE,
                amount=amount,
            )
        )
    if weekend_nights:
        amount = _quantize(PricingPolicy.WEEKEND_RATE * len(weekend_nights))
        subtotal += amount
        lines.append(
            ChargeLine(
                kind=ChargeKind.NIGHTLY,
                description="Diárias de sábado e domingo",
                day_type=DayType.WEEKEND,
                quantity=len(weekend_nights),
                unit_amount=PricingPolicy.WEEKEND_RATE,
                amount=amount,
            )
        )
    return lines, _quantize(subtotal)


def _parking_lines(nights: list[date]) -> tuple[list[ChargeLine], Decimal]:
    weekday_nights = [n for n in nights if not is_weekend(n)]
    weekend_nights = [n for n in nights if is_weekend(n)]

    lines: list[ChargeLine] = []
    subtotal = Decimal("0")

    if weekday_nights:
        amount = _quantize(PricingPolicy.WEEKDAY_PARKING * len(weekday_nights))
        subtotal += amount
        lines.append(
            ChargeLine(
                kind=ChargeKind.PARKING,
                description="Vaga de garagem — segunda a sexta",
                day_type=DayType.WEEKDAY,
                quantity=len(weekday_nights),
                unit_amount=PricingPolicy.WEEKDAY_PARKING,
                amount=amount,
            )
        )
    if weekend_nights:
        amount = _quantize(PricingPolicy.WEEKEND_PARKING * len(weekend_nights))
        subtotal += amount
        lines.append(
            ChargeLine(
                kind=ChargeKind.PARKING,
                description="Vaga de garagem — sábado e domingo",
                day_type=DayType.WEEKEND,
                quantity=len(weekend_nights),
                unit_amount=PricingPolicy.WEEKEND_PARKING,
                amount=amount,
            )
        )
    return lines, _quantize(subtotal)


def build_breakdown(
    *,
    check_in_date: date,
    check_out_date: date,
    uses_parking: bool,
    check_out_moment: datetime | None = None,
) -> Breakdown:
    nights = stay_nights(check_in_date, check_out_date)

    lines: list[ChargeLine] = []

    nightly_lines, nightly_subtotal = _nightly_lines(nights)
    lines.extend(nightly_lines)

    parking_subtotal = _quantize(Decimal("0"))
    if uses_parking:
        parking_lines, parking_subtotal = _parking_lines(nights)
        lines.extend(parking_lines)

    late_fee = _quantize(Decimal("0"))
    if check_out_moment is not None:
        late_fee = late_check_out_fee(check_out_moment, scheduled_check_out_date=check_out_date)
        if late_fee > 0:
            lines.append(
                ChargeLine(
                    kind=ChargeKind.LATE_CHECK_OUT,
                    description="Multa de late check-out",
                    day_type=None,
                    quantity=1,
                    unit_amount=late_fee,
                    amount=late_fee,
                )
            )

    total = _quantize(nightly_subtotal + parking_subtotal + late_fee)

    return Breakdown(
        nights=len(nights),
        lines=tuple(lines),
        nightly_subtotal=nightly_subtotal,
        parking_subtotal=parking_subtotal,
        late_check_out_fee=late_fee,
        total=total,
    )
