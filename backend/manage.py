#!/usr/bin/env python

import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Nao foi possível importar o Django. Ative o ambiente virtual e "
            'instale as dependencias com `pip install -e ".[dev]"`.'
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
