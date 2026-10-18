import "server-only";

import { getCatalogOfferings } from "./queries";

type CatalogRow = Awaited<ReturnType<typeof getCatalogOfferings>>[number];

type CatalogSubject = {
  id: string;
  code: string | null;
  name: string;
  ects: number;
};

type CatalogPlan = {
  id: string;
  code: string | null;
  name: string;
  totalEcts: number;
  subjects: CatalogSubject[];
};

export type CatalogOffering = {
  id: string;
  modality: string | null;

  university: {
    id: string;
    name: string;
  };

  center: {
    id: string;
    name: string;
  } | null;

  degree: {
    id: string;
    name: string;
    academicLevel: string;
  };

  plans: CatalogPlan[];
};

export function structureCatalogRows(
  rows: CatalogRow[]
): CatalogOffering[] {
  const offerings = new Map<string, CatalogOffering>();

  for (const row of rows) {
    let offering = offerings.get(row.offeringId);

    if (!offering) {
      offering = {
        id: row.offeringId,
        modality: row.modality,

        university: {
          id: row.universityId,
          name: row.universityName,
        },

        center:
          row.centerId && row.centerName
            ? {
                id: row.centerId,
                name: row.centerName,
              }
            : null,

        degree: {
          id: row.degreeId,
          name: row.degreeName,
          academicLevel: row.academicLevel,
        },

        plans: [],
      };

      offerings.set(row.offeringId, offering);
    }

    // Puede existir una oferta que todavía no tenga planes cargados.
    if (!row.planId || !row.planName || row.totalEcts === null) {
      continue;
    }

    let plan = offering.plans.find(
      (item) => item.id === row.planId
    );

    if (!plan) {
      plan = {
        id: row.planId,
        code: row.planCode,
        name: row.planName,
        totalEcts: Number(row.totalEcts),
        subjects: [],
      };

      offering.plans.push(plan);
    }

    // Puede existir un plan que todavía no tenga asignaturas cargadas.
    if (
      row.subjectId &&
      row.subjectName !== null &&
      row.subjectEcts !== null
    ) {
      if (!plan.subjects.some((item) => item.id === row.subjectId)) {
        plan.subjects.push({
          id: row.subjectId,
          code: row.subjectCode,
          name: row.subjectName,
          ects: Number(row.subjectEcts),
        });
      }
    }
  }

  return Array.from(offerings.values());
}

export async function getStructuredCatalog() {
  const rows = await getCatalogOfferings();

  return structureCatalogRows(rows);
}
