import { describe, it, expect } from "vitest";
import {
  agruparPorFonte,
  type AlteracaoDeCampo,
} from "./rascunho-de-edicao.ts";

function alteracao(
  rotulo: string,
  propostos: Record<string, unknown>,
  fonte: string,
  justificativa = "",
): AlteracaoDeCampo {
  return {
    rotulo,
    propostos,
    rascunho: {},
    gruposNovos: [],
    fonte,
    justificativa,
    resumo: "",
  };
}

describe("agruparPorFonte", () => {
  it("junta numa proposta só os campos tirados da mesma fonte", () => {
    const livro = "Agroflorestando o Mundo, p. 120";
    expect(
      agruparPorFonte([
        alteracao("Estrato", { estrato: "alto" }, livro),
        alteracao("Sucessão", { sucessao: "climax" }, ` ${livro} `),
      ]),
    ).toEqual([
      {
        patch: { estrato: "alto", sucessao: "climax" },
        fonte: livro,
        justificativa: undefined,
      },
    ]);
  });

  it("separa em propostas diferentes as fontes diferentes", () => {
    const propostas = agruparPorFonte([
      alteracao("Estrato", { estrato: "alto" }, "Livro A, p. 1"),
      alteracao("Família", { familia: "Lauraceae" }, "Flora do Brasil 2020"),
    ]);
    expect(propostas).toHaveLength(2);
    expect(propostas.map((p) => p.fonte)).toEqual([
      "Livro A, p. 1",
      "Flora do Brasil 2020",
    ]);
  });

  it("identifica pelo rótulo a observação de cada campo", () => {
    const [proposta] = agruparPorFonte([
      alteracao("Estrato", { estrato: "alto" }, "Livro A, p. 1", "Vi no campo"),
      alteracao("Sistema", { sistema: "abundancia" }, "Livro A, p. 1"),
      alteracao("Família", { familia: "X" }, "Livro A, p. 1", "Grafia nova"),
    ]);
    expect(proposta!.justificativa).toBe(
      "Estrato: Vi no campo\nFamília: Grafia nova",
    );
  });
});
