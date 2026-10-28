import { getDegreePage, getDegreeUniversities } from "@/lib/catalog/degrees";
export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? 1);
  const university = params.get("university");
  const query = (params.get("q") ?? "").trim();
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || query.length > 200 || (university && !uuid.test(university))) {
    return Response.json({ error: "Filtros no válidos" }, { status: 400 });
  }
  try {
    const [result, universities] = await Promise.all([
      getDegreePage(query, university, page),
      params.get("universities") === "1" ? getDegreeUniversities() : Promise.resolve(undefined),
    ]);
    return Response.json({ ...result, universities });
  } catch {
    return Response.json({ error: "No se puede consultar el catálogo" }, { status: 503 });
  }
}
