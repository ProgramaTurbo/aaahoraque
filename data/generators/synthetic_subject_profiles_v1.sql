\set ON_ERROR_STOP on
\timing on

BEGIN;

SELECT pg_advisory_xact_lock(4019, 2029);

-- Solo modificamos asignaturas pertenecientes a los planes sintéticos.
WITH profiles AS (
    SELECT
        s.id,

        (
            1.50 + (
                (
                    ('x' || substr(
                        md5('AAAHQ:DIFFICULTY:V1:' || s.id::text),
                        1, 8
                    ))::bit(32)::bigint
                ) % 301
            ) / 100.0
        )::numeric(4,2) AS difficulty,

        (
            2.00 + (
                (
                    ('x' || substr(
                        md5('AAAHQ:WORKLOAD:V1:' || s.id::text),
                        1, 8
                    ))::bit(32)::bigint
                ) % 251
            ) / 100.0
        )::numeric(4,2) AS workload

    FROM subjects s
    JOIN study_plans p ON p.id = s.study_plan_id
    WHERE p.status = 'synthetic'
      AND p.official_code = 'SYN-CATALOG-2026-V1'
)
UPDATE subjects s
SET
    estimated_difficulty = profiles.difficulty,
    estimated_workload = profiles.workload
FROM profiles
WHERE s.id = profiles.id
  AND (
      s.estimated_difficulty IS NULL
      OR s.estimated_workload IS NULL
  );

DO $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM subjects s
        JOIN study_plans p ON p.id = s.study_plan_id
        WHERE p.status = 'synthetic'
          AND p.official_code = 'SYN-CATALOG-2026-V1'
          AND s.estimated_difficulty IS NOT NULL
          AND s.estimated_workload IS NOT NULL
    ) <> 188784
    THEN
        RAISE EXCEPTION 'Perfiles académicos incompletos';
    END IF;

    RAISE NOTICE '188784 perfiles académicos disponibles';
END $$;

COMMIT;

SELECT
    COUNT(*) AS asignaturas,
    MIN(estimated_difficulty) AS dificultad_minima,
    MAX(estimated_difficulty) AS dificultad_maxima,
    ROUND(AVG(estimated_difficulty), 2) AS dificultad_media,
    ROUND(AVG(estimated_workload), 2) AS carga_media
FROM subjects s
JOIN study_plans p ON p.id = s.study_plan_id
WHERE p.status = 'synthetic'
  AND p.official_code = 'SYN-CATALOG-2026-V1';
