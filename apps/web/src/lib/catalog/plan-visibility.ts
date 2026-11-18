import { sql, type SQLWrapper } from "drizzle-orm";

export function isCatalogPlanVisible(status: SQLWrapper, offeringId: SQLWrapper) {
  return sql<boolean>`(
    ${status} IS DISTINCT FROM 'synthetic'
    OR NOT EXISTS (
      SELECT 1
      FROM public.study_plans AS official_plan
      JOIN public.subjects AS official_subject
        ON official_subject.study_plan_id = official_plan.id
      WHERE official_plan.degree_offering_id = ${offeringId}
        AND official_plan.status = 'official'
        AND NULLIF(BTRIM(official_subject.source_url), '') IS NOT NULL
    )
  )`;
}
