import sharp from "sharp";
import { LIMITE_DE_UPLOAD_BYTES } from "@/lib/limite-de-upload.ts";

/**
 * Compressão de imagem no servidor — mesma estratégia de
 * `lib/comprimir-imagem.ts` (qualidade antes de resolução), usada quando o
 * arquivo não passa pelo navegador do usuário, como na importação de uma
 * foto do Wikimedia Commons.
 */

const LADO_MAXIMO_PX = 2560;
const LADO_MINIMO_PX = 640;
const QUALIDADES = [85, 75, 65, 55] as const;
const FATOR_DE_REDUCAO = 0.8;

export class ImagemGrandeDemais extends Error {
  constructor() {
    super(
      "Não foi possível reduzir esta imagem para menos de 1 MB sem perder os detalhes.",
    );
    this.name = "ImagemGrandeDemais";
  }
}

export interface ImagemComprimida {
  buffer: Buffer;
  mimeType: "image/jpeg";
  largura: number;
  altura: number;
}

/** Reduz a imagem a até `LIMITE_DE_UPLOAD_BYTES`, se já não couber. */
export async function comprimirParaArmazenar(
  bytes: Buffer,
): Promise<ImagemComprimida> {
  // A rotação do EXIF é aplicada uma vez e descartada — igual ao canvas do
  // navegador, que também não preserva metadados de orientação/GPS.
  const original = sharp(bytes).rotate();
  const metadata = await original.metadata();
  const larguraOriginal = metadata.width ?? 0;
  const alturaOriginal = metadata.height ?? 0;
  if (larguraOriginal === 0 || alturaOriginal === 0) {
    throw new Error("Não foi possível ler as dimensões da imagem.");
  }

  if (bytes.length <= LIMITE_DE_UPLOAD_BYTES) {
    const buffer = await sharp(bytes).rotate().jpeg({ quality: 90 }).toBuffer();
    if (buffer.length <= LIMITE_DE_UPLOAD_BYTES) {
      return {
        buffer,
        mimeType: "image/jpeg",
        largura: larguraOriginal,
        altura: alturaOriginal,
      };
    }
  }

  const ladoOriginal = Math.max(larguraOriginal, alturaOriginal);
  let escala = Math.min(1, LADO_MAXIMO_PX / ladoOriginal);

  while (ladoOriginal * escala >= LADO_MINIMO_PX) {
    const largura = Math.round(larguraOriginal * escala);
    const altura = Math.round(alturaOriginal * escala);

    for (const qualidade of QUALIDADES) {
      const buffer = await sharp(bytes)
        .rotate()
        .resize(largura, altura, { fit: "inside" })
        .jpeg({ quality: qualidade })
        .toBuffer();
      if (buffer.length <= LIMITE_DE_UPLOAD_BYTES) {
        return { buffer, mimeType: "image/jpeg", largura, altura };
      }
    }
    escala *= FATOR_DE_REDUCAO;
  }

  throw new ImagemGrandeDemais();
}
