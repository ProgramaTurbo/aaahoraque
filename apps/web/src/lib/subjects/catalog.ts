import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Identificador verificado del programa conjunto GII + ADE de UNIZAR, plan 634.
// Solo se usa como selección inicial del demo: nunca se insertan datos.
export const DEFAULT_OFFICIAL_SUBJECT_PLAN_ID = "85a890cb-4267-50a3-a2f5-611acdb92f5a";

export async function getDefaultSubjectDemoContext() {
  const rows = await db.execute(sql`
    SELECT
      u.id AS university_id,
      p.id AS plan_id
    FROM study_plans p
    JOIN joint_programs jp ON jp.id = p.joint_program_id
    JOIN universities u ON u.id = jp.university_id
    WHERE p.id = ${DEFAULT_OFFICIAL_SUBJECT_PLAN_ID}::uuid
      AND p.official_code = '634'
      AND p.status = 'official'
      AND p.source_url LIKE 'https://estudios.unizar.es/%'
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) return null;

  return {
    universityId: String(row.university_id),
    planId: String(row.plan_id),
  };
}

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
      plans.status,
      plans.total_ects,
      plans.degree_name,
      plans.academic_level,
      plans.center_name
    FROM (
      SELECT
        p.id,
        p.name AS plan_name,
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
        AND (
          p.status = 'official'
          OR (
            p.status = 'synthetic'
            AND NOT EXISTS (
              SELECT 1
              FROM degree_offerings o2
              JOIN study_plans p2 ON p2.degree_offering_id = o2.id
              WHERE o2.university_id = o.university_id
                AND o2.degree_id = o.degree_id
                AND o2.academic_center_id IS NOT DISTINCT FROM o.academic_center_id
                AND p2.status = 'official'
            )
          )
        )

      UNION ALL

      SELECT
        p.id,
        p.name AS plan_name,
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
      s.estimated_difficulty,
      s.estimated_workload
    FROM subjects s
    JOIN study_plans p ON p.id = s.study_plan_id
    WHERE s.study_plan_id = ${planId}::uuid
      AND p.status IN ('official', 'synthetic')
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
