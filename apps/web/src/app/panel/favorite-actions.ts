"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { degreeOfferings, studentFavorites, studyPlans, subjects } from "@/lib/db/schema";
import { uuidPattern } from "@/lib/account/profile";
import { getAccountUser } from "@/lib/account/session";
import { safeSourceUrl } from "@/lib/subjects/student-decisions";

type FavoriteInput = { kind: "offering" | "subject"; id: string } | { kind: "destination"; name: string; url: string };

export async function addFavorite(input: FavoriteInput) {
  const user = await getAccountUser();
  if (!user) return { error: "Inicia sesión para guardar favoritos." };
  if (!input) return { error: "Favorito inválido." };
  let value: typeof studentFavorites.$inferInsert;
  if (input.kind === "destination") {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const url = input.url ? safeSourceUrl(input.url) : null;
    if (!name || name.length > 120) return { error: "Escribe un destino de hasta 120 caracteres." };
    if (input.url && !url?.startsWith("https://")) return { error: "Introduce una dirección HTTPS válida o deja ese campo vacío." };
    value = { userId: user.id, destination: name, destinationUrl: url };
  } else {
    if (typeof input.id !== "string" || !uuidPattern.test(input.id)) return { error: "Favorito inválido." };
    if (input.kind === "offering") {
      const [offering] = await db.select({ id: degreeOfferings.id }).from(degreeOfferings).where(eq(degreeOfferings.id, input.id));
      if (!offering) return { error: "La titulación ya no está disponible." };
      value = { userId: user.id, offeringId: offering.id };
    } else if (input.kind === "subject") {
      const [subject] = await db.select({ id: subjects.id }).from(subjects)
        .innerJoin(studyPlans, eq(studyPlans.id, subjects.studyPlanId))
        .where(and(eq(subjects.id, input.id), eq(studyPlans.status, "official")));
      if (!subject) return { error: "La asignatura debe pertenecer a un plan oficial." };
      value = { userId: user.id, subjectId: subject.id };
    } else return { error: "Favorito inválido." };
  }
  await db.insert(studentFavorites).values(value).onConflictDoNothing();
  revalidatePath("/panel");
  revalidatePath("/subjects/decision");
  return { saved: true };
}

export async function removeFavorite(id: string) {
  const user = await getAccountUser();
  if (!user) return { error: "Inicia sesión." };
  if (typeof id !== "string" || !uuidPattern.test(id)) return { error: "Favorito inválido." };
  await db.delete(studentFavorites).where(and(eq(studentFavorites.userId, user.id), eq(studentFavorites.id, id)));
  revalidatePath("/panel");
  revalidatePath("/subjects/decision");
  return { removed: true };
}
