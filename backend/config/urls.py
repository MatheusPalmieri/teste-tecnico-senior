from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.common.apis import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/guests/", include("apps.guests.urls")),
    path("api/", include("apps.reservations.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
]

if settings.E2E_MODE:
    from apps.common import e2e_apis

    urlpatterns += [
        path("api/_test/reset/", e2e_apis.reset, name="e2e-reset"),
        path("api/_test/seed/", e2e_apis.seed, name="e2e-seed"),
    ]
