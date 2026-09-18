import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { species, speciesRevision, user } from "@/db/schema/index.ts";

/** Consultas da wiki. Mutações ficam em app/actions/wiki.ts. */

export async function listarRevisoesDaEspecie(speciesId: string) {
  return db
    .select({
      id: speciesRevision.id,
      patch: speciesRevision.patch,
      fonte: speciesRevision.fonte,
      criadoEm: speciesRevision.criadoEm,
      autorNome: user.name,
    })
    .from(speciesRevision)
    .leftJoin(user, eq(speciesRevision.autorId, user.id))
    .where(eq(speciesRevision.speciesId, speciesId))
    .orderBy(desc(speciesRevision.criadoEm));
}

/**
 * Slug único a partir do nome comum. Se já existir, sufixa com -2, -3…
 * Espécies novas vêm de usuários, e nomes comuns colidem com frequência.
 */
export async function gerarSlugUnico(nomeComum: string): Promise<string> {
  const base =
    nomeComum
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "especie";

  const existentes = await db
    .select({ slug: species.slug })
    .from(species)
    .where(
      sql`${species.slug} = ${base} or ${species.slug} like ${base + "-%"}`,
    );

  const ocupados = new Set(existentes.map((linha) => linha.slug));
  if (!ocupados.has(base)) return base;

  for (let sufixo = 2; ; sufixo++) {
    const candidato = `${base}-${sufixo}`;
    if (!ocupados.has(candidato)) return candidato;
  }
}
