import {
  and,
  or,
  ilike,
  eq,
  lte,
  inArray,
  asc,
  sql,
  type SQL,
} from "drizzle-orm";
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
import { lerFaixaDeColheita, type FaixaDeColheita } from "@/core/colheita.ts";

/**
 * Consultas do catálogo público.
 *
 * Leitura anônima é permitida de propósito (docs/PLANO.md §0): o catálogo é a
 * porta de entrada do projeto e precisa ser indexável. Nenhuma função aqui
 * consulta a sessão.
 */

/**
 * Cada dimensão aceita vários valores, combinados em OU dentro dela e em E
 * entre elas: "fruta ou castanha, no estrato alto". Um único valor continua
 * sendo o caso comum — os `<select>` do catálogo público mandam um só.
 */
export interface FiltrosCatalogo {
  busca?: string;
  estratos?: Estrato[];
  sucessoes?: Sucessao[];
  sistemas?: Sistema[];
  grupos?: Grupo[];
  familias?: string[];
  /**
   * Teto de espera até a colheita, em dias. Vários tetos pedidos viram o maior
   * deles — "em até 6 meses ou em até 2 anos" é "em até 2 anos".
   */
  colheitaAteDias?: number;
}

/** Converte query params crus em filtros validados, descartando lixo. */
export function lerFiltros(
  params: Record<string, string | string[] | undefined>,
): FiltrosCatalogo {
  const texto = (chave: string) => {
    const valor = params[chave];
    return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
  };

  /** Aceita `?grupo=fruta&grupo=grao` e `?grupo=fruta,grao` — e nada de vazios. */
  const lista = (chave: string): string[] => {
    const valor = params[chave];
    const cru = Array.isArray(valor) ? valor : valor ? [valor] : [];
    const itens = cru
      .flatMap((parte) => parte.split(","))
      .map((parte) => parte.trim())
      .filter(Boolean);
    return Array.from(new Set(itens));
  };

  const deVocabulario = <T extends string>(
    chave: string,
    vocabulario: readonly T[],
  ): T[] | undefined => {
    const validos = lista(chave).filter((valor) =>
      (vocabulario as readonly string[]).includes(valor),
    ) as T[];
    return validos.length ? validos : undefined;
  };

  const familias = lista("familia");

  const tetos = lista("colheita")
    .map(lerFaixaDeColheita)
    .filter((faixa): faixa is FaixaDeColheita => faixa !== null);

  return {
    busca: texto("busca"),
    estratos: deVocabulario("estrato", ESTRATOS),
    sucessoes: deVocabulario("sucessao", SUCESSOES),
    sistemas: deVocabulario("sistema", SISTEMAS),
    grupos: deVocabulario("grupo", GRUPOS),
    familias: familias.length ? familias : undefined,
    colheitaAteDias: tetos.length ? Math.max(...tetos) : undefined,
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

  if (filtros.estratos)
    condicoes.push(inArray(species.estrato, filtros.estratos));
  if (filtros.sucessoes)
    condicoes.push(inArray(species.sucessao, filtros.sucessoes));
  if (filtros.sistemas)
    condicoes.push(inArray(species.sistema, filtros.sistemas));
  if (filtros.familias)
    condicoes.push(inArray(species.familia, filtros.familias));
  // `lte` já descarta o nulo: espécie sem prazo informado não entra no filtro
  // de colheita, e não ganha um prazo estimado para poder entrar.
  if (filtros.colheitaAteDias !== undefined) {
    condicoes.push(lte(species.diasParaColherMax, filtros.colheitaAteDias));
  }

  if (filtros.grupos) {
    // `grupos` é coluna de enum em array: basta a espécie ter um dos pedidos.
    // Cada valor vai como parâmetro para não montar literal de array na mão.
    const porGrupo = or(
      ...filtros.grupos.map((grupo) => sql`${grupo} = any(${species.grupos})`),
    );
    if (porGrupo) condicoes.push(porGrupo);
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
