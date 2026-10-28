import type { DegreeSummary } from "./types";

export const chartCriteria = [
  { key: "interests", label: "Intereses (estimación)" },
  { key: "location", label: "Ubicación" },
  { key: "modality", label: "Modalidad" },
] as const;
export type ChartCriterion = typeof chartCriteria[number]["key"];
export type ChartValue = { value: number | null; label: string };

export function numericScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}
export function formatScore(value: number): string {
  return new Intl.NumberFormat("es", { maximumFractionDigits: 1 }).format(value);
}
export function overallChartValue(offering: DegreeSummary): ChartValue {
  const value = numericScore(offering.evaluation?.score);
  return { value, label: value === null ? "Sin puntuación global" : `${formatScore(value)}/100` };
}
export function criterionChartValue(offering: DegreeSummary, criterion: ChartCriterion, activeCriteria?: readonly string[]): ChartValue {
  const value = numericScore(offering.evaluation?.criteria[criterion]);
  if (value !== null) return { value, label: `${formatScore(value)}/100` };
  return { value: null, label: activeCriteria && !activeCriteria.includes(criterion) ? "No utilizado en este perfil" : "Sin datos suficientes" };
}
export function offeringChartLabel(offering: DegreeSummary): string {
  return `${offering.degree.name} · ${offering.university.name} · ${offering.center?.name ?? "Centro sin especificar"}`;
}
// Preserve the engine's order and offering IDs, including ties and nulls.
export function pageChartRows(offerings: readonly DegreeSummary[]) {
  return offerings.map((offering) => ({ id: offering.id, offeringLabel: offeringChartLabel(offering), ...overallChartValue(offering) }));
}
