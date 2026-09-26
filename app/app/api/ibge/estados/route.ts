import { NextResponse } from "next/server";
import { listarEstados } from "@/lib/ibge.ts";

/** Estados, para o seletor de região em /conta. */
export async function GET() {
  try {
    return NextResponse.json(await listarEstados(), {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (erro) {
    console.error("Falha ao consultar os estados no IBGE:", erro);
    return NextResponse.json({ error: "IBGE indisponível" }, { status: 502 });
  }
}
