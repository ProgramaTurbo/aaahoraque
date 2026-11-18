"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { studentProfiles } from "@/lib/db/schema";
import { getAccountUser } from "@/lib/account/session";

type Changes = Pick<Partial<typeof studentProfiles.$inferInsert>, "displayName" | "decisionGoal">;

async function updateProfile(changes: Changes) {
  const user = await getAccountUser();
  if (!user) return false;

  const values = { ...changes, updatedAt: new Date() };
  try {
    await db.insert(studentProfiles).values({ userId: user.id, ...values })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: values });
  } catch {
    return false;
  }
  revalidatePath("/panel");
  return true;
}

export async function saveDisplayName(value: string) {
  const displayName = typeof value === "string" ? value.trim() : "";
  if (!displayName || displayName.length > 80) return { error: "Escribe un nombre de hasta 80 caracteres." };
  if (!await updateProfile({ displayName })) return { error: "No se pudo guardar el nombre. Pulsa Enter para reintentar." };
  return { displayName };
}

export async function selectPanelArea(value: string) {
  if (value !== "degree" && value !== "erasmus" && value !== "subjects") return false;
  return updateProfile({ decisionGoal: value });
}
