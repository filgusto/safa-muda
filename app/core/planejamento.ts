/**
 * Matemática da timeline: a ponte entre meses e pixels, e as regras de
 * posicionamento de um plantio.
 *
 * Módulo puro: sem React, sem banco, sem I/O. É o que permite testar as regras
 * de planejamento sem montar a interface.
 */

import {
  ESTRATOS_DE_CIMA_PARA_BAIXO,
  OCUPACAO_IDEAL,
  type Estrato,
} from "./estratos.ts";
import { MESES_POR_PASSO, type ZoomTimeline } from "./tempo.ts";

/** Largura em pixels de um passo da escala, por nível de zoom. */
export const LARGURA_DO_PASSO: Record<ZoomTimeline, number> = {
  mes: 28,
  trimestre: 34,
  ano: 46,
};

export function pixelsPorMes(zoom: ZoomTimeline): number {
  return LARGURA_DO_PASSO[zoom] / MESES_POR_PASSO[zoom];
}

export function mesParaPixel(mes: number, zoom: ZoomTimeline): number {
  return mes * pixelsPorMes(zoom);
}

export function pixelParaMes(pixel: number, zoom: ZoomTimeline): number {
  return pixel / pixelsPorMes(zoom);
}

/**
 * Ajusta um mês ao passo da escala corrente.
 *
 * Sem isso, arrastar uma barra no zoom de ano produziria "mês 137,4" — um
 * número que o usuário não pediu e não consegue ler.
 */
export function encaixarNaEscala(mes: number, zoom: ZoomTimeline): number {
  const passo = MESES_POR_PASSO[zoom];
  return Math.round(mes / passo) * passo;
}

export interface IntervaloDePlantio {
  mesInicio: number;
  mesFim: number;
}

/** Duração mínima: um mês. Barra de duração zero seria invisível e inútil. */
export const DURACAO_MINIMA_MESES = 1;

/**
 * Mantém o intervalo dentro do horizonte e com duração mínima.
 *
 * Aplicado a toda edição — arrastar, redimensionar e criar — para que a
 * interface e o servidor cheguem sempre ao mesmo resultado.
 */
export function normalizarIntervalo(
  intervalo: IntervaloDePlantio,
  horizonteMeses: number,
): IntervaloDePlantio {
  const limite = Math.max(horizonteMeses, DURACAO_MINIMA_MESES);

  let inicio = Math.round(intervalo.mesInicio);
  let fim = Math.round(intervalo.mesFim);

  if (fim - inicio < DURACAO_MINIMA_MESES) {
    fim = inicio + DURACAO_MINIMA_MESES;
  }

  const duracao = fim - inicio;

  // Empurra para dentro do horizonte preservando a duração, e só depois corta —
  // assim arrastar para fora da borda não encolhe a barra sem o usuário pedir.
  if (inicio < 0) {
    inicio = 0;
    fim = Math.min(limite, duracao);
  }
  if (fim > limite) {
    fim = limite;
    inicio = Math.max(0, limite - duracao);
  }

  return {
    mesInicio: inicio,
    mesFim: Math.max(fim, inicio + DURACAO_MINIMA_MESES),
  };
}

/**
 * Duração padrão sugerida ao soltar uma espécie na timeline.
 *
 * Usa o ciclo da espécie quando existe (hortaliça de 45 dias vira ~2 meses) e,
 * na falta dele, um padrão por estrato: quanto mais alto o andar, mais longa
 * tende a ser a permanência. Não é predição — é só um ponto de partida que o
 * usuário arrasta.
 */
export function duracaoSugeridaMeses(params: {
  diasParaColherMax: number | null;
  estrato: Estrato;
}): number {
  if (params.diasParaColherMax !== null) {
    return Math.max(
      DURACAO_MINIMA_MESES,
      Math.ceil(params.diasParaColherMax / 30),
    );
  }
  return PADRAO_POR_ESTRATO[params.estrato];
}

const PADRAO_POR_ESTRATO: Record<Estrato, number> = {
  emergente: 240,
  alto: 120,
  medio: 60,
  baixo: 24,
  rasteiro: 12,
};

export interface PlantioNaLinha {
  id: string;
  estrato: Estrato;
  mesInicio: number;
  mesFim: number;
}

