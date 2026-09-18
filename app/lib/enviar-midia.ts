import { comprimirParaEnvio } from "@/lib/comprimir-imagem.ts";

/**
 * Caminho único de envio de arquivo do navegador ao MinIO.
 *
 * Todo formulário que envia imagem passa por aqui — catálogo, diário de campo
 * e o que vier depois — para que a redução a 1 MB (ver comprimir-imagem.ts)
 * valha em todo o site, e não só onde alguém lembrou de aplicá-la.
 *
 * O arquivo vai direto ao MinIO por URL pré-assinada: uma foto de celular
 * nunca passa pela memória do processo Next.
 */
export async function enviarMidia(
  original: File,
  alt?: string,
): Promise<{ mediaId: string; publicUrl: string; arquivo: File }> {
  const arquivo = await comprimirParaEnvio(original);

  const preparo = await fetch("/api/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: arquivo.name,
      contentType: arquivo.type,
      size: arquivo.size,
      alt,
    }),
  });

  if (!preparo.ok) {
    const corpo = await preparo.json().catch(() => null);
    throw new Error(corpo?.error ?? "Falha ao preparar o envio.");
  }

  const { mediaId, uploadUrl, publicUrl } = await preparo.json();

  const envio = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": arquivo.type },
    body: arquivo,
  });
  if (!envio.ok) throw new Error("Falha ao enviar a imagem.");

  return { mediaId, publicUrl, arquivo };
}
