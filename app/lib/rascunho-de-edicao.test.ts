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
  local = "",
): AlteracaoDeCampo {
  return {
    rotulo,
    propostos,
    rascunho: {},
    gruposNovos: [],
    fonte,
    local,
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

  it("separa a mesma fonte quando o local da observação é outro", () => {
    const livro = "Livro A, p. 1";
    const propostas = agruparPorFonte([
      alteracao("Estrato", { estrato: "alto" }, livro, "", "Piracicaba, SP"),
      alteracao(
        "Sucessão",
        { sucessao: "climax" },
        livro,
        "",
        "Piracicaba, SP",
      ),
      alteracao("Sistema", { sistema: "abundancia" }, livro, "", "BA"),
    ]);
    expect(propostas).toHaveLength(2);
    expect(propostas.map((p) => p.localDaObservacao)).toEqual([
      "Piracicaba, SP",
      "BA",
    ]);
    expect(propostas[0]!.patch).toEqual({
      estrato: "alto",
      sucessao: "climax",
    });
  });

  it("não manda local quando ele ficou em branco", () => {
    const [proposta] = agruparPorFonte([
      alteracao("Estrato", { estrato: "alto" }, "Livro A, p. 1", "", "  "),
    ]);
    expect(proposta!.localDaObservacao).toBeUndefined();
  });
});
