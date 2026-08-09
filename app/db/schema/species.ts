import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  uuid,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import {
  estratoEnum,
  sucessaoEnum,
  sistemaEnum,
  grupoEnum,
  biomaEnum,
} from "./enums.ts";
import { user } from "./auth.ts";

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
    longevidadeAnos: integer("longevidade_anos"),
    produtivaAPartirDeMeses: integer("produtiva_a_partir_de_meses"),
    biomas: biomaEnum("biomas").array().notNull().default([]),

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
