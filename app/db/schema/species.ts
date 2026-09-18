import {
  pgTable,
  text,
  boolean,
  integer,
  real,
  timestamp,
  uuid,
  jsonb,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  estratoEnum,
  sucessaoEnum,
  sistemaEnum,
  grupoEnum,
  biomaEnum,
  cicloDeVidaEnum,
  frutificacaoEnum,
  habitoEnum,
  rebrotaEnum,
  gemaDeRebrotaEnum,
  tagDeFotoEnum,
} from "./enums.ts";
import { user } from "./auth.ts";
import { media } from "./media.ts";

/**
 * Catálogo de espécies.
 *
 * Quase todo campo além do nome é anulável, e isso é deliberado: a fonte não
 * cobre tudo, e a regra do projeto é que lacuna honesta vale mais que dado
 * inventado (CONTRIBUTING.md). A interface mostra "não informado", nunca um
 * valor estimado.
 */
export const species = pgTable(
  "species",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Identificador público estável, derivado do nome comum. */
    slug: text("slug").notNull().unique(),

    nomeComum: text("nome_comum").notNull(),
    nomeCientifico: text("nome_cientifico").notNull(),
    familia: text("familia"),

    /** Outros nomes comuns da mesma planta, para a busca encontrar. */
    sinonimos: text("sinonimos").array().notNull().default([]),

    /** usageKey do táxon no GBIF (https://www.gbif.org/species/{id}). */
    gbifId: integer("gbif_id"),
    /** ID do táxon no iNaturalist (https://www.inaturalist.org/taxa/{id}). */
    inaturalistId: integer("inaturalist_id"),

    // ── Classificação agroflorestal ─────────────────────────────────────────
    estrato: estratoEnum("estrato"),
    sucessao: sucessaoEnum("sucessao"),
    sistema: sistemaEnum("sistema"),
    grupos: grupoEnum("grupos").array().notNull().default([]),

    // ── Ciclo e espaçamento ─────────────────────────────────────────────────
    // Guardados como faixa porque as fontes dão faixa ("90 a 120 dias"). A
    // média seria um número que nenhuma fonte afirma.
    diasParaColherMin: integer("dias_para_colher_min"),
    diasParaColherMax: integer("dias_para_colher_max"),
    espacamentoEntreLinhasMinM: real("espacamento_entre_linhas_min_m"),
    espacamentoEntreLinhasMaxM: real("espacamento_entre_linhas_max_m"),
    espacamentoNaLinhaMinM: real("espacamento_na_linha_min_m"),
    espacamentoNaLinhaMaxM: real("espacamento_na_linha_max_m"),

    // ── Ainda não populados: nenhuma fonte disponível cobre ─────────────────
    // Ver docs/PLANO.md §7.3. Existem para que a wiki possa preenchê-los.
    alturaMaduraM: real("altura_madura_m"),
    produtivaAPartirDeMeses: integer("produtiva_a_partir_de_meses"),
    biomas: biomaEnum("biomas").array().notNull().default([]),

    // Ciclo de vida: eixos independentes, ver core/ciclo.ts. É o ciclo
    // biológico; quanto tempo a planta fica no sistema é do plantio. Hábito e
    // ciclo vêm de db/scripts/enriquecer-ciclo-e-habito.ts; o resto, da wiki.
    cicloDeVida: cicloDeVidaEnum("ciclo_de_vida").array().notNull().default([]),
    frutificacao: frutificacaoEnum("frutificacao"),
    habito: habitoEnum("habito").array().notNull().default([]),
    // Longevidade típica até a senescência, em faixa como as fontes dão. Só o
    // mínimo significa "mais de N anos" — não se inventa teto.
    longevidadeMinAnos: real("longevidade_min_anos"),
    longevidadeMaxAnos: real("longevidade_max_anos"),

    // Poda (também não populado): se rebrota e de onde, ver core/poda.ts.
    rebrota: rebrotaEnum("rebrota"),
    gemasDeRebrota: gemaDeRebrotaEnum("gemas_de_rebrota")
      .array()
      .notNull()
      .default([]),

    /** Texto livre: observações, ressalvas, contexto regional. */
    notas: text("notas").array().notNull().default([]),

    /**
     * Proveniência por campo: { nome_cientifico: "messerschmidt", ... }.
     *
     * É o que permite corrigir a tabela original sem perder o rastro e mostrar
     * "de onde veio este número" no card. Sem isto, uma correção da comunidade
     * fica indistinguível do dado publicado.
     */
    fontes: jsonb("fontes")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),

    criadoPor: text("criado_por").references(() => user.id, {
      onDelete: "set null",
    }),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (tabela) => [
    index("species_estrato_idx").on(tabela.estrato),
    index("species_sucessao_idx").on(tabela.sucessao),
    index("species_sistema_idx").on(tabela.sistema),
    index("species_familia_idx").on(tabela.familia),
  ],
);

export type Species = typeof species.$inferSelect;
export type NovaSpecies = typeof species.$inferInsert;

/**
 * Fotos de uma espécie.
 *
 * Uma espécie tem várias. A que ilustra o card do catálogo e o cabeçalho da
 * ficha é a marcada como `principal`; sem marcação, vale a ordem de
 * reconhecimento de core/fotos.ts. O arquivo em si vive em `media` (MinIO) — aqui fica só o vínculo,
 * a legenda e o crédito.
 *
 * `credito` é obrigatório de propósito: foto sem autoria declarada é dado sem
 * proveniência, e a regra de ouro do projeto vale para imagem também
 * (CONTRIBUTING.md). Quem fotografou, ou de onde veio e sob qual licença.
 *
 * Só aparece no catálogo público depois de `aprovadaEm` — mesma porta de
 * moderação que a wiki usa para os campos. Envio de moderador já entra
 * aprovado.
 */
export const speciesFoto = pgTable(
  "species_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    speciesId: uuid("species_id")
      .notNull()
      .references(() => species.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),

    /**
     * Fase da planta que a foto retrata. Obrigatória: uma foto de semente e uma
     * de árvore adulta não são intercambiáveis para quem tenta identificar a
     * planta no campo, e a galeria se organiza por ela.
     */
    tag: tagDeFotoEnum("tag").notNull(),

    legenda: text("legenda"),
    credito: text("credito").notNull(),

    /** Menor primeiro; empate desempata pela data de envio. */
    ordem: integer("ordem").notNull().default(0),

    /**
     * Escolhida pela administração para ilustrar o card e o cabeçalho da
     * ficha. No máximo uma por espécie (índice parcial abaixo).
     */
    principal: boolean("principal").notNull().default(false),

    aprovadaEm: timestamp("aprovada_em"),
    aprovadaPor: text("aprovada_por").references(() => user.id, {
      onDelete: "set null",
    }),

    enviadaPor: text("enviada_por").references(() => user.id, {
      onDelete: "set null",
    }),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (tabela) => [
    index("species_media_species_idx").on(tabela.speciesId),
    unique("species_media_unico").on(tabela.speciesId, tabela.mediaId),
    uniqueIndex("species_media_principal_unica")
      .on(tabela.speciesId)
      .where(sql`${tabela.principal}`),
  ],
);

export type SpeciesFoto = typeof speciesFoto.$inferSelect;
