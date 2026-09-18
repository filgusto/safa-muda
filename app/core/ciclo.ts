/**
 * Ciclo de vida: quanto tempo a planta vive, quantas vezes frutifica e que
 * forma tem.
 *
 * São eixos independentes na literatura, e por isso campos separados. O café é
 * perene, policárpico e arbusto; o coentro é anual, monocárpico e erva; a
 * bananeira é perene, com haste monocárpica, e erva.
 *
 * Tudo aqui descreve o ciclo BIOLÓGICO da espécie. Quanto tempo a planta fica
 * no sistema é decisão de manejo e vive no plantio (`mesInicio`/`mesFim`): a
 * mandioca é perene, mas sai do canteiro com 12 a 18 meses.
 *
 * Hábito e ciclo de vida vêm de bases públicas (Flora e Funga do Brasil e USDA
 * PLANTS, via db/scripts/enriquecer-ciclo-e-habito.ts); os demais eixos a wiki
 * preenche com fonte (docs/PLANO.md §7.3).
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

/**
 * Duração do ciclo, no vocabulário da USDA PLANTS ("Duration"): anual vive até
 * uma estação; bienal vive duas, em geral floresce na segunda; perene vive mais
 * que duas.
 *
 * A espécie pode ter mais de um valor, como na USDA: a duração muda com o
 * ambiente (pimenta e mamona são perenes nos trópicos e anuais no frio).
 */
export const CICLOS_DE_VIDA = ["anual", "bienal", "perene"] as const;

export type CicloDeVida = (typeof CICLOS_DE_VIDA)[number];

export const CICLO_DE_VIDA_LABEL: Record<CicloDeVida, string> = {
  anual: "Anual",
  bienal: "Bienal",
  perene: "Perene",
};

/**
 * Quantas vezes a planta frutifica. Monocárpica (semélpara) floresce uma vez e
 * morre — pode ser perene, como agave e bambu. Na bananeira e no abacaxi é a
 * haste que morre depois de frutificar; a touceira segue.
 */
export const FRUTIFICACOES = ["monocarpica", "policarpica"] as const;

export type Frutificacao = (typeof FRUTIFICACOES)[number];

export const FRUTIFICACAO_LABEL: Record<Frutificacao, string> = {
  monocarpica: "Monocárpica",
  policarpica: "Policárpica",
};

/**
 * Forma de vida, no vocabulário da Flora e Funga do Brasil (JBRJ) para
 * angiospermas. A fonte atribui mais de uma forma à mesma espécie quando ela
 * varia ("Arbusto, Árvore"), e o campo é lista pelo mesmo motivo.
 */
export const HABITOS = [
  "erva",
  "subarbusto",
  "arbusto",
  "arvore",
  "liana",
  "palmeira",
  "bambu",
  "suculenta",
  "dracenoide",
] as const;

export type Habito = (typeof HABITOS)[number];

export const HABITO_LABEL: Record<Habito, string> = {
  erva: "Erva",
  subarbusto: "Subarbusto",
  arbusto: "Arbusto",
  arvore: "Árvore",
  liana: "Liana/volúvel/trepadeira",
  palmeira: "Palmeira",
  bambu: "Bambu",
  suculenta: "Suculenta",
  dracenoide: "Dracenoide",
};

/**
 * Longevidade típica em texto. É quanto vive, até a senescência, o indivíduo
 * que chega à fase adulta — não a mortalidade, nem o recorde.
 *
 * Fontes dão faixa ("vive de 10 a 20 anos") ou limite aberto ("vive mais de 80
 * anos"). Só o mínimo vira "mais de", sem inventar teto.
 */
export function formatarLongevidade(
  minAnos: number | null,
  maxAnos: number | null,
): string | null {
  if (minAnos === null && maxAnos === null) return null;
  if (minAnos !== null && maxAnos === null) return `mais de ${anos(minAnos)}`;
  if (minAnos === null && maxAnos !== null) return `até ${anos(maxAnos)}`;
  if (minAnos === maxAnos) return anos(minAnos!);
  return `${numero(minAnos!)} a ${anos(maxAnos!)}`;
}

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function anos(valor: number): string {
  return `${numero(valor)} ${valor === 1 ? "ano" : "anos"}`;
}

export interface CamposDoCiclo {
  cicloDeVida: readonly CicloDeVida[];
  longevidadeMinAnos: number | null;
  longevidadeMaxAnos: number | null;
}

/**
 * Combinações que se contradizem. Devolve avisos, nunca corrige: quem decide é
 * a moderação, com a fonte na mão.
 *
 * Ciclo com mais de um valor que inclui "perene" não gera aviso — é justamente
 * o caso da espécie que vive anos no trópico e uma estação no frio.
 */
export function inconsistenciasDoCiclo(campos: CamposDoCiclo): string[] {
  const avisos: string[] = [];
  const {
    cicloDeVida,
    longevidadeMinAnos: min,
    longevidadeMaxAnos: max,
  } = campos;

  if (min !== null && max !== null && min > max) {
    avisos.push("Longevidade mínima maior que a máxima.");
  }

  if (cicloDeVida.includes("perene") || min === null) return avisos;

  if (cicloDeVida.includes("bienal")) {
    if (min > 2) avisos.push("Bienal com longevidade acima de 2 anos.");
  } else if (cicloDeVida.includes("anual") && min > 1) {
    avisos.push("Anual com longevidade acima de 1 ano.");
  }

  return avisos;
}
