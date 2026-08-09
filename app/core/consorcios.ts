/**
 * Consórcios de referência.
 *
 * Fonte: *Agroflorestando o Mundo — De Facão a Trator* (Corrêa Neto,
 * Messerschmidt, Steenbock, Monnerat; Cooperafloresta, 2016), cap. 10.1,
 * tabelas 2 a 10 (págs. 140–149).
 *
 * São arranjos testados em campo, não sugestões geradas por algoritmo. Cada
 * linha traz a percentagem de plantio que o próprio livro registra — é dela
 * que vêm os totais de 170% a 280%, "2,8 canteiros dentro de um canteiro".
 *
 * O livro adverte, e a interface repete: "espaçamentos e ciclos das plantas
 * mudam com solo, clima e estação do ano".
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

import type { Estrato } from "./estratos.ts";

export interface LinhaDoConsorcio {
  estrato: Estrato;
  /** Espécies intercambiáveis nesta linha, como o livro as lista. */
  especies: string[];
  diasParaColherMin: number;
  diasParaColherMax: number;
  /** Percentagem de plantio em relação à monocultura, segundo o livro. */
  percentagemDePlantio: number;
  observacao?: string;
}

export interface Consorcio {
  id: string;
  tabela: number;
  /** Ciclo de renovação do canteiro, em dias. */
  renovacaoDias: number;
  otimizadoPara: string;
  /** Soma das percentagens — o "quantos canteiros num canteiro". */
  totalDePlantio: number;
  linhas: LinhaDoConsorcio[];
  nota?: string;
}

