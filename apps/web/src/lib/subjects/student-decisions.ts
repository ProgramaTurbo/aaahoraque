import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { studentDecisionPlans, studyPlans } from "@/lib/db/schema";
import { getPlanSubjects } from "./catalog";
import type { OfficialEvidence } from "./decision";

export async function getDecisionPlans(userId: string, planId: string) {
  return db.select().from(studentDecisionPlans)
    .where(and(eq(studentDecisionPlans.userId, userId), eq(studentDecisionPlans.planId, planId)))
    .orderBy(desc(studentDecisionPlans.updatedAt), studentDecisionPlans.id);
}

export async function getMostRecentDecision(userId: string) {
  const [row] = await db.select({
    id: studentDecisionPlans.id, planId: studentDecisionPlans.planId, kind: studentDecisionPlans.kind,
    name: studentDecisionPlans.name, updatedAt: studentDecisionPlans.updatedAt,
  }).from(studentDecisionPlans)
    .innerJoin(studyPlans, eq(studyPlans.id, studentDecisionPlans.planId))
    .where(and(eq(studentDecisionPlans.userId, userId), eq(studyPlans.status, "official")))
    .orderBy(desc(studentDecisionPlans.updatedAt), studentDecisionPlans.id).limit(1);
  return row ?? null;
}

const plan716 = "fed26b74-ed7e-58e6-bf1a-9da2d1413862";

export async function getOfficialEvidence(planId: string, subjects: Awaited<ReturnType<typeof getPlanSubjects>>) {
  if (planId !== plan716) return [];
  const relations = await db.execute(sql`
    SELECT relation.relname AS name
    FROM pg_catalog.pg_class relation
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE (namespace.nspname, relation.relname) IN (
      ('dss_enrichment_716', 'guides'), ('dss_demo_716_v2', 'official_grade_aggregates')
    )
      AND has_schema_privilege(namespace.oid, 'USAGE')
      AND has_table_privilege(relation.oid, 'SELECT')
  `);
  const available = new Set(relations.map((relation) => relation.name));
  const [guides, grades] = await Promise.all([
    available.has("guides") ? db.execute(sql`
      SELECT official_code, guide_source_url, program, assessment_eina
      FROM dss_enrichment_716.guides
      WHERE plan_id = ${planId}::uuid AND academic_course = '2026-2027'
    `) : [],
    available.has("official_grade_aggregates") ? db.execute(sql`
      SELECT g.subject_id, g.academic_course, g.source_url,
             (g.pass + g.merit + g.distinction + g.honours) AS passed,
             (g.pass + g.merit + g.distinction + g.honours + g.failed + g.not_presented) AS total
      FROM dss_demo_716_v2.official_grade_aggregates g
      JOIN public.subjects s ON s.id = g.subject_id
      WHERE s.study_plan_id = ${planId}::uuid
      ORDER BY g.academic_course DESC
    `) : [],
  ]);
  const byCode = new Map(guides.map((guide) => [String(guide.official_code), guide]));
  return subjects.flatMap<OfficialEvidence>((subject) => {
    const row = subject.code ? byCode.get(subject.code) : undefined;
    const sourceUrl = safeSourceUrl(row?.guide_source_url);
    const guide = row && sourceUrl ? {
      program: String(row.program ?? ""), assessment: String(row.assessment_eina ?? ""), sourceUrl,
    } : null;
    const history = grades.filter((grade) => grade.subject_id === subject.id).flatMap((grade) => {
      const url = safeSourceUrl(grade.source_url);
      return url && Number(grade.total) > 0 ? [{
        course: String(grade.academic_course), passed: Number(grade.passed), total: Number(grade.total), sourceUrl: url,
      }] : [];
    });
    return guide || history.length ? [{ subjectId: subject.id, guide, grades: history }] : [];
  });
}

export function safeSourceUrl(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
