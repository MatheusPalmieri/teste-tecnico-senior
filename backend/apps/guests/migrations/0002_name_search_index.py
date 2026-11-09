from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("guests", "0001_initial"),
    ]

    operations = [
        # `unaccent` é STABLE e não entra em índice; com o dicionário explícito
        # o resultado é fixo, o que permite declarar o wrapper IMMUTABLE.
        migrations.RunSQL(
            sql="""
                CREATE OR REPLACE FUNCTION hotel_unaccent(text) RETURNS text
                LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
                AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
            """,
            reverse_sql="DROP FUNCTION IF EXISTS hotel_unaccent(text);",
        ),
        # O antigo, em `name` puro, nunca servia ao `UPPER(unaccent(name)) LIKE`.
        migrations.RemoveIndex(model_name="guest", name="guest_name_trgm"),
        # Mesma expressão que `selectors._apply_search` gera (`icontains` = UPPER).
        migrations.RunSQL(
            sql=(
                "CREATE INDEX guest_name_unaccent_trgm ON guests_guest "
                "USING gin ((UPPER(hotel_unaccent(name))) gin_trgm_ops);"
            ),
            reverse_sql="DROP INDEX IF EXISTS guest_name_unaccent_trgm;",
        ),
    ]
