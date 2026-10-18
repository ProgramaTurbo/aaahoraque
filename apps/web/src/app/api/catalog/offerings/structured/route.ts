import { NextResponse } from "next/server";

import { getStructuredCatalog } from "@/lib/catalog/structured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const offerings = await getStructuredCatalog();

    return NextResponse.json({
      status: "ok",
      count: offerings.length,
      data: offerings,
    });
  } catch (error) {
    console.error("Structured catalog query failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "No se ha podido consultar el catálogo académico.",
      },
      { status: 503 }
    );
  }
}
