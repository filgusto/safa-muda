import { describe, it, expect } from "vitest";
import { calcularPatch, CAMPOS, CAMPOS_POR_CHAVE } from "./especie-schema.ts";
import { chaveDeFonte, proveniencia } from "./aplicar-proposta.ts";

describe("calcularPatch", () => {
  const atual = {
    nomeComum: "Abacate",
    estrato: "alto",
    familia: "Lauraceae",
    grupos: ["fruta"],
    alturaMaduraM: null,
  };

  it("devolve só os campos que mudam", () => {
    const patch = calcularPatch(atual, {
      nomeComum: "Abacate",
      estrato: "medio",
      familia: "Lauraceae",
    });
    expect(patch).toEqual({ estrato: "medio" });
  });

  it("ignora campos não enviados", () => {
    expect(calcularPatch(atual, { estrato: undefined })).toEqual({});
  });

  it("trata null e undefined como o mesmo 'sem valor'", () => {
    // Um campo vazio no formulário chega como null; no banco pode estar
    // undefined. Marcar isso como alteração encheria a moderação de ruído.
    expect(calcularPatch(atual, { alturaMaduraM: null })).toEqual({});
    expect(calcularPatch({ x: undefined }, { x: null })).toEqual({});
  });

  it("detecta preenchimento de um campo antes vazio", () => {
    expect(calcularPatch(atual, { alturaMaduraM: 12 })).toEqual({
      alturaMaduraM: 12,
    });
  });

  it("compara arrays por conteúdo e ordem", () => {
    expect(calcularPatch(atual, { grupos: ["fruta"] })).toEqual({});
    expect(calcularPatch(atual, { grupos: ["fruta", "madeira"] })).toEqual({
      grupos: ["fruta", "madeira"],
    });
  });

  it("não considera alteração um array vazio que já era vazio", () => {
    expect(calcularPatch({ sinonimos: [] }, { sinonimos: [] })).toEqual({});
  });
});

describe("proveniência dos campos aprovados", () => {
  it("converte camelCase para o nome da coluna", () => {
    expect(chaveDeFonte("nomeCientifico")).toBe("nome_cientifico");
    expect(chaveDeFonte("espacamentoNaLinhaMinM")).toBe(
      "espacamento_na_linha_min_m",
    );
    expect(chaveDeFonte("estrato")).toBe("estrato");
  });

  it("marca como comunidade só os campos tocados", () => {
    expect(proveniencia({ estrato: "alto", diasParaColherMin: 45 })).toEqual({
      estrato: "comunidade",
      dias_para_colher_min: "comunidade",
    });
  });
});

describe("definição dos campos editáveis", () => {
  it("não tem chave duplicada", () => {
    expect(CAMPOS_POR_CHAVE.size).toBe(CAMPOS.length);
  });

  it("todo campo de enum declara opções", () => {
    for (const campo of CAMPOS) {
      if (campo.tipo === "enum" || campo.tipo === "multi_enum") {
        expect(campo.opcoes, `campo ${campo.chave}`).toBeDefined();
        expect(campo.opcoes!.length).toBeGreaterThan(0);
      }
    }
  });

  it("exige nome comum e científico numa espécie nova", () => {
    const obrigatorios = CAMPOS.filter((campo) => campo.obrigatorioEmNova).map(
      (campo) => campo.chave,
    );
    expect(obrigatorios).toEqual(["nomeComum", "nomeCientifico"]);
  });
});
