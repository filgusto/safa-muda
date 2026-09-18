/**
 * Preenche gbifId e inaturalistId das espécies do catálogo, a partir do nome
 * científico, consultando as APIs públicas do GBIF e do iNaturalist.
 *
 *   npm run db:enriquecer-links-externos
 *
 * Só grava quando o match é único e inequívoco (ver lib/links-externos.ts).
 * Nome com mais de um resultado, sem resultado, ou só fuzzy match, fica de
 * fora e é listado no final para curadoria manual — a regra de ouro do
 * projeto (nenhum campo por estimativa própria) vale também para links.
 *
 * Feito para rodar uma vez, contra o catálogo existente. Espécies cadastradas
 * depois recebem os IDs automaticamente ao propor a espécie nova (ver
 * enriquecerLinksExternos em app/actions/wiki.ts), com a mesma regra.
 */
import { eq } from "drizzle-orm";
import { db } from "../index.ts";
import { species } from "../schema/index.ts";
import { buscarGbifId, buscarINaturalistId } from "../../lib/links-externos.ts";

const ESPERA_ENTRE_CHAMADAS_MS = 300;

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const especies = await db.query.species.findMany({
    columns: {
      id: true,
      nomeCientifico: true,
      gbifId: true,
      inaturalistId: true,
      fontes: true,
    },
  });

  let atualizadas = 0;
  const semMatch: string[] = [];

  for (const especie of especies) {
    if (especie.gbifId !== null && especie.inaturalistId !== null) continue;

    const [gbifId, inaturalistId] = await Promise.all([
      especie.gbifId === null
        ? buscarGbifId(especie.nomeCientifico)
        : Promise.resolve(especie.gbifId),
      especie.inaturalistId === null
        ? buscarINaturalistId(especie.nomeCientifico)
        : Promise.resolve(especie.inaturalistId),
    ]);

    if (gbifId === null && inaturalistId === null) {
      semMatch.push(especie.nomeCientifico);
      await esperar(ESPERA_ENTRE_CHAMADAS_MS);
      continue;
    }

    const fontes = { ...especie.fontes };
    if (gbifId !== null) fontes.gbif_id = "gbif";
    if (inaturalistId !== null) fontes.inaturalist_id = "inaturalist";

    await db
      .update(species)
      .set({ gbifId, inaturalistId, fontes, atualizadoEm: new Date() })
      .where(eq(species.id, especie.id));

    atualizadas++;
    console.log(
      `${especie.nomeCientifico}: gbif=${gbifId ?? "—"} inaturalist=${inaturalistId ?? "—"}`,
    );

    await esperar(ESPERA_ENTRE_CHAMADAS_MS);
  }

  console.log(`\n${atualizadas} espécies atualizadas de ${especies.length}.`);
  if (semMatch.length) {
    console.log(
      `\n${semMatch.length} sem match automático — curadoria manual:`,
    );
    for (const nome of semMatch) console.log(`  - ${nome}`);
  }

  process.exit(0);
}

void main();
