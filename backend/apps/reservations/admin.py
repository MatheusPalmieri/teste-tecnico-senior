from django.contrib import admin

from .models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ["code", "guest", "room", "status", "check_in_date", "check_out_date"]
    list_filter = ["status", "room", "uses_parking"]
    list_select_related = ["guest"]
    search_fields = ["code", "guest__name", "guest__document"]
    autocomplete_fields = ["guest"]
    readonly_fields = [
        "status",
        "checked_in_at",
        "checked_out_at",
        "early_check_in_authorized",
        "total_amount",
        "charges_snapshot",
        "created_by",
    ]
