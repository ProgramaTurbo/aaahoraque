import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Estadísticas agregadas del catálogo académico.
 * No recupera expedientes ni datos individuales.
 */
export async function getDataStats() {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM universities) AS universities,
      (SELECT COUNT(*) FROM academic_centers) AS centers,
      (SELECT COUNT(*) FROM degrees) AS degrees,
      (SELECT COUNT(*) FROM degree_offerings) AS offerings,
      (SELECT COUNT(*) FROM study_plans) AS plans,
      (SELECT COUNT(*) FROM subjects) AS subjects,
      (SELECT COUNT(*) FROM synthetic_students) AS students,
      (SELECT COUNT(*) FROM synthetic_academic_results) AS results
  `);

  const row = result[0];

  if (!row) {
    throw new Error("No se han podido recuperar las estadísticas.");
  }

  return {
    universities: Number(row.universities),
    centers: Number(row.centers),
    degrees: Number(row.degrees),
    offerings: Number(row.offerings),
    plans: Number(row.plans),
    subjects: Number(row.subjects),
    students: Number(row.students),
    results: Number(row.results),
  };
}
