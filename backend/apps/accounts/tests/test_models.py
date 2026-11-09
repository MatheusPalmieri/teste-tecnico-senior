import pytest

from apps.accounts.models import User


@pytest.mark.django_db
class TestUserManager:
    def test_create_user_hashes_password(self) -> None:
        user = User.objects.create_user(email="a@hotel.com", password="senha123", name="A")
        assert user.password != "senha123"
        assert user.check_password("senha123")

    def test_create_superuser_sets_flags(self) -> None:
        user = User.objects.create_superuser(email="admin@hotel.com", password="senha123")
        assert user.is_staff is True
        assert user.is_superuser is True

    def test_login_is_by_email_not_username(self) -> None:
        assert User.USERNAME_FIELD == "email"
        assert not hasattr(User, "username") or User.username is None


@pytest.mark.django_db
def test_create_user_stores_the_whole_email_in_lowercase() -> None:
    user = User.objects.create_user(email="Maria.Souza@Hotel.COM", password="x", name="Maria")
    assert user.email == "maria.souza@hotel.com"
