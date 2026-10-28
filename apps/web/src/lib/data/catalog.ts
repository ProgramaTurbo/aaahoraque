import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const PAGE_SIZE = 20;

export type CatalogFilters = {
  q?: string;
  university?: string;
  page?: number;
};

export async function getCatalogExplorer(filters: CatalogFilters = {}) {
  const q = (filters.q ?? "").trim().slice(0, 100);
  const university = (filters.university ?? "").trim();
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(filters.page) || 1))
  );

  const conditions = [];

  // Comparación insensible a mayúsculas y acentos.
  // Normalizamos tanto la búsqueda como los datos en PostgreSQL.
  if (q) {
    conditions.push(sql`(
      translate(lower(d.name), 'áéíóúüñ', 'aeiouun')
        LIKE '%' || translate(lower(${q}), 'áéíóúüñ', 'aeiouun') || '%'
      OR translate(lower(u.official_name), 'áéíóúüñ', 'aeiouun')
        LIKE '%' || translate(lower(${q}), 'áéíóúüñ', 'aeiouun') || '%'
      OR translate(lower(COALESCE(c.official_name, '')), 'áéíóúüñ', 'aeiouun')
        LIKE '%' || translate(lower(${q}), 'áéíóúüñ', 'aeiouun') || '%'
    )`);
  }

  // Excluimos las ofertas asociadas a planes de demostración.
  conditions.push(sql`NOT EXISTS (
    SELECT 1
    FROM study_plans demo
    WHERE demo.degree_offering_id = o.id
      AND demo.status = 'demo'
  )`);

  if (university) {
    conditions.push(sql`u.id::text = ${university}`);
  }

  const where = conditions.length
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const totalResult = await db.execute(sql`
    SELECT COUNT(*)::integer AS total
    FROM degree_offerings o
    JOIN degrees d ON d.id = o.degree_id
    JOIN universities u ON u.id = o.university_id
    LEFT JOIN academic_centers c ON c.id = o.academic_center_id
    ${where}
  `);

  const total = Number(totalResult[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const result = await db.execute(sql`
    SELECT
      o.id,
      d.name AS degree_name,
      d.academic_level,
      u.id AS university_id,
      u.official_name AS university_name,
      u.city,
      c.official_name AS center_name,
      o.modality,
      o.source_url
    FROM degree_offerings o
    JOIN degrees d ON d.id = o.degree_id
    JOIN universities u ON u.id = o.university_id
    LEFT JOIN academic_centers c ON c.id = o.academic_center_id
    ${where}
    ORDER BY d.name, u.official_name, o.id
    LIMIT ${PAGE_SIZE}
    OFFSET ${offset}
  `);

  return {
    filters: { q, university },
    page: currentPage,
    pageSize: PAGE_SIZE,
    pages,
    total,
    data: result.map((row) => ({
      id: String(row.id),
      degreeName: String(row.degree_name),
      academicLevel: String(row.academic_level),
      universityId: String(row.university_id),
      universityName: String(row.university_name),
      city: row.city ? String(row.city) : null,
      centerName: row.center_name ? String(row.center_name) : null,
      modality: row.modality ? String(row.modality) : null,
      sourceUrl: row.source_url ? String(row.source_url) : null,
    })),
  };
}

export async function getExplorerUniversities() {
  const result = await db.execute(sql`
    SELECT DISTINCT u.id, u.official_name
    FROM universities u
    JOIN degree_offerings o ON o.university_id = u.id
    ORDER BY u.official_name
  `);

  return result.map((row) => ({
    id: String(row.id),
    name: String(row.official_name),
  }));
}
