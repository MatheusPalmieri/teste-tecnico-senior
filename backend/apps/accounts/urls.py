from django.urls import path

from . import apis

urlpatterns = [
    path("login/", apis.login, name="auth-login"),
    path("register/", apis.register, name="auth-register"),
    path("refresh/", apis.refresh, name="auth-refresh"),
    path("logout/", apis.logout, name="auth-logout"),
    path("me/", apis.me, name="auth-me"),
    path("change-password/", apis.change_password, name="auth-change-password"),
]
