import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calcularPatch,
  CAMPOS,
  CAMPOS_POR_CHAVE,
  CHAVE_FONTES_AUTOMATICAS,
  CHAVE_GRUPOS_PROPOSTOS,
  camposDaEspecieSchema,
  rotuloDaChave,
} from "./especie-schema.ts";
import {
  camposAplicaveis,
  chaveDeFonte,
  proveniencia,
  provenienciaDaProposta,
} from "./aplicar-proposta.ts";

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

describe("gbifId e inaturalistId aceitam URL colada", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("aceita só o número quando o ID existe", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const resultado = await camposDaEspecieSchema.safeParseAsync({
      gbifId: "7587087",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data.gbifId).toBe(7587087);
  });

  it("extrai o ID de uma URL do GBIF colada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const resultado = await camposDaEspecieSchema.safeParseAsync({
      gbifId: "https://www.gbif.org/species/7587087",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data.gbifId).toBe(7587087);
  });

  it("extrai o ID de uma URL do iNaturalist colada, slug incluído", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ id: 139444 }] }),
      }),
    );

    const resultado = await camposDaEspecieSchema.safeParseAsync({
      inaturalistId: "https://www.inaturalist.org/taxa/139444-Cajanus-cajan",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data.inaturalistId).toBe(139444);
  });

  it("rejeita texto que não é número nem URL reconhecida", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const resultado = await camposDaEspecieSchema.safeParseAsync({
      gbifId: "não é um link",
    });

    expect(resultado.success).toBe(false);
  });

  it("rejeita quando o ID não existe na base", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const resultado = await camposDaEspecieSchema.safeParseAsync({
      gbifId: "999999999",
    });

    expect(resultado.success).toBe(false);
  });

  it("rejeita quando a confirmação falha por erro de rede", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const resultado = await camposDaEspecieSchema.safeParseAsync({
      gbifId: "7587087",
    });

    expect(resultado.success).toBe(false);
  });

  it("trata string vazia como null, sem chamar a rede", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await camposDaEspecieSchema.safeParseAsync({
      gbifId: "",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data.gbifId).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
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

describe("grupos novos sugeridos", () => {
  it("são aceitos na proposta, pelo nome", async () => {
    const resultado = await camposDaEspecieSchema.safeParseAsync({
      grupos: ["fruta"],
      [CHAVE_GRUPOS_PROPOSTOS]: [" Cerca viva "],
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data[CHAVE_GRUPOS_PROPOSTOS]).toEqual(["Cerca viva"]);
    }
  });

  it("recusam nome curto demais e mais de cinco de uma vez", async () => {
    const curto = await camposDaEspecieSchema.safeParseAsync({
      [CHAVE_GRUPOS_PROPOSTOS]: ["x"],
    });
    expect(curto.success).toBe(false);

    const muitos = await camposDaEspecieSchema.safeParseAsync({
      [CHAVE_GRUPOS_PROPOSTOS]: ["aa", "bb", "cc", "dd", "ee", "ff"],
    });
    expect(muitos.success).toBe(false);
  });

  it("não são aplicados à espécie nem ganham proveniência", () => {
    // `grupos` é enum no banco: criar um grupo pede código, não aprovação.
    const patch = { estrato: "alto", [CHAVE_GRUPOS_PROPOSTOS]: ["Cerca viva"] };
    expect(camposAplicaveis(patch)).toEqual({ estrato: "alto" });
    expect(proveniencia(camposAplicaveis(patch))).toEqual({
      estrato: "comunidade",
    });
  });

  it("têm rótulo próprio na moderação", () => {
    expect(rotuloDaChave(CHAVE_GRUPOS_PROPOSTOS)).toBe("Grupos novos");
    expect(rotuloDaChave("estrato")).toBe("Estrato");
  });
});

describe("campos completados automaticamente", () => {
  const patch = {
    nomeComum: "Coentro",
    nomeCientifico: "Coriandrum sativum",
    habito: ["erva"],
    cicloDeVida: ["anual"],
    [CHAVE_FONTES_AUTOMATICAS]: {
      habito: "flora-e-funga-do-brasil",
      ciclo_de_vida: "usda-plants",
    },
  };

  it("não são coluna da espécie", () => {
    expect(camposAplicaveis(patch)).not.toHaveProperty(
      CHAVE_FONTES_AUTOMATICAS,
    );
  });

  it("ficam com a fonte de origem; o resto, com a comunidade", () => {
    expect(provenienciaDaProposta(patch)).toEqual({
      nome_comum: "comunidade",
      nome_cientifico: "comunidade",
      habito: "flora-e-funga-do-brasil",
      ciclo_de_vida: "usda-plants",
    });
  });

  it("não dão fonte a campo que não está no patch", () => {
    expect(
      provenienciaDaProposta({
        estrato: "alto",
        [CHAVE_FONTES_AUTOMATICAS]: { habito: "flora-e-funga-do-brasil" },
      }),
    ).toEqual({ estrato: "comunidade" });
  });

  it("não podem ser declarados por quem propõe", async () => {
    const resultado = await camposDaEspecieSchema.safeParseAsync({
      habito: ["erva"],
      [CHAVE_FONTES_AUTOMATICAS]: { habito: "flora-e-funga-do-brasil" },
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data).not.toHaveProperty(CHAVE_FONTES_AUTOMATICAS);
    }
  });
});
