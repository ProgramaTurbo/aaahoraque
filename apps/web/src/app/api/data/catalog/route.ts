import { NextRequest, NextResponse } from "next/server";
import { getCatalogExplorer } from "@/lib/data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const result = await getCatalogExplorer({
      q: params.get("q") ?? "",
      university: params.get("university") ?? "",
      page: Number(params.get("page") ?? 1),
    });

    return NextResponse.json({
      status: "ok",
      ...result,
      provenance: "Catálogo importado de ISTAC/QEDU, con registros provisionales y de demostración",
    });
  } catch (error) {
    console.error("Catalog explorer error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "No se ha podido consultar el catálogo.",
      },
      { status: 503 }
    );
  }
}