export const CONSORCIOS: Consorcio[] = [
  {
    id: "tabela-2",
    tabela: 2,
    renovacaoDias: 45,
    otimizadoPara: "Alface",
    totalDePlantio: 200,
    linhas: [
      {
        estrato: "emergente",
        especies: ["Crotalaria Juncea"],
        diasParaColherMin: 45,
        diasParaColherMax: 45,
        percentagemDePlantio: 20,
        observacao:
          "Adubação verde. Como é emergente e ocupa só 20% do seu estrato, beneficia os andares de baixo.",
      },
      {
        estrato: "medio",
        especies: ["Alface"],
        diasParaColherMin: 45,
        diasParaColherMax: 45,
        percentagemDePlantio: 100,
      },
      {
        estrato: "medio",
        especies: ["Rabanete", "Rúcula", "Coentro"],
        diasParaColherMin: 25,
        diasParaColherMax: 30,
        percentagemDePlantio: 80,
        observacao:
          "Colher com raiz e tudo aos 30 dias: depois disso atrapalham o alface, pela sombra e pela informação de envelhecimento.",
      },
    ],
  },
  {
    id: "tabela-3",
    tabela: 3,
    renovacaoDias: 45,
    otimizadoPara: "Alface, chicória, almeirão, acelga ou nabo",
    totalDePlantio: 277,
    linhas: [
      {
        estrato: "emergente",
        especies: ["Milho verde", "Girassol"],
        diasParaColherMin: 90,
        diasParaColherMax: 90,
        percentagemDePlantio: 25,
        observacao: "Plantio adensado, 8 plantas/m².",
      },
      {
        estrato: "alto",
        especies: ["Couve"],
        diasParaColherMin: 65,
        diasParaColherMax: 90,
        percentagemDePlantio: 92,
        observacao:
          "Duas carreiras nas laterais do canteiro. Chega ao pleno desenvolvimento depois das hortaliças saírem.",
      },
      {
        estrato: "medio",
        especies: ["Alface", "Almeirão", "Acelga", "Nabo"],
        diasParaColherMin: 45,
        diasParaColherMax: 60,
        percentagemDePlantio: 80,
      },
      {
        estrato: "medio",
        especies: ["Rabanete", "Rúcula", "Coentro"],
        diasParaColherMin: 25,
        diasParaColherMax: 30,
        percentagemDePlantio: 80,
      },
    ],
  },
  {
    id: "tabela-4",
    tabela: 4,
    renovacaoDias: 90,
    otimizadoPara: "Feijão ou vagem rasteira",
    totalDePlantio: 220,
    linhas: [
      {
        estrato: "emergente",
        especies: ["Milho verde"],
        diasParaColherMin: 90,
        diasParaColherMax: 90,
        percentagemDePlantio: 20,
      },
      {
        estrato: "alto",
        especies: ["Feijão de Corda", "Vagem"],
        diasParaColherMin: 90,
        diasParaColherMax: 90,
        percentagemDePlantio: 50,
        observacao: "Na mesma linha do milho, com duas sementes por cova.",
      },
      {
        estrato: "medio",
        especies: ["Arroz"],
        diasParaColherMin: 90,
        diasParaColherMax: 90,
        percentagemDePlantio: 50,
        observacao: "Variedade de 3 meses, duas linhas entre milho e feijão.",
      },
      {
        estrato: "baixo",
        especies: ["Vagem"],
        diasParaColherMin: 60,
        diasParaColherMax: 90,
        percentagemDePlantio: 100,
        observacao: "De arranque (moita) ou rasteira.",
      },
    ],
  },
  {
    id: "tabela-5",
    tabela: 5,
    renovacaoDias: 90,
    otimizadoPara: "Milho, feijão e arroz",
    totalDePlantio: 190,
    linhas: [
      {
        estrato: "emergente",
        especies: ["Milho verde"],
        diasParaColherMin: 90,
        diasParaColherMax: 90,
        percentagemDePlantio: 20,
      },
      {
        estrato: "alto",
        especies: ["Feijão de Corda", "Vagem"],
        diasParaColherMin: 90,
        diasParaColherMax: 90,
        percentagemDePlantio: 50,
      },
      {
        estrato: "medio",
        especies: ["Arroz"],
        diasParaColherMin: 90,
        diasParaColherMax: 90,
        percentagemDePlantio: 50,
      },
      {
        estrato: "baixo",
        especies: ["Pepino", "Melancia"],
        diasParaColherMin: 40,
        diasParaColherMax: 90,
        percentagemDePlantio: 50,
        observacao:
          "Entram com densidade reduzida por cobrirem muito as outras plantas.",
      },
    ],
  },
  {
    id: "tabela-6",
    tabela: 6,
    renovacaoDias: 120,
    otimizadoPara: "Alface, chicória, almeirão ou nabo",
    totalDePlantio: 235,
    linhas: [
      {
        estrato: "emergente",
        especies: ["Milho verde", "Quiabo", "Gergelim"],
        diasParaColherMin: 90,
        diasParaColherMax: 120,
        percentagemDePlantio: 25,
      },
      {
        estrato: "alto",
        especies: ["Brócoli Ramoso", "Couve", "Couve flor"],
        diasParaColherMin: 90,
        diasParaColherMax: 120,
        percentagemDePlantio: 50,
        observacao: "Duas ruas próximas às bordas, uma planta a cada metro.",
      },
      {
        estrato: "medio",
        especies: ["Alface", "Almeirão", "Nabo"],
        diasParaColherMin: 45,
        diasParaColherMax: 60,
        percentagemDePlantio: 80,
      },
      {
        estrato: "medio",
        especies: ["Rabanete", "Rúcula", "Coentro"],
        diasParaColherMin: 25,
        diasParaColherMax: 30,
        percentagemDePlantio: 80,
      },
    ],
  },
  {
    id: "tabela-7",
    tabela: 7,
    renovacaoDias: 120,
    otimizadoPara: "Cenoura ou beterraba",
    totalDePlantio: 275,
    linhas: [
      {
        estrato: "emergente",
        especies: ["Milho verde", "Quiabo", "Gergelim"],
        diasParaColherMin: 90,
        diasParaColherMax: 120,
        percentagemDePlantio: 25,
      },
      {
        estrato: "alto",
        especies: ["Brócoli Ramoso", "Couve", "Couve flor"],
        diasParaColherMin: 90,
        diasParaColherMax: 120,
        percentagemDePlantio: 50,
      },
      {
        estrato: "medio",
        especies: ["Cenoura", "Beterraba"],
        diasParaColherMin: 90,
        diasParaColherMax: 120,
        percentagemDePlantio: 100,
      },
      {
        estrato: "baixo",
        especies: ["Rabanete"],
        diasParaColherMin: 25,
        diasParaColherMax: 25,
        percentagemDePlantio: 100,
        observacao:
          "Entra pela sucessão: pode até ter as sementes caindo junto com a cenoura.",
      },
    ],
    nota: "Com beterraba no lugar da cenoura, o total cai para 255%.",
  },
  {
    id: "tabela-8",
    tabela: 8,
    renovacaoDias: 120,
    otimizadoPara: "Tomate e alface",
    totalDePlantio: 220,
    linhas: [
      {
        estrato: "emergente",
        especies: ["Milho verde", "Gergelim", "Quiabo"],
        diasParaColherMin: 90,
        diasParaColherMax: 120,
        percentagemDePlantio: 25,
      },
      {
        estrato: "alto",
        especies: ["Tomate"],
        diasParaColherMin: 120,
        diasParaColherMax: 120,
        percentagemDePlantio: 25,
        observacao:
          "Tutorado a cada metro entre os pés de milho — a estaca pode ser maniva de mandioca.",
      },
      {
        estrato: "medio",
        especies: ["Alface"],
        diasParaColherMin: 40,
        diasParaColherMax: 40,
        percentagemDePlantio: 100,
      },
      {
        estrato: "medio",
        especies: ["Rabanete", "Rúcula", "Coentro"],
        diasParaColherMin: 25,
        diasParaColherMax: 30,
        percentagemDePlantio: 70,
      },
    ],
  },
  {
    id: "tabela-9",
    tabela: 9,
    renovacaoDias: 120,
    otimizadoPara: "Batata inglesa",
    totalDePlantio: 170,
    linhas: [
      {
        estrato: "emergente",
        especies: ["Milho verde", "Gergelim", "Quiabo"],
        diasParaColherMin: 80,
        diasParaColherMax: 120,
        percentagemDePlantio: 20,
      },
      {
        estrato: "alto",
        especies: ["Brócoli Ramoso", "Couve", "Couve flor"],
        diasParaColherMin: 90,
        diasParaColherMax: 120,
        percentagemDePlantio: 50,
      },
      {
        estrato: "medio",
        especies: ["Batata Inglesa"],
        diasParaColherMin: 90,
        diasParaColherMax: 90,
        percentagemDePlantio: 100,
      },
    ],
    nota: "As demais entram pela estratificação: nesta ocupação, beneficiam a batata.",
  },
  {
    id: "tabela-10",
    tabela: 10,
    renovacaoDias: 120,
    otimizadoPara: "Alface",
    totalDePlantio: 280,
    linhas: [
      {
        estrato: "emergente",
        especies: ["Milho verde", "Quiabo", "Gergelim"],
        diasParaColherMin: 80,
        diasParaColherMax: 120,
        percentagemDePlantio: 20,
      },
      {
        estrato: "alto",
        especies: [
          "Repolho",
          "Berinjela",
          "Jiló",
          "Brócoli Ramoso",
          "Couve",
          "Couve flor",
        ],
        diasParaColherMin: 80,
        diasParaColherMax: 120,
        percentagemDePlantio: 100,
      },
      {
        estrato: "medio",
        especies: ["Alface"],
        diasParaColherMin: 40,
        diasParaColherMax: 45,
        percentagemDePlantio: 80,
      },
      {
        estrato: "medio",
        especies: ["Rabanete", "Rúcula", "Coentro"],
        diasParaColherMin: 25,
        diasParaColherMax: 30,
        percentagemDePlantio: 80,
      },
    ],
  },
];

/**
 * Consórcios que combinam com o que já está desenhado.
 *
 * O critério é a intersecção de espécies: se o usuário já pôs alface, os
 * arranjos do livro que incluem alface são os que interessam. Não há
 * pontuação inventada — é filtro, não recomendação algorítmica.
 */
export function consorciosRelacionados(
  nomesJaUsados: readonly string[],
): { consorcio: Consorcio; emComum: string[] }[] {
  const usados = new Set(nomesJaUsados.map((nome) => nome.toLowerCase()));

  return CONSORCIOS.map((consorcio) => {
    const emComum = [
      ...new Set(
        consorcio.linhas
          .flatMap((linha) => linha.especies)
          .filter((especie) => usados.has(especie.toLowerCase())),
      ),
    ];
    return { consorcio, emComum };
  })
    .filter((item) => item.emComum.length > 0)
    .sort((a, b) => b.emComum.length - a.emComum.length);
}

/** Todas as espécies citadas nos consórcios, para o seed resolver os ids. */
export function especiesDosConsorcios(): string[] {
  return [
    ...new Set(CONSORCIOS.flatMap((c) => c.linhas.flatMap((l) => l.especies))),
  ].sort();
}
