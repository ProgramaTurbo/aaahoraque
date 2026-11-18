import { migrateOrientationProfile, toOrientationEngineProfile, profileValidationMessages } from "@/features/degrees/orientation-profile";
import type { DegreeQeduData } from "@/features/degrees/types";
import { getOrientationCandidates, getDegreeUniversities, getDegreeCutoffs } from "@/lib/catalog/degrees";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud no válida" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Datos no válidos" }, { status: 400 });
  const page = body.page ?? 1;
  if (!body.profile || typeof body.profile !== "object" || Array.isArray(body.profile) || !Number.isSafeInteger(page) || page < 1 || page > 100000 || typeof (body.q ?? "") !== "string" || (body.q ?? "").length > 200) return Response.json({ error: "Datos no válidos" }, { status: 400 });
  const profile = migrateOrientationProfile(body.profile);
  const validation = profileValidationMessages(profile);
  if (validation.length) return Response.json({ error: validation.join(" ") }, { status: 400 });
  try {
    const candidates = await getOrientationCandidates();
    const engine = await fetch(`${process.env.DECISION_ENGINE_URL ?? "http://127.0.0.1:8000"}/degrees/orient`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ profile: toOrientationEngineProfile(profile), alternatives: candidates.map((c) => ({ id: c.id, name: c.degree.name, province: c.province, modality: c.modality })) }),
    });
    if (engine.status === 422) return Response.json({ error: "Revisa las respuestas del test" }, { status: 400 });
    if (!engine.ok) throw new Error("Engine unavailable");
    const result = await engine.json();
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const query = (body.q ?? "").trim().toLocaleLowerCase("es");
    const evaluations: { id: string; score: number | null; areas: string[] }[] = result.alternatives;
    const ranked = evaluations.flatMap((evaluation) => {
      const c = byId.get(evaluation.id);
      if (!c || (body.university && c.university.id !== body.university)) return [];
      if (query && !`${c.degree.name} ${c.university.name} ${c.center?.name ?? ""}`.toLocaleLowerCase("es").includes(query)) return [];
      return [{ ...c, evaluation }];
    });
    const recommendationsByArea: Record<string, typeof ranked> = Object.create(null);
    if (body.groupByArea === true) {
      for (const offering of ranked) {
        if (!Number.isFinite(offering.evaluation.score)) continue;
        for (const area of offering.evaluation.areas) {
          const recommendations = recommendationsByArea[area] ??= [];
          if (recommendations.length < 3 && !recommendations.some((item) => item.degree.id === offering.degree.id)) {
            recommendations.push(offering);
          }
        }
      }
    }
    const recommendedDegreeIds = new Set(Object.values(recommendationsByArea).flat().map(({ degree }) => degree.id));
    const evaluatedById = new Map(ranked.map(({ id, evaluation }) => [id, evaluation]));
    const offeringsByDegree: Record<string, Array<(typeof candidates)[number] & { evaluation?: (typeof ranked)[number]["evaluation"]; cutoff?: DegreeQeduData }>> = Object.create(null);
    const recommendedOffers = candidates.filter(({ degree }) => recommendedDegreeIds.has(degree.id));
    const cutoffs = await getDegreeCutoffs(recommendedOffers.map(({ id }) => id)).catch((error) => {
      console.error("No se pudieron cargar las notas de corte de QEDU", error instanceof Error ? error.name : "Error");
      return null;
    });
    for (const candidate of recommendedOffers) {
      (offeringsByDegree[candidate.degree.id] ??= []).push({
        ...candidate,
        evaluation: evaluatedById.get(candidate.id),
        cutoff: cutoffs?.get(candidate.id),
      });
    }
    return Response.json({ cutoffsUnavailable: cutoffs === null, offeringsByDegree: body.groupByArea === true ? offeringsByDegree : undefined, recommendationsByArea: body.groupByArea === true ? recommendationsByArea : undefined, data: body.groupByArea === true ? [] : ranked.slice((page - 1) * 12, page * 12), hasMore: body.groupByArea !== true && ranked.length > page * 12,
      excluded: result.excluded, total: ranked.length, activeCriteria: result.active_criteria, areaInterestScores: result.area_interest_scores,
      universities: body.universities ? await getDegreeUniversities() : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "No se pudo calcular la orientación. Comprueba que el motor de decisiones está disponible e inténtalo de nuevo." }, { status: 503 });
  }
}
