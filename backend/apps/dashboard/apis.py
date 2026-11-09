from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.db.models import Count, DecimalField, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.cache import DASHBOARD_SUMMARY_TTL, cache_set
from apps.common.cache_keys import dashboard_summary_key
from apps.common.clock import now, today_local
from apps.reservations.models import Reservation, Status
from apps.reservations.rooms import TOTAL_ROOMS
from apps.reservations.selectors import is_reservation_late_check_out


@api_view(["GET"])
def summary(request: Request) -> Response:
    today: date = today_local()
    cache_key = dashboard_summary_key(today)

    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    payload = _build_summary(today)
    cache_set(cache_key, payload, timeout=DASHBOARD_SUMMARY_TTL)
    return Response(payload)


def _build_summary(today: date) -> dict[str, object]:
    counts = Reservation.objects.aggregate(
        in_house_count=Count("id", filter=Q(status=Status.CHECKED_IN)),
        arrivals_today_count=Count("id", filter=Q(status=Status.RESERVED, check_in_date=today)),
        departures_today_count=Count(
            "id", filter=Q(status=Status.CHECKED_IN, check_out_date=today)
        ),
        awaiting_check_in_count=Count("id", filter=Q(status=Status.RESERVED)),
        revenue_month=Coalesce(
            Sum(
                "total_amount",
                filter=Q(
                    status=Status.CHECKED_OUT,
                    checked_out_at__year=today.year,
                    checked_out_at__month=today.month,
                ),
            ),
            Decimal("0.00"),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        ),
    )

    moment = now()
    late_check_out_count = sum(
        1
        for reservation in Reservation.objects.filter(
            status=Status.CHECKED_IN, check_out_date__lte=today
        )
        if is_reservation_late_check_out(reservation, moment=moment)
    )

    occupancy_rate = (
        (Decimal(counts["in_house_count"]) / Decimal(TOTAL_ROOMS)).quantize(Decimal("0.01"))
        if TOTAL_ROOMS
        else Decimal("0.00")
    )

    return {
        "reference_date": today.isoformat(),
        "in_house_count": counts["in_house_count"],
        "arrivals_today_count": counts["arrivals_today_count"],
        "departures_today_count": counts["departures_today_count"],
        "awaiting_check_in_count": counts["awaiting_check_in_count"],
        "late_check_out_count": late_check_out_count,
        "occupancy_rate": str(occupancy_rate),
        "revenue_month": str(counts["revenue_month"]),
    }
