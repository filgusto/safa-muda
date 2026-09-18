import { ESTRATOS, ESTRATO_LABEL } from "@/core/estratos.ts";
import {
  SUCESSOES,
  SUCESSAO_LABEL,
  SISTEMAS,
  SISTEMA_LABEL,
} from "@/core/sucessao.ts";
import { GRUPOS, GRUPO_LABEL } from "@/core/grupos.ts";
import {
  CICLOS_DE_VIDA,
  CICLO_DE_VIDA_LABEL,
  HABITOS,
  HABITO_LABEL,
} from "@/core/ciclo.ts";
import {
  REBROTAS,
  REBROTA_LABEL,
  GEMAS_DE_REBROTA,
  GEMA_DE_REBROTA_LABEL,
} from "@/core/poda.ts";
import {
  FAIXAS_DE_COLHEITA,
  FAIXA_DE_COLHEITA_LABEL,
} from "@/core/colheita.ts";

/**
 * Vocabulário compartilhado dos filtros do catálogo.
 *
 * As mesmas dimensões valem no catálogo público (estado na URL) e na gaveta do
 * planejador (estado em memória), e o nome de cada uma é também a chave de
 * query que `lib/catalogo.ts` lê — mantenha os dois lados em sincronia.
 */

/** Dimensões de filtro, na ordem em que aparecem na barra. */
export const DIMENSOES = [
  "estrato",
  "sucessao",
  "sistema",
  "grupo",
  "ciclo",
  "habito",
  "rebrota",
  "gemas",
  "colheita",
  "familia",
] as const;

export type Dimensao = (typeof DIMENSOES)[number];

export const DIMENSAO_LABEL: Record<Dimensao, string> = {
  estrato: "Estrato",
  sucessao: "Sucessão",
  sistema: "Sistema",
  grupo: "Grupo",
  ciclo: "Ciclo de vida",
  habito: "Hábito",
  rebrota: "Rebrota",
  gemas: "Rebrota de onde",
  colheita: "Colheita",
  familia: "Família",
};

export type Opcao = { valor: string; rotulo: string };

export type Selecao = Record<Dimensao, string[]>;

export const SELECAO_VAZIA: Selecao = {
  estrato: [],
  sucessao: [],
  sistema: [],
  grupo: [],
  ciclo: [],
  habito: [],
  rebrota: [],
  gemas: [],
  colheita: [],
  familia: [],
};

/**
 * Opções fixas — as que vêm de vocabulário fechado em `core/`.
 *
 * Família fica de fora: são quase cem, mudam com o catálogo e por isso vêm do
 * banco em cada tela do jeito que couber (props no servidor, `fetch` na gaveta).
 */
export const OPCOES_FIXAS: Record<Exclude<Dimensao, "familia">, Opcao[]> = {
  estrato: ESTRATOS.map((valor) => ({ valor, rotulo: ESTRATO_LABEL[valor] })),
  sucessao: SUCESSOES.map((valor) => ({
    valor,
    rotulo: SUCESSAO_LABEL[valor],
  })),
  sistema: SISTEMAS.map((valor) => ({ valor, rotulo: SISTEMA_LABEL[valor] })),
  grupo: GRUPOS.map((valor) => ({ valor, rotulo: GRUPO_LABEL[valor] })),
  ciclo: CICLOS_DE_VIDA.map((valor) => ({
    valor,
    rotulo: CICLO_DE_VIDA_LABEL[valor],
  })),
  habito: HABITOS.map((valor) => ({ valor, rotulo: HABITO_LABEL[valor] })),
  rebrota: REBROTAS.map((valor) => ({ valor, rotulo: REBROTA_LABEL[valor] })),
  gemas: GEMAS_DE_REBROTA.map((valor) => ({
    valor,
    rotulo: GEMA_DE_REBROTA_LABEL[valor],
  })),
  colheita: FAIXAS_DE_COLHEITA.map((dias) => ({
    valor: String(dias),
    rotulo: FAIXA_DE_COLHEITA_LABEL[dias],
  })),
};

/**
 * Liga ou desliga um valor, devolvendo a seleção nova.
 *
 * Colheita é escolha única: os valores são tetos, e marcar "até 3 meses" junto
 * com "até 10 anos" só significaria "até 10 anos" — dois chips acesos para um
 * resultado só.
 */
export function alternarSelecao(
  selecao: Selecao,
  dimensao: Dimensao,
  valor: string,
): Selecao {
  const jaTem = selecao[dimensao].includes(valor);

  if (dimensao === "colheita") {
    return { ...selecao, colheita: jaTem ? [] : [valor] };
  }

  return {
    ...selecao,
    [dimensao]: jaTem
      ? selecao[dimensao].filter((item) => item !== valor)
      : [...selecao[dimensao], valor],
  };
}

/** Quantos chips estão acesos somando todas as dimensões. */
export function contarSelecionados(selecao: Selecao): number {
  return DIMENSOES.reduce(
    (soma, dimensao) => soma + selecao[dimensao].length,
    0,
  );
}
