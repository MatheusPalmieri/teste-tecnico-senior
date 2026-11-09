import factory

from .models import User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"atendente{n}@hotel.com")
    name = factory.Faker("name", locale="pt_BR")
    is_active = True

    @factory.post_generation
    def password(self, create: bool, extracted: str | None, **kwargs: object) -> None:
        user: User = self  # type: ignore[assignment]
        user.set_password(extracted or "senha123")
        if create:
            user.save()
