/**
 * Geometria do croqui: o que dá para calcular sobre o desenho no plano local.
 *
 * Tudo em METROS. É a aritmética simples que o plano local torna possível —
 * ver docs/adr/0001-plano-metrico-local.md.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

import {
  type PontoLocal,
  distancia,
  comprimento,
  pontoAoLongo,
} from "./geo.ts";

export interface Limites {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function limites(pontos: readonly PontoLocal[]): Limites | null {
  if (pontos.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const ponto of pontos) {
    if (ponto.x < minX) minX = ponto.x;
    if (ponto.y < minY) minY = ponto.y;
    if (ponto.x > maxX) maxX = ponto.x;
    if (ponto.y > maxY) maxY = ponto.y;
  }
  return { minX, minY, maxX, maxY };
}

export function centro(pontos: readonly PontoLocal[]): PontoLocal {
  const caixa = limites(pontos);
  if (!caixa) return { x: 0, y: 0 };
  return {
    x: (caixa.minX + caixa.maxX) / 2,
    y: (caixa.minY + caixa.maxY) / 2,
  };
}

/**
 * Ponto dentro do polígono, por lançamento de raio.
 *
 * Conta quantas arestas um raio horizontal cruza: ímpar = dentro.
 */
export function pontoDentroDoPoligono(
  ponto: PontoLocal,
  poligono: readonly PontoLocal[],
): boolean {
  if (poligono.length < 3) return false;

  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i]!;
    const b = poligono[j]!;

    const cruza = a.y > ponto.y !== b.y > ponto.y;
    if (!cruza) continue;

    const xNaAresta = ((b.x - a.x) * (ponto.y - a.y)) / (b.y - a.y) + a.x;
    if (ponto.x < xNaAresta) dentro = !dentro;
  }
  return dentro;
}

/** Perímetro do polígono, fechando o último vértice no primeiro. */
export function perimetro(poligono: readonly PontoLocal[]): number {
  if (poligono.length < 2) return 0;
  return comprimento([...poligono, poligono[0]!]);
}

/**
 * Recorta uma reta infinita pelo polígono, devolvendo os trechos internos.
 *
 * A reta é dada por um ponto e uma direção unitária. Acha os parâmetros `t` em
 * que ela cruza cada aresta, ordena, e toma os pares consecutivos cujo ponto
 * médio cai dentro — o que trata corretamente polígonos côncavos, em que a reta
 * entra e sai mais de uma vez.
 */
export function recortarRetaNoPoligono(
  origem: PontoLocal,
  direcao: PontoLocal,
  poligono: readonly PontoLocal[],
): [PontoLocal, PontoLocal][] {
  if (poligono.length < 3) return [];

  const cruzamentos: number[] = [];

  for (let i = 0; i < poligono.length; i++) {
    const a = poligono[i]!;
    const b = poligono[(i + 1) % poligono.length]!;

    // Resolve  origem + t·direcao = a + u·aresta.
    const arestaX = b.x - a.x;
    const arestaY = b.y - a.y;

    const determinante = arestaX * direcao.y - direcao.x * arestaY;
    // Paralelas: ou não cruzam, ou são colineares (ignoradas de propósito —
    // uma linha rente à borda não gera trecho útil de plantio).
    if (Math.abs(determinante) < 1e-12) continue;

    const paraAX = a.x - origem.x;
    const paraAY = a.y - origem.y;

    const t = (arestaX * paraAY - arestaY * paraAX) / determinante;
    const u = (direcao.x * paraAY - direcao.y * paraAX) / determinante;

    // u fora de [0,1] significa que o cruzamento cai no prolongamento da
    // aresta, não nela.
    if (u >= 0 && u <= 1) cruzamentos.push(t);
  }

  if (cruzamentos.length < 2) return [];
  cruzamentos.sort((a, b) => a - b);

  const trechos: [PontoLocal, PontoLocal][] = [];

  for (let i = 0; i < cruzamentos.length - 1; i++) {
    const t1 = cruzamentos[i]!;
    const t2 = cruzamentos[i + 1]!;
    if (t2 - t1 < 1e-9) continue;

    const meio = (t1 + t2) / 2;
    const pontoMedio = {
      x: origem.x + direcao.x * meio,
      y: origem.y + direcao.y * meio,
    };

    if (pontoDentroDoPoligono(pontoMedio, poligono)) {
      trechos.push([
        { x: origem.x + direcao.x * t1, y: origem.y + direcao.y * t1 },
        { x: origem.x + direcao.x * t2, y: origem.y + direcao.y * t2 },
      ]);
    }
  }
  return trechos;
}

export interface ParametrosDasLinhas {
  poligono: readonly PontoLocal[];
  /** Direção das linhas em graus, 0 = leste, 90 = norte. */
  direcaoGraus: number;
  espacamentoM: number;
  /** Recuo a partir da borda do polígono, em metros. */
  bordaduraM?: number;
}

