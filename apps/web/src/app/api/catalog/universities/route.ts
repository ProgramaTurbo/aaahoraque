import { NextResponse } from "next/server";
import { and, asc, eq, like } from "drizzle-orm";

import { db } from "@/lib/db";
import { universities } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await db
      .select({
        id: universities.id,
        name: universities.officialName,
        officialCode: universities.officialCode,
        countryCode: universities.countryCode,
        city: universities.city,
        websiteUrl: universities.websiteUrl,
        sourceUrl: universities.sourceUrl,
      })
      .from(universities)
      .where(
        and(
          eq(universities.countryCode, "ES"),
          like(
            universities.officialCode,
            "ISTAC:CL_RUCT_UNIVERSIDADES:%"
          )
        )
      )
      .orderBy(asc(universities.officialName));

    return NextResponse.json({
      status: "ok",
      source: "ISTAC:CL_RUCT_UNIVERSIDADES:01.000",
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error loading universities:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "No se ha podido consultar el catálogo universitario.",
      },
      { status: 500 }
    );
  }
}
