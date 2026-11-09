from __future__ import annotations

from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from apps.guests.models import Guest
from apps.reservations.models import Reservation

from .e2e_scenarios import ATTENDANT_EMAIL, ATTENDANT_PASSWORD, SCENARIOS


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def reset(request: Request) -> Response:
    Reservation.objects.all().delete()
    Guest.objects.all().delete()
    _reset_attendant()
    cache.clear()
    return Response(status=204)


def _reset_attendant() -> None:
    from apps.accounts.models import User

    user, created = User.objects.update_or_create(
        email=ATTENDANT_EMAIL,
        defaults={"name": "Atendente Demo", "is_staff": False, "is_active": True},
    )
    user.set_password(ATTENDANT_PASSWORD)
    user.save(update_fields=["password"])


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def seed(request: Request) -> Response:
    scenario_name = request.data.get("scenario")
    seed_fn = SCENARIOS.get(scenario_name)
    if seed_fn is None:
        return Response(
            {"detail": f"Cenário desconhecido: {scenario_name!r}.", "code": "unknown_scenario"},
            status=400,
        )
    seed_fn()
    return Response(status=204)