/**
 * Gera linhas de plantio paralelas cobrindo o polígono.
 *
 * A bordadura encolhe o alcance perpendicular, evitando linhas rentes à cerca.
 * Cada linha é recortada pelo polígono, então áreas côncavas produzem mais de
 * um trecho — e cada trecho vira uma linha própria.
 */
export function gerarLinhasParalelas(
  parametros: ParametrosDasLinhas,
): PontoLocal[][] {
  const { poligono, direcaoGraus, espacamentoM } = parametros;
  const bordadura = parametros.bordaduraM ?? 0;

  if (poligono.length < 3 || espacamentoM <= 0) return [];

  const rad = (direcaoGraus * Math.PI) / 180;
  const direcao = { x: Math.cos(rad), y: Math.sin(rad) };
  // Normal à direção das linhas: é ao longo dela que elas se distribuem.
  const normal = { x: -direcao.y, y: direcao.x };

  const meio = centro(poligono);

  // Alcance do polígono projetado na normal.
  let minimo = Infinity;
  let maximo = -Infinity;
  for (const vertice of poligono) {
    const projecao =
      (vertice.x - meio.x) * normal.x + (vertice.y - meio.y) * normal.y;
    if (projecao < minimo) minimo = projecao;
    if (projecao > maximo) maximo = projecao;
  }

  minimo += bordadura;
  maximo -= bordadura;
  if (minimo > maximo) return [];

  const linhas: PontoLocal[][] = [];

  // Começa no primeiro múltiplo do espaçamento dentro do alcance, para que a
  // malha não dependa de onde o centro caiu.
  for (
    let deslocamento = minimo;
    deslocamento <= maximo + 1e-9;
    deslocamento += espacamentoM
  ) {
    const origem = {
      x: meio.x + normal.x * deslocamento,
      y: meio.y + normal.y * deslocamento,
    };

    for (const [inicio, fim] of recortarRetaNoPoligono(
      origem,
      direcao,
      poligono,
    )) {
      const trecho = encolherTrecho(inicio, fim, bordadura);
      if (trecho) linhas.push(trecho);
    }
  }

  return linhas;
}

/** Recua as duas pontas de um trecho; devolve null se sobrar nada. */
function encolherTrecho(
  inicio: PontoLocal,
  fim: PontoLocal,
  recuo: number,
): PontoLocal[] | null {
  if (recuo <= 0) return [inicio, fim];

  const total = distancia(inicio, fim);
  if (total <= recuo * 2) return null;

  const ux = (fim.x - inicio.x) / total;
  const uy = (fim.y - inicio.y) / total;

  return [
    { x: inicio.x + ux * recuo, y: inicio.y + uy * recuo },
    { x: fim.x - ux * recuo, y: fim.y - uy * recuo },
  ];
}

export interface RegraDePosicionamento {
  tipo: "linha";
  rowId: string;
  deMetros: number;
  ateMetros: number;
  espacamentoM: number;
}

/**
 * Quantas mudas uma regra produz, sem gerar as posições.
 *
 * Usado nos contadores ao vivo: recalcular 800 pontos a cada tecla digitada no
 * campo de espaçamento seria desperdício.
 */
export function contarMudas(regra: RegraDePosicionamento): number {
  const trecho = regra.ateMetros - regra.deMetros;
  if (trecho < 0 || regra.espacamentoM <= 0) return 0;
  return Math.floor(trecho / regra.espacamentoM) + 1;
}

/** Posições das mudas de uma regra, ao longo do caminho da linha. */
export function posicoesDaRegra(
  regra: RegraDePosicionamento,
  caminho: readonly PontoLocal[],
): PontoLocal[] {
  if (regra.espacamentoM <= 0 || caminho.length < 2) return [];

  const posicoes: PontoLocal[] = [];
  const total = comprimento(caminho);
  const fim = Math.min(regra.ateMetros, total);

  for (let d = regra.deMetros; d <= fim + 1e-9; d += regra.espacamentoM) {
    const ponto = pontoAoLongo(caminho, d);
    if (ponto) posicoes.push(ponto);
  }
  return posicoes;
}

/** Densidade em mudas por hectare. */
export function densidadePorHectare(
  totalDeMudas: number,
  areaM2: number,
): number | null {
  if (areaM2 <= 0) return null;
  return (totalDeMudas / areaM2) * 10_000;
}

/**
 * Passo da régua que resulta em marcas legíveis na escala corrente.
 *
 * Sobe pela série 1-2-5 (1, 2, 5, 10, 20, 50…), que é o que produz números
 * redondos em qualquer zoom.
 */
export function passoDaRegua(
  metrosVisiveis: number,
  marcasDesejadas = 8,
): number {
  const bruto = metrosVisiveis / marcasDesejadas;
  if (bruto <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(bruto));
  const normalizado = bruto / magnitude;

  const passo =
    normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
  return passo * magnitude;
}
