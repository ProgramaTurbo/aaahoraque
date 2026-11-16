"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { academicStages, languageLevels, studentProfiles, type Language } from "@/lib/db/schema";
import { getAccountUser } from "@/lib/account/session";

const stageOptions = new Set<string>(academicStages);
const levelOptions = new Set<string>(languageLevels);

export async function saveProfile(_previous: string, formData: FormData): Promise<string> {
  const user = await getAccountUser();
  if (!user) return "La sesión ha caducado. Vuelve a iniciar sesión.";

  const name = String(formData.get("displayName") ?? "").trim();
  const stage = String(formData.get("academicStage") ?? "");
  const languages: Language[] = [];
  const names = new Set<string>();
  if (name.length > 80 || (stage && !stageOptions.has(stage))) return "Revisa los datos del perfil.";

  for (let i = 0; i < 3; i++) {
    const language = String(formData.get(`language-${i}`) ?? "").trim();
    const level = String(formData.get(`level-${i}`) ?? "");
    if (!language && !level) continue;
    const key = language.toLocaleLowerCase("es");
    if (!language || language.length > 40 || !levelOptions.has(level) || names.has(key)) {
      return "Indica un nivel por idioma y evita repetir idiomas.";
    }
    names.add(key);
    languages.push({ name: language, level: level as Language["level"] });
  }

  const values = {
    displayName: name || null,
    academicStage: stage ? stage as typeof academicStages[number] : null,
    languages,
    updatedAt: new Date(),
  };
  try {
    await db.insert(studentProfiles).values({ userId: user.id, ...values })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: values });
  } catch {
    return "No se ha podido guardar el perfil. Inténtalo de nuevo.";
  }
  revalidatePath("/panel");
  return "Perfil guardado.";
}
