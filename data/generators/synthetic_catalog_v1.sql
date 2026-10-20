\set ON_ERROR_STOP on
\timing on

BEGIN;

SELECT pg_advisory_xact_lock(4019, 2028);

-- Seguridad: exigimos el catálogo QEDU completo.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM qedu_offering_mappings) <> 3933 THEN
        RAISE EXCEPTION 'El catálogo QEDU no contiene 3933 ofertas';
    END IF;
END $$;

-- Un plan sintético por oferta QEDU.
-- Identificadores reproducibles: la misma ejecución genera los mismos UUID.
INSERT INTO study_plans (
    id,
    degree_offering_id,
    official_code,
    name,
    implementation_year,
    total_ects,
    status
)
SELECT
    md5(
        'AAAHQ:SYN:PLAN:V1:' || q.degree_offering_id::text
    )::uuid,
    q.degree_offering_id,
    'SYN-CATALOG-2026-V1',
    'Plan académico sintético de referencia V1',
    2026,
    240,
    'synthetic'
FROM qedu_offering_mappings q
ON CONFLICT (id) DO NOTHING;

-- 48 asignaturas disponibles por plan:
-- 30 comunes (180 ECTS) y 18 optativas (108 ECTS disponibles).
-- El itinerario simulado requiere escoger 10 optativas (60 ECTS).
INSERT INTO subjects (
    id,
    study_plan_id,
    official_code,
    name,
    ects,
    academic_year,
    semester,
    subject_type,
    metadata
)
SELECT
    md5(
        'AAAHQ:SYN:SUBJECT:V1:' ||
        p.id::text || ':' || n.num::text
    )::uuid,

    p.id,

    'SYN-S' || lpad(n.num::text, 2, '0'),

    CASE
        WHEN n.num <= 30 THEN
            'Asignatura sintética común ' ||
            lpad(n.num::text, 2, '0')
        ELSE
            'Optativa sintética ' ||
            lpad((n.num - 30)::text, 2, '0')
    END,

    6,

    CASE
        WHEN n.num <= 30 THEN ((n.num - 1) / 10) + 1
        ELSE 4
    END,

    CASE
        WHEN n.num <= 30 THEN
            CASE WHEN ((n.num - 1) % 10) < 5
                THEN '1' ELSE '2'
            END
        ELSE
            CASE WHEN ((n.num - 31) % 2) = 0
                THEN '1' ELSE '2'
            END
    END,

    CASE
        WHEN n.num <= 30 THEN 'mandatory'
        ELSE 'optional'
    END,

    jsonb_build_object(
        'data_type', 'synthetic',
        'generator', 'synthetic_catalog_v1',
        'version', 1,
        'credits_required_from_optional_pool', 60,
        'credits_per_subject', 6
    )

FROM study_plans p
CROSS JOIN generate_series(1, 48) AS n(num)

WHERE
    p.status = 'synthetic'
    AND p.official_code = 'SYN-CATALOG-2026-V1'

ON CONFLICT (id) DO NOTHING;

-- Validación obligatoria antes del COMMIT.
DO $$
DECLARE
    plan_count bigint;
    subject_count bigint;
    invalid_plans bigint;
BEGIN
    SELECT COUNT(*)
    INTO plan_count
    FROM study_plans
    WHERE status = 'synthetic'
      AND official_code = 'SYN-CATALOG-2026-V1';

    SELECT COUNT(*)
    INTO subject_count
    FROM subjects s
    JOIN study_plans p ON p.id = s.study_plan_id
    WHERE p.status = 'synthetic'
      AND p.official_code = 'SYN-CATALOG-2026-V1';

    SELECT COUNT(*)
    INTO invalid_plans
    FROM (
        SELECT p.id
        FROM study_plans p
        LEFT JOIN subjects s ON s.study_plan_id = p.id
        WHERE p.status = 'synthetic'
          AND p.official_code = 'SYN-CATALOG-2026-V1'
        GROUP BY p.id
        HAVING COUNT(s.id) <> 48
            OR COUNT(s.id) FILTER (
                WHERE s.subject_type = 'mandatory'
            ) <> 30
            OR COUNT(s.id) FILTER (
                WHERE s.subject_type = 'optional'
            ) <> 18
    ) validation;

    IF plan_count <> 3933
       OR subject_count <> 188784
       OR invalid_plans <> 0
    THEN
        RAISE EXCEPTION
            'Validación fallida: planes %, asignaturas %, planes incorrectos %',
            plan_count, subject_count, invalid_plans;
    END IF;

    RAISE NOTICE
        'Carga validada: % planes y % asignaturas',
        plan_count, subject_count;
END $$;

COMMIT;

-- Resumen final.
SELECT
    (SELECT COUNT(*) FROM study_plans) AS planes_totales,
    (SELECT COUNT(*) FROM subjects) AS asignaturas_totales,
    (SELECT COUNT(*) FROM study_plans
     WHERE status = 'synthetic') AS planes_sinteticos,
    (SELECT COUNT(*) FROM subjects s
     JOIN study_plans p ON p.id = s.study_plan_id
     WHERE p.status = 'synthetic') AS asignaturas_sinteticas;
