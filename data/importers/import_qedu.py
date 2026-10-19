#!/usr/bin/env python3

"""Prepara una carga QEDU reproducible en las tablas de staging."""

import csv
import hashlib
import io
import json
from pathlib import Path

INPUT = Path("data/raw/qedu/qedu.csv")
OUTPUT = Path("/tmp/aaahoraque-qedu-import.sql")

SOURCE = "QEDU_GRADO_CSV"
SOURCE_URL = "https://www.ciencia.gob.es/qedu"

EXPECTED_COLUMNS = [
    "Nivel de estudios",
    "Comunidad Autónoma",
    "Tipo de universidad",
    "Universidad",
    "Modalidad",
    "Tipo de centro",
    "Provincia",
    "Centro",
    "Titulación",
    "Idioma extranjero",
    "Nota de corte",
]


def sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    raw = INPUT.read_bytes()
    file_hash = hashlib.sha256(raw).hexdigest()

    with INPUT.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        if reader.fieldnames != EXPECTED_COLUMNS:
            raise ValueError(
                "La estructura del CSV no coincide con la inspeccionada.\n"
                f"Columnas encontradas: {reader.fieldnames}"
            )

        rows = list(reader)

    if len(rows) != 3962:
        raise ValueError(
            f"Se esperaban 3962 registros y se encontraron {len(rows)}. "
            "Revisar la descarga antes de continuar."
        )

    for number, row in enumerate(rows, start=2):
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f"Registro CSV mal formado: línea {number}")

    if any(row["Nivel de estudios"].strip() != "GRADO" for row in rows):
        raise ValueError("El fichero contiene niveles distintos de GRADO.")

    # Generamos datos para PostgreSQL COPY en formato CSV.
    # Los valores originales se conservan dentro de JSONB.
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")

    for row_number, row in enumerate(rows, start=1):
        writer.writerow([
            row_number,
            json.dumps(row, ensure_ascii=False),
        ])

    copy_data = buffer.getvalue()

    sql = f"""\\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE qedu_stage (
    row_number integer NOT NULL,
    raw_data jsonb NOT NULL
) ON COMMIT DROP;

COPY qedu_stage (row_number, raw_data)
FROM STDIN
WITH (FORMAT csv);
{copy_data}\\.

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM qedu_stage) <> {len(rows)} THEN
        RAISE EXCEPTION 'Cantidad de registros QEDU incorrecta';
    END IF;

    IF EXISTS (
        SELECT row_number
        FROM qedu_stage
        GROUP BY row_number
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Numeración de registros duplicada';
    END IF;
END
$$;

INSERT INTO catalog_import_batches (
    source,
    file_name,
    file_sha256,
    source_url,
    reference_academic_year,
    row_count
)
VALUES (
    {sql_string(SOURCE)},
    {sql_string(INPUT.name)},
    {sql_string(file_hash)},
    {sql_string(SOURCE_URL)},
    NULL,
    {len(rows)}
)
ON CONFLICT (source, file_sha256) DO NOTHING;

INSERT INTO catalog_import_rows (
    batch_id,
    row_number,
    raw_data
)
SELECT
    b.id,
    s.row_number,
    s.raw_data
FROM qedu_stage AS s
JOIN catalog_import_batches AS b
    ON b.source = {sql_string(SOURCE)}
   AND b.file_sha256 = {sql_string(file_hash)}
ON CONFLICT (batch_id, row_number) DO NOTHING;

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM catalog_import_rows AS r
        JOIN catalog_import_batches AS b ON b.id = r.batch_id
        WHERE b.source = {sql_string(SOURCE)}
          AND b.file_sha256 = {sql_string(file_hash)}
    ) <> {len(rows)} THEN
        RAISE EXCEPTION 'La carga QEDU no está completa';
    END IF;
END
$$;

COMMIT;

SELECT
    b.id,
    b.source,
    b.row_count,
    COUNT(r.id) AS loaded_rows,
    b.reference_academic_year
FROM catalog_import_batches AS b
LEFT JOIN catalog_import_rows AS r ON r.batch_id = b.id
WHERE b.source = {sql_string(SOURCE)}
  AND b.file_sha256 = {sql_string(file_hash)}
GROUP BY
    b.id,
    b.source,
    b.row_count,
    b.reference_academic_year;
"""

    OUTPUT.write_text(sql, encoding="utf-8")

    print("QEDU — PREPARACIÓN COMPLETADA")
    print("Archivo:", INPUT)
    print("Registros:", len(rows))
    print("SHA-256:", file_hash)
    print("SQL generado:", OUTPUT)
    print("Curso académico de referencia: desconocido")
    print()
    print("PostgreSQL todavía NO se ha modificado.")


if __name__ == "__main__":
    main()
