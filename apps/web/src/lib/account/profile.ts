import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { degreeOfferings, degrees, jointPrograms, studentPlanProgress, studentProfiles, studyPlans, universities } from "@/lib/db/schema";

export const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const officialPlanColumns = {
  id: studyPlans.id,
  name: studyPlans.name,
  totalEcts: studyPlans.totalEcts,
  degreeName: sql<string>`coalesce(${degrees.name}, ${jointPrograms.name})`,
  universityId: universities.id,
  universityName: universities.officialName,
};

export async function getOfficialPlanContext(planId: string) {
  if (typeof planId !== "string" || !uuidPattern.test(planId)) return null;

  const [plan] = await db.select(officialPlanColumns).from(studyPlans)
    .leftJoin(degreeOfferings, eq(studyPlans.degreeOfferingId, degreeOfferings.id))
    .leftJoin(degrees, eq(degreeOfferings.degreeId, degrees.id))
    .leftJoin(jointPrograms, eq(studyPlans.jointProgramId, jointPrograms.id))
    .innerJoin(universities, eq(universities.id, sql`coalesce(${degreeOfferings.universityId}, ${jointPrograms.universityId})`))
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.status, "official")))
    .limit(1);
  return plan ?? null;
}

export function subjectsPlanPath(plan: { id: string; universityId: string }, section?: "expediente" | "preferencias", year?: string) {
  const params = new URLSearchParams({ university: plan.universityId, plan: plan.id });
  if (section) params.set("section", section);
  if (year) params.set("curso", year);
  return `/subjects?${params}`;
}

export async function getStudentProfile(userId: string) {
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
  return profile ?? null;
}

export async function getPlansWithSavedProgress(userId: string) {
  return db.select({
    ...officialPlanColumns,
    updatedAt: studentPlanProgress.updatedAt,
    lastSection: studentPlanProgress.lastSection,
  }).from(studentPlanProgress)
    .innerJoin(studyPlans, eq(studyPlans.id, studentPlanProgress.planId))
    .leftJoin(degreeOfferings, eq(studyPlans.degreeOfferingId, degreeOfferings.id))
    .leftJoin(degrees, eq(degreeOfferings.degreeId, degrees.id))
    .leftJoin(jointPrograms, eq(studyPlans.jointProgramId, jointPrograms.id))
    .innerJoin(universities, eq(universities.id, sql`coalesce(${degreeOfferings.universityId}, ${jointPrograms.universityId})`))
    .where(and(eq(studentPlanProgress.userId, userId), eq(studyPlans.status, "official")))
    .orderBy(desc(studentPlanProgress.updatedAt), studyPlans.id);
}

export async function getSavedPlanProgress(userId: string, planId: string) {
  const [progress] = await db.select({
    completed: studentPlanProgress.completed,
    shortlist: studentPlanProgress.shortlist,
    preferences: studentPlanProgress.preferences,
    version: studentPlanProgress.version,
  }).from(studentPlanProgress)
    .where(and(eq(studentPlanProgress.userId, userId), eq(studentPlanProgress.planId, planId)));
  return progress ?? null;
}
