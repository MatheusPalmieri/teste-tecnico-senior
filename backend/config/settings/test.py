import os

os.environ.setdefault("DJANGO_SECRET_KEY", "chave-de-teste-não-usar-em-produção")
os.environ.setdefault("POSTGRES_DB", "hotel_test")
os.environ.setdefault("POSTGRES_USER", "hotel")
os.environ.setdefault("POSTGRES_PASSWORD", "hotel")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")
os.environ.setdefault("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
os.environ.setdefault("CACHE_ENABLED", "False")
os.environ.setdefault("AUTH_COOKIE_SECURE", "False")

from .base import *  # noqa: E402, F403

DEBUG = False

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
