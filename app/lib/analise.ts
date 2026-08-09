import { eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { planting, species, area } from "@/db/schema/index.ts";
import { contarMudas, type RegraDePosicionamento } from "@/core/croqui.ts";
import type { PlantioAnalisado } from "@/core/analise.ts";
import type { Estrato } from "@/core/estratos.ts";
import type { Sucessao } from "@/core/sucessao.ts";

/**
 * Monta os dados que a análise consome.
 *
 * O trabalho aqui é juntar três coisas que vivem separadas: o plantio (tempo),
 * a regra de posicionamento (espaço) e o espaçamento em monocultura que o
 * catálogo informa. Sem as três não há como medir ocupação.
 */

export interface DadosDaAnalise {
  plantios: (PlantioAnalisado & {
    diasParaColherMin: number | null;
    diasParaColherMax: number | null;
  })[];
  /** Soma das áreas desenhadas. Zero quando não há mapa ainda. */
  areaTotalM2: number;
}

export async function montarAnalise(
  projectId: string,
): Promise<DadosDaAnalise> {
  const [linhas, areas] = await Promise.all([
    db
      .select({
        id: planting.id,
        estrato: planting.estrato,
        mesInicio: planting.mesInicio,
        mesFim: planting.mesFim,
        placement: planting.placement,
        nomeComum: species.nomeComum,
        sucessao: species.sucessao,
        espacamentoEntreLinhasM: species.espacamentoEntreLinhasMinM,
        espacamentoNaLinhaM: species.espacamentoNaLinhaMinM,
        diasParaColherMin: species.diasParaColherMin,
        diasParaColherMax: species.diasParaColherMax,
      })
      .from(planting)
      .innerJoin(species, eq(planting.speciesId, species.id))
      .where(eq(planting.projectId, projectId)),

    db
      .select({ areaM2: area.areaM2 })
      .from(area)
      .where(eq(area.projectId, projectId)),
  ]);

  const areaTotalM2 = areas.reduce((soma, item) => soma + item.areaM2, 0);

  return {
    areaTotalM2,
    plantios: linhas.map((linha) => {
      const regra = linha.placement as RegraDePosicionamento | null;

      return {
        id: linha.id,
        nomeComum: linha.nomeComum,
        estrato: linha.estrato as Estrato,
        sucessao: linha.sucessao as Sucessao | null,
        mesInicio: linha.mesInicio,
        mesFim: linha.mesFim,
        // Sem lugar no mapa, o plantio existe no tempo mas não ocupa espaço.
        totalDeMudas: regra?.tipo === "linha" ? contarMudas(regra) : 0,
        espacamentoEntreLinhasM: linha.espacamentoEntreLinhasM,
        espacamentoNaLinhaM: linha.espacamentoNaLinhaM,
        diasParaColherMin: linha.diasParaColherMin,
        diasParaColherMax: linha.diasParaColherMax,
      };
    }),
  };
}
