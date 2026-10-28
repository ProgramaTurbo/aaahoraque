import "server-only";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { universities, academicCenters, degrees, degreeOfferings, studyPlans, subjects } from "@/lib/db/schema";

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
    .from(studyPlans).where(eq(studyPlans.degreeOfferingId, offeringId)).orderBy(asc(studyPlans.name), asc(studyPlans.id));
  const rows = await db.select({ id: subjects.id, planId: subjects.studyPlanId, name: subjects.name, ects: subjects.ects })
    .from(subjects).innerJoin(studyPlans, eq(subjects.studyPlanId, studyPlans.id))
    .where(eq(studyPlans.degreeOfferingId, offeringId)).orderBy(asc(subjects.name), asc(subjects.id));
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
