from __future__ import annotations

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.db import IntegrityError, transaction
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from .cookies import clear_auth_cookies, set_auth_cookies
from .exceptions import EmailTakenError
from .models import User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)
from .throttling import LoginIpRateThrottle, LoginRateThrottle, RegisterRateThrottle


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle, LoginIpRateThrottle])
def login(request: Request) -> Response:
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = authenticate(
        request,
        username=serializer.validated_data["email"],
        password=serializer.validated_data["password"],
    )
    if user is None or not user.is_active:
        raise AuthenticationFailed(detail="E-mail ou senha inválidos.", code="invalid_credentials")

    update_last_login(User, user)
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    response = Response({"user": UserSerializer(user).data})
    set_auth_cookies(response, access=access, refresh=str(refresh))
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request: Request) -> Response:
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        user = User.objects.create_user(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            name=serializer.validated_data["name"].strip(),
        )
    except IntegrityError as exc:
        raise EmailTakenError from exc

    refresh = RefreshToken.for_user(user)
    response = Response({"user": UserSerializer(user).data}, status=201)
    set_auth_cookies(response, access=str(refresh.access_token), refresh=str(refresh))
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh(request: Request) -> Response:
    raw_token = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
    if raw_token is None:
        raise InvalidToken("Refresh token ausente.")

    try:
        old_refresh = RefreshToken(raw_token)
    except TokenError as exc:
        raise InvalidToken(str(exc)) from exc

    user_id = old_refresh[jwt_settings.USER_ID_CLAIM]
    try:
        user = User.objects.get(pk=user_id, is_active=True)
    except User.DoesNotExist as exc:
        raise InvalidToken("Usuário inválido.") from exc

    new_refresh = RefreshToken.for_user(user)
    access = str(new_refresh.access_token)

    try:
        old_refresh.blacklist()
    except TokenError:
        pass

    response = Response(status=204)
    set_auth_cookies(response, access=access, refresh=str(new_refresh))
    return response


@api_view(["POST"])
def logout(request: Request) -> Response:
    raw_token = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
    if raw_token:
        try:
            RefreshToken(raw_token).blacklist()
        except TokenError:
            pass

    response = Response(status=204)
    clear_auth_cookies(response)
    return response


@api_view(["GET", "PATCH"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def me(request: Request) -> Response:
    if not request.user or not request.user.is_authenticated:
        return Response({"detail": "Não autenticado.", "code": "not_authenticated"}, status=401)

    if request.method == "PATCH":
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except IntegrityError as exc:
            raise EmailTakenError from exc

    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
def change_password(request: Request) -> Response:
    serializer = ChangePasswordSerializer(data=request.data, context={"user": request.user})
    serializer.is_valid(raise_exception=True)

    with transaction.atomic():
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        pending = OutstandingToken.objects.filter(user=request.user, blacklistedtoken__isnull=True)
        BlacklistedToken.objects.bulk_create(
            [BlacklistedToken(token=token) for token in pending], ignore_conflicts=True
        )

    new_refresh = RefreshToken.for_user(request.user)
    access = str(new_refresh.access_token)

    response = Response(status=204)
    set_auth_cookies(response, access=access, refresh=str(new_refresh))
    return response
