import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await db.execute(
      sql`SELECT current_database() AS database_name, current_schema() AS schema_name`
    );

    return NextResponse.json({
      status: "ok",
      database: result[0]?.database_name,
      schema: result[0]?.schema_name,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      { status: "error", message: "Database connection failed" },
      { status: 503 }
    );
  }
}
