import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { verificarArmazenamento } from "@/lib/storage.ts";

/**
 * Health check consumido pelo Docker e pelo Traefik.
 *
 * Sem `?deep=1` só confirma que o processo responde e o banco está de pé —
 * é chamado a cada 30s (ver docker-compose.prod.yml), então fica barato.
 * `?deep=1` também confere o MinIO; use num monitor externo, num intervalo
 * maior, não no healthcheck do load balancer.
 */
export async function GET(request: NextRequest) {
  const profundo = request.nextUrl.searchParams.get("deep") === "1";

  const checagens: Record<string, boolean> = {};
  try {
    await db.execute(sql`select 1`);
    checagens.banco = true;
  } catch {
    checagens.banco = false;
  }

  if (profundo) {
    checagens.armazenamento = await verificarArmazenamento();
  }

  const saudavel = Object.values(checagens).every(Boolean);

  return NextResponse.json(
    {
      status: saudavel ? "ok" : "error",
      timestamp: new Date().toISOString(),
      checagens,
    },
    { status: saudavel ? 200 : 503 },
  );
}
