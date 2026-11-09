from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.common.clock import today_local
from apps.guests.documents import cpf_check_digits
from apps.guests.models import Guest
from apps.reservations.models import Reservation, Status
from apps.reservations.rooms import HOTEL_ROOMS

DEMO_ATTENDANT_EMAIL = "atendente@hotel.com"
DEMO_ATTENDANT_PASSWORD = "senha123"

DEMO_GUEST_NAMES = [
    "José da Silva",
    "Maria Aparecida Souza",
    "João Pedro Almeida",
    "Ana Cláudia Ferreira",
    "Luís Fernando Costa",
    "Beatriz Nogueira",
    "André Luiz Santos",
    "Camila Rodrigues",
    "Rafael Conceição",
    "Larissa Andrade",
    "Fábio Martins",
    "Débora Cristina Lima",
    "Vinícius Barbosa",
    "Patrícia Gonçalves",
    "Thiago Nascimento",
]


def _next_weekday(base_date, weekday: int):
    delta = (weekday - base_date.weekday()) % 7
    return base_date + timedelta(days=delta)


class Command(BaseCommand):
    help = "Popula o banco com um cenário determinístico para desenvolvimento."

    def handle(self, *args: object, **options: object) -> None:
        with transaction.atomic():
            attendant = self._seed_attendant()
            guests = self._seed_guests()
            self._seed_reservations(guests, attendant)

        self.stdout.write(self.style.SUCCESS("seed_demo concluído."))

    def _seed_attendant(self) -> User:
        user, created = User.objects.get_or_create(
            email=DEMO_ATTENDANT_EMAIL,
            defaults={"name": "Atendente Demo"},
        )
        if created:
            user.set_password(DEMO_ATTENDANT_PASSWORD)
            user.save(update_fields=["password"])
        return user

    def _seed_guests(self) -> list[Guest]:
        guests = []
        for index, name in enumerate(DEMO_GUEST_NAMES):
            base = f"{100000000 + index}"
            document = base + cpf_check_digits(base)
            guest, _ = Guest.objects.get_or_create(
                document=document,
                defaults={
                    "name": name,
                    "phone": f"119{8000000 + index:07d}",
                    "email": f"{name.split()[0].lower()}@example.com",
                },
            )
            guests.append(guest)
        return guests

    def _seed_reservations(self, guests: list[Guest], attendant: User) -> None:
        today = today_local()
        monday = _next_weekday(today, 0)
        saturday = _next_weekday(today, 5)

        scenarios = [
            (0, 0, monday, monday + timedelta(days=2), Status.RESERVED, False),
            (1, 1, saturday, saturday + timedelta(days=2), Status.RESERVED, True),
            (2, 2, today - timedelta(days=1), today + timedelta(days=3), Status.CHECKED_IN, True),
            (3, 3, today - timedelta(days=1), today, Status.CHECKED_IN, False),
            (4, 4, today - timedelta(days=2), today, Status.CHECKED_OUT, False),
            (5, 5, today - timedelta(days=5), today - timedelta(days=3), Status.CANCELLED, False),
        ]

        for guest_index, room_index, check_in, check_out, status, parking in scenarios:
            guest = guests[guest_index]
            room = HOTEL_ROOMS[room_index]
            reservation, created = Reservation.objects.get_or_create(
                guest=guest,
                room=room,
                check_in_date=check_in,
                defaults={
                    "check_out_date": check_out,
                    "uses_parking": parking,
                    "created_by": attendant,
                },
            )
            if not created:
                continue

            if status in (Status.CHECKED_IN, Status.CHECKED_OUT):
                reservation.transition_to(Status.CHECKED_IN)
                reservation.checked_in_at = reservation.created_at
            if status == Status.CHECKED_OUT:
                reservation.transition_to(Status.CHECKED_OUT)
                reservation.checked_out_at = reservation.updated_at
            if status == Status.CANCELLED:
                reservation.transition_to(Status.CANCELLED)

            reservation.save()
