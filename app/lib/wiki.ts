import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { species, speciesRevision, user } from "@/db/schema/index.ts";
import { linksDaCitacao, nomeParaCredito } from "@/lib/perfil-de-usuario.ts";

/** Consultas da wiki. Mutações ficam em app/actions/wiki.ts. */

export async function listarRevisoesDaEspecie(speciesId: string) {
  const linhas = await db
    .select({
      id: speciesRevision.id,
      patch: speciesRevision.patch,
      fonte: speciesRevision.fonte,
      criadoEm: speciesRevision.criadoEm,
      autorCitacao: speciesRevision.autorCitacao,
      autorNome: user.name,
      creditoNome: user.creditoNome,
      creditoNomeOutro: user.creditoNomeOutro,
      linkInstagram: user.linkInstagram,
      linkSite: user.linkSite,
      linkLattes: user.linkLattes,
      citarInstagram: user.citarInstagram,
      citarSite: user.citarSite,
      citarLattes: user.citarLattes,
    })
    .from(speciesRevision)
    .leftJoin(user, eq(speciesRevision.autorId, user.id))
    .where(eq(speciesRevision.speciesId, speciesId))
    .orderBy(desc(speciesRevision.criadoEm));

  // O nome sai do jeito que a pessoa escolheu ser creditada. Autor removido
  // continua null (a tela mostra "autor removido").
  return linhas.map(
    ({
      autorCitacao,
      autorNome,
      creditoNome,
      creditoNomeOutro,
      linkInstagram,
      linkSite,
      linkLattes,
      citarInstagram,
      citarSite,
      citarLattes,
      ...revisao
    }) => ({
      ...revisao,
      autorNome: autorNome
        ? nomeParaCredito(autorNome, creditoNome, creditoNomeOutro)
        : // Conta excluída: vale a citação que a pessoa escolheu manter.
          autorCitacao,
      // Só os links que a pessoa cadastrou e escolheu incluir na citação.
      autorLinks: linksDaCitacao({
        creditoNome,
        linkInstagram,
        linkSite,
        linkLattes,
        citarInstagram: citarInstagram ?? false,
        citarSite: citarSite ?? false,
        citarLattes: citarLattes ?? false,
      }),
    }),
  );
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
