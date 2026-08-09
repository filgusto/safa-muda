import { NextResponse } from "next/server";
import { getViewer, isModerator } from "@/lib/access.ts";
import {
  contarPropostasPendentes,
  contarNotificacoesNaoLidas,
} from "@/lib/wiki.ts";

/**
 * Dados do menu da navegação: quem está logado e os contadores.
 *
 * Existe como rota, e não como Server Component dentro do layout, porque ler a
 * sessão no layout tornaria TODA página dinâmica — inclusive as 442 fichas de
 * espécie, que dependem de ISR para serem indexáveis (ver a decisão em
 * app/(frontend)/catalogo/[slug]/page.tsx).
 */
export async function GET() {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json(
      { autenticado: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const moderador = isModerator(viewer);
  const [pendentes, naoLidas] = await Promise.all([
    moderador ? contarPropostasPendentes() : Promise.resolve(0),
    contarNotificacoesNaoLidas(viewer.id),
  ]);

  return NextResponse.json(
    { autenticado: true, moderador, pendentes, naoLidas },
    { headers: { "Cache-Control": "no-store" } },
  );
}
