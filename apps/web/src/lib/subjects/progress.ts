export type SubjectTab = "catalogo" | "expediente" | "preferencias";

export function subjectTab(value: unknown): SubjectTab {
  return value === "expediente" || value === "preferencias" ? value : "catalogo";
}

export const subjectPreferenceFields = [
  "theory_preference", "practice_preference", "project_preference",
  "teamwork_preference", "difficulty_tolerance", "workload_tolerance",
  "academic_affinity", "professional_alignment", "learning_compatibility", "effort_compatibility",
] as const;

export type SubjectPreferenceField = typeof subjectPreferenceFields[number];
export type SubjectPreferences = Record<SubjectPreferenceField, number | null>;
export type SubjectProgress = {
  completed: string[];
  shortlist: string[];
  preferences: SubjectPreferences;
  version: number;
};

export function emptySubjectPreferences() {
  return Object.fromEntries(subjectPreferenceFields.map((field) => [field, null])) as SubjectPreferences;
}

export function normalizeSubjectPreferences(value: unknown) {
  const result = emptySubjectPreferences();
  if (typeof value !== "object" || value === null) return result;

  const record = value as Record<string, unknown>;
  for (const field of subjectPreferenceFields) {
    const score = record[field];
    if (typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= 10) {
      result[field] = score;
    }
  }
  return result;
}

export const preferenceLabels: Record<SubjectPreferenceField, string> = {
  theory_preference: "Fundamentos teóricos",
  practice_preference: "Aplicación práctica",
  project_preference: "Proyectos",
  teamwork_preference: "Trabajo colaborativo",
  difficulty_tolerance: "Exigencia académica asumible",
  workload_tolerance: "Dedicación asumible",
  academic_affinity: "Afinidad académica",
  professional_alignment: "Proyección profesional",
  learning_compatibility: "Forma de aprender",
  effort_compatibility: "Esfuerzo",
};
