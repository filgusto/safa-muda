import { describe, it, expect } from "vitest";
import {
  formasDeVidaDoPerfil,
  mapearDuracaoUsda,
  mapearFormaDeVidaFfb,
  nomeDaUsda,
  normalizarNome,
} from "./tracos-externos.ts";

describe("mapearFormaDeVidaFfb", () => {
  it("converte o vocabulário da FFB no enum", () => {
    expect(
      mapearFormaDeVidaFfb(["Arbusto", "Árvore", "Liana/volúvel/trepadeira"]),
    ).toEqual({ habito: ["arbusto", "arvore", "liana"], ignorados: [] });
  });

  it("deixa à parte o que o enum não tem, sem palpite", () => {
    expect(mapearFormaDeVidaFfb(["Erva", "Talosa"])).toEqual({
      habito: ["erva"],
      ignorados: ["Talosa"],
    });
  });
});

describe("mapearDuracaoUsda", () => {
  it("converte a Duration da USDA e ignora o resto", () => {
    expect(mapearDuracaoUsda(["Annual", "Perennial", "Unknown"])).toEqual([
      "anual",
      "perene",
    ]);
  });

  it("não deduz nada de lista vazia", () => {
    expect(mapearDuracaoUsda([])).toEqual([]);
  });
});

describe("formasDeVidaDoPerfil", () => {
  it("lê o JSON que a FFB publica no GBIF", () => {
    expect(
      formasDeVidaDoPerfil('{"lifeForm":["Palmeira"],"habitat":["Terrícola"]}'),
    ).toEqual(["Palmeira"]);
  });

  it("perfil só com vegetação ou texto inválido não traz forma", () => {
    expect(
      formasDeVidaDoPerfil('{"vegetationType":["Área Antrópica"]}'),
    ).toEqual([]);
    expect(formasDeVidaDoPerfil("Árbol")).toEqual([]);
  });
});

describe("nomes", () => {
  it("tira cultivar, marcador de categoria e sinal de híbrido", () => {
    expect(normalizarNome("Musa acuminata 'Dwarf Cavendish'")).toBe(
      "musa acuminata",
    );
    expect(normalizarNome("Citrus × limonia")).toBe("citrus limonia");
    expect(normalizarNome("Prunus persica var. nucipersica")).toBe(
      "prunus persica nucipersica",
    );
  });

  it("extrai da USDA só o nome, sem autoria", () => {
    expect(nomeDaUsda("<i>Coriandrum sativum</i> L.")).toBe(
      "coriandrum sativum",
    );
    expect(
      nomeDaUsda(
        "<i>Persea americana</i> Mill. var. <i>drymifolia</i> (Schltdl. & Cham.) S.F. Blake",
      ),
    ).toBe("persea americana drymifolia");
  });
});
