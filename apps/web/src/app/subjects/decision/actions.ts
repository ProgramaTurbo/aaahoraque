"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { studentDecisionPlans, subjects } from "@/lib/db/schema";
import { getAccountUser } from "@/lib/account/session";
import { getOfficialPlanContext, uuidPattern } from "@/lib/account/profile";
import { isPeriod } from "@/lib/subjects/decision";
import { normalizeSubjectPreferences } from "@/lib/subjects/progress";

type SaveInput = {
  id?: string;
  version: number;
  period: string;
  target: number;
  subjectIds: string[];
  name?: string;
  preferences?: unknown;
};

const conflict = "Este borrador o escenario ha cambiado en otra pestaña. Recarga la página para ver la última versión.";

export async function saveDecision(planId: string, kind: "draft" | "scenario", input: SaveInput) {
  const user = await getAccountUser();
  if (!user) return { error: "Inicia sesión para guardar." };
  if ((kind !== "draft" && kind !== "scenario") || !await getOfficialPlanContext(planId)) {
    return { error: "Selecciona un plan oficial." };
  }
  if (!input || !isPeriod(input.period) || !Number.isInteger(input.target) || input.target < 1 || input.target > 120 ||
      !Number.isInteger(input.version) || input.version < 0 || input.version >= 2_147_483_647 ||
      (input.id ? typeof input.id !== "string" || !uuidPattern.test(input.id) || input.version === 0 : input.version !== 0) ||
      !Array.isArray(input.subjectIds) ||
      input.subjectIds.some((id) => typeof id !== "string" || !uuidPattern.test(id))) {
    return { error: "Revisa el periodo, el objetivo de ECTS (1–120) y las asignaturas seleccionadas." };
  }
  const name = kind === "scenario" && typeof input.name === "string" ? input.name.trim() : null;
  if (kind === "scenario" && (!name || name.length > 80)) return { error: "Escribe un nombre de hasta 80 caracteres." };
  const subjectIds = [...new Set(input.subjectIds)];
  if (subjectIds.length) {
    const [found] = await db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(subjects)
      .where(and(eq(subjects.studyPlanId, planId), sql`${subjects.id} = ANY(${sql.param(subjectIds)}::uuid[])`));
    if (found.total !== subjectIds.length) return { error: "Hay asignaturas que ya no pertenecen al catálogo de este plan." };
  }

  const values = {
    name, period: input.period, target: input.target, subjectIds,
    preferences: kind === "scenario" ? normalizeSubjectPreferences(input.preferences) : null,
    updatedAt: new Date(),
  };
  const result = { id: studentDecisionPlans.id, version: studentDecisionPlans.version };
  const [saved] = input.id ? await db.update(studentDecisionPlans).set({ ...values, version: input.version + 1 })
    .where(and(eq(studentDecisionPlans.id, input.id), eq(studentDecisionPlans.planId, planId),
      eq(studentDecisionPlans.userId, user.id), eq(studentDecisionPlans.kind, kind),
      eq(studentDecisionPlans.version, input.version)))
    .returning(result) : await db.insert(studentDecisionPlans).values({ ...values, userId: user.id, planId, kind })
    .onConflictDoNothing().returning(result);
  if (!saved) return { error: conflict };
  revalidatePath("/panel");
  revalidatePath("/subjects/decision");
  return { saved };
}

export async function deleteScenario(planId: string, id: string, version: number) {
  const user = await getAccountUser();
  if (!user) return { error: "Inicia sesión para borrar un escenario." };
  if (![planId, id].every((value) => typeof value === "string" && uuidPattern.test(value)) ||
      !Number.isInteger(version) || version < 1 || version > 2_147_483_647) {
    return { error: "Escenario inválido." };
  }
  const [removed] = await db.delete(studentDecisionPlans)
    .where(and(eq(studentDecisionPlans.id, id), eq(studentDecisionPlans.planId, planId),
      eq(studentDecisionPlans.userId, user.id), eq(studentDecisionPlans.kind, "scenario"), eq(studentDecisionPlans.version, version)))
    .returning({ id: studentDecisionPlans.id });
  if (!removed) return { error: conflict };
  revalidatePath("/panel");
  revalidatePath("/subjects/decision");
  return { removed: true };
}
