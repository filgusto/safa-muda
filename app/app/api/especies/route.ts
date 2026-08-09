import { NextResponse } from "next/server";
import { buscarEspecies, lerFiltros } from "@/lib/catalogo.ts";

/**
 * Busca de espécies para o painel acoplado à timeline.
 *
 * Existe como rota porque o painel é client-side: filtrar ali não pode
 * recarregar a página, senão o usuário perde a posição de rolagem da timeline
 * no meio do desenho.
 *
 * Leitura pública, como o resto do catálogo.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filtros = lerFiltros(Object.fromEntries(url.searchParams));

  const especies = await buscarEspecies(filtros);

  // Só o que a timeline precisa — o payload completo de 442 espécies seria
  // desperdício num painel que mostra nome, estrato e ciclo.
  return NextResponse.json(
    especies.slice(0, 100).map((especie) => ({
      id: especie.id,
      slug: especie.slug,
      nomeComum: especie.nomeComum,
      nomeCientifico: especie.nomeCientifico,
      estrato: especie.estrato,
      sucessao: especie.sucessao,
      grupos: especie.grupos,
      diasParaColherMax: especie.diasParaColherMax,
    })),
  );
}
