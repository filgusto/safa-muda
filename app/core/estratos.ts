/**
 * Estratos agroflorestais: o eixo do espaço vertical.
 *
 * Fonte dos números: "Agroflorestando o Mundo" (Corrêa Neto, Messerschmidt,
 * Steenbock, Monnerat — Cooperafloresta, 2016), cap. 7.3, registrando
 * estimativas de Ernst Götsch; e cap. 10, tabelas 2–6, para a ocupação ideal.
 *
 * Este módulo é puro: sem React, sem banco, sem I/O.
 */

export const ESTRATOS = [
  "emergente",
  "alto",
  "medio",
  "baixo",
  "rasteiro",
] as const;

export type Estrato = (typeof ESTRATOS)[number];

/** Rótulos para exibição (pt-BR). */
export const ESTRATO_LABEL: Record<Estrato, string> = {
  emergente: "Emergente",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
  rasteiro: "Rasteiro",
};

/**
 * Fração da luz incidente que o estrato DEIXA PASSAR para os andares abaixo.
 * Cap. 7.3: "O estrato emergente permite a passagem de aproximadamente 80% da
 * luz que recebe, o estrato alto 60%, o médio 40% e o baixo 20%."
 *
 * O rasteiro não recebe estimativa na fonte — deixamos null em vez de inventar.
 */
export const LUZ_TRANSMITIDA: Record<Estrato, number | null> = {
  emergente: 0.8,
  alto: 0.6,
  medio: 0.4,
  baixo: 0.2,
  rasteiro: null,
};

/**
 * Fração do andar que deve ser ocupada pelas copas daquele estrato.
 * É o complemento da luz transmitida, e é exatamente a coluna "Ocupação ideal"
 * das tabelas de consórcio do cap. 10 (Emergente 20%, Alto 40%, Médio 60%,
 * Baixo 80%).
 */
export const OCUPACAO_IDEAL: Record<Estrato, number | null> = {
  emergente: 0.2,
  alto: 0.4,
  medio: 0.6,
  baixo: 0.8,
  rasteiro: null,
};

/** Ordem de cima para baixo — a ordem das faixas na timeline. */
export const ESTRATOS_DE_CIMA_PARA_BAIXO: readonly Estrato[] = [
  "emergente",
  "alto",
  "medio",
  "baixo",
  "rasteiro",
];

/**
 * Luz que chega a um estrato, dado o conjunto de estratos acima dele
 * plenamente ocupados. Produto das frações transmitidas.
 *
 * É a base do futuro diagnóstico de sombreamento (fase 6): serve para dizer
 * "o café no estrato baixo está recebendo 19% da luz plena".
 */
export function luzQueChegaAo(estrato: Estrato): number {
  const indice = ESTRATOS_DE_CIMA_PARA_BAIXO.indexOf(estrato);
  if (indice < 0) return 1;

  return ESTRATOS_DE_CIMA_PARA_BAIXO.slice(0, indice).reduce((luz, acima) => {
    const transmitida = LUZ_TRANSMITIDA[acima];
    // Estrato sem estimativa na fonte não altera o cálculo.
    return transmitida === null ? luz : luz * transmitida;
  }, 1);
}