/** Plantios ativos num dado mês, agrupados por estrato. */
export function plantiosAtivosEm(
  plantios: readonly PlantioNaLinha[],
  mes: number,
): PlantioNaLinha[] {
  return plantios.filter(
    (plantio) => plantio.mesInicio <= mes && mes < plantio.mesFim,
  );
}

/**
 * Empilha as barras de uma faixa em sublinhas, para que plantios simultâneos
 * não se sobreponham visualmente.
 *
 * Devolve o índice da sublinha de cada plantio. Algoritmo guloso: a barra vai
 * para a primeira sublinha cuja última barra já terminou.
 */
export function distribuirEmSublinhas(
  plantios: readonly PlantioNaLinha[],
): Map<string, number> {
  const ordenados = [...plantios].sort(
    (a, b) => a.mesInicio - b.mesInicio || a.mesFim - b.mesFim,
  );

  const fimDaSublinha: number[] = [];
  const resultado = new Map<string, number>();

  for (const plantio of ordenados) {
    let sublinha = fimDaSublinha.findIndex((fim) => fim <= plantio.mesInicio);
    if (sublinha === -1) {
      sublinha = fimDaSublinha.length;
      fimDaSublinha.push(plantio.mesFim);
    } else {
      fimDaSublinha[sublinha] = plantio.mesFim;
    }
    resultado.set(plantio.id, sublinha);
  }

  return resultado;
}

/** Quantas sublinhas uma faixa precisa para caber tudo. */
export function alturaEmSublinhas(plantios: readonly PlantioNaLinha[]): number {
  if (plantios.length === 0) return 1;
  return Math.max(...distribuirEmSublinhas(plantios).values()) + 1;
}

export interface CoberturaDoEstrato {
  estrato: Estrato;
  /** Meses do horizonte com ao menos um plantio. */
  mesesOcupados: number;
  /** Fração do horizonte coberta, de 0 a 1. */
  cobertura: number;
  ocupacaoIdeal: number | null;
}

/**
 * Quanto de cada andar está ocupado ao longo do horizonte.
 *
 * Mede presença no TEMPO, não densidade de copa — a ocupação ideal do livro
 * (20/40/60/80%) é uma medida de espaço, e só poderá ser confrontada de fato
 * quando o mapa existir (fase 4). Aqui ela aparece como referência ao lado,
 * não como veredito.
 */
export function coberturaPorEstrato(
  plantios: readonly PlantioNaLinha[],
  horizonteMeses: number,
): CoberturaDoEstrato[] {
  return ESTRATOS_DE_CIMA_PARA_BAIXO.map((estrato) => {
    const doEstrato = plantios.filter((plantio) => plantio.estrato === estrato);

    let ocupados = 0;
    for (let mes = 0; mes < horizonteMeses; mes++) {
      if (doEstrato.some((p) => p.mesInicio <= mes && mes < p.mesFim)) {
        ocupados++;
      }
    }

    return {
      estrato,
      mesesOcupados: ocupados,
      cobertura: horizonteMeses > 0 ? ocupados / horizonteMeses : 0,
      ocupacaoIdeal: OCUPACAO_IDEAL[estrato],
    };
  });
}

/**
 * Trechos do horizonte em que NENHUM estrato tem planta.
 *
 * É o diagnóstico mais elementar que o modelo permite hoje: solo descoberto.
 * "Manter o solo coberto, o melhor começo" é o título do cap. 9.4 de
 * Agroflorestando o Mundo.
 */
export function lacunasDeCobertura(
  plantios: readonly PlantioNaLinha[],
  horizonteMeses: number,
): { de: number; ate: number }[] {
  const lacunas: { de: number; ate: number }[] = [];
  let inicioDaLacuna: number | null = null;

  for (let mes = 0; mes < horizonteMeses; mes++) {
    const vazio = !plantios.some((p) => p.mesInicio <= mes && mes < p.mesFim);

    if (vazio && inicioDaLacuna === null) inicioDaLacuna = mes;
    if (!vazio && inicioDaLacuna !== null) {
      lacunas.push({ de: inicioDaLacuna, ate: mes });
      inicioDaLacuna = null;
    }
  }

  if (inicioDaLacuna !== null) {
    lacunas.push({ de: inicioDaLacuna, ate: horizonteMeses });
  }
  return lacunas;
}
