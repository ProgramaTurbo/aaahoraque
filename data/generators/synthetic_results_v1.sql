\set ON_ERROR_STOP on
\timing on

BEGIN;

SELECT pg_advisory_xact_lock(4019, 2029);

-- Comprobación de las condiciones de partida.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM study_plans
        WHERE status = 'synthetic'
          AND official_code = 'SYN-CATALOG-2026-V1') <> 3933
    THEN
        RAISE EXCEPTION 'No están disponibles los 3933 planes sintéticos';
    END IF;

    IF (SELECT COUNT(*) FROM subjects s
        JOIN study_plans p ON p.id = s.study_plan_id
        WHERE p.official_code = 'SYN-CATALOG-2026-V1') <> 188784
    THEN
        RAISE EXCEPTION 'El catálogo sintético de asignaturas está incompleto';
    END IF;
END $$;

-- 25.000 estudiantes distribuidos entre los 3.933 planes.
WITH plans AS (
    SELECT
        id,
        row_number() OVER (ORDER BY id) AS rn
    FROM study_plans
    WHERE status = 'synthetic'
      AND official_code = 'SYN-CATALOG-2026-V1'
)
INSERT INTO synthetic_students (
    id,
    study_plan_id,
    synthetic_code,
    admission_year,
    generator_version
)
SELECT
    md5('AAAHQ:STUDENT:V1:' || n::text)::uuid,
    p.id,
    'SYN-STU-V1-' || lpad(n::text, 6, '0'),
    2022 + (n % 2),
    'synthetic_results_v1'
FROM generate_series(1, 25000) AS g(n)
JOIN plans p
  ON p.rn = ((g.n - 1) % 3933) + 1
ON CONFLICT (id) DO NOTHING;

-- Un resultado consolidado por estudiante y asignatura.
-- Seleccionamos las 30 comunes y 10 de las 18 optativas.
WITH selected AS (
    SELECT
        st.id AS student_id,
        st.admission_year,
        st.synthetic_code,
        s.id AS subject_id,
        s.academic_year AS course_year,
        substring(s.official_code FROM 6)::integer AS subject_number,
        split_part(st.synthetic_code, '-', 4)::integer AS student_number
    FROM synthetic_students st
    JOIN study_plans p
      ON p.id = st.study_plan_id
    JOIN subjects s
      ON s.study_plan_id = p.id
    WHERE st.generator_version = 'synthetic_results_v1'
      AND p.status = 'synthetic'
      AND p.official_code = 'SYN-CATALOG-2026-V1'
      AND (
          s.subject_type = 'mandatory'
          OR (
              s.subject_type = 'optional'
              AND (
                  (
                    substring(s.official_code FROM 6)::integer - 31
                    + split_part(st.synthetic_code, '-', 4)::integer % 18
                  ) % 18
              ) < 10
          )
      )
),
grades AS (
    SELECT
        *,
        GREATEST(
            0,
            LEAST(
                1000,
                (
                    (
                        ('x' || substr(
                            md5(student_id::text || ':' || subject_id::text),
                            1, 8
                        ))::bit(32)::bigint
                    ) % 1001
                )::integer
                + ((student_number % 5) - 2) * 35
                - (subject_number % 7) * 12
            )
        ) AS grade_hundredths
    FROM selected
)
INSERT INTO synthetic_academic_results (
    id,
    student_id,
    subject_id,
    academic_year,
    attempt,
    grade,
    passed,
    generator_version
)
SELECT
    md5(
        'AAAHQ:RESULT:V1:' ||
        student_id::text || ':' || subject_id::text
    )::uuid,

    student_id,
    subject_id,

    (admission_year + course_year - 1)::text
       || '/'
       || right((admission_year + course_year)::text, 2),

    1 + ((student_number * 7 + subject_number) % 3),

    (grade_hundredths / 100.0)::numeric(4,2),

    grade_hundredths >= 500,

    'synthetic_results_v1'
FROM grades
ON CONFLICT (id) DO NOTHING;

-- Validación transaccional: si algo falla, no confirmamos.
DO $$
DECLARE
    n_students bigint;
    n_results bigint;
    n_invalid bigint;
BEGIN
    SELECT COUNT(*) INTO n_students
    FROM synthetic_students
    WHERE generator_version = 'synthetic_results_v1';

    SELECT COUNT(*) INTO n_results
    FROM synthetic_academic_results
    WHERE generator_version = 'synthetic_results_v1';

    SELECT COUNT(*) INTO n_invalid
    FROM (
        SELECT st.id
        FROM synthetic_students st
        LEFT JOIN synthetic_academic_results r
          ON r.student_id = st.id
        LEFT JOIN subjects s
          ON s.id = r.subject_id
        WHERE st.generator_version = 'synthetic_results_v1'
        GROUP BY st.id
        HAVING COUNT(r.id) <> 40
            OR COUNT(r.id) FILTER (
                WHERE s.study_plan_id IS DISTINCT FROM st.study_plan_id
            ) <> 0
            OR COUNT(r.id) FILTER (
                WHERE (r.grade >= 5) IS DISTINCT FROM r.passed
                   OR r.grade < 0
                   OR r.grade > 10
            ) <> 0
            OR COUNT(r.id) FILTER (
                WHERE s.subject_type = 'mandatory'
            ) <> 30
            OR COUNT(r.id) FILTER (
                WHERE s.subject_type = 'optional'
            ) <> 10
    ) invalid_students;

    IF n_students <> 25000
       OR n_results <> 1000000
       OR n_invalid <> 0
    THEN
        RAISE EXCEPTION
            'Validación incorrecta: estudiantes %, resultados %, expedientes erróneos %',
            n_students, n_results, n_invalid;
    END IF;

    RAISE NOTICE
        'VALIDADO: % estudiantes, % resultados, % expedientes incorrectos',
        n_students, n_results, n_invalid;
END $$;

COMMIT;

SELECT
    (SELECT COUNT(*) FROM synthetic_students) AS estudiantes,
    (SELECT COUNT(*) FROM synthetic_academic_results) AS resultados,
    pg_size_pretty(
        pg_database_size(current_database())
    ) AS tamano_base;
