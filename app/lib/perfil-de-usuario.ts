/**
 * Campos opcionais do perfil de quem tem conta: rótulos, validação e
 * normalização. Puro, sem banco nem React — o servidor valida com isto e a
 * interface usa os mesmos rótulos.
 *
 * Regra de ouro dos dados vale aqui também: campo vazio é `null` ("não
 * informado"), nunca um valor de enfeite.
 */

import {
  TRATAMENTOS,
  flexionarMarcas,
  type Tratamento,
} from "@/core/tratamento.ts";

export const PERFIS_DE_USO = [
  "agricultor",
  "em_formacao",
  "pesquisador",
  "tecnico",
  "curioso",
  "outro",
] as const;
export type PerfilDeUso = (typeof PERFIS_DE_USO)[number];

export const PERFIL_DE_USO_LABEL: Record<PerfilDeUso, string> = {
  agricultor: "Agricultor(a) ou produtor(a)",
  em_formacao: "Agrofloresteiro(a)",
  pesquisador: "Pesquisador(a) ou estudante",
  tecnico: "Técnico(a) ou extensionista",
  curioso: "Curioso(a)",
  outro: "Outro",
};

export const LIMITE_DO_PERFIL_OUTRO = 60;
export const LIMITE_DA_CITACAO_OUTRA = 100;

/**
 * Escolha numa lista com a saída "Outro", que pede um texto livre. Os dois
 * valores vão juntos porque um não faz sentido sem o outro: "Outro" exige o
 * texto, e qualquer outra opção descarta o texto.
 */
function normalizarComOutro<T extends string>(
  lista: readonly T[],
  escolha: unknown,
  outro: unknown,
  opcoes: { obrigatorio: boolean; limite: number; pedido: string },
):
  | { ok: true; escolha: T | null; outro: string | null }
  | { ok: false; erro: string } {
  const escolhido = daLista(lista, escolha, opcoes.obrigatorio);
  if (!escolhido.ok) return escolhido;
  if (escolhido.valor !== "outro") {
    return { ok: true, escolha: escolhido.valor as T | null, outro: null };
  }

  const texto = typeof outro === "string" ? outro.trim() : "";
  if (!texto) return { ok: false, erro: opcoes.pedido };
  if (texto.length > opcoes.limite) {
    return {
      ok: false,
      erro: `O texto pode ter no máximo ${opcoes.limite} caracteres.`,
    };
  }
  return { ok: true, escolha: "outro" as T, outro: texto };
}

/** Perfil de uso e, quando é "Outro", o texto que o descreve. */
export function normalizarPerfilDeUso(perfil: unknown, outro: unknown) {
  const r = normalizarComOutro(PERFIS_DE_USO, perfil, outro, {
    obrigatorio: false,
    limite: LIMITE_DO_PERFIL_OUTRO,
    pedido: "Descreva o seu perfil de uso.",
  });
  return r.ok ? { ok: true as const, perfil: r.escolha, outro: r.outro } : r;
}

/** Citação e, quando é "Outro", como a pessoa quer ser citada. */
export function normalizarCitacao(citacao: unknown, outro: unknown) {
  const r = normalizarComOutro(CREDITOS_DE_NOME, citacao, outro, {
    obrigatorio: true,
    limite: LIMITE_DA_CITACAO_OUTRA,
    pedido: "Escreva como você quer ser citado.",
  });
  return r.ok
    ? { ok: true as const, citacao: r.escolha as CreditoDeNome, outro: r.outro }
    : r;
}

/** Texto do perfil de uso: o da lista, ou o que a pessoa escreveu em "Outro". */
export function rotuloDoPerfilDeUso(
  perfil: PerfilDeUso | null,
  outro: string | null,
  tratamento?: Tratamento | null,
): string | null {
  if (!perfil) return null;
  return perfil === "outro"
    ? outro?.trim() || PERFIL_DE_USO_LABEL.outro
    : flexionarMarcas(PERFIL_DE_USO_LABEL[perfil], tratamento);
}

export const EXPERIENCIAS = [
  "menos_de_1_ano",
  "de_1_a_3_anos",
  "de_3_a_10_anos",
  "mais_de_10_anos",
] as const;
export type Experiencia = (typeof EXPERIENCIAS)[number];

export const EXPERIENCIA_LABEL: Record<Experiencia, string> = {
  menos_de_1_ano: "Menos de 1 ano",
  de_1_a_3_anos: "De 1 a 3 anos",
  de_3_a_10_anos: "De 3 a 10 anos",
  mais_de_10_anos: "Mais de 10 anos",
};

export const CREDITOS_DE_NOME = [
  "completo",
  "primeiro_nome",
  "anonimo",
  "outro",
] as const;
export type CreditoDeNome = (typeof CREDITOS_DE_NOME)[number];

