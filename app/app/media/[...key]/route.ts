import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/access.ts";
import { podeLerMidia } from "@/lib/visibilidade-de-midia.ts";
import { lerObjeto } from "@/lib/storage.ts";

/**
 * Serve o conteúdo do bucket em /media/<key>.
 *
 * O bucket é privado (ver lib/storage.ts) — sem esta rota no meio, a URL
 * sozinha bastaria para ler a foto de perfil de alguém que marcou "não
 * pública", ou uma foto de um projeto privado. `podeLerMidia` decide quem lê
 * cada arquivo; aqui só busca os bytes e monta a resposta.
 *
 * Os arquivos nunca passam de 1 MB (ver limite-de-upload.ts), então ler o
 * objeto inteiro na memória do processo é aceitável — evita a complexidade de
 * um redirect para URL pré-assinada (que expiraria em cache e recriaria a
 * distinção público/privado em outro lugar).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: partes } = await params;
  const chave = partes.join("/");

  const viewer = await getViewer();
  const visibilidade = await podeLerMidia(chave, viewer);

  if (!visibilidade.ok) {
    return new NextResponse(null, {
      status: visibilidade.motivo === "nao_encontrada" ? 404 : 403,
    });
  }

  const objeto = await lerObjeto(chave);
  if (!objeto) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(objeto.bytes), {
    headers: {
      "Content-Type": objeto.contentType,
      // Pública e com chave opaca (UUID): pode viver no cache por muito
      // tempo. Privada: cache só do navegador de quem tem permissão, nunca
      // num proxy compartilhado.
      "Cache-Control": visibilidade.publica
        ? "public, max-age=31536000, immutable"
        : "private, max-age=60, must-revalidate",
    },
  });
}
