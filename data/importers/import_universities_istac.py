#!/usr/bin/env python3

"""Valida la clasificación ISTAC y prepara su importación a PostgreSQL."""

import csv
import html
import re
from collections import Counter
from pathlib import Path

SOURCE_URL = (
    "https://datos.canarias.es/api/estadisticas/"
    "structural-resources/v1.0/codelists/ISTAC/"
    "CL_RUCT_UNIVERSIDADES/01.000/codes.csv?fields=+description"
)

INPUT = Path("data/raw/universities/ruct_istac.csv")
OUTPUT = Path("/tmp/aaahoraque-universities-import.sql")

CODE_PREFIX = "ISTAC:CL_RUCT_UNIVERSIDADES:"


def normalize_name(value: str) -> str:
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.IGNORECASE)
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def sql_literal(value: str) -> str:
    """Escapa un literal de texto para el SQL generado."""
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    with INPUT.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        required = {"code", "parent", "urn", "name#es"}

        if not required.issubset(reader.fieldnames or []):
            raise ValueError("El CSV no contiene las columnas esperadas.")

        rows = list(reader)

    universities = []

    for row in rows:
        code = row["code"].strip()

        # Los códigos numéricos corresponden a las universidades
        # candidatas de esta clasificación.
        if not re.fullmatch(r"\d+", code):
            continue

        name = normalize_name(row["name#es"])

        if not name:
            raise ValueError(f"Universidad sin nombre: {code}")

        if "<" in name or ">" in name:
            raise ValueError(
                f"Revisar posible HTML no reconocido: {code} - {name}"
            )

        if not row["parent"].strip():
            raise ValueError(f"Universidad sin clasificación: {code}")

        universities.append({
            "code": code,
            "official_code": CODE_PREFIX + code,
            "name": name,
        })

    counts = Counter(u["official_code"] for u in universities)
    duplicates = [code for code, count in counts.items() if count > 1]

    if duplicates:
        raise ValueError(f"Códigos duplicados: {duplicates}")

    # Control específico para la versión del fichero inspeccionada.
    if len(universities) != 91:
        raise ValueError(
            f"Se esperaban 91 universidades candidatas; "
            f"se encontraron {len(universities)}. Revisar la fuente."
        )

    values = []

    for university in universities:
        values.append(
            "("
            + ", ".join([
                sql_literal(university["name"]),
                sql_literal(university["official_code"]),
                sql_literal(SOURCE_URL),
            ])
            + ")"
        )

    sql = """\\set ON_ERROR_STOP on

BEGIN;

-- Serializa las ejecuciones de este importador.
SELECT pg_advisory_xact_lock(4019, 2026);

-- Verifica que no hay códigos de esta fuente ya duplicados.
DO $$
BEGIN
    IF EXISTS (
        SELECT official_code
        FROM universities
        WHERE official_code LIKE 'ISTAC:CL_RUCT_UNIVERSIDADES:%'
        GROUP BY official_code
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Existen códigos ISTAC duplicados en universidades';
    END IF;
END
$$;

WITH incoming (official_name, official_code, source_url) AS (
    VALUES
""" + ",\n".join("    " + item for item in values) + """
)
INSERT INTO universities (
    official_name,
    country_code,
    official_code,
    source_url
)
SELECT
    incoming.official_name,
    'ES',
    incoming.official_code,
    incoming.source_url
FROM incoming
WHERE NOT EXISTS (
    SELECT 1
    FROM universities AS existing
    WHERE existing.official_code = incoming.official_code
);

COMMIT;

SELECT
    COUNT(*) AS universities_from_istac
FROM universities
WHERE official_code LIKE 'ISTAC:CL_RUCT_UNIVERSIDADES:%';
"""

    OUTPUT.write_text(sql, encoding="utf-8")

    print("IMPORTADOR ISTAC — VALIDACIÓN COMPLETADA")
    print(f"Registros originales: {len(rows)}")
    print(f"Universidades candidatas: {len(universities)}")
    print(f"Registros excluidos: {len(rows) - len(universities)}")
    print(f"SQL generado: {OUTPUT}")

    print("\nPrimeras universidades:")
    for university in universities[:5]:
        print(
            university["official_code"],
            "|",
            university["name"],
        )

    print("\nÚltimas universidades:")
    for university in universities[-5:]:
        print(
            university["official_code"],
            "|",
            university["name"],
        )

    print("\nLa base de datos NO ha sido modificada.")


if __name__ == "__main__":
    main()
