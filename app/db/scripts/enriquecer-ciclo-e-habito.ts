/**
 * Preenche hábito e ciclo de vida das espécies do catálogo a partir de bases
 * públicas estruturadas (ver lib/tracos-externos.ts):
 *
 *   npm run db:enriquecer-ciclo-e-habito
 *
 * - hábito: Flora e Funga do Brasil, pelo perfil que ela publica no GBIF
 *   (precisa do `gbifId`; rode antes `db:enriquecer-links-externos`);
 * - ciclo de vida: "Duration" da USDA PLANTS, só com casamento exato do nome
 *   aceito.
 *
 * Só grava campo vazio: o que a wiki já preencheu não é tocado. Cada campo
 * gravado ganha a proveniência da sua fonte. Pode rodar de novo sem efeito
 * colateral. No fim, lista o que ficou sem match e os valores da fonte sem
 * correspondência no enum, para curadoria manual.
 *
 * Frutificação, longevidade, altura, "produz a partir de" e os campos de poda
 * não têm fonte estruturada ampla e confiável; continuam com a wiki.
 */
import { eq } from "drizzle-orm";
import { db } from "../index.ts";
import { species } from "../schema/index.ts";
import { chaveDeFonte } from "../../lib/aplicar-proposta.ts";
import {
  buscarHabitoECiclo,
  FONTE_DO_CICLO,
  FONTE_DO_HABITO,
} from "../../lib/tracos-externos.ts";
import type { CicloDeVida, Habito } from "../../core/ciclo.ts";

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
      habito: true,
      cicloDeVida: true,
      fontes: true,
    },
  });

  let comHabito = 0;
  let comCiclo = 0;
  const semHabito: string[] = [];
  const semCiclo: string[] = [];
  const ignorados: string[] = [];

  for (const especie of especies) {
    const querHabito = especie.habito.length === 0;
    const querCiclo = especie.cicloDeVida.length === 0;
    if (!querHabito && !querCiclo) continue;

    const {
      habito,
      cicloDeVida,
      ignorados: semEquivalente,
    } = await buscarHabitoECiclo({
      nomeCientifico: especie.nomeCientifico,
      gbifId: especie.gbifId,
      querHabito,
      querCiclo,
    });
    if (semEquivalente.length) {
      ignorados.push(
        `${especie.nomeCientifico} (FFB): ${semEquivalente.join(", ")}`,
      );
    }

    if (querHabito && habito.length === 0) {
      semHabito.push(
        especie.gbifId === null
          ? `${especie.nomeCientifico} (sem gbifId)`
          : especie.nomeCientifico,
      );
    }
    if (querCiclo && cicloDeVida.length === 0) {
      semCiclo.push(especie.nomeCientifico);
    }

    const patch: { habito?: Habito[]; cicloDeVida?: CicloDeVida[] } = {};
    const fontes = { ...especie.fontes };
    if (querHabito && habito.length) {
      patch.habito = habito;
      fontes[chaveDeFonte("habito")] = FONTE_DO_HABITO;
      comHabito++;
    }
    if (querCiclo && cicloDeVida.length) {
      patch.cicloDeVida = cicloDeVida;
      fontes[chaveDeFonte("cicloDeVida")] = FONTE_DO_CICLO;
      comCiclo++;
    }

    if (patch.habito || patch.cicloDeVida) {
      await db
        .update(species)
        .set({ ...patch, fontes, atualizadoEm: new Date() })
        .where(eq(species.id, especie.id));
      console.log(
        `${especie.nomeCientifico}: hábito=${patch.habito?.join("/") ?? "—"} ciclo=${patch.cicloDeVida?.join("/") ?? "—"}`,
      );
    }

    await esperar(ESPERA_ENTRE_CHAMADAS_MS);
  }

  console.log(
    `\nDe ${especies.length} espécies: ${comHabito} ganharam hábito, ${comCiclo} ganharam ciclo de vida.`,
  );
  const listar = (titulo: string, itens: string[]) => {
    if (!itens.length) return;
    console.log(`\n${itens.length} ${titulo}:`);
    for (const item of itens) console.log(`  - ${item}`);
  };
  listar("sem hábito na Flora e Funga do Brasil — curadoria manual", semHabito);
  listar("sem ciclo de vida na USDA PLANTS — curadoria manual", semCiclo);
  listar("com valor da fonte sem correspondência no enum", ignorados);

  process.exit(0);
}

void main();
