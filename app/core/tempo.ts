/**
 * Tempo do planejamento.
 *
 * Decisão fechada (docs/PLANO.md §0): o planejamento vive em MESES RELATIVOS
 * ao início do projeto — é como o agrofloresteiro pensa ("ano 3") e é o que
 * permite reaproveitar um desenho em outra data de plantio. O diário usa datas
 * absolutas; este módulo faz a ponte.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

/** Mês relativo ao início do projeto. 0 = mês de implantação. */
export type MesRelativo = number;

export function mesesParaAnos(meses: MesRelativo): number {
  return meses / 12;
}

export function anosParaMeses(anos: number): MesRelativo {
  return Math.round(anos * 12);
}

/** Converte mês relativo em data absoluta, dada a data de início do projeto. */
export function mesRelativoParaData(
  inicioDoProjeto: Date,
  mes: MesRelativo,
): Date {
  const data = new Date(inicioDoProjeto);
  data.setMonth(data.getMonth() + mes);
  return data;
}

/**
 * Converte data absoluta em mês relativo. Usado pelo diário: o usuário registra
 * "podei em 12/03", o sistema posiciona o evento na timeline.
 *
 * Trunca para baixo: um evento no dia 20 do mês 5 pertence ao mês 5.
 */
export function dataParaMesRelativo(
  inicioDoProjeto: Date,
  data: Date,
): MesRelativo {
  const anos = data.getFullYear() - inicioDoProjeto.getFullYear();
  const meses = data.getMonth() - inicioDoProjeto.getMonth();
  const total = anos * 12 + meses;
  // Ainda não completou o mês corrente.
  return data.getDate() < inicioDoProjeto.getDate() ? total - 1 : total;
}

/**
 * Níveis de zoom da timeline. O horizonte vai de uma hortaliça de 45 dias a um
 * jequitibá de 50 anos, então a escala precisa agregar — ver docs/PLANO.md §0.
 */
export const ZOOM_TIMELINE = ["mes", "trimestre", "ano"] as const;
export type ZoomTimeline = (typeof ZOOM_TIMELINE)[number];

export const MESES_POR_PASSO: Record<ZoomTimeline, number> = {
  mes: 1,
  trimestre: 3,
  ano: 12,
};

/**
 * Escolhe o zoom que mantém a timeline legível para um dado horizonte,
 * mirando algo em torno de 60 colunas.
 */
export function zoomSugerido(horizonteEmMeses: number): ZoomTimeline {
  if (horizonteEmMeses <= 60) return "mes";
  if (horizonteEmMeses <= 180) return "trimestre";
  return "ano";
}
