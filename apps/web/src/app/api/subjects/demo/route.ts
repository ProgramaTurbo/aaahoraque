import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENGINE_URL =
  process.env.DECISION_ENGINE_URL ?? "http://127.0.0.1:8000";

export async function POST() {
  // Este endpoint solo sirve para el entorno de desarrollo.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Demostración no disponible en producción." },
      { status: 404 }
    );
  }

  try {
    const examplePath = resolve(
      process.cwd(),
      "../../examples/subjects/example_analysis.json"
    );

    const input = JSON.parse(
      await readFile(examplePath, "utf-8")
    );

    const response = await fetch(
      `${ENGINE_URL}/subjects/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    const analysis = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: "El motor no ha podido completar el análisis.",
          detail: analysis,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      status: "ok",
      source: "synthetic_demo",
      input,
      analysis,
    });
  } catch (error) {
    console.error("Subjects demo failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "No se ha podido ejecutar la demostración.",
      },
      { status: 503 }
    );
  }
}
