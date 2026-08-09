import { and, or, ilike, eq, asc, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { species, type Species } from "@/db/schema/species.ts";
import { ESTRATOS, type Estrato } from "@/core/estratos.ts";
import {
  SUCESSOES,
  SISTEMAS,
  type Sucessao,
  type Sistema,
} from "@/core/sucessao.ts";
import { GRUPOS, type Grupo } from "@/core/grupos.ts";

/**
 * Consultas do catálogo público.
 *
 * Leitura anônima é permitida de propósito (docs/PLANO.md §0): o catálogo é a
 * porta de entrada do projeto e precisa ser indexável. Nenhuma função aqui
 * consulta a sessão.
 */

export interface FiltrosCatalogo {
  busca?: string;
  estrato?: Estrato;
  sucessao?: Sucessao;
  sistema?: Sistema;
  grupo?: Grupo;
  familia?: string;
}

/** Converte query params crus em filtros validados, descartando lixo. */
export function lerFiltros(
  params: Record<string, string | string[] | undefined>,
): FiltrosCatalogo {
  const texto = (chave: string) => {
    const valor = params[chave];
    return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
  };
  const deVocabulario = <T extends string>(
    chave: string,
    vocabulario: readonly T[],
  ): T | undefined => {
    const valor = texto(chave);
    return valor && (vocabulario as readonly string[]).includes(valor)
      ? (valor as T)
      : undefined;
  };

  return {
    busca: texto("busca"),
    estrato: deVocabulario("estrato", ESTRATOS),
    sucessao: deVocabulario("sucessao", SUCESSOES),
    sistema: deVocabulario("sistema", SISTEMAS),
    grupo: deVocabulario("grupo", GRUPOS),
    familia: texto("familia"),
  };
}

function montarCondicoes(filtros: FiltrosCatalogo): SQL | undefined {
  const condicoes: SQL[] = [];

  if (filtros.busca) {
    const padrao = `%${filtros.busca}%`;
    const busca = or(
      ilike(species.nomeComum, padrao),
      ilike(species.nomeCientifico, padrao),
      ilike(species.familia, padrao),
      // Sinônimos ficam num array; a busca precisa alcançá-los para que quem
      // digita "Genipapo" encontre o registro salvo como "Jenipapo".
      sql`exists (select 1 from unnest(${species.sinonimos}) s where s ilike ${padrao})`,
    );
    if (busca) condicoes.push(busca);
  }

  if (filtros.estrato) condicoes.push(eq(species.estrato, filtros.estrato));
  if (filtros.sucessao) condicoes.push(eq(species.sucessao, filtros.sucessao));
  if (filtros.sistema) condicoes.push(eq(species.sistema, filtros.sistema));
  if (filtros.familia) condicoes.push(eq(species.familia, filtros.familia));
  if (filtros.grupo) {
    condicoes.push(sql`${filtros.grupo} = any(${species.grupos})`);
  }

  return condicoes.length ? and(...condicoes) : undefined;
}

export async function buscarEspecies(
  filtros: FiltrosCatalogo,
): Promise<Species[]> {
  return db
    .select()
    .from(species)
    .where(montarCondicoes(filtros))
    .orderBy(asc(species.nomeComum));
}

export async function contarEspecies(): Promise<number> {
  const [linha] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(species);
  return linha?.total ?? 0;
}

export async function buscarEspeciePorSlug(
  slug: string,
): Promise<Species | undefined> {
  return db.query.species.findFirst({ where: eq(species.slug, slug) });
}

export async function listarSlugs(): Promise<string[]> {
  const linhas = await db.select({ slug: species.slug }).from(species);
  return linhas.map((linha) => linha.slug);
}

/** Famílias presentes no catálogo, com contagem — alimenta o filtro. */
export async function listarFamilias(): Promise<
  { familia: string; total: number }[]
> {
  const linhas = await db
    .select({
      familia: species.familia,
      total: sql<number>`count(*)::int`,
    })
    .from(species)
    .where(sql`${species.familia} is not null`)
    .groupBy(species.familia)
    .orderBy(asc(species.familia));

  return linhas.filter((linha): linha is { familia: string; total: number } =>
    Boolean(linha.familia),
  );
}
