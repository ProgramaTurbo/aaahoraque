\set ON_ERROR_STOP on
\timing on

BEGIN;

SELECT pg_advisory_xact_lock(4019, 2029);

-- Impide ejecutar rangos incorrectos o incompletos.
CREATE TEMP TABLE batch_parameters ON COMMIT DROP AS
SELECT
    (:start)::integer AS first_student,
    (:end)::integer AS last_student;

DO $$
DECLARE
    first_n integer;
    last_n integer;
BEGIN
    SELECT first_student, last_student
    INTO first_n, last_n
    FROM batch_parameters;

    IF first_n < 25001
       OR last_n > 1000000
       OR first_n > last_n
    THEN
        RAISE EXCEPTION 'Rango de estudiantes incorrecto';
    END IF;

    IF (SELECT COUNT(*) FROM study_plans
        WHERE status = 'synthetic'
          AND official_code = 'SYN-CATALOG-2026-V1') <> 3933
    THEN
        RAISE EXCEPTION 'Catálogo sintético incompleto';
    END IF;
END $$;

-- Preparamos únicamente los estudiantes del lote solicitado.
CREATE TEMP TABLE batch_students ON COMMIT DROP AS
WITH plans AS (
    SELECT
        id,
        row_number() OVER (ORDER BY id) AS rn
    FROM study_plans
    WHERE status = 'synthetic'
      AND official_code = 'SYN-CATALOG-2026-V1'
)
SELECT
    md5('AAAHQ:STUDENT:V2:' || g.n::text)::uuid AS id,
    p.id AS study_plan_id,
    'SYN-STU-V2-' || lpad(g.n::text, 7, '0') AS synthetic_code,
    2022 + (g.n % 2) AS admission_year,
    g.n AS student_number
FROM batch_parameters b
CROSS JOIN LATERAL generate_series(
    b.first_student,
    b.last_student
) AS g(n)
JOIN plans p
  ON p.rn = ((g.n - 1) % 3933) + 1;

INSERT INTO synthetic_students (
    id,
    study_plan_id,
    synthetic_code,
    admission_year,
    generator_version
)
SELECT
    id,
    study_plan_id,
    synthetic_code,
    admission_year,
    'synthetic_results_v2'
FROM batch_students
ON CONFLICT (id) DO NOTHING;

-- Las mismas reglas académicas utilizadas en V1:
-- 30 asignaturas obligatorias y 10 optativas por estudiante.
WITH selected AS (
    SELECT
        st.id AS student_id,
        st.admission_year,
        st.student_number,
        s.id AS subject_id,
        s.academic_year AS course_year,
        substring(s.official_code FROM 6)::integer AS subject_number
    FROM batch_students st
    JOIN subjects s
      ON s.study_plan_id = st.study_plan_id
    WHERE
        s.subject_type = 'mandatory'
        OR (
            s.subject_type = 'optional'
            AND (
                (
                    substring(s.official_code FROM 6)::integer - 31
                    + st.student_number % 18
                ) % 18
            ) < 10
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
        'AAAHQ:RESULT:V2:'
        || student_id::text || ':' || subject_id::text
    )::uuid,

    student_id,
    subject_id,

    (admission_year + course_year - 1)::text
        || '/'
        || right((admission_year + course_year)::text, 2),

    1 + ((student_number * 7 + subject_number) % 3),

    (grade_hundredths / 100.0)::numeric(4,2),

    grade_hundredths >= 500,

    'synthetic_results_v2'
FROM grades
ON CONFLICT (id) DO NOTHING;

-- Validación del lote antes de confirmar la transacción.
DO $$
DECLARE
    expected_students bigint;
    actual_students bigint;
    actual_results bigint;
BEGIN
    SELECT COUNT(*) INTO expected_students
    FROM batch_students;

    SELECT COUNT(*) INTO actual_students
    FROM synthetic_students st
    JOIN batch_students b ON b.id = st.id
    WHERE st.generator_version = 'synthetic_results_v2'
      AND st.study_plan_id = b.study_plan_id;

    SELECT COUNT(*) INTO actual_results
    FROM synthetic_academic_results r
    JOIN batch_students b ON b.id = r.student_id
    WHERE r.generator_version = 'synthetic_results_v2';

    IF actual_students <> expected_students
       OR actual_results <> expected_students * 40
    THEN
        RAISE EXCEPTION
            'Lote incorrecto: esperados % estudiantes / % resultados; obtenidos % / %',
            expected_students,
            expected_students * 40,
            actual_students,
            actual_results;
    END IF;

    RAISE NOTICE
        'LOTE VALIDADO: % estudiantes y % resultados',
        actual_students,
        actual_results;
END $$;

COMMIT;

SELECT
    (SELECT COUNT(*) FROM synthetic_students) AS estudiantes_totales,
    (SELECT COUNT(*) FROM synthetic_academic_results) AS resultados_totales,
    pg_size_pretty(pg_database_size(current_database())) AS tamano_base;
