import { NextResponse } from "next/server";

import { getCatalogOfferings } from "@/lib/catalog/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const offerings = await getCatalogOfferings();

    return NextResponse.json({
      status: "ok",
      count: offerings.length,
      data: offerings,
    });
  } catch (error) {
    console.error("Catalog query failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "No se ha podido consultar el catálogo académico.",
      },
      { status: 503 }
    );
  }
}
