from __future__ import annotations

from typing import cast, get_args

from django.db.models import QuerySet
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.clock import now, today_local
from apps.common.ordering import parse_ordering
from apps.common.pagination import DefaultPagination
from apps.common.params import parse_bool, parse_choice, parse_date
from apps.pricing.calculator import build_breakdown
from apps.pricing.errors import InvalidStayError
from apps.pricing.policy import PricingPolicy

from . import selectors, services
from .models import Reservation, Status
from .rooms import HOTEL_ROOMS
from .serializers import (
    ArrivalSerializer,
    AvailableRoomsRequestSerializer,
    CheckInRequestSerializer,
    CheckOutRequestSerializer,
    DepartureSerializer,
    QuoteRequestSerializer,
    ReservationSerializer,
    ReservationWriteSerializer,
    serialize_breakdown,
)

ALLOWED_ORDERING = (
    "code",
    "guest__name",
    "check_in_date",
    "check_out_date",
    "room",
    "status",
    "created_at",
)


class ReservationViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch"]

    def get_queryset(self) -> QuerySet[Reservation]:
        qs = Reservation.objects.select_related("guest")
        params = self.request.query_params

        qs = selectors.search_reservations(qs, params.get("search"))

        statuses = [
            parse_choice(value, param="status", choices=tuple(Status.values), default="")
            for value in params.getlist("status")
        ]
        if statuses:
            qs = qs.filter(status__in=statuses)

        date_from = parse_date(params.get("date_from"), param="date_from")
        date_to = parse_date(params.get("date_to"), param="date_to")
        if date_from:
            qs = qs.filter(check_out_date__gt=date_from)
        if date_to:
            qs = qs.filter(check_in_date__lte=date_to)

        uses_parking = parse_bool(params.get("uses_parking"))
        if uses_parking is not None:
            qs = qs.filter(uses_parking=uses_parking)

        ordering = parse_ordering(params.get("ordering"), ALLOWED_ORDERING)
        if ordering:
            qs = qs.order_by(ordering)

        return qs

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return ReservationWriteSerializer
        return ReservationSerializer

    def perform_create(self, serializer) -> None:
        reservation = services.create_reservation(
            created_by=self.request.user, **serializer.validated_data
        )
        serializer.instance = reservation

    def perform_update(self, serializer) -> None:
        reservation = services.update_reservation(
            reservation=serializer.instance, **serializer.validated_data
        )
        serializer.instance = reservation

    @staticmethod
    def _with_warnings(reservation: Reservation, data: dict) -> dict:
        data["warnings"] = [warning.as_dict() for warning in getattr(reservation, "warnings", [])]
        return data

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        write_serializer = self.get_serializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        reservation = write_serializer.instance
        read_data = self._with_warnings(reservation, ReservationSerializer(reservation).data)
        return Response(read_data, status=201)

    def update(self, request: Request, *args: object, **kwargs: object) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write_serializer = self.get_serializer(instance, data=request.data, partial=partial)
        write_serializer.is_valid(raise_exception=True)
        self.perform_update(write_serializer)
        reservation = write_serializer.instance
        read_data = self._with_warnings(reservation, ReservationSerializer(reservation).data)
        return Response(read_data)

    @action(detail=False, methods=["post"])
    def quote(self, request: Request) -> Response:
        serializer = QuoteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            breakdown = build_breakdown(**serializer.validated_data)
        except InvalidStayError as exc:
            return Response({"detail": str(exc), "code": "invalid_stay"}, status=400)
        return Response(serialize_breakdown(breakdown))

    @action(detail=True, methods=["post"])
    def cancel(self, request: Request, pk: str | None = None) -> Response:
        reservation = self.get_object()
        reservation = services.cancel_reservation(reservation=reservation)
        return Response(ReservationSerializer(reservation).data)

    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request: Request, pk: str | None = None) -> Response:
        reservation = self.get_object()
        serializer = CheckInRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reservation = services.check_in(
            reservation=reservation, moment=now(), **serializer.validated_data
        )
        return Response(ReservationSerializer(reservation).data)

    @action(detail=True, methods=["post"], url_path="check-out")
    def check_out(self, request: Request, pk: str | None = None) -> Response:
        reservation = self.get_object()
        serializer = CheckOutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reservation = services.check_out(
            reservation=reservation, moment=now(), **serializer.validated_data
        )
        return Response(ReservationSerializer(reservation).data)

    @action(detail=True, methods=["get"], url_path="check-out-preview")
    def check_out_preview(self, request: Request, pk: str | None = None) -> Response:
        reservation = self.get_object()
        moment = now()
        breakdown = services.preview_check_out(reservation=reservation, moment=moment)
        local_moment = timezone.localtime(moment)
        payload = serialize_breakdown(breakdown)
        payload["is_late_check_out"] = selectors.is_reservation_late_check_out(
            reservation, moment=moment
        )
        payload["check_out_deadline"] = PricingPolicy.CHECK_OUT_UNTIL.strftime("%H:%M")
        payload["current_time"] = local_moment.strftime("%H:%M")
        return Response(payload)


def _queue_response(
    request: Request, qs: QuerySet[Reservation], serializer_class: type, *, paginate: bool
) -> Response:
    if paginate:
        paginator = DefaultPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(serializer_class(page, many=True).data)
    return Response({"count": qs.count(), "results": serializer_class(qs, many=True).data})


@api_view(["GET"])
def arrivals_view(request: Request) -> Response:
    reference_date = parse_date(request.query_params.get("date"), param="date")
    scope = parse_choice(
        request.query_params.get("scope"),
        param="scope",
        choices=get_args(selectors.ArrivalsScope),
        default="today",
    )
    qs = selectors.arrivals(
        reference_date=reference_date or today_local(),
        search=request.query_params.get("search"),
        scope=cast(selectors.ArrivalsScope, scope),
    )
    return _queue_response(request, qs, ArrivalSerializer, paginate=scope == "history")


@api_view(["GET"])
def departures_view(request: Request) -> Response:
    reference_date = parse_date(request.query_params.get("date"), param="date")
    scope = parse_choice(
        request.query_params.get("scope"),
        param="scope",
        choices=get_args(selectors.DeparturesScope),
        default="today",
    )
    qs = selectors.departures(
        reference_date=reference_date or today_local(),
        search=request.query_params.get("search"),
        scope=cast(selectors.DeparturesScope, scope),
    )
    return _queue_response(request, qs, DepartureSerializer, paginate=scope == "history")


@api_view(["GET"])
def available_rooms_view(request: Request) -> Response:
    serializer = AvailableRoomsRequestSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    exclude_pk = data.get("exclude_reservation")
    available = services.available_rooms(
        check_in_date=data["check_in_date"],
        check_out_date=data["check_out_date"],
        exclude_pk=str(exclude_pk) if exclude_pk else None,
    )
    occupied = [room for room in HOTEL_ROOMS if room not in available]
    return Response({"total_rooms": len(HOTEL_ROOMS), "available": available, "occupied": occupied})
