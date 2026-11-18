import "server-only";

import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { emptyHistory, type ObservatoryHistory, type SampleBase, type SampleStats } from "./observatory-history";
import { plan716, safeSourceUrl } from "./student-decisions";

const statKeys = [
  "n", "graded", "passed", "absent", "gradeSum", "gradeSquares", "low", "pass", "merit", "high",
  "hours", "difficulty", "difficultyN", "satisfaction", "satisfactionN", "again", "againN",
] as const satisfies readonly (keyof SampleStats)[];

const loadHistory = unstable_cache(async (planId: string): Promise<ObservatoryHistory> => {
  const relations = await db.execute(sql`
    SELECT c.relname AS name
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'dss_demo_716_v2'
      AND c.relname IN ('students', 'results', 'mentions', 'mention_subjects')
      AND has_schema_privilege(n.oid, 'USAGE') AND has_table_privilege(c.oid, 'SELECT')
  `);
  const available = new Set(relations.map((relation) => relation.name));
  const hasSample = available.has("students") && available.has("results");
  const sampleFrom = sql`
    FROM dss_demo_716_v2.results r
    JOIN dss_demo_716_v2.students st ON st.student_code = r.student_code
    JOIN public.subjects s ON s.id = r.subject_id
    WHERE st.plan_id = ${planId}::uuid AND s.study_plan_id = ${planId}::uuid
      AND st.profile_kind = 'historical_simulation'
      AND st.provenance = 'synthetic_demo' AND r.provenance = 'synthetic_demo'
  `;
  const [stats, reasons, mentions] = await Promise.all([
    hasSample ? db.execute(sql`
      SELECT r.subject_id, r.academic_course, st.latent_interest, count(*) AS n,
        count(r.grade) AS graded, count(*) FILTER (WHERE r.state = 'passed') AS passed,
        count(*) FILTER (WHERE r.state = 'not_presented') AS absent,
        sum(r.grade) AS "gradeSum", sum(r.grade * r.grade) AS "gradeSquares",
        count(*) FILTER (WHERE r.grade < 5) AS low,
        count(*) FILTER (WHERE r.grade >= 5 AND r.grade < 7) AS pass,
        count(*) FILTER (WHERE r.grade >= 7 AND r.grade < 9) AS merit,
        count(*) FILTER (WHERE r.grade >= 9) AS high,
        sum(r.weekly_hours) AS hours, sum(r.perceived_difficulty) AS difficulty,
        count(r.perceived_difficulty) AS "difficultyN",
        sum(r.satisfaction) AS satisfaction, count(r.satisfaction) AS "satisfactionN",
        count(*) FILTER (WHERE r.choose_again) AS again, count(r.choose_again) AS "againN"
      ${sampleFrom}
      GROUP BY r.subject_id, r.academic_course, st.latent_interest
    `) : [],
    hasSample ? db.execute(sql`
      SELECT r.subject_id, r.academic_course, r.election_reason, count(*) AS n
      ${sampleFrom} AND r.election_reason IS NOT NULL AND btrim(r.election_reason) <> ''
      GROUP BY r.subject_id, r.academic_course, r.election_reason
    `) : [],
    available.has("mentions") && available.has("mention_subjects") ? db.execute(sql`
      SELECT ms.subject_id, m.name, m.source_url, m.source_course
      FROM dss_demo_716_v2.mentions m
      JOIN dss_demo_716_v2.mention_subjects ms ON ms.mention_code = m.code
      JOIN public.subjects s ON s.id = ms.subject_id
      WHERE m.plan_id = ${planId}::uuid AND s.study_plan_id = ${planId}::uuid AND m.provenance = 'official_unizar'
      ORDER BY m.name, ms.subject_id
    `) : [],
  ]);
  return {
    stats: stats.map((row): SampleBase => ({
      subjectId: String(row.subject_id), course: String(row.academic_course), interest: String(row.latent_interest),
      ...Object.fromEntries(statKeys.map((key) => [key, Number(row[key] ?? 0)])) as SampleStats,
    })),
    reasons: reasons.map((row) => ({
      subjectId: String(row.subject_id), course: String(row.academic_course), reason: String(row.election_reason), count: Number(row.n),
    })),
    mentions: mentions.flatMap((row) => {
      const sourceUrl = safeSourceUrl(row.source_url);
      return sourceUrl ? [{ subjectId: String(row.subject_id), name: String(row.name), sourceUrl, course: String(row.source_course) }] : [];
    }),
  };
}, ["private-subject-observatory-aggregates-v1"], { revalidate: 300 });

export async function getObservatoryHistory(planId: string) {
  if (planId !== plan716) return emptyHistory;
  try {
    return await loadHistory(planId);
  } catch (error) {
    // Optional history must not block the student's catalogue and draft.
    const code = (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code;
    console.warn("No se pudo cargar el histórico del observatorio", code ?? "unknown");
    return emptyHistory;
  }
}
