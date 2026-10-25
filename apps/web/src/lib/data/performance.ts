import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function getSyntheticPerformance() {
  const [summary, difficult] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(DISTINCT student_id)::integer AS students,
        ROUND(AVG(grade), 2) AS average_grade,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE passed) / NULLIF(COUNT(*), 0),
          2
        ) AS pass_rate,
        COUNT(*) FILTER (WHERE passed)::integer AS passed,
        COUNT(*) FILTER (WHERE NOT passed)::integer AS failed
      FROM synthetic_academic_results
    `),

    db.execute(sql`
      SELECT
        s.id,
        s.name,
        COUNT(*)::integer AS samples,
        ROUND(AVG(r.grade), 2) AS average_grade,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE r.passed) / COUNT(*),
          2
        ) AS pass_rate
      FROM synthetic_academic_results r
      INNER JOIN subjects s ON s.id = r.subject_id
      GROUP BY s.id, s.name
      HAVING COUNT(*) >= 10
      ORDER BY pass_rate ASC, samples DESC, s.id
      LIMIT 15
    `),
  ]);

  const row = summary[0];

  return {
    summary: {
      total: Number(row?.total ?? 0),
      students: Number(row?.students ?? 0),
      averageGrade: Number(row?.average_grade ?? 0),
      passRate: Number(row?.pass_rate ?? 0),
      passed: Number(row?.passed ?? 0),
      failed: Number(row?.failed ?? 0),
    },
    difficultSubjects: difficult.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      samples: Number(item.samples),
      averageGrade: Number(item.average_grade),
      passRate: Number(item.pass_rate),
    })),
    methodology: {
      source: "synthetic",
      minimumSamples: 10,
      criterion: "Menor porcentaje de aprobados simulados",
      disclaimer:
        "Los resultados proceden de un generador artificial, no de expedientes académicos reales.",
    },
  };
}
