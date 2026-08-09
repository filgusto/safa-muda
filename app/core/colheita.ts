/**
 * Faixas de espera até a colheita.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 *
 * São tetos, não intervalos: "em até 1 ano" inclui a alface de 60 dias. Quem
 * desenha um consórcio pensa assim — precisa saber o que dá comida cedo
 * enquanto a fruteira cresce, e não o que colhe exatamente entre 300 e 365
 * dias.
 *
 * O corte usa `dias_para_colher_max`, o pior caso informado pela fonte.
 * Espécie sem esse dado fica de fora do filtro em vez de ganhar uma estimativa
 * (ver CLAUDE.md §4).
 */

export const FAIXAS_DE_COLHEITA = [90, 180, 365, 730, 1825, 3650] as const;

export type FaixaDeColheita = (typeof FAIXAS_DE_COLHEITA)[number];

export const FAIXA_DE_COLHEITA_LABEL: Record<FaixaDeColheita, string> = {
  90: "Em até 3 meses",
  180: "Em até 6 meses",
  365: "Em até 1 ano",
  730: "Em até 2 anos",
  1825: "Em até 5 anos",
  3650: "Em até 10 anos",
};

/** Aceita o valor cru vindo da URL e devolve a faixa, ou nada. */
export function lerFaixaDeColheita(valor: string): FaixaDeColheita | null {
  const dias = Number(valor);
  return (FAIXAS_DE_COLHEITA as readonly number[]).includes(dias)
    ? (dias as FaixaDeColheita)
    : null;
}
