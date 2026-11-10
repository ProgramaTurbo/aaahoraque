-- Ejecutar solo cuando dss_demo_716_v2 exista.
-- Es de SOLO LECTURA. Requiere PGOPTIONS='-c default_transaction_read_only=on'.
BEGIN TRANSACTION READ ONLY;
\echo ===== 01 - DATOS V1 Y V2: CONTROL DE CONSERVACIÓN =====
SELECT 'V1' AS version, (SELECT COUNT(*) FROM dss_demo_716.students) AS estudiantes,
       (SELECT COUNT(*) FROM dss_demo_716.results) AS resultados
UNION ALL
SELECT 'V2', (SELECT COUNT(*) FROM dss_demo_716_v2.students),
             (SELECT COUNT(*) FROM dss_demo_716_v2.results);

\echo ===== 02 - DISTRIBUCIÓN V2 POR MENCION =====
SELECT m.code, m.name, COUNT(s.student_code) AS estudiantes_sinteticos
FROM dss_demo_716_v2.mentions m
LEFT JOIN dss_demo_716_v2.students s ON s.mention_code=m.code
GROUP BY m.code, m.name ORDER BY estudiantes_sinteticos DESC;

\echo ===== 03 - SERIE ANUAL SIMULADA PARA EL DASHBOARD =====
SELECT s.mention_choice_academic_course AS curso_eleccion_simulado,
       m.name AS mencion,
       COUNT(*) AS estudiantes_sinteticos
FROM dss_demo_716_v2.students s
JOIN dss_demo_716_v2.mentions m ON m.code=s.mention_code
WHERE s.profile_kind='historical_simulation'
GROUP BY s.mention_choice_academic_course, m.name
ORDER BY curso_eleccion_simulado, mencion;

\echo ===== 04 - CREDITOS OPTATIVOS POR ESTUDIANTE (SIN EXIGIR APROBADO) =====
WITH x AS (
SELECT st.student_code,
       SUM(CASE WHEN s.subject_type='optional' AND ms.subject_id IS NOT NULL THEN s.ects ELSE 0 END) AS ects_mencion,
       SUM(CASE WHEN s.subject_type='optional' AND ms.subject_id IS NULL THEN s.ects ELSE 0 END) AS ects_libres
FROM dss_demo_716_v2.students st
JOIN dss_demo_716_v2.results r ON r.student_code=st.student_code
JOIN public.subjects s ON s.id=r.subject_id
LEFT JOIN dss_demo_716_v2.mention_subjects ms ON ms.subject_id=s.id AND ms.mention_code=st.mention_code
WHERE st.profile_kind='historical_simulation'
GROUP BY st.student_code
)
SELECT COUNT(*) AS estudiantes,
       MIN(ects_mencion) AS min_ects_mencion, MAX(ects_mencion) AS max_ects_mencion,
       MIN(ects_libres) AS min_ects_libres, MAX(ects_libres) AS max_ects_libres,
       COUNT(*) FILTER (WHERE ects_mencion<>48 OR ects_libres<>18) AS expedientes_incoherentes
FROM x;

\echo ===== 05 - DEMO Y ASIGNATURAS NO OFERTADAS =====
SELECT s.academic_year, COUNT(*) AS asignaturas_aprobadas, SUM(s.ects) AS ects_aprobados
FROM dss_demo_716_v2.results r
JOIN public.subjects s ON s.id=r.subject_id
WHERE r.student_code='DEMO716-ESTUDIANTE' AND r.state='passed'
GROUP BY s.academic_year ORDER BY s.academic_year;
SELECT s.official_code, COUNT(*) AS resultados_erroneos
FROM dss_demo_716_v2.results r
JOIN public.subjects s ON s.id=r.subject_id
WHERE s.official_code IN ('30260','30286')
GROUP BY s.official_code;
ROLLBACK;