export const CREDITO_DE_NOME_LABEL: Record<CreditoDeNome, string> = {
  completo: "Nome completo",
  primeiro_nome: "Só o primeiro nome",
  anonimo: "Sem identificação",
  outro: "Outro",
};

export const NOME_ANONIMO = "Pessoa colaboradora";

/**
 * Como o nome aparece nas contribuições públicas (histórico da espécie).
 * Sem preferência registrada, vale o nome completo — o comportamento de antes.
 */
export function nomeParaCredito(
  nome: string,
  preferencia: string | null | undefined,
  outro?: string | null,
): string {
  if (preferencia === "anonimo") return NOME_ANONIMO;
  // "Outro" sem texto (não deveria existir) cai no nome completo.
  if (preferencia === "outro") return outro?.trim() || nome;
  if (preferencia === "primeiro_nome") {
    return nome.trim().split(/\s+/)[0] || NOME_ANONIMO;
  }
  return nome;
}

export type LinkDeCitacao = {
  tipo: "instagram" | "site" | "lattes";
  rotulo: string;
  url: string;
};

/**
 * Links que acompanham o nome numa citação: só os que a pessoa cadastrou E
 * ligou a chave correspondente. Quem pede para não ser identificado nunca
 * tem links exibidos, mesmo com as chaves ligadas.
 */
export function linksDaCitacao(dados: {
  creditoNome: string | null | undefined;
  linkInstagram: string | null;
  linkSite: string | null;
  linkLattes: string | null;
  citarInstagram: boolean;
  citarSite: boolean;
  citarLattes: boolean;
}): LinkDeCitacao[] {
  if (dados.creditoNome === "anonimo") return [];

  const candidatos: Array<
    [LinkDeCitacao["tipo"], string, string | null, boolean]
  > = [
    ["instagram", "Instagram", dados.linkInstagram, dados.citarInstagram],
    ["site", "Site", dados.linkSite, dados.citarSite],
    ["lattes", "Lattes", dados.linkLattes, dados.citarLattes],
  ];
  return candidatos.flatMap(([tipo, rotulo, url, ligado]) =>
    url && ligado ? [{ tipo, rotulo, url }] : [],
  );
}

/** O que fazer com as contribuições publicadas quando a conta é excluída. */
export const DESTINOS_DAS_CONTRIBUICOES = ["manter", "anonimizar"] as const;
export type DestinoDasContribuicoes =
  (typeof DESTINOS_DAS_CONTRIBUICOES)[number];

/**
 * Citação que fica nas contribuições depois da exclusão. "Manter" respeita o
 * jeito que a pessoa escolheu ser citada, sem links (a citação guardada é só
 * texto); "anonimizar" troca por "Pessoa colaboradora".
 */
export function citacaoAoExcluir(
  destino: DestinoDasContribuicoes,
  nome: string,
  creditoNome: string | null | undefined,
  creditoNomeOutro?: string | null,
): string {
  return destino === "anonimizar"
    ? NOME_ANONIMO
    : nomeParaCredito(nome, creditoNome, creditoNomeOutro);
}

/** Chave de "Tornar público" de cada campo do perfil opcional. */
export const CHAVES_DE_PUBLICO = {
  foto: "publicoFoto",
  regiao: "publicoRegiao",
  perfilDeUso: "publicoPerfilDeUso",
  experiencia: "publicoExperiencia",
  bio: "publicoBio",
  linkInstagram: "publicoInstagram",
  linkSite: "publicoSite",
  linkLattes: "publicoLattes",
} as const;

export const LIMITE_DA_BIO = 280;
const LIMITE_DA_REGIAO = 100;
const LIMITE_DO_SITE = 200;

/** Campos de perfil editáveis um a um em /conta. */
export const CAMPOS_DE_PERFIL = [
  "regiao",
  "experiencia",
  "tratamento",
  "bio",
  "linkInstagram",
  "linkSite",
  "linkLattes",
  "citarInstagram",
  "citarSite",
  "citarLattes",
  "publicoFoto",
  "publicoRegiao",
  "publicoPerfilDeUso",
  "publicoExperiencia",
  "publicoBio",
  "publicoInstagram",
  "publicoSite",
  "publicoLattes",
  "avisoPorEmail",
] as const;
export type CampoDePerfil = (typeof CAMPOS_DE_PERFIL)[number];

export type ResultadoDeNormalizacao =
  { ok: true; valor: string | boolean | null } | { ok: false; erro: string };

const ok = (valor: string | boolean | null): ResultadoDeNormalizacao => ({
  ok: true,
  valor,
});
const erro = (mensagem: string): ResultadoDeNormalizacao => ({
  ok: false,
  erro: mensagem,
});

