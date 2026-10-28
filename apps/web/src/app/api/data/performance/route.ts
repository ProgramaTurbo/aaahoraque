import { NextResponse } from "next/server";
import { getSyntheticPerformance } from "@/lib/data/performance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      status: "ok",
      data: await getSyntheticPerformance(),
    });
  } catch (error) {
    console.error("Synthetic performance query failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "No se han podido recuperar las estadísticas.",
      },
      { status: 503 }
    );
  }
}
