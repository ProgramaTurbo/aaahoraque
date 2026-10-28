import { getDegreePlans } from "@/lib/catalog/degrees";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("offering") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "Oferta no válida" }, { status: 400 });
  }
  try { return Response.json({ data: await getDegreePlans(id) }); }
  catch { return Response.json({ error: "No se pueden consultar los planes" }, { status: 503 }); }
}
