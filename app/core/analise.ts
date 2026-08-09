/**
 * Análise do desenho: ocupação real dos estratos e diagnósticos.
 *
 * Aqui as duas metades do produto finalmente se encontram. A ocupação ideal do
 * livro (20/40/60/80%) é medida de ESPAÇO, e até a fase 3 só dava para medir
 * presença no tempo. Com o mapa, dá para medir de fato.
 *
 * O método é o do cap. 10 de *Agroflorestando o Mundo*: a ocupação de uma
 * espécie é a razão entre a densidade no consórcio e a densidade que ela teria
 * em monocultura. É por isso que os consórcios do livro somam 170%–277% —
 * "2,77 canteiros dentro de um canteiro".
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

import {
  ESTRATOS_DE_CIMA_PARA_BAIXO,
  OCUPACAO_IDEAL,
  type Estrato,
} from "./estratos.ts";
import { ordemSucessional, type Sucessao } from "./sucessao.ts";

export interface PlantioAnalisado {
  id: string;
  nomeComum: string;
  estrato: Estrato;
  sucessao: Sucessao | null;
  mesInicio: number;
  mesFim: number;
  /** Mudas efetivamente posicionadas no mapa. Zero se ainda sem lugar. */
  totalDeMudas: number;
  /** Espaçamentos em MONOCULTURA, vindos do catálogo. Nulos quando a fonte não informa. */
  espacamentoEntreLinhasM: number | null;
  espacamentoNaLinhaM: number | null;
}

/**
 * Fração do talhão que uma espécie ocuparia se plantada na densidade dela.
 *
 * `null` quando o catálogo não informa o espaçamento em monocultura — sem esse
 * número não há como medir, e estimá-lo seria inventar (CONTRIBUTING.md).
 */
export function ocupacaoDoPlantio(
  plantio: PlantioAnalisado,
  areaM2: number,
): number | null {
  if (
    plantio.espacamentoEntreLinhasM === null ||
    plantio.espacamentoNaLinhaM === null ||
    areaM2 <= 0
  ) {
    return null;
  }

  // Área que uma única planta ocuparia em monocultura.
  const areaPorPlanta =
    plantio.espacamentoEntreLinhasM * plantio.espacamentoNaLinhaM;

  return (plantio.totalDeMudas * areaPorPlanta) / areaM2;
}

export type Veredito = "vazio" | "sub" | "adequado" | "sobre" | "sem_medida";

export interface OcupacaoDoEstrato {
  estrato: Estrato;
  ocupacao: number;
  ideal: number | null;
  veredito: Veredito;
  /** Plantios ativos que não puderam ser medidos, por falta de espaçamento. */
  semMedida: string[];
}

/**
 * Ocupação de cada andar num dado mês.
 *
 * Só entram plantios ativos naquele mês — é o que torna a leitura dinâmica:
 * um consórcio pode estar equilibrado no ano 1 e sobrecarregado no ano 5.
 */
export function ocupacaoPorEstratoNoMes(
  plantios: readonly PlantioAnalisado[],
  areaM2: number,
  mes: number,
): OcupacaoDoEstrato[] {
  return ESTRATOS_DE_CIMA_PARA_BAIXO.map((estrato) => {
    const ativos = plantios.filter(
      (plantio) =>
        plantio.estrato === estrato &&
        plantio.mesInicio <= mes &&
        mes < plantio.mesFim,
    );

    let ocupacao = 0;
    const semMedida: string[] = [];

    for (const plantio of ativos) {
      const parcela = ocupacaoDoPlantio(plantio, areaM2);
      if (parcela === null) semMedida.push(plantio.nomeComum);
      else ocupacao += parcela;
    }

    const ideal = OCUPACAO_IDEAL[estrato];

    return {
      estrato,
      ocupacao,
      ideal,
      veredito: julgar({ ativos: ativos.length, ocupacao, semMedida, ideal }),
      semMedida,
    };
  });
}

