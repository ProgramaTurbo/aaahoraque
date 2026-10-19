import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ENGINE_URL =
  process.env.DECISION_ENGINE_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "El cuerpo de la petición debe contener JSON válido.",
      },
      { status: 400 }
    );
  }

  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return NextResponse.json(
      {
        status: "error",
        message: "Se esperaba un objeto JSON.",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${ENGINE_URL}/subjects/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const result = await response.json();

    return NextResponse.json(result, {
      status: response.status,
    });
  } catch (error) {
    console.error("Subjects decision engine request failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message:
          "No se ha podido comunicar con el motor de decisión.",
      },
      { status: 503 }
    );
  }
}
