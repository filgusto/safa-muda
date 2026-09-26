import { LIMITE_DE_UPLOAD_BYTES } from "@/lib/limite-de-upload.ts";

/**
 * Compressão de imagem no navegador, antes do envio.
 *
 * Foto de celular passa fácil de 5 MB; o catálogo aceita até 1 MB. Em vez de
 * recusar, o navegador redesenha a imagem num canvas e a reexporta como JPEG,
 * baixando primeiro a qualidade e depois a resolução até caber. O servidor
 * nunca vê o arquivo original.
 *
 * A busca (`buscarCodificacao`) não conhece canvas — recebe o codificador por
 * parâmetro —, então a estratégia é testável sem navegador.
 */

export { LIMITE_DE_UPLOAD_BYTES } from "@/lib/limite-de-upload.ts";

/**
 * Lado maior de partida. Acima disso a ficha não ganha nada visível (o modal
 * mostra a foto com ~48rem de largura), e começar menor poupa tentativas.
 */
export const LADO_MAXIMO_PX = 2560;

/** Abaixo disso a foto já não serve para identificar a planta. */
export const LADO_MINIMO_PX = 640;

const QUALIDADES = [0.85, 0.75, 0.65, 0.55] as const;
const FATOR_DE_REDUCAO = 0.8;

export type Codificador = (
  largura: number,
  altura: number,
  qualidade: number,
) => Promise<Blob>;

function rotuloDoLimite(limite: number): string {
  return limite >= 1024 * 1024
    ? `${limite / (1024 * 1024)} MB`
    : `${Math.round(limite / 1024)} KB`;
}

export class ImagemGrandeDemais extends Error {
  constructor(limite = LIMITE_DE_UPLOAD_BYTES) {
    super(
      `Não foi possível reduzir esta imagem para menos de ${rotuloDoLimite(limite)} sem perder os detalhes. Tente outra foto.`,
    );
    this.name = "ImagemGrandeDemais";
  }
}

export class ArquivoGrandeDemais extends Error {
  constructor(limite = LIMITE_DE_UPLOAD_BYTES) {
    super(
      `Este arquivo passa de ${rotuloDoLimite(limite)} e não é uma imagem que dê para reduzir.`,
    );
    this.name = "ArquivoGrandeDemais";
  }
}

/**
 * Procura a primeira combinação de resolução e qualidade que caiba no limite.
 * A qualidade cai antes da resolução: JPEG a 0,75 é indistinguível do
 * original a olho nu, enquanto perder pixels apaga nervura de folha.
 */
export async function buscarCodificacao(
  larguraOriginal: number,
  alturaOriginal: number,
  codificar: Codificador,
  limite = LIMITE_DE_UPLOAD_BYTES,
): Promise<{ blob: Blob; largura: number; altura: number }> {
  const ladoOriginal = Math.max(larguraOriginal, alturaOriginal);
  let escala = Math.min(1, LADO_MAXIMO_PX / ladoOriginal);

  while (ladoOriginal * escala >= LADO_MINIMO_PX) {
    const largura = Math.round(larguraOriginal * escala);
    const altura = Math.round(alturaOriginal * escala);

    for (const qualidade of QUALIDADES) {
      const blob = await codificar(largura, altura, qualidade);
      if (blob.size <= limite) return { blob, largura, altura };
    }

    escala *= FATOR_DE_REDUCAO;
  }

  throw new ImagemGrandeDemais(limite);
}

/**
 * Devolve um arquivo de até `limite` bytes (1 MB por padrão) pronto para
 * envio. Se o original já cabe, vai como está — recomprimir só perderia
 * qualidade.
 */
export async function comprimirParaEnvio(
  arquivo: File,
  limite = LIMITE_DE_UPLOAD_BYTES,
): Promise<File> {
  if (arquivo.size <= limite) return arquivo;
  if (!arquivo.type.startsWith("image/")) {
    // Não deveria acontecer: a rota de upload só aceita imagem. Se um dia
    // aceitar outra coisa, é melhor falhar claro do que enviar 20 MB.
    throw new ArquivoGrandeDemais(limite);
  }

  // `from-image` aplica a rotação do EXIF: foto de celular em pé não sai
  // deitada. O EXIF em si não sobrevive ao canvas, o que também descarta a
  // localização GPS gravada pela câmera.
  const bitmap = await createImageBitmap(arquivo, {
    imageOrientation: "from-image",
  }).catch(() => {
    // AVIF e HEIC dependem do navegador; sem decodificador, não há o que
    // redesenhar.
    throw new Error("Este navegador não conseguiu abrir esta imagem.");
  });

  try {
    const { blob } = await buscarCodificacao(
      bitmap.width,
      bitmap.height,
      (largura, altura, qualidade) =>
        desenharComoJpeg(bitmap, largura, altura, qualidade),
      limite,
    );

    const nome = arquivo.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${nome}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

function desenharComoJpeg(
  bitmap: ImageBitmap,
  largura: number,
  altura: number,
  qualidade: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d");
  if (!contexto)
    throw new Error("O navegador não permitiu processar a imagem.");

  // JPEG não tem transparência: sem fundo, o PNG recortado sairia com preto
  // onde era transparente.
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, largura, altura);
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(bitmap, 0, 0, largura, altura);

  return new Promise((resolver, rejeitar) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolver(blob)
          : rejeitar(new Error("Falha ao processar a imagem.")),
      "image/jpeg",
      qualidade,
    ),
  );
}