function julgar(params: {
  ativos: number;
  ocupacao: number;
  semMedida: string[];
  ideal: number | null;
}): Veredito {
  if (params.ativos === 0) return "vazio";
  // Alguém ocupa o andar, mas não sabemos quanto: melhor calar do que julgar.
  if (params.ocupacao === 0 && params.semMedida.length > 0) return "sem_medida";
  if (params.ideal === null) return "sem_medida";

  // As faixas são deliberadamente largas. O próprio livro trata os números
  // como referência, não como meta: "espaçamentos e ciclos mudam com solo,
  // clima e estação".
  if (params.ocupacao < params.ideal * 0.5) return "sub";
  if (params.ocupacao > params.ideal * 1.25) return "sobre";
  return "adequado";
}

export type Gravidade = "info" | "atencao" | "alerta";

export interface Diagnostico {
  chave: string;
  gravidade: Gravidade;
  titulo: string;
  detalhe: string;
  /** Meses a que o diagnóstico se refere, quando aplicável. */
  de?: number;
  ate?: number;
}

/**
 * Diagnósticos do desenho.
 *
 * Cada um aponta um problema que a literatura de referência nomeia. Nenhum
 * inventa recomendação: eles descrevem o que está no desenho e citam o
 * princípio correspondente.
 */
export function diagnosticar(params: {
  plantios: readonly PlantioAnalisado[];
  horizonteMeses: number;
  areaM2: number;
}): Diagnostico[] {
  const { plantios, horizonteMeses, areaM2 } = params;
  const diagnosticos: Diagnostico[] = [];

  if (plantios.length === 0) return diagnosticos;

  // ── Solo descoberto ────────────────────────────────────────────────────
  for (const lacuna of lacunasDeSolo(plantios, horizonteMeses)) {
    diagnosticos.push({
      chave: `solo-${lacuna.de}`,
      gravidade: "alerta",
      titulo: "Solo descoberto",
      detalhe:
        "Nenhuma planta ocupa o sistema neste período. Manter o solo coberto é o primeiro passo do manejo agroflorestal (Agroflorestando o Mundo, cap. 9.4).",
      de: lacuna.de,
      ate: lacuna.ate,
    });
  }

  // ── Ausência de quem prepara o terreno ─────────────────────────────────
  const primeiroAno = plantios.filter((plantio) => plantio.mesInicio < 12);
  const temPreparo = primeiroAno.some(
    (plantio) =>
      plantio.sucessao !== null && ordemSucessional(plantio.sucessao) <= 2,
  );

  if (primeiroAno.length > 0 && !temPreparo) {
    diagnosticos.push({
      chave: "sem-placenta",
      gravidade: "atencao",
      titulo: "Nenhuma placenta ou pioneira no primeiro ano",
      detalhe:
        "As colonizadoras servem de placenta protetora enquanto as árvores ainda são frágeis, e as pioneiras criam as condições das secundárias (cap. 7.1).",
      de: 0,
      ate: 12,
    });
  }

  // ── Sistema que não avança ─────────────────────────────────────────────
  const comSucessao = plantios.filter((plantio) => plantio.sucessao !== null);
  const temLongoPrazo = comSucessao.some(
    (plantio) => ordemSucessional(plantio.sucessao!) >= 4,
  );

  if (comSucessao.length >= 3 && !temLongoPrazo) {
    diagnosticos.push({
      chave: "sem-climax",
      gravidade: "info",
      titulo: "Nenhuma espécie de ciclo longo",
      detalhe:
        "O sistema não tem quem assuma o estrato superior quando as de ciclo curto saírem. A sucessão caminha em degraus: cada espécie planta a próxima.",
    });
  }

  // ── Ocupação por andar ─────────────────────────────────────────────────
  const marcos = mesesDeAmostra(plantios, horizonteMeses);

  for (const estrato of ESTRATOS_DE_CIMA_PARA_BAIXO) {
    const sobrecarregado: number[] = [];

    for (const mes of marcos) {
      const linha = ocupacaoPorEstratoNoMes(plantios, areaM2, mes).find(
        (item) => item.estrato === estrato,
      )!;
      if (linha.veredito === "sobre") sobrecarregado.push(mes);
    }

    if (sobrecarregado.length > 0) {
      const ideal = OCUPACAO_IDEAL[estrato];
      diagnosticos.push({
        chave: `sobre-${estrato}`,
        gravidade: "atencao",
        titulo: `Estrato ${estrato} acima da ocupação de referência`,
        detalhe: `A referência do cap. 10 para este andar é ${Math.round((ideal ?? 0) * 100)}%. Acima disso, o andar de baixo recebe menos luz do que precisa.`,
        de: sobrecarregado[0],
        ate: sobrecarregado.at(-1),
      });
    }
  }

  // ── Dados que faltam para medir ────────────────────────────────────────
  const semEspacamento = [
    ...new Set(
      plantios
        .filter(
          (plantio) =>
            plantio.totalDeMudas > 0 &&
            (plantio.espacamentoEntreLinhasM === null ||
              plantio.espacamentoNaLinhaM === null),
        )
        .map((plantio) => plantio.nomeComum),
    ),
  ];

  if (semEspacamento.length > 0) {
    diagnosticos.push({
      chave: "sem-espacamento",
      gravidade: "info",
      titulo: "Ocupação não pôde ser medida para algumas espécies",
      detalhe: `O catálogo não informa o espaçamento em monocultura de: ${semEspacamento.join(", ")}. Sem esse número não há como calcular a ocupação — e estimá-lo seria inventar. Se você tem a fonte, sugira a correção no catálogo.`,
    });
  }

  return diagnosticos;
}

