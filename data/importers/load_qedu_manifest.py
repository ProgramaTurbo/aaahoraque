#!/usr/bin/env python3

"""Prepara la carga transaccional del manifiesto QEDU."""

import hashlib
import json
from pathlib import Path

MANIFEST = Path("/tmp/aaahoraque-qedu-manifest.json")
CSV = Path("data/raw/qedu/qedu.csv")
OUTPUT = Path("/tmp/aaahoraque-qedu-normalized.sql")


def quote(value):
    return "'" + value.replace("'", "''") + "'"


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    actual_hash = hashlib.sha256(CSV.read_bytes()).hexdigest()

    assert manifest["source"] == "QEDU_GRADO_CSV"
    assert manifest["fileSha256"] == actual_hash
    assert manifest["rowCount"] == 3962
    assert len(manifest["universities"]) == 5
    assert len(manifest["universityMappings"]) == 94
    assert len(manifest["centers"]) == 1119
    assert len(manifest["degrees"]) == 887
    assert len(manifest["offerings"]) == 3933
    assert len(manifest["rowLinks"]) == 3962

    assert sorted(
        item["rowNumber"] for item in manifest["rowLinks"]
    ) == list(range(1, 3963))

    # Evitar errores por límites del esquema existente.
    for item in manifest["universities"]:
        assert len(item["name"]) <= 255
        assert len(item["officialCode"]) <= 100

    for item in manifest["centers"]:
        assert len(item["name"]) <= 255
        assert len(item["province"]) <= 150

    for item in manifest["degrees"]:
        assert len(item["name"]) <= 255

    for item in manifest["offerings"]:
        assert len(item["modality"]) <= 50
        assert len(item["officialReference"]) <= 150

    payload = quote(json.dumps(manifest, ensure_ascii=False))

    sql = r"""
\set ON_ERROR_STOP on

BEGIN;

SELECT pg_advisory_xact_lock(4019, 2027);

CREATE TEMP TABLE q_payload (
    document jsonb NOT NULL
) ON COMMIT DROP;

INSERT INTO q_payload VALUES (__MANIFEST__);

CREATE TEMP TABLE q_new_universities ON COMMIT DROP AS
SELECT *
FROM jsonb_to_recordset(
    (SELECT document->'universities' FROM q_payload)
) AS x(
    id uuid,
    "officialCode" text,
    name text,
    "countryCode" text
);

CREATE TEMP TABLE q_university_map ON COMMIT DROP AS
SELECT *
FROM jsonb_to_recordset(
    (SELECT document->'universityMappings' FROM q_payload)
) AS x(
    "qeduName" text,
    "officialCode" text
);

CREATE TEMP TABLE q_centers ON COMMIT DROP AS
SELECT *
FROM jsonb_to_recordset(
    (SELECT document->'centers' FROM q_payload)
) AS x(
    id uuid,
    "universityCode" text,
    name text,
    province text
);

CREATE TEMP TABLE q_degrees ON COMMIT DROP AS
SELECT *
FROM jsonb_to_recordset(
    (SELECT document->'degrees' FROM q_payload)
) AS x(
    id uuid,
    name text,
    "academicLevel" text
);

CREATE TEMP TABLE q_offerings ON COMMIT DROP AS
SELECT *
FROM jsonb_to_recordset(
    (SELECT document->'offerings' FROM q_payload)
) AS x(
    id uuid,
    "centerId" uuid,
    "degreeId" uuid,
    "universityCode" text,
    modality text,
    "foreignLanguage" boolean,
    "identityHash" text,
    "officialReference" text
);

CREATE TEMP TABLE q_links ON COMMIT DROP AS
SELECT *
FROM jsonb_to_recordset(
    (SELECT document->'rowLinks' FROM q_payload)
) AS x(
    "rowNumber" integer,
    "offeringId" uuid
);

-- Validación previa: ni un solo registro del catálogo se modifica
-- hasta confirmar el lote y las identidades de origen.

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM catalog_import_batches
        WHERE source = 'QEDU_GRADO_CSV'
          AND file_sha256 = '__FILE_HASH__'
          AND row_count = 3962
    ) <> 1 THEN
        RAISE EXCEPTION 'No existe el lote QEDU esperado';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM catalog_import_rows r
        JOIN catalog_import_batches b ON b.id = r.batch_id
        WHERE b.source = 'QEDU_GRADO_CSV'
          AND b.file_sha256 = '__FILE_HASH__'
    ) <> 3962 THEN
        RAISE EXCEPTION 'Staging QEDU incompleto';
    END IF;

    IF (SELECT COUNT(*) FROM q_new_universities) <> 5
       OR (SELECT COUNT(*) FROM q_university_map) <> 94
       OR (SELECT COUNT(*) FROM q_centers) <> 1119
       OR (SELECT COUNT(*) FROM q_degrees) <> 887
       OR (SELECT COUNT(*) FROM q_offerings) <> 3933
       OR (SELECT COUNT(*) FROM q_links) <> 3962 THEN
        RAISE EXCEPTION 'Recuentos del manifiesto incorrectos';
    END IF;

    IF EXISTS (
        SELECT 1 FROM q_links
        GROUP BY "rowNumber" HAVING COUNT(*) <> 1
    ) THEN
        RAISE EXCEPTION 'Hay filas originales repetidas en los enlaces';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM q_links l
        LEFT JOIN q_offerings o ON o.id = l."offeringId"
        WHERE o.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Enlace a una oferta inexistente';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM q_new_universities n
        JOIN universities u
          ON u.official_code = n."officialCode"
        WHERE u.id <> n.id
    ) THEN
        RAISE EXCEPTION 'Conflicto con un codigo institucional existente';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM q_new_universities n
        JOIN universities u ON u.id = n.id
        WHERE u.official_code IS DISTINCT FROM n."officialCode"
    ) THEN
        RAISE EXCEPTION 'Colision de UUID institucional';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM q_offerings o
        JOIN degree_offerings d
          ON d.official_reference = o."officialReference"
        WHERE d.id <> o.id
    ) THEN
        RAISE EXCEPTION 'Conflicto de referencia de oferta';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM q_offerings o
        JOIN degree_offerings d ON d.id = o.id
        WHERE d.official_reference
              IS DISTINCT FROM o."officialReference"
    ) THEN
        RAISE EXCEPTION 'Colision de UUID de oferta';
    END IF;
END
$$;

-- 1. Instituciones nuevas: las otras 89 se reutilizan.

INSERT INTO universities (
    id, official_name, country_code, official_code, source_url
)
SELECT
    id, name, "countryCode", "officialCode",
    'https://www.ciencia.gob.es/qedu'
FROM q_new_universities
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM q_university_map m
        LEFT JOIN universities u
          ON u.official_code = m."officialCode"
        GROUP BY m."qeduName"
        HAVING COUNT(u.id) <> 1
    ) THEN
        RAISE EXCEPTION 'Universidades QEDU no resueltas de forma unica';
    END IF;
END
$$;

-- 2. Centros, diferenciando la provincia.

INSERT INTO academic_centers (
    id, university_id, official_name, province
)
SELECT
    c.id, u.id, c.name, c.province
FROM q_centers c
JOIN universities u
  ON u.official_code = c."universityCode"
ON CONFLICT (id) DO NOTHING;

-- 3. Conceptos de titulacion.

INSERT INTO degrees (id, name, academic_level)
SELECT id, name, "academicLevel"
FROM q_degrees
ON CONFLICT (id) DO NOTHING;

-- 4. Ofertas academicas.

INSERT INTO degree_offerings (
    id,
    degree_id,
    university_id,
    academic_center_id,
    modality,
    official_reference,
    source_url
)
SELECT
    o.id,
    o."degreeId",
    u.id,
    o."centerId",
    o.modality,
    o."officialReference",
    'https://www.ciencia.gob.es/qedu'
FROM q_offerings o
JOIN universities u
  ON u.official_code = o."universityCode"
ON CONFLICT (id) DO NOTHING;

-- 5. Correspondencia con el lote QEDU.

INSERT INTO qedu_offering_mappings (
    batch_id,
    degree_offering_id,
    identity_hash,
    foreign_language
)
SELECT
    b.id,
    o.id,
    o."identityHash",
    o."foreignLanguage"
FROM q_offerings o
CROSS JOIN catalog_import_batches b
WHERE b.source = 'QEDU_GRADO_CSV'
  AND b.file_sha256 = '__FILE_HASH__'
ON CONFLICT (batch_id, identity_hash) DO NOTHING;

-- 6. Enlace individual de las 3962 filas originales.

INSERT INTO qedu_offering_rows (
    mapping_id,
    import_row_id
)
SELECT
    m.id,
    r.id
FROM q_links l
JOIN q_offerings o ON o.id = l."offeringId"
JOIN catalog_import_batches b
  ON b.source = 'QEDU_GRADO_CSV'
 AND b.file_sha256 = '__FILE_HASH__'
JOIN catalog_import_rows r
  ON r.batch_id = b.id
 AND r.row_number = l."rowNumber"
JOIN qedu_offering_mappings m
  ON m.batch_id = b.id
 AND m.identity_hash = o."identityHash"
ON CONFLICT (import_row_id) DO NOTHING;

-- Comprobacion final: si algo no cuadra, abortamos toda la transaccion.

DO $$
DECLARE
    batch uuid;
BEGIN
    SELECT id INTO STRICT batch
    FROM catalog_import_batches
    WHERE source = 'QEDU_GRADO_CSV'
      AND file_sha256 = '__FILE_HASH__';

    IF (
        SELECT COUNT(*) FROM qedu_offering_mappings
        WHERE batch_id = batch
    ) <> 3933 THEN
        RAISE EXCEPTION 'Numero incorrecto de ofertas vinculadas';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM qedu_offering_rows qr
        JOIN catalog_import_rows r ON r.id = qr.import_row_id
        WHERE r.batch_id = batch
    ) <> 3962 THEN
        RAISE EXCEPTION 'No se han vinculado las 3962 filas originales';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM q_offerings o
        JOIN degree_offerings d ON d.id = o.id
        WHERE d.official_reference = o."officialReference"
    ) <> 3933 THEN
        RAISE EXCEPTION 'Catalogo de ofertas incompleto';
    END IF;
END
$$;

COMMIT;

SELECT
    (SELECT COUNT(*) FROM universities) AS universities,
    (SELECT COUNT(*) FROM academic_centers) AS centers,
    (SELECT COUNT(*) FROM degrees) AS degrees,
    (SELECT COUNT(*) FROM degree_offerings) AS offerings,
    (SELECT COUNT(*) FROM qedu_offering_mappings) AS qedu_mappings,
    (SELECT COUNT(*) FROM qedu_offering_rows) AS qedu_rows;
"""

    sql = sql.replace("__MANIFEST__", payload)
    sql = sql.replace("__FILE_HASH__", actual_hash)

    OUTPUT.write_text(sql, encoding="utf-8")

    print("SQL NORMALIZADO PREPARADO")
    print("SHA-256 QEDU:", actual_hash)
    print("Salida:", OUTPUT)
    print("Tamaño:", round(OUTPUT.stat().st_size / 1024), "KB")
    print("PostgreSQL: sin modificaciones")


if __name__ == "__main__":
    main()
