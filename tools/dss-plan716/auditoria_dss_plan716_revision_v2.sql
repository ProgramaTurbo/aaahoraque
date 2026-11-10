-- AAAhoraQue · Plan 716 · Segunda pasada de auditoría focalizada
-- Exclusivamente lectura: no crea ni modifica datos.
-- Objetivo: corregir el cómputo ECTS por mención, identificar códigos
-- ausentes y delimitar el alcance real del conjunto sintético.
\pset pager off
\set ON_ERROR_STOP on
BEGIN TRANSACTION READ ONLY;

\echo '\n===== 01 · MENCIONES: ECTS REALES SIN MULTIPLICAR POR ALUMNOS ====='
WITH oferta AS (
    SELECT m.code, m.name,
           COUNT(DISTINCT ms.subject_id) AS asignaturas,
           COALESCE(SUM(s.ects), 0) AS ects_oferta
    FROM dss_demo_716.mentions m
    LEFT JOIN dss_demo_716.mention_subjects ms ON ms.mention_code = m.code
    LEFT JOIN public.subjects s ON s.id = ms.subject_id
    GROUP BY m.code, m.name
), poblacion AS (
    SELECT mention_code AS code, COUNT(*) AS estudiantes
    FROM dss_demo_716.students
    WHERE NOT is_featured_demo
    GROUP BY mention_code
)
SELECT o.code, o.name, o.asignaturas, o.ects_oferta,
       COALESCE(p.estudiantes, 0) AS estudiantes_simulados
FROM oferta o LEFT JOIN poblacion p USING (code)
ORDER BY o.name;

\echo '\n===== 02 · CÓDIGOS CRÍTICOS DEL CATÁLOGO Y SUS OCURRENCIAS ====='
WITH codigos(code) AS (
    VALUES ('30260'), ('30286'), ('30290'), ('30291'),
           ('30275'), ('30276'), ('30279')
)
SELECT c.code, COALESCE(s.name, '[NO IMPORTADA]') AS asignatura,
       s.academic_year, s.semester, s.subject_type,
       COALESCE((SELECT STRING_AGG(DISTINCT occ.item->>'offer_status', ', ')
                 FROM jsonb_array_elements(CASE
                     WHEN jsonb_typeof(s.metadata->'occurrences') = 'array'
                     THEN s.metadata->'occurrences'
                     ELSE '[]'::jsonb END) AS occ(item)), '[sin estado]') AS estados_fuente,
       COALESCE((SELECT STRING_AGG(DISTINCT occ.item->>'academic_year', ', ')
                 FROM jsonb_array_elements(CASE
                     WHEN jsonb_typeof(s.metadata->'occurrences') = 'array'
                     THEN s.metadata->'occurrences'
                     ELSE '[]'::jsonb END) AS occ(item)), '[sin curso]') AS cursos_fuente,
       COALESCE((SELECT COUNT(*)
                 FROM dss_demo_716.results r WHERE r.subject_id = s.id), 0) AS resultados_simulados
FROM codigos c
LEFT JOIN public.subjects s
  ON s.official_code = c.code
 AND s.study_plan_id = 'fed26b74-ed7e-58e6-bf1a-9da2d1413862'::uuid
ORDER BY c.code;

\echo '\n===== 03 · ECTS OPTATIVOS EFECTIVAMENTE SIMULADOS POR ESTUDIANTE ====='
WITH avance AS (
    SELECT d.student_code, d.mention_code,
           COALESCE(SUM(s.ects) FILTER (WHERE s.subject_type = 'optional'), 0) AS ects_optativos,
           COUNT(*) FILTER (WHERE s.subject_type = 'optional') AS optativas_con_resultado,
           COALESCE(SUM(s.ects) FILTER (WHERE r.state = 'passed'), 0) AS ects_aprobados
    FROM dss_demo_716.students d
    JOIN dss_demo_716.results r ON r.student_code = d.student_code
    JOIN public.subjects s ON s.id = r.subject_id
    WHERE NOT d.is_featured_demo
    GROUP BY d.student_code, d.mention_code
)
SELECT m.code, m.name, COUNT(a.student_code) AS estudiantes,
       MIN(a.ects_optativos) AS min_ects_optativos,
       ROUND(AVG(a.ects_optativos), 2) AS media_ects_optativos,
       MAX(a.ects_optativos) AS max_ects_optativos,
       ROUND(AVG(a.optativas_con_resultado), 2) AS media_optativas_con_resultado,
       ROUND(AVG(a.ects_aprobados), 2) AS media_ects_aprobados
FROM dss_demo_716.mentions m
JOIN avance a ON a.mention_code = m.code
GROUP BY m.code, m.name
ORDER BY m.name;

\echo '\n===== 04 · DIFICULTAD DECLARADA Y HORAS: RELACIÓN ENTRE ASIGNATURAS ====='
WITH por_asignatura AS (
    SELECT s.official_code, s.name,
           COUNT(*) FILTER (WHERE r.perceived_difficulty IS NOT NULL) AS respuestas,
           AVG(r.perceived_difficulty::double precision) AS dificultad_media,
           AVG(r.weekly_hours::double precision) FILTER (WHERE r.perceived_difficulty IS NOT NULL) AS horas_medias_respondentes
    FROM public.subjects s
    JOIN dss_demo_716.results r ON r.subject_id = s.id
    WHERE s.study_plan_id = 'fed26b74-ed7e-58e6-bf1a-9da2d1413862'::uuid
      AND s.subject_type = 'optional'
    GROUP BY s.official_code, s.name
)
SELECT official_code, name, respuestas,
       ROUND(dificultad_media::numeric, 2) AS dificultad_media_sintetica,
       ROUND(horas_medias_respondentes::numeric, 2) AS horas_medias_sinteticas
FROM por_asignatura
WHERE respuestas > 0
ORDER BY dificultad_media DESC, respuestas DESC
LIMIT 12;

\echo '\n===== 05 · CORRELACIÓN ENTRE MEDIAS POR ASIGNATURA ====='
WITH por_asignatura AS (
    SELECT s.id,
           AVG(r.perceived_difficulty::double precision) AS dificultad,
           AVG(r.weekly_hours::double precision) FILTER (WHERE r.perceived_difficulty IS NOT NULL) AS horas
    FROM public.subjects s
    JOIN dss_demo_716.results r ON r.subject_id = s.id
    WHERE s.study_plan_id = 'fed26b74-ed7e-58e6-bf1a-9da2d1413862'::uuid
      AND s.subject_type = 'optional'
    GROUP BY s.id
)
SELECT COUNT(*) FILTER (WHERE dificultad IS NOT NULL) AS asignaturas_con_encuesta,
       ROUND(CORR(dificultad, horas)::numeric, 3) AS correlacion_medias
FROM por_asignatura;

\echo '\n===== 06 · OFERTA OPTATIVA SIN REGISTROS SIMULADOS ====='
SELECT s.official_code, s.name, s.academic_year, s.semester,
       s.ects,
       COUNT(r.student_code) AS resultados,
       COUNT(a.subject_id) AS agregados_reales_2024_25
FROM public.subjects s
LEFT JOIN dss_demo_716.results r ON r.subject_id = s.id
LEFT JOIN dss_demo_716.official_grade_aggregates a ON a.subject_id = s.id
WHERE s.study_plan_id = 'fed26b74-ed7e-58e6-bf1a-9da2d1413862'::uuid
  AND s.subject_type = 'optional'
GROUP BY s.id, a.subject_id
HAVING COUNT(r.student_code) = 0
ORDER BY s.official_code;

ROLLBACK;
