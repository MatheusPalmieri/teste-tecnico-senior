import factory

from .documents import cpf_check_digits
from .models import Guest


def _valid_cpf(n: int) -> str:
    base = f"{100_000_000 + n:09d}"
    return base + cpf_check_digits(base)


class GuestFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Guest

    name = factory.Faker("name", locale="pt_BR")
    document = factory.Sequence(_valid_cpf)
    phone = factory.Sequence(lambda n: f"1198{n:07d}")
    email = factory.Faker("email")
