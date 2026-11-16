import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { degreeOfferings, degrees, jointPrograms, studentPlanProgress, studentProfiles, studyPlans, subjects, universities } from "@/lib/db/schema";

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

export function subjectsPlanPath(plan: { id: string; universityId: string }, section?: "expediente" | "preferencias" | "comparar") {
  const params = new URLSearchParams({ university: plan.universityId, plan: plan.id });
  if (section) params.set("section", section);
  return `/subjects?${params}`;
}

export async function getStudentProfile(userId: string) {
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
  return profile ?? null;
}

export async function getSavedPlanSummaries(userId: string) {
  const rows = await db.select({
    ...officialPlanColumns,
    completed: studentPlanProgress.completed,
    shortlist: studentPlanProgress.shortlist,
    preferences: studentPlanProgress.preferences,
    updatedAt: studentPlanProgress.updatedAt,
  }).from(studentPlanProgress)
    .innerJoin(studyPlans, eq(studyPlans.id, studentPlanProgress.planId))
    .leftJoin(degreeOfferings, eq(studyPlans.degreeOfferingId, degreeOfferings.id))
    .leftJoin(degrees, eq(degreeOfferings.degreeId, degrees.id))
    .leftJoin(jointPrograms, eq(studyPlans.jointProgramId, jointPrograms.id))
    .innerJoin(universities, eq(universities.id, sql`coalesce(${degreeOfferings.universityId}, ${jointPrograms.universityId})`))
    .where(and(eq(studentPlanProgress.userId, userId), eq(studyPlans.status, "official")))
    .orderBy(desc(studentPlanProgress.updatedAt), studyPlans.id);
  const ids = [...new Set(rows.flatMap((row) => [...row.completed, ...row.shortlist]))];
  const catalog = ids.length ? await db.select({
    id: subjects.id, planId: subjects.studyPlanId, name: subjects.name, ects: subjects.ects,
  }).from(subjects).where(inArray(subjects.id, ids)) : [];
  const byId = new Map(catalog.map((subject) => [subject.id, subject]));
  return rows.map(({ completed, shortlist, preferences, ...row }) => {
    function subjectsInPlan(subjectIds: string[]) {
      return subjectIds.flatMap((id) => {
        const subject = byId.get(id);
        return subject?.planId === row.id ? [subject] : [];
      });
    }
    const completedSubjects = subjectsInPlan(completed);
    const alternatives = subjectsInPlan(shortlist);
    return {
      ...row,
      completedCount: completedSubjects.length,
      earnedCredits: completedSubjects.reduce((sum, subject) => sum + Number(subject.ects), 0),
      alternatives,
      answered: Object.values(preferences).filter((answer) => answer !== null).length,
    };
  });
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
