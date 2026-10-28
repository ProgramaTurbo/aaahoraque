import { getOrientationCandidates, getDegreeUniversities } from "@/lib/catalog/degrees";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud no válida" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Datos no válidos" }, { status: 400 });
  const page = body.page ?? 1;
  if (!body.profile || !Number.isSafeInteger(page) || page < 1 || page > 100000 || typeof (body.q ?? "") !== "string" || (body.q ?? "").length > 200) return Response.json({ error: "Datos no válidos" }, { status: 400 });
  try {
    const candidates = await getOrientationCandidates();
    const engine = await fetch(`${process.env.DECISION_ENGINE_URL ?? "http://127.0.0.1:8000"}/degrees/orient`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ profile: body.profile, alternatives: candidates.map((c) => ({ id: c.id, name: c.degree.name, province: c.province, modality: c.modality })) }),
    });
    if (engine.status === 422) return Response.json({ error: "Revisa las respuestas del test" }, { status: 400 });
    if (!engine.ok) throw new Error("Engine unavailable");
    const result = await engine.json();
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const query = (body.q ?? "").trim().toLocaleLowerCase("es");
    const ranked = result.alternatives.flatMap((evaluation: { id: string }) => {
      const c = byId.get(evaluation.id);
      if (!c || (body.university && c.university.id !== body.university)) return [];
      if (query && !`${c.degree.name} ${c.university.name} ${c.center?.name ?? ""}`.toLocaleLowerCase("es").includes(query)) return [];
      return [{ ...c, evaluation }];
    });
    return Response.json({ data: ranked.slice((page - 1) * 12, page * 12), hasMore: ranked.length > page * 12,
      excluded: result.excluded, total: ranked.length, activeCriteria: result.active_criteria,
      universities: body.universities ? await getDegreeUniversities() : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "No se pudo calcular la orientación. Comprueba que el motor de decisiones está disponible e inténtalo de nuevo." }, { status: 503 });
  }
}
