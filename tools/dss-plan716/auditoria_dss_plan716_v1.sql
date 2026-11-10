-- AAAhoraQue | Auditoría del DSS de optativas · UNIZAR EINA · plan 716
-- Solo lectura. No modifica dss_demo_716 ni public.
-- Fuente académica: https://estudios.unizar.es/estudio/asignaturas?anyo_academico=2026&centro_id=110&estudio_id=20260148&plan_id_nk=716
\pset pager off
\set ON_ERROR_STOP on
BEGIN TRANSACTION READ ONLY;

\echo '\n===== 01 · IDENTIDAD Y COBERTURA DEL PLAN ====='
SELECT p.id, p.official_code, p.name, p.status, p.total_ects,
       COUNT(s.id) AS asignaturas,
       COUNT(s.id) FILTER (WHERE s.subject_type='optional') AS optativas,
       COUNT(s.id) FILTER (WHERE s.academic_year IS NULL) AS sin_curso,
       COUNT(s.id) FILTER (WHERE s.semester IS NULL) AS sin_semestre
FROM public.study_plans p
LEFT JOIN public.subjects s ON s.study_plan_id=p.id
WHERE p.id='fed26b74-ed7e-58e6-bf1a-9da2d1413862'::uuid
  AND p.official_code='716' AND p.status='official'
GROUP BY p.id;

\echo '\n===== 02 · ASIGNATURAS SIN CURSO Y ESTADO DE LAS DOS NO OFERTADAS ====='
SELECT s.official_code, s.name, s.academic_year, s.semester,
       s.subject_type, s.ects,
       s.metadata->>'offer_status' AS meta_offer_status,
       s.metadata->'availability_statuses' AS estados_disponibilidad,
       LEFT(s.metadata::text, 650) AS fragmento_metadata
FROM public.subjects s
WHERE s.study_plan_id='fed26b74-ed7e-58e6-bf1a-9da2d1413862'::uuid
  AND (s.academic_year IS NULL OR s.official_code IN ('30260','30286'))
ORDER BY s.official_code;

\echo '\n===== 03 · POBLACION SINTETICA Y CONTROLES DE INTEGRIDAD ====='
SELECT
 (SELECT COUNT(*) FROM dss_demo_716.students) AS estudiantes,
 (SELECT COUNT(*) FROM dss_demo_716.students WHERE is_featured_demo) AS perfiles_demo,
 (SELECT COUNT(*) FROM dss_demo_716.results) AS resultados,
 (SELECT COUNT(*) FROM dss_demo_716.official_grade_aggregates) AS agregados_oficiales,
 (SELECT COUNT(*) FROM dss_demo_716.mentions) AS menciones,
 (SELECT COUNT(*) FROM dss_demo_716.mention_subjects) AS relaciones_mencion;

SELECT
 COUNT(*) FILTER (WHERE r.provenance <> 'synthetic_demo') AS resultados_sin_etiqueta_sintetica,
 COUNT(*) FILTER (WHERE d.plan_id <> s.study_plan_id) AS resultados_ajenos_al_plan,
 COUNT(*) FILTER (WHERE r.course_taken IS DISTINCT FROM s.academic_year) AS curso_no_coincide_con_plan,
 COUNT(*) FILTER (WHERE r.state='passed' AND (r.grade IS NULL OR r.grade<5)) AS aprobados_incoherentes,
 COUNT(*) FILTER (WHERE r.state='failed' AND (r.grade IS NULL OR r.grade>=5)) AS suspensos_incoherentes,
 COUNT(*) FILTER (WHERE r.state='not_presented' AND r.grade IS NOT NULL) AS no_presentados_con_nota,
 COUNT(*) FILTER (WHERE r.academic_course IS DISTINCT FROM
       CONCAT(d.entry_academic_year+r.course_taken-1, '-', d.entry_academic_year+r.course_taken)) AS curso_historico_incoherente
FROM dss_demo_716.results r
JOIN dss_demo_716.students d ON d.student_code=r.student_code
JOIN public.subjects s ON s.id=r.subject_id;

\echo '\n===== 04 · EXPEDIENTE DEL ESTUDIANTE DEMO ====='
SELECT d.student_code,d.current_course,d.mention_code,
       s.academic_year AS curso,
       COUNT(*) AS resultados,
       COUNT(*) FILTER(WHERE r.state='passed') AS aprobadas,
       SUM(s.ects) FILTER (WHERE r.state='passed') AS ects_aprobados,
       ROUND(AVG(r.grade) FILTER (WHERE r.state='passed'),2) AS nota_media_simple
FROM dss_demo_716.students d
JOIN dss_demo_716.results r ON r.student_code=d.student_code
JOIN public.subjects s ON s.id=r.subject_id
WHERE d.is_featured_demo
GROUP BY d.student_code,d.current_course,d.mention_code,s.academic_year
ORDER BY s.academic_year NULLS LAST;

\echo '\n===== 05 · DISTRIBUCION DE RESULTADOS Y COBERTURA DE ENCUESTAS ====='
SELECT r.state,COUNT(*) AS n,
       ROUND(100.0*COUNT(*)/SUM(COUNT(*)) OVER (),2) AS porcentaje,
       ROUND(AVG(r.grade),2) AS nota_media,
       ROUND(AVG(r.weekly_hours),2) AS horas_medias
FROM dss_demo_716.results r
GROUP BY r.state
ORDER BY r.state;

