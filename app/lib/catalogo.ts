import {
  and,
  or,
  ilike,
  eq,
  lte,
  inArray,
  isNotNull,
  asc,
  desc,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/index.ts";
import { species, speciesFoto, type Species } from "@/db/schema/species.ts";
import { media } from "@/db/schema/media.ts";
import { ESTRATOS, type Estrato } from "@/core/estratos.ts";
import {
  SUCESSOES,
  SISTEMAS,
  type Sucessao,
  type Sistema,
} from "@/core/sucessao.ts";
import { GRUPOS, type Grupo } from "@/core/grupos.ts";
import {
  CICLOS_DE_VIDA,
  HABITOS,
  type CicloDeVida,
  type Habito,
} from "@/core/ciclo.ts";
import {
  REBROTAS,
  GEMAS_DE_REBROTA,
  type Rebrota,
  type GemaDeRebrota,
} from "@/core/poda.ts";
import { lerFaixaDeColheita, type FaixaDeColheita } from "@/core/colheita.ts";
import {
  escolherFotoPrincipal,
  ordemDaTag,
  type TagDeFoto,
} from "@/core/fotos.ts";

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
  ciclos?: CicloDeVida[];
  habitos?: Habito[];
  rebrotas?: Rebrota[];
  gemas?: GemaDeRebrota[];
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
    ciclos: deVocabulario("ciclo", CICLOS_DE_VIDA),
    habitos: deVocabulario("habito", HABITOS),
    rebrotas: deVocabulario("rebrota", REBROTAS),
    gemas: deVocabulario("gemas", GEMAS_DE_REBROTA),
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
  if (filtros.rebrotas)
    condicoes.push(inArray(species.rebrota, filtros.rebrotas));
  if (filtros.familias)
    condicoes.push(inArray(species.familia, filtros.familias));
  // `lte` já descarta o nulo: espécie sem prazo informado não entra no filtro
  // de colheita, e não ganha um prazo estimado para poder entrar.
  if (filtros.colheitaAteDias !== undefined) {
    condicoes.push(lte(species.diasParaColherMax, filtros.colheitaAteDias));
  }

  // Colunas de enum em array: basta a espécie ter um dos valores pedidos. Cada
  // valor vai como parâmetro para não montar literal de array na mão. Array
  // vazio — "não informado" — nunca casa.
  const emArray = [
    [filtros.grupos, species.grupos],
    [filtros.ciclos, species.cicloDeVida],
    [filtros.habitos, species.habito],
    [filtros.gemas, species.gemasDeRebrota],
  ] as const;
  for (const [valores, coluna] of emArray) {
    if (!valores) continue;
    const algum = or(...valores.map((valor) => sql`${valor} = any(${coluna})`));
    if (algum) condicoes.push(algum);
  }

  return condicoes.length ? and(...condicoes) : undefined;
}

/** Foto como o catálogo público a consome: chave do objeto e texto alternativo. */
export interface FotoDaEspecie {
  id: string;
  key: string;
  alt: string | null;
  legenda: string | null;
  credito: string;
  /** Ficha no Wikimedia Commons, quando a foto foi importada de lá. */
  sourceUrl: string | null;
  tag: TagDeFoto;
  /** Escolhida pela administração para ilustrar o card e o cabeçalho. */
  principal: boolean;
}

/**
 * Ordena pela fase da planta (semente → jovem → adulta → misc) e, dentro dela,
 * pela ordem manual. A comparação vive em core/fotos.ts; aqui só se aplica.
 */
function porFase<T extends { tag: TagDeFoto }>(fotos: T[]): T[] {
  return [...fotos].sort((a, b) => ordemDaTag(a.tag) - ordemDaTag(b.tag));
}

/** Espécie com a foto que ilustra o card — `null` quando não há nenhuma. */
export type EspecieComFoto = Species & { foto: FotoDaEspecie | null };

/**
 * A foto que ilustra a espécie dentre as já carregadas — mesma regra de
 * `fotosPrincipais` para o card, aplicada em memória para quem já tem a lista
 * da galeria em mãos (a ficha e o cabeçalho do modal), sem uma segunda
 * consulta. A regra vive em core/fotos.ts.
 */
