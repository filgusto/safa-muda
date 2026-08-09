/**
 * Biomas brasileiros.
 *
 * Nenhuma espécie do catálogo tem bioma preenchido hoje: a Tabela Guia não traz
 * essa informação (docs/PLANO.md §7.3). O campo existe para que a wiki possa
 * preenchê-lo com fonte.
 *
 * Importa porque estrato é relativo ao ecossistema de origem — o próprio livro
 * usa acerola × abacate para mostrar que a mesma classificação significa
 * alturas diferentes em florestas diferentes.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

export const BIOMAS = [
  "amazonia",
  "cerrado",
  "mata_atlantica",
  "caatinga",
  "pampa",
  "pantanal",
] as const;

export type Bioma = (typeof BIOMAS)[number];

export const BIOMA_LABEL: Record<Bioma, string> = {
  amazonia: "Amazônia",
  cerrado: "Cerrado",
  mata_atlantica: "Mata Atlântica",
  caatinga: "Caatinga",
  pampa: "Pampa",
  pantanal: "Pantanal",
};
