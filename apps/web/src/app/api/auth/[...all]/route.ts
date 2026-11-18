import { getAuth } from "@/lib/account/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = getAuth();
  if (!auth) return Response.json({ error: "El acceso con cuenta no está disponible." }, { status: 503 });
  return auth.handler(request);
}

export const POST = GET;
