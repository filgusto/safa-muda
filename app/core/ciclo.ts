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
 * A época de frutificação (meses do ano) é independente de `frutificacao`: a
 * maioria das espécies não tem esse eixo preenchido, e condicionar um campo ao
 * outro deixaria o dos meses sem uso.
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
 * Meses do ano, na ordem do calendário. Vocabulário fechado de texto (e não
 * número) para o campo seguir o mesmo caminho dos demais de múltipla escolha.
 */
export const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

export type Mes = (typeof MESES)[number];

export const MES_LABEL: Record<Mes, string> = {
  jan: "Janeiro",
  fev: "Fevereiro",
  mar: "Março",
  abr: "Abril",
  mai: "Maio",
  jun: "Junho",
  jul: "Julho",
  ago: "Agosto",
  set: "Setembro",
  out: "Outubro",
  nov: "Novembro",
  dez: "Dezembro",
};

/**
 * Meses de frutificação em texto: sequências viram "nov a jan" (inclusive
 * atravessando a virada do ano) e meses soltos são listados. Vazio é `null`,
 * o "não informado" da ficha.
 *
 * A época varia com região e clima, e nenhuma base ampla a traz; o campo só
 * é preenchido com fonte, pela wiki.
 */
export function formatarMeses(meses: readonly Mes[]): string | null {
  const presentes = new Set(meses);
  if (presentes.size === 0) return null;
  if (presentes.size === MESES.length) return "o ano todo";

  // Começa pelo primeiro mês que abre uma sequência (o anterior não está no
  // conjunto), para que "nov, dez, jan" saia como um trecho só.
  const trechos = MESES.flatMap((mes, i) =>
    presentes.has(mes) && !presentes.has(MESES[(i + 11) % 12]!) ? [i] : [],
  ).map((i) => {
    let fim = i;
    while (presentes.has(MESES[(fim + 1) % 12]!)) fim = (fim + 1) % 12;
    const primeiro = MESES[i]!;
    const ultimo = MESES[fim]!;
    if (fim === i) return primeiro;
    // Dois meses seguidos ficam melhor como "jan e fev" do que "jan a fev".
    return (i + 1) % 12 === fim
      ? `${primeiro} e ${ultimo}`
      : `${primeiro} a ${ultimo}`;
  });

  return trechos.join(", ");
}

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
