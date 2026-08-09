import { eq, asc } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { area, row, planting, species } from "@/db/schema/index.ts";
import type { PontoLocal } from "@/core/geo.ts";
import type { RegraDePosicionamento } from "@/core/croqui.ts";

/** Consultas do desenho espacial. Mutações em app/actions/espaco.ts. */

export interface AreaComLinhas {
  id: string;
  nome: string;
  geomLocal: PontoLocal[];
  areaM2: number;
  anchorLat: number | null;
  anchorLon: number | null;
  rotationDeg: number;
  linhas: {
    id: string;
    tipo: "plantio" | "entrelinha" | "servico";
    rotulo: string | null;
    pathLocal: PontoLocal[];
    comprimentoM: number;
    ordem: number;
  }[];
}

export async function listarAreas(projectId: string): Promise<AreaComLinhas[]> {
  const areas = await db
    .select()
    .from(area)
    .where(eq(area.projectId, projectId))
    .orderBy(asc(area.criadoEm));

  if (areas.length === 0) return [];

  const linhas = await db.select().from(row).orderBy(asc(row.ordem));

  const porArea = new Map<string, AreaComLinhas["linhas"]>();
  for (const linha of linhas) {
    if (!porArea.has(linha.areaId)) porArea.set(linha.areaId, []);
    porArea.get(linha.areaId)!.push({
      id: linha.id,
      tipo: linha.tipo,
      rotulo: linha.rotulo,
      pathLocal: linha.pathLocal,
      comprimentoM: linha.comprimentoM,
      ordem: linha.ordem,
    });
  }

  return areas.map((registro) => ({
    id: registro.id,
    nome: registro.nome,
    geomLocal: registro.geomLocal,
    areaM2: registro.areaM2,
    anchorLat: registro.anchorLat,
    anchorLon: registro.anchorLon,
    rotationDeg: registro.rotationDeg,
    linhas: porArea.get(registro.id) ?? [],
  }));
}

/** Plantios do projeto com a regra de posicionamento já tipada. */
export interface PlantioEspacial {
  id: string;
  nomeComum: string;
  slug: string;
  estrato: string;
  mesInicio: number;
  mesFim: number;
  placement: RegraDePosicionamento | null;
  espacamentoNaLinhaMinM: number | null;
}

export async function listarPlantiosEspaciais(
  projectId: string,
): Promise<PlantioEspacial[]> {
  const linhas = await db
    .select({
      id: planting.id,
      nomeComum: species.nomeComum,
      slug: species.slug,
      estrato: planting.estrato,
      mesInicio: planting.mesInicio,
      mesFim: planting.mesFim,
      placement: planting.placement,
      espacamentoNaLinhaMinM: species.espacamentoNaLinhaMinM,
    })
    .from(planting)
    .innerJoin(species, eq(planting.speciesId, species.id))
    .where(eq(planting.projectId, projectId))
    .orderBy(asc(planting.mesInicio));

  return linhas.map((linha) => ({
    ...linha,
    placement: (linha.placement as RegraDePosicionamento | null) ?? null,
  }));
}
