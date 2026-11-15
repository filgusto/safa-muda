import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { verificarArmazenamento } from "@/lib/storage.ts";
import { verificarDisco } from "@/lib/disco.ts";
import { registrarErro } from "@/lib/observabilidade.ts";

/**
 * Health check consumido pelo Docker e pelo Traefik.
 *
 * Sem `?deep=1` só confirma que o processo responde e o banco está de pé —
 * é chamado a cada 30s (ver docker-compose.prod.yml), então fica barato.
 * `?deep=1` também confere o Garage e o espaço livre em disco (lib/disco.ts);
 * use num monitor externo, num intervalo maior, não no healthcheck do load
 * balancer. A resposta é pública, então só diz ok/falha — os números vão
 * para o log.
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
    try {
      const disco = await verificarDisco();
      checagens.disco = disco.ok;
      if (!disco.ok) {
        registrarErro("saude.disco_baixo", {
          livrePct: disco.livrePct,
          livreGb: disco.livreGb,
        });
      }
    } catch (erro) {
      checagens.disco = false;
      registrarErro("saude.disco_ilegivel", {}, erro);
    }
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
