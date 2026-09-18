import { describe, expect, it } from "vitest";
import {
  buscarCodificacao,
  ImagemGrandeDemais,
  LADO_MAXIMO_PX,
  LIMITE_DE_UPLOAD_BYTES,
  type Codificador,
} from "./comprimir-imagem.ts";

/**
 * Codificador falso: o "arquivo" tem bytes proporcionais aos pixels e à
 * qualidade, o que basta para exercitar a ordem das tentativas.
 */
function codificadorProporcional(bytesPorPixel: number) {
  const tentativas: { largura: number; altura: number; qualidade: number }[] =
    [];
  const codificar: Codificador = async (largura, altura, qualidade) => {
    tentativas.push({ largura, altura, qualidade });
    const tamanho = Math.round(largura * altura * bytesPorPixel * qualidade);
    return new Blob([new Uint8Array(tamanho)]);
  };
  return { codificar, tentativas };
}

describe("buscarCodificacao", () => {
  it("parte do lado máximo, mesmo que o original seja maior", async () => {
    const { codificar, tentativas } = codificadorProporcional(0.01);

    const { largura, altura } = await buscarCodificacao(4000, 3000, codificar);

    expect(largura).toBe(LADO_MAXIMO_PX);
    expect(altura).toBe(1920);
    expect(tentativas).toHaveLength(1);
  });

  it("baixa a qualidade antes de baixar a resolução", async () => {
    // 2560×1920 a 0,85 dá ~1,25 MB; a 0,65 cabe.
    const { codificar, tentativas } = codificadorProporcional(0.3);

    const { largura, blob } = await buscarCodificacao(2560, 1920, codificar);

    expect(largura).toBe(2560);
    expect(blob.size).toBeLessThanOrEqual(LIMITE_DE_UPLOAD_BYTES);
    expect(tentativas.map((t) => t.qualidade)).toEqual([0.85, 0.75, 0.65]);
  });

  it("reduz a resolução quando nenhuma qualidade basta", async () => {
    const { codificar, tentativas } = codificadorProporcional(0.6);

    const { largura, blob } = await buscarCodificacao(2560, 1920, codificar);

    expect(largura).toBeLessThan(2560);
    expect(blob.size).toBeLessThanOrEqual(LIMITE_DE_UPLOAD_BYTES);
    // As quatro qualidades na resolução cheia falharam antes de reduzir.
    expect(tentativas.slice(0, 4).every((t) => t.largura === 2560)).toBe(true);
  });

  it("preserva a proporção da imagem", async () => {
    const { codificar } = codificadorProporcional(0.6);

    const { largura, altura } = await buscarCodificacao(1500, 3000, codificar);

    expect(largura / altura).toBeCloseTo(0.5, 2);
  });

  it("desiste em vez de entregar uma miniatura", async () => {
    const { codificar } = codificadorProporcional(100);

    await expect(buscarCodificacao(4000, 3000, codificar)).rejects.toThrow(
      ImagemGrandeDemais,
    );
  });
});
