import "server-only";

import { sql } from "drizzle-orm";
import { isCatalogPlanVisible } from "@/lib/catalog/plan-visibility";
import { db } from "@/lib/db";

export async function getSubjectUniversities() {
  const rows = await db.execute(sql`
    SELECT u.id, u.official_name AS name
    FROM universities u
    WHERE EXISTS (
      SELECT 1
      FROM degree_offerings o
      JOIN study_plans p ON p.degree_offering_id = o.id
      WHERE o.university_id = u.id
        AND p.status IN ('official', 'synthetic')
    )
    OR EXISTS (
      SELECT 1
      FROM joint_programs jp
      JOIN study_plans p ON p.joint_program_id = jp.id
      WHERE jp.university_id = u.id
        AND p.status = 'official'
    )
    ORDER BY name
  `);

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
  }));
}

export async function getSubjectPlans(universityId: string) {
  const rows = await db.execute(sql`
    SELECT
      plans.id,
      plans.plan_name,
      plans.plan_code,
      plans.status,
      plans.total_ects,
      plans.degree_name,
      plans.academic_level,
      plans.center_name
    FROM (
      SELECT
        p.id,
        p.name AS plan_name,
        p.official_code AS plan_code,
        p.status,
        p.total_ects,
        d.name AS degree_name,
        d.academic_level,
        c.official_name AS center_name
      FROM study_plans p
      JOIN degree_offerings o ON o.id = p.degree_offering_id
      JOIN degrees d ON d.id = o.degree_id
      LEFT JOIN academic_centers c ON c.id = o.academic_center_id
      WHERE o.university_id = ${universityId}::uuid
        AND p.status IN ('official', 'synthetic')
        AND ${isCatalogPlanVisible(sql`p.status`, sql`p.degree_offering_id`)}

      UNION ALL

      SELECT
        p.id,
        p.name AS plan_name,
        p.official_code AS plan_code,
        p.status,
        p.total_ects,
        jp.name AS degree_name,
        'joint_program'::varchar AS academic_level,
        (
          SELECT STRING_AGG(DISTINCT c.official_name, ' · ' ORDER BY c.official_name)
          FROM joint_program_degrees jpd
          JOIN academic_centers c ON c.id = jpd.academic_center_id
          WHERE jpd.joint_program_id = jp.id
        ) AS center_name
      FROM study_plans p
      JOIN joint_programs jp ON jp.id = p.joint_program_id
      WHERE jp.university_id = ${universityId}::uuid
        AND p.status = 'official'
    ) AS plans
    ORDER BY plans.degree_name, plans.center_name NULLS LAST, plans.plan_name, plans.id
  `);

  return rows.map((row) => ({
    id: String(row.id),
    planName: String(row.plan_name),
    planCode: row.plan_code ? String(row.plan_code) : null,
    status: String(row.status),
    totalEcts: Number(row.total_ects),
    degreeName: String(row.degree_name),
    academicLevel: String(row.academic_level),
    centerName: row.center_name ? String(row.center_name) : null,
  }));
}

export async function getPlanSubjects(planId: string) {
  const rows = await db.execute(sql`
    SELECT
      s.id,
      s.name,
      s.official_code,
      s.ects,
      s.academic_year,
      s.semester,
      s.subject_type,
      s.source_url,
      s.metadata,
      s.estimated_difficulty,
      s.estimated_workload
    FROM subjects s
    JOIN study_plans p ON p.id = s.study_plan_id
    WHERE s.study_plan_id = ${planId}::uuid
      AND p.status IN ('official', 'synthetic')
      AND ${isCatalogPlanVisible(sql`p.status`, sql`p.degree_offering_id`)}
    ORDER BY
      s.academic_year NULLS LAST,
      s.semester NULLS LAST,
      s.subject_type,
      s.name
  `);

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    code: row.official_code ? String(row.official_code) : null,
    ects: Number(row.ects),
    year: row.academic_year === null ? null : Number(row.academic_year),
    semester: row.semester ? String(row.semester) : null,
    type: row.subject_type ? String(row.subject_type) : null,
    sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
    knownUnavailable: isKnownUnavailable(row.metadata),
    // Estos dos campos son NULL en las asignaturas oficiales auditadas.
    // No se convierten en cero ni se estiman desde datos sintéticos.
    difficulty: row.estimated_difficulty === null
      ? null
      : Number(row.estimated_difficulty),
    workload: row.estimated_workload === null
      ? null
      : Number(row.estimated_workload),
  }));
}

function isKnownUnavailable(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return false;
  const { occurrences } = metadata as { occurrences?: unknown };
  return Array.isArray(occurrences) && occurrences.length > 0 &&
    occurrences.every((occurrence) => occurrence?.offer_status === "not_offered");
}
