/**
 * Fases da planta que uma foto pode retratar.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 *
 * A ordem da lista é a ordem em que as fotos aparecem, e segue o
 * desenvolvimento da planta: semente, jovem, adulta, e então o que a árvore
 * feita produz — flor antes de fruta, porque é essa a sequência no galho, e a
 * raiz depois delas, porque é a parte que só se vê quando se colhe (a mandioca
 * é o caso óbvio). É como quem consulta o catálogo reconhece o que está vendo
 * no campo.
 *
 * `misc` fecha a lista: é o que não se comprometeu com uma fase (tronco, casca,
 * folha, o pé no consórcio), não uma fase a mais.
 */

export const TAGS_DE_FOTO = [
  "semente",
  "jovem",
  "adulta",
  "flor",
  "fruta",
  "raiz",
  "misc",
] as const;

export type TagDeFoto = (typeof TAGS_DE_FOTO)[number];

export const TAG_DE_FOTO_LABEL: Record<TagDeFoto, string> = {
  semente: "Semente",
  jovem: "Jovem",
  adulta: "Adulta",
  flor: "Flor",
  fruta: "Fruta",
  raiz: "Raiz",
  misc: "Diversas",
};

/** Posição da tag na ordem de exibição. Tag desconhecida vai para o fim. */
export function ordemDaTag(tag: string): number {
  const posicao = (TAGS_DE_FOTO as readonly string[]).indexOf(tag);
  return posicao === -1 ? TAGS_DE_FOTO.length : posicao;
}

/**
 * Ordem de reconhecimento no campo, usada para escolher a foto que ilustra o
 * card e o cabeçalho da ficha: a forma adulta primeiro — como a espécie é
 * vista de longe —, depois o que se colhe dela de perto (fruta, e então raiz,
 * para a mandioca da vida), e só então as fases anteriores ao porte adulto.
 */
export const ORDEM_DE_RECONHECIMENTO: readonly TagDeFoto[] = [
  "adulta",
  "fruta",
  "raiz",
  "flor",
  "jovem",
  "semente",
  "misc",
];

/** Posição da tag na ordem de reconhecimento. Tag desconhecida vai para o fim. */
export function ordemDeReconhecimento(tag: string): number {
  const posicao = (ORDEM_DE_RECONHECIMENTO as readonly string[]).indexOf(tag);
  return posicao === -1 ? ORDEM_DE_RECONHECIMENTO.length : posicao;
}

/**
 * A foto que ilustra o card e o cabeçalho da ficha: a marcada como principal
 * pela administração, quando há; senão, a primeira na ordem de
 * reconhecimento. Estável — empates mantêm a ordem recebida.
 */
export function escolherFotoPrincipal<
  T extends { tag: string; principal: boolean },
>(fotos: readonly T[]): T | null {
  if (fotos.length === 0) return null;
  return [...fotos].sort(
    (a, b) =>
      Number(b.principal) - Number(a.principal) ||
      ordemDeReconhecimento(a.tag) - ordemDeReconhecimento(b.tag),
  )[0]!;
}
