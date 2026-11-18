import "server-only";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { DegreeQeduData } from "@/features/degrees/types";
import { db } from "@/lib/db";
import { universities, academicCenters, degrees, degreeOfferings, studyPlans, subjects } from "@/lib/db/schema";
import { isCatalogPlanVisible } from "./plan-visibility";

// Lightweight, additive catalog read: no plan/subject joins in the listing.
export async function getDegreePage(query: string, university: string | null, page: number) {
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const data = await db.select({
    id: degreeOfferings.id, modality: degreeOfferings.modality,
    university: { id: universities.id, name: universities.officialName },
    center: { id: academicCenters.id, name: academicCenters.officialName },
    degree: { id: degrees.id, name: degrees.name, academicLevel: degrees.academicLevel },
  }).from(degreeOfferings)
    .innerJoin(universities, eq(degreeOfferings.universityId, universities.id))
    .innerJoin(degrees, eq(degreeOfferings.degreeId, degrees.id))
    .leftJoin(academicCenters, eq(degreeOfferings.academicCenterId, academicCenters.id))
    .where(and(university ? eq(degreeOfferings.universityId, university) : undefined,
      query ? or(ilike(degrees.name, pattern), ilike(universities.officialName, pattern), ilike(academicCenters.officialName, pattern)) : undefined))
    .orderBy(asc(universities.officialName), asc(degrees.name), asc(degreeOfferings.id))
    .limit(13).offset((page - 1) * 12);
  return { data: data.slice(0, 12), hasMore: data.length > 12 };
}

export async function getDegreeUniversities() {
  return db.select({ id: universities.id, name: universities.officialName }).from(universities).orderBy(asc(universities.officialName));
}

export async function getDegreePlans(offeringId: string) {
  const plans = await db.select({ id: studyPlans.id, name: studyPlans.name, totalEcts: studyPlans.totalEcts })
    .from(studyPlans)
    .where(and(
      eq(studyPlans.degreeOfferingId, offeringId),
      isCatalogPlanVisible(studyPlans.status, studyPlans.degreeOfferingId),
    ))
    .orderBy(asc(studyPlans.name), asc(studyPlans.id));
  if (plans.length === 0) return [];

  const rows = await db.select({ id: subjects.id, planId: subjects.studyPlanId, name: subjects.name, ects: subjects.ects })
    .from(subjects)
    .where(inArray(subjects.studyPlanId, plans.map((plan) => plan.id)))
    .orderBy(asc(subjects.name), asc(subjects.id));
  return plans.map((plan) => ({ ...plan, totalEcts: Number(plan.totalEcts),
    subjects: rows.filter((s) => s.planId === plan.id).map((s) => ({ id: s.id, name: s.name, ects: Number(s.ects) })) }));
}

// Only metadata for orientation: never load all plans or subjects to rank offers.
export async function getOrientationCandidates() {
  return db.select({
    id: degreeOfferings.id, modality: degreeOfferings.modality,
    university: { id: universities.id, name: universities.officialName },
    center: { id: academicCenters.id, name: academicCenters.officialName },
    degree: { id: degrees.id, name: degrees.name, academicLevel: degrees.academicLevel },
    province: academicCenters.province,
  }).from(degreeOfferings)
    .innerJoin(universities, eq(degreeOfferings.universityId, universities.id))
    .innerJoin(degrees, eq(degreeOfferings.degreeId, degrees.id))
    .leftJoin(academicCenters, eq(degreeOfferings.academicCenterId, academicCenters.id))
    .orderBy(asc(degreeOfferings.id));
}

export async function getDegreeCutoffs(offeringIds: string[]) {
  if (offeringIds.length === 0) return new Map();
  const rows = await db.execute<{ offering_id: string; academic_year: string | null; cutoff: string | null; university_type: string | null; center_type: string | null; foreign_language: boolean }>(sql`
    WITH latest AS (
      SELECT DISTINCT ON (m.degree_offering_id)
        m.id, m.degree_offering_id, m.foreign_language, b.reference_academic_year
      FROM qedu_offering_mappings m
      INNER JOIN catalog_import_batches b ON b.id = m.batch_id
      WHERE m.degree_offering_id IN (${sql.join(offeringIds.map((id) => sql`${id}::uuid`), sql`, `)})
      ORDER BY m.degree_offering_id, b.imported_at DESC, m.id
    )
    SELECT DISTINCT l.degree_offering_id AS offering_id, l.reference_academic_year AS academic_year,
      r.raw_data ->> 'Nota de corte' AS cutoff,
      r.raw_data ->> 'Tipo de universidad' AS university_type,
      r.raw_data ->> 'Tipo de centro' AS center_type, l.foreign_language
    FROM latest l
    INNER JOIN qedu_offering_rows q ON q.mapping_id = l.id
    INNER JOIN catalog_import_rows r ON r.id = q.import_row_id
  `);
  const byOffering = new Map<string, DegreeQeduData>();
  for (const row of rows) {
    const raw = row.cutoff?.trim().replace(",", ".");
    const entry = byOffering.get(row.offering_id) ?? {
      academicYear: row.academic_year, values: [], universityTypes: [], centerTypes: [],
      foreignLanguage: row.foreign_language,
    };
    const value = raw && /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
    if (value !== null && value <= 14 && !entry.values.includes(value)) entry.values.push(value);
    const universityType = row.university_type?.trim();
    const centerType = row.center_type?.trim();
    if (universityType && !entry.universityTypes.includes(universityType)) entry.universityTypes.push(universityType);
    if (centerType && !entry.centerTypes.includes(centerType)) entry.centerTypes.push(centerType);
    byOffering.set(row.offering_id, entry);
  }
  return byOffering;
}