function daLista<T extends string>(
  lista: readonly T[],
  bruto: unknown,
  obrigatorio: boolean,
): ResultadoDeNormalizacao {
  if (bruto === null || bruto === "") {
    return obrigatorio ? erro("Escolha uma opção.") : ok(null);
  }
  return typeof bruto === "string" &&
    (lista as readonly string[]).includes(bruto)
    ? ok(bruto)
    : erro("Opção inválida.");
}

function normalizarInstagram(texto: string): ResultadoDeNormalizacao {
  const semUrl = texto
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(semUrl)
    ? ok(`https://www.instagram.com/${semUrl}`)
    : erro("Informe seu usuário do Instagram (ex.: @seuusuario).");
}

function normalizarSite(texto: string): ResultadoDeNormalizacao {
  const comProtocolo = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;
  if (comProtocolo.length > LIMITE_DO_SITE) {
    return erro(`O endereço pode ter no máximo ${LIMITE_DO_SITE} caracteres.`);
  }
  try {
    const url = new URL(comProtocolo);
    const valido =
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.includes(".") &&
      !url.username &&
      !url.password;
    return valido ? ok(url.toString()) : erro("Informe um endereço válido.");
  } catch {
    return erro("Informe um endereço válido.");
  }
}

function normalizarLattes(texto: string): ResultadoDeNormalizacao {
  const id = texto
    .replace(/^https?:\/\/(www\.)?lattes\.cnpq\.br\//i, "")
    .replace(/[/?#].*$/, "");
  return /^\d{16}$/.test(id)
    ? ok(`https://lattes.cnpq.br/${id}`)
    : erro("Informe o link do seu Currículo Lattes ou os 16 dígitos do ID.");
}

/**
 * Valida e normaliza o valor de um campo. Texto vazio vira `null` (apaga o
 * dado), exceto nos campos que sempre têm valor.
 */
export function normalizarCampoDePerfil(
  campo: CampoDePerfil,
  bruto: unknown,
): ResultadoDeNormalizacao {
  if (
    campo.startsWith("publico") ||
    campo === "avisoPorEmail" ||
    campo === "citarInstagram" ||
    campo === "citarSite" ||
    campo === "citarLattes"
  ) {
    return typeof bruto === "boolean" ? ok(bruto) : erro("Valor inválido.");
  }
  if (campo === "experiencia") return daLista(EXPERIENCIAS, bruto, false);
  if (campo === "tratamento") return daLista(TRATAMENTOS, bruto, false);

  if (bruto !== null && typeof bruto !== "string")
    return erro("Valor inválido.");
  const texto = (bruto ?? "").trim();
  if (!texto) return ok(null);

  switch (campo) {
    case "regiao":
      return texto.length <= LIMITE_DA_REGIAO
        ? ok(texto)
        : erro(`A região pode ter no máximo ${LIMITE_DA_REGIAO} caracteres.`);
    case "bio":
      return texto.length <= LIMITE_DA_BIO
        ? ok(texto)
        : erro(`A bio pode ter no máximo ${LIMITE_DA_BIO} caracteres.`);
    case "linkInstagram":
      return normalizarInstagram(texto);
    case "linkSite":
      return normalizarSite(texto);
    case "linkLattes":
      return normalizarLattes(texto);
    default:
      return erro("Campo desconhecido.");
  }
}

/** O perfil de uma conta, como a tela de /conta o recebe do servidor. */
export type PerfilDaConta = {
  regiao: string | null;
  perfilDeUso: PerfilDeUso | null;
  perfilDeUsoOutro: string | null;
  experiencia: Experiencia | null;
  /** Como a pessoa quer ser chamada; flexiona os textos ligados ao nome dela. */
  tratamento: Tratamento | null;
  bio: string | null;
  linkInstagram: string | null;
  linkSite: string | null;
  linkLattes: string | null;
  creditoNome: CreditoDeNome;
  creditoNomeOutro: string | null;
  avisoPorEmail: boolean;
  citarInstagram: boolean;
  citarSite: boolean;
  citarLattes: boolean;
  /** "Tornar público", campo a campo (ver `CHAVES_DE_PUBLICO`). */
  publicoFoto: boolean;
  publicoRegiao: boolean;
  publicoPerfilDeUso: boolean;
  publicoExperiencia: boolean;
  publicoBio: boolean;
  publicoInstagram: boolean;
  publicoSite: boolean;
  publicoLattes: boolean;
  /** Versão dos termos aceita e quando (ISO); nulos em contas antigas. */
  termosVersao: string | null;
  termosAceitosEm: string | null;
};
