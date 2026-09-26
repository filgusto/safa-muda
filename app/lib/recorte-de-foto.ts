/**
 * Recorte da foto de perfil: geometria e compressão, sem DOM.
 *
 * A foto é exibida em círculo, então o usuário enquadra o rosto num círculo
 * de `diametro` px sobre a imagem. O recorte que sai daqui é sempre um
 * quadrado — o círculo é só máscara na hora de exibir.
 *
 * Como em lib/comprimir-imagem.ts, o codificador entra por parâmetro para a
 * estratégia ser testável sem canvas.
 */

/** Teto da foto de perfil. */
export const LIMITE_DA_FOTO_DE_PERFIL_BYTES = 500 * 1024;

/** Lado do quadrado exportado, do maior para o menor. */
const LADOS_DE_SAIDA_PX = [512, 384, 256, 192] as const;
const QUALIDADES = [0.9, 0.8, 0.7, 0.6, 0.5] as const;

export const ZOOM_MINIMO = 1;
export const ZOOM_MAXIMO = 4;

export type Enquadramento = {
  /** Multiplicador sobre a escala mínima que cobre o círculo. */
  zoom: number;
  /**
   * Deslocamento do centro da imagem em relação ao centro do círculo, em px
   * da tela. Positivo empurra a imagem para a direita / para baixo.
   */
  x: number;
  y: number;
};

/** Escala (px da tela por px da imagem) em que a imagem só cobre o círculo. */
export function escalaBase(
  largura: number,
  altura: number,
  diametro: number,
): number {
  return diametro / Math.min(largura, altura);
}

/** Mantém o círculo inteiro sobre a imagem: sem borda vazia dentro dele. */
export function limitarEnquadramento(
  largura: number,
  altura: number,
  diametro: number,
  { zoom, x, y }: Enquadramento,
): Enquadramento {
  const zoomLimitado = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, zoom));
  const escala = escalaBase(largura, altura, diametro) * zoomLimitado;
  const folgaX = Math.max(0, (largura * escala - diametro) / 2);
  const folgaY = Math.max(0, (altura * escala - diametro) / 2);

  return {
    zoom: zoomLimitado,
    x: Math.min(folgaX, Math.max(-folgaX, x)),
    y: Math.min(folgaY, Math.max(-folgaY, y)),
  };
}

/** Quadrado da imagem original que fica dentro do círculo. */
export function regiaoDeOrigem(
  largura: number,
  altura: number,
  diametro: number,
  { zoom, x, y }: Enquadramento,
): { x: number; y: number; lado: number } {
  const escala = escalaBase(largura, altura, diametro) * zoom;
  const lado = diametro / escala;
  return {
    x: largura / 2 - x / escala - lado / 2,
    y: altura / 2 - y / escala - lado / 2,
    lado,
  };
}

export type CodificadorDeQuadrado = (
  lado: number,
  qualidade: number,
) => Promise<Blob>;

export class FotoGrandeDemais extends Error {
  constructor() {
    super("Não foi possível reduzir esta foto para menos de 500 KB.");
    this.name = "FotoGrandeDemais";
  }
}

/**
 * Primeira combinação de lado e qualidade que cabe em `limite`. Um quadrado
 * de 512 px em JPEG raramente passa de 100 KB; a busca existe para o caso
 * raro (imagem muito ruidosa) não virar recusa.
 */
export async function codificarFotoDePerfil(
  codificar: CodificadorDeQuadrado,
  limite = LIMITE_DA_FOTO_DE_PERFIL_BYTES,
): Promise<Blob> {
  for (const lado of LADOS_DE_SAIDA_PX) {
    for (const qualidade of QUALIDADES) {
      const blob = await codificar(lado, qualidade);
      if (blob.size <= limite) return blob;
    }
  }
  throw new FotoGrandeDemais();
}