/** Períodos em que nenhum estrato tem planta viva. */
export function lacunasDeSolo(
  plantios: readonly PlantioAnalisado[],
  horizonteMeses: number,
): { de: number; ate: number }[] {
  const lacunas: { de: number; ate: number }[] = [];
  let inicio: number | null = null;

  for (let mes = 0; mes < horizonteMeses; mes++) {
    const vazio = !plantios.some(
      (plantio) => plantio.mesInicio <= mes && mes < plantio.mesFim,
    );

    if (vazio && inicio === null) inicio = mes;
    if (!vazio && inicio !== null) {
      lacunas.push({ de: inicio, ate: mes });
      inicio = null;
    }
  }
  if (inicio !== null) lacunas.push({ de: inicio, ate: horizonteMeses });

  return lacunas;
}

/**
 * Meses em que a composição muda.
 *
 * Amostrar mês a mês num horizonte de 50 anos seriam 600 avaliações por
 * estrato, quase todas idênticas. A composição só muda quando um plantio entra
 * ou sai, então basta avaliar nesses instantes.
 */
export function mesesDeAmostra(
  plantios: readonly PlantioAnalisado[],
  horizonteMeses: number,
): number[] {
  const marcos = new Set<number>([0]);

  for (const plantio of plantios) {
    if (plantio.mesInicio < horizonteMeses) marcos.add(plantio.mesInicio);
    if (plantio.mesFim < horizonteMeses) marcos.add(plantio.mesFim);
  }

  return [...marcos].sort((a, b) => a - b);
}

export interface ColheitaPrevista {
  plantioId: string;
  nomeComum: string;
  mesDe: number;
  mesAte: number;
}

/**
 * Janela de colheita prevista, a partir do ciclo informado no catálogo.
 *
 * Só entram espécies com dias para colher conhecidos. Não há previsão de poda:
 * nenhuma das fontes disponíveis dá periodicidade de poda, e chutar uma seria
 * inventar manejo.
 */
export function colheitasPrevistas(
  plantios: readonly (PlantioAnalisado & {
    diasParaColherMin: number | null;
    diasParaColherMax: number | null;
  })[],
): ColheitaPrevista[] {
  const previstas: ColheitaPrevista[] = [];

  for (const plantio of plantios) {
    if (plantio.diasParaColherMin === null) continue;

    const de = plantio.mesInicio + Math.ceil(plantio.diasParaColherMin / 30);
    const ate =
      plantio.mesInicio +
      Math.ceil((plantio.diasParaColherMax ?? plantio.diasParaColherMin) / 30);

    // Uma colheita prevista para depois da saída da planta não é previsão, é
    // contradição — indica que a barra é curta demais para o ciclo.
    if (de > plantio.mesFim) continue;

    previstas.push({
      plantioId: plantio.id,
      nomeComum: plantio.nomeComum,
      mesDe: de,
      mesAte: Math.min(ate, plantio.mesFim),
    });
  }

  return previstas.sort((a, b) => a.mesDe - b.mesDe);
}
