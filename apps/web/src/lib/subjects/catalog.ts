import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function getSubjectUniversities() {
  const rows = await db.execute(sql`
    SELECT DISTINCT
      u.id,
      u.official_name AS name
    FROM universities u
    JOIN degree_offerings o ON o.university_id = u.id
    JOIN study_plans p ON p.degree_offering_id = o.id
    WHERE p.status <> 'demo'
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
      AND p.status <> 'demo'
    ORDER BY d.name, c.official_name NULLS LAST, p.name, p.id
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
      AND p.status <> 'demo'
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
    difficulty:
      row.estimated_difficulty === null
        ? null
        : Number(row.estimated_difficulty),
    workload:
      row.estimated_workload === null
        ? null
        : Number(row.estimated_workload),
  }));
}
