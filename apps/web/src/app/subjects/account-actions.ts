"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { studentPlanProgress, studentProfiles, subjects } from "@/lib/db/schema";
import { getAccountUser } from "@/lib/account/session";
import { getOfficialPlanContext, uuidPattern } from "@/lib/account/profile";
import { normalizeSubjectPreferences, type SubjectProgress } from "@/lib/subjects/progress";

type SaveResult = { version: number } | { error: string };
type PlanResult = { ok: true } | { error: string };

function validIds(value: unknown, limit: number): value is string[] {
  return Array.isArray(value) && value.length <= limit &&
    value.every((id) => typeof id === "string" && uuidPattern.test(id)) &&
    new Set(value).size === value.length;
}

export async function saveSubjectProgress(planId: string, input: SubjectProgress, section?: string): Promise<SaveResult> {
  const user = await getAccountUser().catch(() => null);
  if (!user) return { error: "La sesión ha caducado. Vuelve a iniciar sesión." };
  if (!input || !Number.isInteger(input.version) || input.version < 0 || input.version >= 2_147_483_647 ||
      !validIds(input.completed, 1000) || !validIds(input.shortlist, 3)) {
    return { error: "Revisa los datos del expediente y de la comparación." };
  }

  try {
    if (!(await getOfficialPlanContext(planId))) return { error: "Selecciona un plan oficial." };
    const rows = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.studyPlanId, planId));
    const allowed = new Set(rows.map((row) => row.id));
    if (![...input.completed, ...input.shortlist].every((id) => allowed.has(id))) {
      return { error: "Hay asignaturas que ya no pertenecen a este plan. Recarga la página para actualizarlo." };
    }

    const changes = {
      completed: input.completed,
      shortlist: input.shortlist,
      preferences: normalizeSubjectPreferences(input.preferences),
      lastSection: section === "preferencias" ? "preferencias" as const
        : section === "expediente" ? "expediente" as const : undefined,
      version: input.version + 1,
      updatedAt: new Date(),
    };
    const written = input.version === 0
      ? await db.insert(studentPlanProgress).values({ userId: user.id, planId, ...changes })
        .onConflictDoNothing().returning({ version: studentPlanProgress.version })
      : await db.update(studentPlanProgress).set(changes).where(and(
        eq(studentPlanProgress.userId, user.id),
        eq(studentPlanProgress.planId, planId),
        eq(studentPlanProgress.version, input.version),
      )).returning({ version: studentPlanProgress.version });
    if (!written.length) return { error: "Este plan se ha actualizado en otra pestaña o dispositivo. Recarga antes de volver a guardar." };

    revalidatePath("/panel");
    return { version: written[0].version };
  } catch {
    return { error: "No se ha podido guardar el progreso. Inténtalo de nuevo." };
  }
}

export async function setCurrentStudyPlan(planId: string): Promise<PlanResult> {
  const user = await getAccountUser().catch(() => null);
  if (!user) return { error: "La sesión ha caducado. Vuelve a iniciar sesión." };

  try {
    if (planId !== "" && !(await getOfficialPlanContext(planId))) return { error: "Selecciona un plan oficial." };
    const values = { currentStudyPlanId: planId || null, updatedAt: new Date() };
    await db.insert(studentProfiles).values({ userId: user.id, ...values })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: values });
    revalidatePath("/panel");
    return { ok: true };
  } catch {
    return { error: "No se ha podido actualizar tu plan actual. Inténtalo de nuevo." };
  }
}
