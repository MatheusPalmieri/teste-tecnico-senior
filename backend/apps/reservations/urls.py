from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ReservationViewSet,
    arrivals_view,
    available_rooms_view,
    departures_view,
)

router = DefaultRouter()
router.register("reservations", ReservationViewSet, basename="reservation")

urlpatterns = [
    path("rooms/available/", available_rooms_view, name="rooms-available"),
    path("reservations/arrivals/", arrivals_view, name="reservation-arrivals"),
    path("reservations/departures/", departures_view, name="reservation-departures"),
    *router.urls,
]
