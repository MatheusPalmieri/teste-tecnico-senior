from corsheaders.defaults import default_headers

from .dev import *  # noqa: F403
from .dev import CACHE_ENABLED, CACHES, DATABASES, MIDDLEWARE, env

E2E_MODE = True

# O reset do E2E apaga dados: nunca apontar para o banco ou o Redis de dev.
DATABASES = {
    "default": {**DATABASES["default"], "NAME": env("E2E_POSTGRES_DB", default="hotel_e2e")}
}
if CACHE_ENABLED:
    CACHES = {
        "default": {
            **CACHES["default"],
            "LOCATION": env("E2E_REDIS_URL", default="redis://localhost:6379/1"),
        }
    }

MIDDLEWARE = MIDDLEWARE + ["apps.common.e2e_middleware.E2EClockMiddleware"]

CORS_ALLOWED_ORIGINS = ["http://localhost:4173"]
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

CORS_ALLOW_HEADERS = [*default_headers, "x-e2e-now"]
