from .base import *  # noqa: F403
from .base import SPECTACULAR_SETTINGS

DEBUG = True

SPECTACULAR_SETTINGS = {
    **SPECTACULAR_SETTINGS,
    "SERVE_PERMISSIONS": ["rest_framework.permissions.AllowAny"],
}
