export const periods = ["1", "2", "annual"] as const;
export type Period = typeof periods[number];
export type DecisionDraft = { period: Period; target: number; subjectIds: string[] };
export type DecisionSubject = {
  id: string;
  name: string;
  code: string | null;
  ects: number;
  year: number | null;
  semester: string | null;
  type: string | null;
  sourceUrl: string | null;
  knownUnavailable: boolean;
};
export type OfficialEvidence = {
  subjectId: string;
  guide: { program: string; assessment: string; sourceUrl: string } | null;
  grades: { course: string; passed: number; total: number; sourceUrl: string }[];
};
export const periodNames: Record<Period, string> = {
  "1": "Primer semestre", "2": "Segundo semestre", annual: "Curso completo",
};
export const subjectTypes: Record<string, string> = {
  basic: "Formación básica", mandatory: "Obligatoria", optional: "Optativa", internship: "Prácticas", final_project: "Trabajo final",
};
export const creditsFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

export function isPeriod(value: unknown): value is Period {
  return value === "1" || value === "2" || value === "annual";
}

export function semesterName(value: string | null) {
  return value === "annual" ? "Anual" : value === "1" || value === "2" ? periodNames[value] : value ?? "Periodo sin confirmar";
}

export function selectionCredits(subjects: DecisionSubject[]) {
  return subjects.reduce((sum, subject) => sum + Math.round(subject.ects * 100), 0) / 100;
}

export type DecisionTab = "decidir" | "semestre" | "escenarios";

export function decisionPath(planId: string, tab?: DecisionTab, scenarioId?: string) {
  const params = new URLSearchParams({ plan: planId });
  if (tab) params.set("tab", tab);
  if (scenarioId) params.set("scenario", scenarioId);
  return `/subjects/decision?${params}`;
}

export function isOutsidePeriod(subject: DecisionSubject, period: Period) {
  return period !== "annual" && subject.semester !== null &&
    ["1", "2"].includes(subject.semester) && subject.semester !== period;
}
