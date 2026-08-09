/**
 * Sucessão: o eixo do tempo ecológico.
 *
 * "Não é a altura da planta que determina seu papel, mas o momento e a função
 * que ela cumpre na sucessão." — Guia dos Estratos Agroflorestais, cap. 2.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

export const SUCESSOES = [
  "placenta_1",
  "placenta_2",
  "pioneira",
  "secundaria_inicial",
  "secundaria_media",
  "secundaria_tardia",
  "climax",
] as const;

export type Sucessao = (typeof SUCESSOES)[number];

export const SUCESSAO_LABEL: Record<Sucessao, string> = {
  placenta_1: "Placenta 1",
  placenta_2: "Placenta 2",
  pioneira: "Pioneira",
  secundaria_inicial: "Secundária Inicial",
  secundaria_media: "Secundária Média",
  secundaria_tardia: "Secundária Tardia",
  climax: "Clímax",
};

/**
 * Posição ordinal na espiral sucessional. Cada degrau prepara o seguinte:
 * a placenta cria as condições da pioneira, a pioneira da secundária, e esta
 * da climácica (cap. 7.1).
 */
export function ordemSucessional(sucessao: Sucessao): number {
  return SUCESSOES.indexOf(sucessao);
}

/**
 * Sistemas ecológicos — degraus crescentes de fertilidade do solo pelos quais
 * a espiral passa (cap. 7.1, 7.8, 7.9).
 */
export const SISTEMAS = ["retomada", "acumulacao", "abundancia"] as const;
export type Sistema = (typeof SISTEMAS)[number];

export const SISTEMA_LABEL: Record<Sistema, string> = {
  retomada: "Retomada",
  acumulacao: "Acumulação",
  abundancia: "Abundância",
};

export function ordemSistema(sistema: Sistema): number {
  return SISTEMAS.indexOf(sistema);
}
