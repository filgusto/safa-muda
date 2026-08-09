import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/index.ts";

/** Health check consumido pelo Docker e pelo Traefik. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
