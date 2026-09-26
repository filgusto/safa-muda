import { describe, expect, it } from "vitest";
import {
  LIMITE_DA_BIO,
  NOME_ANONIMO,
  nomeParaCredito,
  normalizarCampoDePerfil,
  linksDaCitacao,
  citacaoAoExcluir,
  normalizarCitacao,
  rotuloDoPerfilDeUso,
  normalizarPerfilDeUso,
} from "./perfil-de-usuario.ts";

const valor = (r: ReturnType<typeof normalizarCampoDePerfil>) =>
  r.ok ? r.valor : `ERRO: ${r.erro}`;

describe("nomeParaCredito", () => {
  it("nome completo por padrão", () => {
    expect(nomeParaCredito("Maria Pedrosa Silva", null)).toBe(
      "Maria Pedrosa Silva",
    );
    expect(nomeParaCredito("Maria Pedrosa Silva", "completo")).toBe(
      "Maria Pedrosa Silva",
    );
  });

  it("só o primeiro nome", () => {
    expect(nomeParaCredito("  Maria Pedrosa Silva", "primeiro_nome")).toBe(
      "Maria",
    );
  });

  it("outro usa o texto escolhido; sem texto, cai no nome completo", () => {
    expect(
      nomeParaCredito("Maria Pedrosa", "outro", "Dona Maria da Horta"),
    ).toBe("Dona Maria da Horta");
    expect(nomeParaCredito("Maria Pedrosa", "outro", " ")).toBe(
      "Maria Pedrosa",
    );
  });

  it("sem identificação", () => {
    expect(nomeParaCredito("Maria Pedrosa", "anonimo")).toBe(NOME_ANONIMO);
  });
});

describe("normalizarPerfilDeUso", () => {
  it("opção da lista descarta o texto livre", () => {
    expect(normalizarPerfilDeUso("tecnico", "lixo")).toEqual({
      ok: true,
      perfil: "tecnico",
      outro: null,
    });
  });

  it("vazio apaga os dois", () => {
    expect(normalizarPerfilDeUso("", "x")).toEqual({
      ok: true,
      perfil: null,
      outro: null,
    });
  });

  it("outro exige o texto, aparado e limitado", () => {
    expect(normalizarPerfilDeUso("outro", "  Permacultora ")).toEqual({
      ok: true,
      perfil: "outro",
      outro: "Permacultora",
    });
    expect(normalizarPerfilDeUso("outro", "   ").ok).toBe(false);
    expect(normalizarPerfilDeUso("outro", "a".repeat(61)).ok).toBe(false);
  });

  it("recusa opção desconhecida", () => {
    expect(normalizarPerfilDeUso("hacker", null).ok).toBe(false);
  });
});

describe("citacaoAoExcluir", () => {
  it("manter respeita a citação escolhida", () => {
    expect(citacaoAoExcluir("manter", "Maria Pedrosa", "primeiro_nome")).toBe(
      "Maria",
    );
    expect(
      citacaoAoExcluir("manter", "Maria Pedrosa", "outro", "Dona Maria"),
    ).toBe("Dona Maria");
  });

  it("anonimizar sempre vira Pessoa colaboradora", () => {
    expect(citacaoAoExcluir("anonimizar", "Maria Pedrosa", "completo")).toBe(
      NOME_ANONIMO,
    );
  });
});

describe("rotuloDoPerfilDeUso", () => {
  it("usa o rótulo da lista ou o texto de Outro", () => {
    expect(rotuloDoPerfilDeUso("tecnico", null)).toBe(
      "Técnico ou extensionista",
    );
    expect(rotuloDoPerfilDeUso("outro", " Permacultora ")).toBe("Permacultora");
    expect(rotuloDoPerfilDeUso("outro", null)).toBe("Outro");
  });

  it("sem perfil, sem rótulo", () => {
    expect(rotuloDoPerfilDeUso(null, "x")).toBeNull();
  });
});

