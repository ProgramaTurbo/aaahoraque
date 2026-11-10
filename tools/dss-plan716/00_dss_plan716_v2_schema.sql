-- AAAhoraQue: esquema aislado para la DEMOSTRACIÓN del Plan 716.
-- No modifica ninguna tabla existente en public.
-- Ejecutar exclusivamente dentro de una transacción y tras comprobar la identidad del plan.
CREATE SCHEMA dss_demo_716_v2;

CREATE TABLE dss_demo_716_v2.mentions (
  code text PRIMARY KEY,
  name text NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE RESTRICT,
  source_url text NOT NULL,
  source_course text NOT NULL,
  provenance text NOT NULL DEFAULT 'official_unizar',
  CHECK (provenance = 'official_unizar')
);
CREATE TABLE dss_demo_716_v2.mention_subjects (
  mention_code text NOT NULL REFERENCES dss_demo_716_v2.mentions(code) ON DELETE RESTRICT,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  PRIMARY KEY(mention_code, subject_id)
);
CREATE INDEX mention_subjects_subject_idx
  ON dss_demo_716_v2.mention_subjects(subject_id);

CREATE TABLE dss_demo_716_v2.official_grade_aggregates (
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  academic_course text NOT NULL,
  source_url text NOT NULL,
  not_presented integer NOT NULL CHECK (not_presented >= 0),
  failed integer NOT NULL CHECK (failed >= 0),
  pass integer NOT NULL CHECK (pass >= 0),
  merit integer NOT NULL CHECK (merit >= 0),
  distinction integer NOT NULL CHECK (distinction >= 0),
  honours integer NOT NULL CHECK (honours >= 0),
  provenance text NOT NULL DEFAULT 'official_aggregated',
  CHECK (provenance = 'official_aggregated'),
  PRIMARY KEY(subject_id, academic_course)
);

CREATE TABLE dss_demo_716_v2.students (
  student_code text PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE RESTRICT,
  is_featured_demo boolean NOT NULL DEFAULT false,
  entry_academic_year integer NOT NULL,
  last_observed_course integer NOT NULL CHECK (last_observed_course BETWEEN 1 AND 4),
  mention_code text REFERENCES dss_demo_716_v2.mentions(code),
  mention_choice_academic_course text,
  latent_interest text NOT NULL,
  profile_kind text NOT NULL CHECK (profile_kind IN ('historical_simulation', 'featured_demo')),
  provenance text NOT NULL DEFAULT 'synthetic_demo',
  CHECK (provenance = 'synthetic_demo')
);
CREATE INDEX students_plan_idx
  ON dss_demo_716_v2.students(plan_id);

CREATE TABLE dss_demo_716_v2.results (
  student_code text NOT NULL REFERENCES dss_demo_716_v2.students(student_code) ON DELETE RESTRICT,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  academic_course text NOT NULL,
  course_taken integer NOT NULL CHECK(course_taken BETWEEN 1 AND 4),
  state text NOT NULL CHECK(state IN ('passed','failed','not_presented')),
  grade numeric(4,2) CHECK(grade BETWEEN 0 AND 10 OR grade IS NULL),
  weekly_hours numeric(5,2) NOT NULL CHECK(weekly_hours BETWEEN 0 AND 60),
  perceived_difficulty integer CHECK(perceived_difficulty BETWEEN 1 AND 5),
  satisfaction integer CHECK(satisfaction BETWEEN 1 AND 5),
  choose_again boolean,
  election_reason text,
  provenance text NOT NULL DEFAULT 'synthetic_demo',
  PRIMARY KEY(student_code, subject_id),
  CHECK (provenance = 'synthetic_demo'),
  CHECK (
    (state='not_presented' AND grade IS NULL) OR
    (state='failed' AND grade IS NOT NULL AND grade < 5) OR
    (state='passed' AND grade >= 5)
  )
);
CREATE INDEX results_subject_course_idx
  ON dss_demo_716_v2.results(subject_id, academic_course);
CREATE INDEX results_academic_course_idx
  ON dss_demo_716_v2.results(academic_course);

COMMENT ON SCHEMA dss_demo_716_v2 IS 'Demo AAAhoraQue plan oficial 716 V2: simulación de menciones por año, resultados individuales sintéticos; históricos oficiales agregados segregados';
COMMENT ON TABLE dss_demo_716_v2.results IS 'TODAS las filas son simuladas. No son resultados individuales de alumnos reales.';
