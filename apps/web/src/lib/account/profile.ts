import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { degreeOfferings, jointPrograms, studentPlanProgress, studentProfiles, studyPlans } from "@/lib/db/schema";

export const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function getOfficialPlanContext(planId: string) {
  if (typeof planId !== "string" || !uuidPattern.test(planId)) return null;

  const [plan] = await db.select({
    id: studyPlans.id,
    name: studyPlans.name,
    universityId: sql<string>`coalesce(${degreeOfferings.universityId}, ${jointPrograms.universityId})`,
  }).from(studyPlans)
    .leftJoin(degreeOfferings, eq(studyPlans.degreeOfferingId, degreeOfferings.id))
    .leftJoin(jointPrograms, eq(studyPlans.jointProgramId, jointPrograms.id))
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.status, "official")))
    .limit(1);
  return plan ?? null;
}

export function subjectsPlanPath(plan: { id: string; universityId: string }) {
  return `/subjects?${new URLSearchParams({ university: plan.universityId, plan: plan.id })}`;
}

export async function getStudentProfile(userId: string) {
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
  return profile ?? null;
}

export async function getLastSavedPlan(userId: string) {
  const [row] = await db.select({ planId: studentPlanProgress.planId })
    .from(studentPlanProgress)
    .where(eq(studentPlanProgress.userId, userId))
    .orderBy(desc(studentPlanProgress.updatedAt))
    .limit(1);
  return row ? getOfficialPlanContext(row.planId) : null;
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
