
-- AAAhoraQue - Catálogo académico DEMO
-- Datos sintéticos. No representan información universitaria oficial.
-- Ejecutar exclusivamente en la base local de desarrollo.

BEGIN;

INSERT INTO universities (
    id, official_name, country_code, city, official_code
) VALUES (
    '10000000-0000-4000-8000-000000000001',
    'Universidad Demo AAAhoraQue',
    'ES',
    'Ciudad Demo',
    'DEMO-UNIVERSITY'
);

INSERT INTO academic_centers (
    id, university_id, official_name, official_code
) VALUES (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Escuela Demo de Ingeniería',
    'DEMO-CENTER'
);

INSERT INTO degrees (
    id, name, academic_level, knowledge_area, description
) VALUES (
    '30000000-0000-4000-8000-000000000001',
    'Grado Demo en Ingeniería Informática',
    'bachelor',
    'engineering',
    'Titulación ficticia utilizada para validar AAAhoraQue.'
);

INSERT INTO degree_offerings (
    id, degree_id, university_id, academic_center_id,
    modality, official_reference
) VALUES (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'on_site',
    'DEMO-OFFERING'
);

INSERT INTO study_plans (
    id, degree_offering_id, official_code, name,
    implementation_year, total_ects, status
) VALUES (
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'DEMO-2026',
    'Plan de estudios de demostración 2026',
    2026,
    240,
    'demo'
);

INSERT INTO subjects (
    id, study_plan_id, official_code, name, ects,
    academic_year, semester, subject_type, metadata
) VALUES
(
    '60000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'DEMO-IA',
    'Inteligencia Artificial',
    6, 4, '1', 'optional',
    '{"data_type": "synthetic"}'::jsonb
),
(
    '60000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000001',
    'DEMO-CYBER',
    'Ciberseguridad',
    6, 4, '1', 'optional',
    '{"data_type": "synthetic"}'::jsonb
),
(
    '60000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000001',
    'DEMO-DISTRIBUTED',
    'Sistemas Distribuidos',
    6, 4, '2', 'optional',
    '{"data_type": "synthetic"}'::jsonb
);

COMMIT;

