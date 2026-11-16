import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { safeSourceUrl } from "@/lib/subjects/student-decisions";
import { db } from "@/lib/db";
import { academicCenters, degreeOfferings, degrees, studentFavorites, studyPlans, subjects, universities } from "@/lib/db/schema";

export async function getFavorites(userId: string) {
  const owner = eq(studentFavorites.userId, userId);
  const sorted = desc(studentFavorites.createdAt);
  const [offerings, courses, destinations] = await Promise.all([
    db.select({
      id: studentFavorites.id, name: degrees.name, university: universities.officialName, center: academicCenters.officialName,
      sourceUrl: degreeOfferings.sourceUrl,
    }).from(studentFavorites)
      .innerJoin(degreeOfferings, eq(degreeOfferings.id, studentFavorites.offeringId))
      .innerJoin(degrees, eq(degrees.id, degreeOfferings.degreeId))
      .innerJoin(universities, eq(universities.id, degreeOfferings.universityId))
      .leftJoin(academicCenters, eq(academicCenters.id, degreeOfferings.academicCenterId))
      .where(owner).orderBy(sorted),
    db.select({
      id: studentFavorites.id, subjectId: subjects.id, name: subjects.name, planId: studyPlans.id, detail: studyPlans.name,
    }).from(studentFavorites)
      .innerJoin(subjects, eq(subjects.id, studentFavorites.subjectId))
      .innerJoin(studyPlans, eq(studyPlans.id, subjects.studyPlanId))
      .where(and(owner, eq(studyPlans.status, "official"))).orderBy(sorted),
    db.select({ id: studentFavorites.id, name: studentFavorites.destination, url: studentFavorites.destinationUrl })
      .from(studentFavorites).where(owner).orderBy(sorted),
  ]);
  return {
    offerings: offerings.map((item) => ({ ...item, sourceUrl: safeSourceUrl(item.sourceUrl) })), courses,
    destinations: destinations.flatMap(({ name, ...row }) => name ? [{ ...row, name }] : []),
  };
}

export async function getFavoriteSubjects(userId: string, planId: string) {
  return db.select({ id: studentFavorites.id, subjectId: subjects.id }).from(studentFavorites)
    .innerJoin(subjects, eq(studentFavorites.subjectId, subjects.id))
    .where(and(eq(studentFavorites.userId, userId), eq(subjects.studyPlanId, planId)));
}