describe("linksDaCitacao", () => {
  const base = {
    creditoNome: "completo",
    linkInstagram: "https://www.instagram.com/safa",
    linkSite: "https://safa.org/",
    linkLattes: null,
    citarInstagram: true,
    citarSite: false,
    citarLattes: true,
  };

  it("só inclui o que existe e está ligado", () => {
    expect(linksDaCitacao(base).map((l) => l.tipo)).toEqual(["instagram"]);
  });

  it("tudo desligado por padrão dá lista vazia", () => {
    expect(
      linksDaCitacao({ ...base, citarInstagram: false, citarLattes: false }),
    ).toEqual([]);
  });

  it("quem pede anonimato nunca exibe links", () => {
    expect(linksDaCitacao({ ...base, creditoNome: "anonimo" })).toEqual([]);
  });
});

describe("normalizarCitacao", () => {
  it("sempre tem valor", () => {
    expect(normalizarCitacao("", null).ok).toBe(false);
    expect(normalizarCitacao("anonimo", "lixo")).toEqual({
      ok: true,
      citacao: "anonimo",
      outro: null,
    });
  });

  it("outro exige o texto, aparado e limitado", () => {
    expect(normalizarCitacao("outro", "  Dona Maria da Horta ")).toEqual({
      ok: true,
      citacao: "outro",
      outro: "Dona Maria da Horta",
    });
    expect(normalizarCitacao("outro", " ").ok).toBe(false);
    expect(normalizarCitacao("outro", "a".repeat(101)).ok).toBe(false);
  });
});

describe("normalizarCampoDePerfil", () => {
  it("texto vazio apaga o dado", () => {
    expect(valor(normalizarCampoDePerfil("regiao", "   "))).toBeNull();
    expect(valor(normalizarCampoDePerfil("bio", null))).toBeNull();
  });

  it("aparam e limitam região e bio", () => {
    expect(valor(normalizarCampoDePerfil("regiao", " Piracicaba, SP "))).toBe(
      "Piracicaba, SP",
    );
    expect(
      normalizarCampoDePerfil("bio", "a".repeat(LIMITE_DA_BIO + 1)).ok,
    ).toBe(false);
    expect(normalizarCampoDePerfil("bio", "a".repeat(LIMITE_DA_BIO)).ok).toBe(
      true,
    );
  });

  it("aceitam só opções conhecidas", () => {
    expect(normalizarCampoDePerfil("experiencia", "de_1_a_3_anos").ok).toBe(
      true,
    );
  });

  it("o aviso por e-mail é booleano", () => {
    expect(valor(normalizarCampoDePerfil("avisoPorEmail", false))).toBe(false);
    expect(normalizarCampoDePerfil("avisoPorEmail", "sim").ok).toBe(false);
  });

  it("Instagram vira URL a partir de @, usuário ou link", () => {
    const esperado = "https://www.instagram.com/safa.muda";
    expect(valor(normalizarCampoDePerfil("linkInstagram", "@safa.muda"))).toBe(
      esperado,
    );
    expect(valor(normalizarCampoDePerfil("linkInstagram", "safa.muda"))).toBe(
      esperado,
    );
    expect(
      valor(
        normalizarCampoDePerfil(
          "linkInstagram",
          "https://instagram.com/safa.muda/?hl=pt",
        ),
      ),
    ).toBe(esperado);
    expect(normalizarCampoDePerfil("linkInstagram", "não é usuário!").ok).toBe(
      false,
    );
  });

  it("site aceita domínio puro e recusa protocolo perigoso", () => {
    expect(valor(normalizarCampoDePerfil("linkSite", "safamuda.org"))).toBe(
      "https://safamuda.org/",
    );
    expect(normalizarCampoDePerfil("linkSite", "javascript:alert(1)").ok).toBe(
      false,
    );
    expect(normalizarCampoDePerfil("linkSite", "https://u:p@site.com").ok).toBe(
      false,
    );
    expect(normalizarCampoDePerfil("linkSite", "semponto").ok).toBe(false);
  });

  it("Lattes pede o ID de 16 dígitos, sozinho ou em link", () => {
    const esperado = "https://lattes.cnpq.br/1234567890123456";
    expect(
      valor(normalizarCampoDePerfil("linkLattes", "1234567890123456")),
    ).toBe(esperado);
    expect(valor(normalizarCampoDePerfil("linkLattes", esperado))).toBe(
      esperado,
    );
    expect(
      normalizarCampoDePerfil("linkLattes", "https://outro.com/1").ok,
    ).toBe(false);
  });
});
