from __future__ import annotations

from typing import cast, get_args

from rest_framework import viewsets
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.ordering import parse_ordering
from apps.common.params import parse_bool, parse_choice

from . import services
from .models import Guest
from .selectors import GuestStatus, list_guests
from .serializers import GuestDetailSerializer, GuestSerializer, GuestWriteSerializer

ALLOWED_ORDERING = ("name", "document", "phone", "created_at")


class GuestViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        params = self.request.query_params
        status = params.get("status") or None
        if status is not None:
            parse_choice(status, param="status", choices=get_args(GuestStatus), default="")
        return list_guests(
            search=params.get("search") or None,
            status=cast(GuestStatus | None, status),
            uses_parking=parse_bool(params.get("uses_parking")),
            ordering=parse_ordering(params.get("ordering"), ALLOWED_ORDERING),
        )

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return GuestWriteSerializer
        if self.action == "retrieve":
            return GuestDetailSerializer
        return GuestSerializer

    def perform_create(self, serializer) -> None:
        guest = services.create_guest(**serializer.validated_data)
        serializer.instance = guest

    def perform_update(self, serializer) -> None:
        guest = services.update_guest(guest=serializer.instance, **serializer.validated_data)
        serializer.instance = guest

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        write_serializer = self.get_serializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        return Response(GuestSerializer(write_serializer.instance).data, status=201)

    def update(self, request: Request, *args: object, **kwargs: object) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        write_serializer = self.get_serializer(instance, data=request.data, partial=partial)
        write_serializer.is_valid(raise_exception=True)
        self.perform_update(write_serializer)
        return Response(GuestSerializer(write_serializer.instance).data)

    def destroy(self, request: Request, *args: object, **kwargs: object) -> Response:
        guest: Guest = self.get_object()
        services.delete_guest(guest=guest)
        return Response(status=204)
