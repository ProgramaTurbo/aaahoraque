import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type {
  Demo716Payload, DemoGuide, DemoSubject, SubjectStats, Mention,
  MentionYear, ReasonRow, InterestRow, OfficialGrade, DemoPassed,
} from "./demo716-types";

// Plan 716, EINA (Zaragoza), 2026-2027: ID contrastado en la auditoría de la MV.
const PLAN_ID = "fed26b74-ed7e-58e6-bf1a-9da2d1413862";
const num = (v: unknown) => v === null || v === undefined ? 0 : Number(v);
const str = (v: unknown) => v === null || v === undefined ? "" : String(v);

export async function getSubjectsDemo716(): Promise<Demo716Payload> {
  const check = await db.execute(sql`
    SELECT
      to_regclass('dss_demo_716_v2.students')::text AS students_table,
      to_regclass('dss_demo_716_v2.results')::text AS results_table,
      to_regclass('dss_enrichment_716.guides')::text AS guide_table
  `);
  if (!check[0]?.students_table || !check[0]?.results_table) {
    throw new Error("El esquema dss_demo_716_v2 no está cargado en esta conexión.");
  }
  const guidesLoaded = Boolean(check[0].guide_table);

  const [planRows, subjectRows, mentionRows, statsRows, mentionYearRows,
    reasonRows, interestRows, officialRows, demoRows, sizeRows] = await Promise.all([
    db.execute(sql`
      SELECT p.name, p.official_code, p.total_ects, p.source_url
      FROM public.study_plans p
      WHERE p.id = ${PLAN_ID}::uuid AND p.status = 'official' AND p.official_code = '716'
      LIMIT 1
    `),
    db.execute(sql`
      SELECT s.id, s.official_code AS code, s.name, s.ects,
             s.academic_year AS year, s.semester, s.source_url,
             CASE WHEN EXISTS (
               SELECT 1 FROM jsonb_array_elements(
                 CASE WHEN jsonb_typeof(s.metadata->'occurrences') = 'array'
                 THEN s.metadata->'occurrences' ELSE '[]'::jsonb END
               ) AS occ(item)
               WHERE occ.item->>'offer_status' = 'not_offered'
             ) THEN 'not_offered' ELSE 'listed' END AS availability,
             COALESCE((SELECT array_agg(ms.mention_code ORDER BY ms.mention_code)
               FROM dss_demo_716_v2.mention_subjects ms WHERE ms.subject_id=s.id), ARRAY[]::text[]) AS mention_codes
      FROM public.subjects s
      WHERE s.study_plan_id = ${PLAN_ID}::uuid AND s.subject_type = 'optional'
      ORDER BY s.academic_year NULLS LAST, s.name
    `),
    db.execute(sql`SELECT code, name FROM dss_demo_716_v2.mentions ORDER BY name`),
    db.execute(sql`
      SELECT r.subject_id, st.mention_code,
             st.mention_choice_academic_course AS cohort,
             COUNT(*)::int AS n,
             COUNT(*) FILTER (WHERE r.state <> 'not_presented')::int AS presented,
             COUNT(*) FILTER (WHERE r.state = 'passed')::int AS passed,
             COUNT(*) FILTER (WHERE r.state = 'failed')::int AS failed,
             COUNT(*) FILTER (WHERE r.state = 'not_presented')::int AS absent,
             COALESCE(SUM(r.grade), 0) AS grade_sum,
             AVG(r.grade) AS grade_mean,
             COALESCE(SUM(r.grade * r.grade), 0) AS grade_sq_sum,
             COUNT(*) FILTER (WHERE r.grade < 5)::int AS grade_0,
             COUNT(*) FILTER (WHERE r.grade >= 5 AND r.grade < 7)::int AS grade_5,
             COUNT(*) FILTER (WHERE r.grade >= 7 AND r.grade < 9)::int AS grade_7,
             COUNT(*) FILTER (WHERE r.grade >= 9)::int AS grade_9,
             COALESCE(SUM(r.weekly_hours), 0) AS hours_sum,
             COALESCE(SUM(r.perceived_difficulty), 0) AS difficulty_sum,
             COUNT(r.perceived_difficulty)::int AS difficulty_n,
             COALESCE(SUM(r.satisfaction), 0) AS satisfaction_sum,
             COUNT(r.satisfaction)::int AS satisfaction_n,
             COUNT(*) FILTER (WHERE r.choose_again IS TRUE)::int AS repeat_yes,
             COUNT(r.choose_again)::int AS repeat_n
      FROM dss_demo_716_v2.results r
      JOIN dss_demo_716_v2.students st ON st.student_code = r.student_code
      JOIN public.subjects s ON s.id = r.subject_id
      WHERE st.profile_kind = 'historical_simulation'
        AND s.study_plan_id = ${PLAN_ID}::uuid AND s.subject_type = 'optional'
      GROUP BY r.subject_id, st.mention_code, st.mention_choice_academic_course
    `),
    db.execute(sql`
      SELECT mention_choice_academic_course AS year, mention_code,
             COUNT(*)::int AS n
      FROM dss_demo_716_v2.students
      WHERE profile_kind = 'historical_simulation'
      GROUP BY mention_choice_academic_course, mention_code
      ORDER BY year, mention_code
    `),
    db.execute(sql`
      SELECT r.election_reason AS reason, st.mention_code,
             st.mention_choice_academic_course AS cohort, COUNT(*)::int AS n
      FROM dss_demo_716_v2.results r
      JOIN dss_demo_716_v2.students st ON st.student_code=r.student_code
      JOIN public.subjects s ON s.id=r.subject_id
      WHERE s.study_plan_id=${PLAN_ID}::uuid AND s.subject_type='optional'
        AND st.profile_kind='historical_simulation'
        AND r.election_reason IS NOT NULL
      GROUP BY r.election_reason, st.mention_code, st.mention_choice_academic_course
    `),
    db.execute(sql`
      SELECT st.latent_interest AS interest, AVG(r.satisfaction) AS satisfaction,
             COUNT(r.satisfaction)::int AS responses
      FROM dss_demo_716_v2.results r
      JOIN dss_demo_716_v2.students st ON st.student_code=r.student_code
      JOIN public.subjects s ON s.id=r.subject_id
      WHERE s.study_plan_id=${PLAN_ID}::uuid AND s.subject_type='optional'
        AND st.profile_kind='historical_simulation'
      GROUP BY st.latent_interest ORDER BY st.latent_interest
    `),
    db.execute(sql`
      SELECT subject_id, academic_course, not_presented, failed, pass,
             merit, distinction, honours, source_url
      FROM dss_demo_716_v2.official_grade_aggregates
    `),
    db.execute(sql`
      SELECT s.official_code AS code, s.name, s.academic_year AS year,
             s.ects, r.grade
      FROM dss_demo_716_v2.results r
      JOIN public.subjects s ON s.id=r.subject_id
      WHERE r.student_code = 'DEMO716-ESTUDIANTE' AND r.state='passed'
      ORDER BY s.academic_year, s.official_code
    `),
    db.execute(sql`
      SELECT (SELECT COUNT(*) FROM dss_demo_716_v2.students)::int AS students,
             (SELECT COUNT(*) FROM dss_demo_716_v2.results)::int AS results
    `),
  ]);
  const plan = planRows[0];
  if (!plan || subjectRows.length !== 40) {
    throw new Error(`Catálogo del plan 716 inesperado: ${subjectRows.length} optativas.`);
  }

  let guidesByCode = new Map<string, DemoGuide>();
  if (guidesLoaded) {
    const guideRows = await db.execute(sql`
      SELECT official_code, guide_source_url, language_declaration,
             guide_basic, learning_outcomes, program, activities,
             assessment_eina, assessment_signals, multicenter_guide,
             assessment_center_segmentation
      FROM dss_enrichment_716.guides
      WHERE plan_id = ${PLAN_ID}::uuid AND academic_course = '2026-2027'
    `);
    guidesByCode = new Map(guideRows.map(g => [str(g.official_code), {
      sourceUrl: str(g.guide_source_url), language: str(g.language_declaration),
      basic: str(g.guide_basic), outcomes: str(g.learning_outcomes),
      program: str(g.program), activities: str(g.activities),
      assessment: str(g.assessment_eina),
      signals: Array.isArray(g.assessment_signals) ? g.assessment_signals.map(str) : [],
      multicenter: Boolean(g.multicenter_guide),
      segmentation: str(g.assessment_center_segmentation),
    }]));
  }

  const subjects: DemoSubject[] = subjectRows.map(r => ({
    id: str(r.id), code: str(r.code), name: str(r.name), ects: num(r.ects),
    year: r.year === null ? null : num(r.year),
    semester: r.semester === null ? null : str(r.semester),
    availability: str(r.availability) === 'not_offered' ? 'not_offered' : 'listed',
    mentions: Array.isArray(r.mention_codes) ? r.mention_codes.map(str) : [],
    sourceUrl: r.source_url === null ? null : str(r.source_url),
    guide: guidesByCode.get(str(r.code)) ?? null,
  }));
  const mentions: Mention[] = mentionRows.map(r => ({ code: str(r.code), name: str(r.name) }));
  const stats: SubjectStats[] = statsRows.map(r => ({
    subjectId: str(r.subject_id), mentionCode: str(r.mention_code), cohort: str(r.cohort),
    n: num(r.n), presented: num(r.presented), passed: num(r.passed),
    failed: num(r.failed), absent: num(r.absent), gradeSum: num(r.grade_sum),
    gradeMean: r.grade_mean === null ? null : num(r.grade_mean),
    gradeSqSum: num(r.grade_sq_sum), grade0: num(r.grade_0), grade5: num(r.grade_5),
    grade7: num(r.grade_7), grade9: num(r.grade_9), hoursSum: num(r.hours_sum),
    difficultySum: num(r.difficulty_sum), difficultyN: num(r.difficulty_n),
    satisfactionSum: num(r.satisfaction_sum), satisfactionN: num(r.satisfaction_n),
    repeatYes: num(r.repeat_yes), repeatN: num(r.repeat_n),
  }));
  const mentionYears: MentionYear[] = mentionYearRows.map(r => ({
    year: str(r.year), mentionCode: str(r.mention_code), n: num(r.n),
  }));
  const reasons: ReasonRow[] = reasonRows.map(r => ({
    reason: str(r.reason), mentionCode: str(r.mention_code), cohort: str(r.cohort), count: num(r.n),
  }));
  const interests: InterestRow[] = interestRows.map(r => ({
    interest: str(r.interest), satisfaction: r.satisfaction === null ? null : num(r.satisfaction),
    responses: num(r.responses),
  }));
  const official: OfficialGrade[] = officialRows.map(r => ({
    subjectId: str(r.subject_id), course: str(r.academic_course),
    notPresented: num(r.not_presented), failed: num(r.failed), pass: num(r.pass),
    merit: num(r.merit), distinction: num(r.distinction), honours: num(r.honours),
    sourceUrl: str(r.source_url),
  }));
  const demoPassed: DemoPassed[] = demoRows.map(r => ({
    code: str(r.code), name: str(r.name), year: num(r.year), ects: num(r.ects), grade: num(r.grade),
  }));
  return {
    planName: str(plan.name), planCode: str(plan.official_code), totalEcts: num(plan.total_ects),
    sourceUrl: str(plan.source_url), subjects, mentions, stats, mentionYears,
    reasons, interests, official, demoPassed, guidesLoaded,
    syntheticStudents: num(sizeRows[0]?.students), syntheticResults: num(sizeRows[0]?.results),
  };
}
