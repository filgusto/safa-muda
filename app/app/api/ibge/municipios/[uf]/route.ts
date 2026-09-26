import { NextResponse } from "next/server";
import { listarEstados, listarMunicipios } from "@/lib/ibge.ts";

/** Municípios de uma UF, para o seletor de região em /conta. */
export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ uf: string }> },
) {
  const { uf } = await params;
  const sigla = uf.toUpperCase();

  try {
    // Só repassa UFs de verdade: nada de montar caminho arbitrário no IBGE.
    const estados = await listarEstados();
    if (!estados.some((estado) => estado.sigla === sigla)) {
      return NextResponse.json({ error: "UF inválida" }, { status: 404 });
    }

    return NextResponse.json(await listarMunicipios(sigla), {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (erro) {
    console.error("Falha ao consultar os municípios no IBGE:", erro);
    return NextResponse.json({ error: "IBGE indisponível" }, { status: 502 });
  }
}
