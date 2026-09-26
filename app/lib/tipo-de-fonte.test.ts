import { describe, expect, it } from "vitest";
import { lerFonte, montarFonte } from "./tipo-de-fonte.ts";

describe("montarFonte", () => {
  it("junta o rótulo do tipo ao detalhe", () => {
    expect(montarFonte("livro", " Lorenzi, vol. 1, p. 142 ")).toBe(
      "Livro: Lorenzi, vol. 1, p. 142",
    );
  });

  it("observação de campo vale sozinha, com ou sem detalhe", () => {
    expect(montarFonte("observacao_de_campo", "")).toBe("Observação de campo");
    expect(montarFonte("observacao_de_campo", "sistema de 5 anos")).toBe(
      "Observação de campo: sistema de 5 anos",
    );
  });

  it("os demais tipos ficam incompletos sem detalhe", () => {
    expect(montarFonte("livro", "  ")).toBe("");
    expect(montarFonte("artigo", "")).toBe("");
  });

  it("'outro' grava o texto como veio, sem rótulo", () => {
    expect(montarFonte("outro", "Caderno de campo da cooperativa")).toBe(
      "Caderno de campo da cooperativa",
    );
  });

  it("sem tipo, não há fonte", () => {
    expect(montarFonte("", "qualquer coisa")).toBe("");
  });
});

describe("lerFonte", () => {
  it("desfaz o que montarFonte fez", () => {
    for (const [tipo, detalhe] of [
      ["livro", "Lorenzi, p. 142"],
      ["artigo", "Silva et al. 2020"],
      ["instituicao", "Embrapa, Cultivo do abacateiro"],
      ["relato", "produtor de Ibiúna"],
      ["site", "GBIF"],
      ["observacao_de_campo", "sistema de 5 anos"],
      ["observacao_de_campo", ""],
    ] as const) {
      expect(lerFonte(montarFonte(tipo, detalhe))).toEqual({ tipo, detalhe });
    }
  });

  it("texto de outra origem vira 'outro', sem perder nada", () => {
    expect(lerFonte("Messerschmidt, tabela 4")).toEqual({
      tipo: "outro",
      detalhe: "Messerschmidt, tabela 4",
    });
  });

  it("um rótulo sem os dois-pontos não é o tipo", () => {
    expect(lerFonte("Livro do Neto, cap. 10").tipo).toBe("outro");
  });

  it("vazio é sem tipo", () => {
    expect(lerFonte("  ")).toEqual({ tipo: "", detalhe: "" });
  });
});
