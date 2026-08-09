/**
 * O diário: tipos de manejo e a leitura de "planejado versus realizado".
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

import { dataParaMesRelativo, type MesRelativo } from "./tempo.ts";

export const TIPOS_DE_EVENTO = [
  "semeadura",
  "plantio",
  "poda",
  "colheita",
  "rocada",
  "adubacao",
  "mortalidade",
  "observacao",
] as const;

export type TipoDeEvento = (typeof TIPOS_DE_EVENTO)[number];

export const EVENTO_LABEL: Record<TipoDeEvento, string> = {
  semeadura: "Semeadura",
  plantio: "Plantio",
  poda: "Poda",
  colheita: "Colheita",
  rocada: "Roçada",
  adubacao: "Adubação",
  mortalidade: "Mortalidade",
  observacao: "Observação",
};

/** Eventos que exigem quantidade para fazer sentido. */
export const EVENTO_COM_QUANTIDADE: ReadonlySet<TipoDeEvento> = new Set([
  "plantio",
  "semeadura",
  "colheita",
  "mortalidade",
]);

/** Unidade que costuma acompanhar cada tipo. Sugestão, não imposição. */
export const UNIDADE_SUGERIDA: Partial<Record<TipoDeEvento, string>> = {
  plantio: "mudas",
  semeadura: "sementes",
  colheita: "kg",
  mortalidade: "mudas",
};

export interface EventoDoDiario {
  tipo: TipoDeEvento;
  ocorridoEm: Date;
  quantidade: number | null;
  unidade: string | null;
}

export type EstadoRealizado = "planejado" | "plantado" | "encerrado";

/**
 * Estado de um plantio segundo o que o diário registra.
 *
 * Deriva dos eventos em vez de ser um campo que alguém precisa lembrar de
 * atualizar. Um plantio "encerra" quando a mortalidade acumulada alcança o que
 * foi plantado — não por decreto.
 */
export function estadoRealizado(
  eventos: readonly EventoDoDiario[],
): EstadoRealizado {
  const implantado = eventos.some(
    (evento) => evento.tipo === "plantio" || evento.tipo === "semeadura",
  );
  if (!implantado) return "planejado";

  const plantadas = somar(eventos, ["plantio", "semeadura"]);
  const perdidas = somar(eventos, ["mortalidade"]);

  // Sem quantidade registrada não dá para concluir que acabou.
  if (plantadas > 0 && perdidas >= plantadas) return "encerrado";
  return "plantado";
}

function somar(
  eventos: readonly EventoDoDiario[],
  tipos: readonly TipoDeEvento[],
): number {
  return eventos
    .filter((evento) => tipos.includes(evento.tipo))
    .reduce((total, evento) => total + (evento.quantidade ?? 0), 0);
}

/** Data em que o plantio de fato aconteceu, se aconteceu. */
export function dataDeImplantacao(
  eventos: readonly EventoDoDiario[],
): Date | null {
  const implantacoes = eventos
    .filter(
      (evento) => evento.tipo === "plantio" || evento.tipo === "semeadura",
    )
    .map((evento) => evento.ocorridoEm)
    .sort((a, b) => a.getTime() - b.getTime());

  return implantacoes[0] ?? null;
}

/**
 * Desvio entre o mês planejado e o mês em que se plantou de verdade.
 *
 * Positivo = atrasou. É o número que faz o planejamento conversar com a
 * realidade: sem ele, a timeline continuaria mostrando um desenho que já não
 * corresponde ao campo.
 */
export function desvioDaImplantacao(params: {
  inicioDoProjeto: Date;
  mesPlanejado: MesRelativo;
  eventos: readonly EventoDoDiario[];
}): number | null {
  const data = dataDeImplantacao(params.eventos);
  if (!data) return null;

  return (
    dataParaMesRelativo(params.inicioDoProjeto, data) - params.mesPlanejado
  );
}

export interface TotalDeColheita {
  unidade: string;
  total: number;
  registros: number;
}

/**
 * Colheita somada por unidade.
 *
 * Não converte entre unidades: somar 12 kg com 3 maços daria um número sem
 * significado. Cada unidade tem sua própria linha.
 */
export function totaisDeColheita(
  eventos: readonly EventoDoDiario[],
): TotalDeColheita[] {
  const porUnidade = new Map<string, { total: number; registros: number }>();

  for (const evento of eventos) {
    if (evento.tipo !== "colheita" || evento.quantidade === null) continue;

    const unidade = evento.unidade?.trim() || "sem unidade";
    const atual = porUnidade.get(unidade) ?? { total: 0, registros: 0 };
    porUnidade.set(unidade, {
      total: atual.total + evento.quantidade,
      registros: atual.registros + 1,
    });
  }

  return [...porUnidade.entries()]
    .map(([unidade, dados]) => ({ unidade, ...dados }))
    .sort((a, b) => b.total - a.total);
}

/** Agrupa eventos por mês (AAAA-MM) para a linha do tempo do diário. */
export function agruparPorMes<T extends { ocorridoEm: Date }>(
  eventos: readonly T[],
): { chave: string; eventos: T[] }[] {
  const grupos = new Map<string, T[]>();

  for (const evento of eventos) {
    const chave = `${evento.ocorridoEm.getFullYear()}-${String(
      evento.ocorridoEm.getMonth() + 1,
    ).padStart(2, "0")}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(evento);
  }

  return [...grupos.entries()]
    .map(([chave, lista]) => ({ chave, eventos: lista }))
    .sort((a, b) => b.chave.localeCompare(a.chave));
}
