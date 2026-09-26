import { describe, expect, it } from "vitest";
import {
  codificarFotoDePerfil,
  escalaBase,
  FotoGrandeDemais,
  limitarEnquadramento,
  regiaoDeOrigem,
} from "./recorte-de-foto.ts";

describe("escalaBase", () => {
  it("cobre o círculo pelo lado menor da imagem", () => {
    expect(escalaBase(2000, 1000, 250)).toBe(0.25);
    expect(escalaBase(1000, 2000, 250)).toBe(0.25);
  });
});

describe("limitarEnquadramento", () => {
  it("não deixa arrastar além da borda da imagem", () => {
    // Imagem 2000x1000 no círculo de 250: escala 0,25 → 500x250 na tela.
    // Só há folga na horizontal: (500 - 250) / 2 = 125.
    const r = limitarEnquadramento(2000, 1000, 250, { zoom: 1, x: 999, y: 40 });
    expect(r).toEqual({ zoom: 1, x: 125, y: 0 });
  });

  it("a folga cresce com o zoom", () => {
    const r = limitarEnquadramento(1000, 1000, 250, { zoom: 2, x: -999, y: 0 });
    expect(r.x).toBe(-125);
  });

  it("limita o zoom ao intervalo permitido", () => {
    expect(
      limitarEnquadramento(1000, 1000, 250, { zoom: 0.2, x: 0, y: 0 }).zoom,
    ).toBe(1);
    expect(
      limitarEnquadramento(1000, 1000, 250, { zoom: 99, x: 0, y: 0 }).zoom,
    ).toBe(4);
  });
});

describe("regiaoDeOrigem", () => {
  it("sem zoom nem deslocamento, recorta o quadrado central", () => {
    expect(regiaoDeOrigem(2000, 1000, 250, { zoom: 1, x: 0, y: 0 })).toEqual({
      x: 500,
      y: 0,
      lado: 1000,
    });
  });

  it("zoom 2 recorta metade do lado", () => {
    const r = regiaoDeOrigem(1000, 1000, 250, { zoom: 2, x: 0, y: 0 });
    expect(r).toEqual({ x: 250, y: 250, lado: 500 });
  });

  it("empurrar a imagem para a direita mostra a parte esquerda dela", () => {
    const r = regiaoDeOrigem(2000, 1000, 250, { zoom: 1, x: 125, y: 0 });
    expect(r.x).toBe(0);
  });
});

describe("codificarFotoDePerfil", () => {
  const blobDe = (bytes: number) => new Blob([new Uint8Array(bytes)]);

  it("devolve a primeira codificação que cabe", async () => {
    const chamadas: Array<[number, number]> = [];
    const blob = await codificarFotoDePerfil(async (lado, qualidade) => {
      chamadas.push([lado, qualidade]);
      return blobDe(100);
    });
    expect(blob.size).toBe(100);
    expect(chamadas).toEqual([[512, 0.9]]);
  });

  it("baixa a qualidade antes do tamanho", async () => {
    const chamadas: Array<[number, number]> = [];
    await codificarFotoDePerfil(async (lado, qualidade) => {
      chamadas.push([lado, qualidade]);
      return blobDe(qualidade > 0.7 ? 600 * 1024 : 100);
    });
    expect(chamadas.every(([lado]) => lado === 512)).toBe(true);
  });

  it("reduz o lado quando a qualidade não basta", async () => {
    const blob = await codificarFotoDePerfil(async (lado) =>
      blobDe(lado === 512 ? 600 * 1024 : 100),
    );
    expect(blob.size).toBe(100);
  });

  it("falha se nada cabe", async () => {
    await expect(
      codificarFotoDePerfil(async () => blobDe(600 * 1024)),
    ).rejects.toBeInstanceOf(FotoGrandeDemais);
  });
});