export { escolherFotoPrincipal };

/**
 * A foto que ilustra cada espécie: a aprovada marcada como principal, ou, sem
 * marcação, a primeira na ordem de reconhecimento.
 *
 * `distinct on` deixa o banco escolher uma por espécie. Trazer todas as fotos
 * para filtrar em JS traria centenas de linhas só para descartar quase todas
 * numa grade que mostra uma por card.
 */
async function fotosPrincipais(
  ids: string[],
): Promise<Map<string, FotoDaEspecie>> {
  if (ids.length === 0) return new Map();

  const linhas = await db
    .selectDistinctOn([speciesFoto.speciesId], {
      speciesId: speciesFoto.speciesId,
      id: speciesFoto.id,
      key: media.key,
      alt: media.alt,
      legenda: speciesFoto.legenda,
      credito: speciesFoto.credito,
      sourceUrl: media.sourceUrl,
      tag: speciesFoto.tag,
      principal: speciesFoto.principal,
    })
    .from(speciesFoto)
    .innerJoin(media, eq(media.id, speciesFoto.mediaId))
    .where(
      and(
        inArray(speciesFoto.speciesId, ids),
        isNotNull(speciesFoto.aprovadaEm),
      ),
    )
    // A foto do card é a da planta adulta quando existe — a forma em que a
    // espécie é reconhecida de longe — e o que se colhe vem logo atrás, que é
    // como se reconhece de perto: fruto, e depois raiz, para a mandioca da vida. A ordem aqui é a do reconhecimento, não a do
    // desenvolvimento (essa é a de core/fotos.ts, usada na galeria). `array_position` no enum reproduz a mesma
    // ordem de core/fotos.ts, para o banco poder escolher uma por espécie.
    .orderBy(
      asc(speciesFoto.speciesId),
      // A escolha da administração vem antes de qualquer regra automática.
      desc(speciesFoto.principal),
      sql`array_position(array['adulta','fruta','raiz','flor','jovem','semente','misc']::tag_de_foto[], ${speciesFoto.tag})`,
      asc(speciesFoto.ordem),
      asc(speciesFoto.criadoEm),
    );

  return new Map(
    linhas.map(({ speciesId, ...foto }) => [speciesId, foto as FotoDaEspecie]),
  );
}

export async function buscarEspecies(
  filtros: FiltrosCatalogo,
): Promise<EspecieComFoto[]> {
  const especies = await db
    .select()
    .from(species)
    .where(montarCondicoes(filtros))
    .orderBy(asc(species.nomeComum));

  const fotos = await fotosPrincipais(especies.map((especie) => especie.id));

  return especies.map((especie) => ({
    ...especie,
    foto: fotos.get(especie.id) ?? null,
  }));
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

/**
 * Fotos de uma espécie. Só as aprovadas, salvo quando `incluirPendentes` — o
 * que a página de gestão usa para a moderação enxergar a fila.
 */
export async function listarFotosDaEspecie(
  speciesId: string,
  incluirPendentes = false,
): Promise<
  (FotoDaEspecie & { aprovada: boolean; enviadaPor: string | null })[]
> {
  const linhas = await db
    .select({
      id: speciesFoto.id,
      key: media.key,
      alt: media.alt,
      legenda: speciesFoto.legenda,
      credito: speciesFoto.credito,
      sourceUrl: media.sourceUrl,
      tag: speciesFoto.tag,
      principal: speciesFoto.principal,
      aprovadaEm: speciesFoto.aprovadaEm,
      enviadaPor: speciesFoto.enviadaPor,
    })
    .from(speciesFoto)
    .innerJoin(media, eq(media.id, speciesFoto.mediaId))
    .where(
      incluirPendentes
        ? eq(speciesFoto.speciesId, speciesId)
        : and(
            eq(speciesFoto.speciesId, speciesId),
            isNotNull(speciesFoto.aprovadaEm),
          ),
    )
    .orderBy(asc(speciesFoto.ordem), asc(speciesFoto.criadoEm));

  return porFase(
    linhas.map(({ aprovadaEm, ...foto }) => ({
      ...foto,
      aprovada: aprovadaEm !== null,
    })),
  );
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
