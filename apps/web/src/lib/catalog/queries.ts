import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  universities,
  academicCenters,
  degrees,
  degreeOfferings,
  studyPlans,
  subjects,
} from "@/lib/db/schema";

/**
 * Recupera el catálogo académico compartido.
 *
 * Los módulos deben reutilizar esta función en lugar de
 * implementar consultas equivalentes por separado.
 *
 * Esta primera versión devuelve ofertas académicas,
 * sus planes y sus asignaturas.
 */
export async function getCatalogOfferings() {
  const rows = await db
    .select({
      offeringId: degreeOfferings.id,
      modality: degreeOfferings.modality,

      universityId: universities.id,
      universityName: universities.officialName,

      centerId: academicCenters.id,
      centerName: academicCenters.officialName,

      degreeId: degrees.id,
      degreeName: degrees.name,
      academicLevel: degrees.academicLevel,

      planId: studyPlans.id,
      planName: studyPlans.name,
      planCode: studyPlans.officialCode,
      totalEcts: studyPlans.totalEcts,

      subjectId: subjects.id,
      subjectName: subjects.name,
      subjectCode: subjects.officialCode,
      subjectEcts: subjects.ects,
    })
    .from(degreeOfferings)
    .innerJoin(
      universities,
      eq(degreeOfferings.universityId, universities.id)
    )
    .innerJoin(
      degrees,
      eq(degreeOfferings.degreeId, degrees.id)
    )
    .leftJoin(
      academicCenters,
      eq(degreeOfferings.academicCenterId, academicCenters.id)
    )
    .leftJoin(
      studyPlans,
      eq(studyPlans.degreeOfferingId, degreeOfferings.id)
    )
    .leftJoin(
      subjects,
      eq(subjects.studyPlanId, studyPlans.id)
    )
    .orderBy(
      asc(universities.officialName),
      asc(degrees.name),
      asc(studyPlans.name),
      asc(subjects.name)
    );

  return rows;
}
