from datetime import timedelta

import factory

from apps.common.clock import today_local
from apps.guests.factories import GuestFactory

from .models import ACTIVE_STATUSES, Reservation, Status
from .rooms import HOTEL_ROOMS


def _free_room(o: factory.builder.Resolver) -> str:
    if o.status not in ACTIVE_STATUSES:
        return HOTEL_ROOMS[0]
    taken = set(
        Reservation.objects.filter(
            status__in=ACTIVE_STATUSES,
            check_in_date__lt=o.check_out_date,
            check_out_date__gt=o.check_in_date,
        ).values_list("room", flat=True)
    )
    return next((room for room in HOTEL_ROOMS if room not in taken), HOTEL_ROOMS[0])


class ReservationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Reservation

    guest = factory.SubFactory(GuestFactory)
    status = Status.RESERVED
    check_in_date = factory.LazyFunction(today_local)
    check_out_date = factory.LazyAttribute(lambda o: o.check_in_date + timedelta(days=1))
    room = factory.LazyAttribute(_free_room)
    uses_parking = False