SELECT
 COUNT(*) FILTER(WHERE s.subject_type='optional') AS resultados_optativas,
 COUNT(*) FILTER(WHERE s.subject_type='optional' AND r.perceived_difficulty IS NOT NULL) AS respuestas_dificultad,
 COUNT(*) FILTER(WHERE s.subject_type='optional' AND r.satisfaction IS NOT NULL) AS respuestas_satisfaccion,
 COUNT(*) FILTER(WHERE s.subject_type='optional' AND r.choose_again IS NOT NULL) AS respuestas_repeticion,
 COUNT(*) FILTER(WHERE s.subject_type='optional' AND r.election_reason IS NOT NULL) AS respuestas_motivo,
 ROUND(CORR(r.perceived_difficulty::double precision,r.weekly_hours::double precision)::numeric,3) AS correlacion_dificultad_horas_respondentes
FROM dss_demo_716.results r
JOIN public.subjects s ON s.id=r.subject_id;

\echo '\n===== 06 · ANOS DE ENTRADA SIMULADOS (NO COHORTES REALES) ====='
SELECT d.entry_academic_year AS anio_entrada_ficticio,COUNT(*) AS estudiantes
FROM dss_demo_716.students d
WHERE NOT d.is_featured_demo
GROUP BY d.entry_academic_year
ORDER BY d.entry_academic_year;

\echo '\n===== 07 · COBERTURA DE MENCIONES (NO EQUIVALE A REGLAS DE MATRICULA) ====='
SELECT m.code,m.name,
       COUNT(DISTINCT ms.subject_id) AS asignaturas_listadas,
       COALESCE(SUM(s.ects),0) AS ects_listados,
       COUNT(DISTINCT d.student_code) AS estudiantes_sinteticos_asignados
FROM dss_demo_716.mentions m
LEFT JOIN dss_demo_716.mention_subjects ms ON ms.mention_code=m.code
LEFT JOIN public.subjects s ON s.id=ms.subject_id
LEFT JOIN dss_demo_716.students d ON d.mention_code=m.code
GROUP BY m.code,m.name
ORDER BY m.name;

\echo '\n===== 08 · OPTATIVAS NO OFERTADAS: ¿APARECEN EN RESULTADOS SINTETICOS? ====='
SELECT s.official_code,s.name,
       COUNT(r.student_code) AS registros_sinteticos,
       COUNT(*) FILTER(WHERE r.state='passed') AS aprobados_sinteticos,
       COUNT(a.subject_id) AS registros_agregados_oficiales_2024_25
FROM public.subjects s
LEFT JOIN dss_demo_716.results r ON r.subject_id=s.id
LEFT JOIN dss_demo_716.official_grade_aggregates a ON a.subject_id=s.id
WHERE s.study_plan_id='fed26b74-ed7e-58e6-bf1a-9da2d1413862'::uuid
  AND s.official_code IN ('30260','30286')
GROUP BY s.official_code,s.name
ORDER BY s.official_code;

\echo '\n===== 09 · COBERTURA POR ASIGNATURA OPTATIVA ====='
SELECT s.official_code,s.name,COUNT(r.student_code) AS observaciones_simuladas,
       COUNT(r.student_code) FILTER(WHERE r.state='passed') AS aprobados_simulados,
       ROUND(AVG(r.grade),2) AS nota_media_simulada,
       ROUND(AVG(r.weekly_hours),2) AS horas_semana_simuladas,
       COUNT(r.student_code) FILTER(WHERE r.satisfaction IS NOT NULL) AS encuestas_simuladas,
       CASE WHEN a.subject_id IS NULL THEN 'sin agregado real' ELSE 'agregado 2024-25' END AS respaldo_historico_oficial
FROM public.subjects s
LEFT JOIN dss_demo_716.results r ON r.subject_id=s.id
LEFT JOIN dss_demo_716.official_grade_aggregates a ON a.subject_id=s.id
WHERE s.study_plan_id='fed26b74-ed7e-58e6-bf1a-9da2d1413862'::uuid
  AND s.subject_type='optional'
GROUP BY s.official_code,s.name,a.subject_id
ORDER BY observaciones_simuladas ASC,s.official_code
LIMIT 15;

\echo '\n===== 10 · MAYORES DESVIACIONES: SIMULADOS FRENTE A AGREGADOS OFICIALES 2024-25 ====='
WITH synthetic AS (
  SELECT r.subject_id,COUNT(*) AS n,
    100.0*COUNT(*) FILTER(WHERE r.state='passed') / NULLIF(COUNT(*),0) AS pct_aprobados
  FROM dss_demo_716.results r
  GROUP BY r.subject_id
), official AS (
  SELECT a.subject_id,
    a.not_presented+a.failed+a.pass+a.merit+a.distinction+a.honours AS n,
    100.0*(a.pass+a.merit+a.distinction+a.honours) /
    NULLIF(a.not_presented+a.failed+a.pass+a.merit+a.distinction+a.honours,0) AS pct_aprobados
  FROM dss_demo_716.official_grade_aggregates a
)
SELECT s.official_code,s.name,o.n AS n_real_2024_25,y.n AS n_simulado,
  ROUND(o.pct_aprobados,1) AS aprobado_real_pct,
  ROUND(y.pct_aprobados,1) AS aprobado_simulado_pct,
  ROUND(y.pct_aprobados-o.pct_aprobados,1) AS diferencia_puntos
FROM official o
JOIN synthetic y ON y.subject_id=o.subject_id
JOIN public.subjects s ON s.id=o.subject_id
WHERE o.n>0
ORDER BY ABS(y.pct_aprobados-o.pct_aprobados) DESC,s.official_code
LIMIT 15;

ROLLBACK;
