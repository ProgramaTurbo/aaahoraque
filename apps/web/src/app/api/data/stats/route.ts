import { NextResponse } from "next/server";

import { getDataStats } from "@/lib/data/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDataStats();

    return NextResponse.json({
      status: "ok",
      data,
      provenance: {
        catalog: "ISTAC / QEDU, registros provisionales y demostración",
        synthetic: "Datos artificiales generados para desarrollo",
      },
    });
  } catch (error) {
    console.error("Error loading data statistics:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "No se han podido recuperar las estadísticas.",
      },
      { status: 503 }
    );
  }
}
