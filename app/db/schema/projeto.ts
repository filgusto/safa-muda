import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  jsonb,
  boolean,
  date,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { species } from "./species.ts";
import { estratoEnum } from "./enums.ts";

/**
 * Projetos de planejamento agroflorestal.
 *
 * Um projeto é o desenho de uma agrofloresta no tempo (fase 3) e no espaço
 * (fase 4). Privado por padrão — ver a política em lib/access.ts.
 */

export const visibilidadeEnum = pgEnum("visibilidade", [
  "private",
  "unlisted",
  "public",
]);

export const papelNoProjetoEnum = pgEnum("papel_no_projeto", [
  "owner",
  "editor",
  "viewer",
]);

export const project = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    descricao: text("descricao"),

    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    /**
     * Data real de implantação. O planejamento vive em meses relativos a ela
     * (docs/PLANO.md §7.1) — é assim que o agrofloresteiro pensa ("ano 3") e é
     * o que permite reaproveitar um desenho em outra data de plantio.
     */
    dataInicio: date("data_inicio", { mode: "date" }).notNull(),

    /** Horizonte do planejamento, em meses. Padrão de 20 anos. */
    horizonteMeses: integer("horizonte_meses").notNull().default(240),

    visibilidade: visibilidadeEnum("visibilidade").notNull().default("private"),

    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (tabela) => [index("project_owner_idx").on(tabela.ownerId)],
);

export const projectMember = pgTable(
  "project_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    papel: papelNoProjetoEnum("papel").notNull().default("viewer"),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (tabela) => [
    unique("project_member_unico").on(tabela.projectId, tabela.userId),
    index("project_member_user_idx").on(tabela.userId),
  ],
);

export const intencaoEnum = pgEnum("intencao", [
  "producao",
  "materia_organica",
  "adubacao",
  "quebra_vento",
  "servico",
]);

export const statusDoPlantioEnum = pgEnum("status_do_plantio", [
  "planejado",
  "plantado",
  "removido",
]);

/**
 * Um plantio: uma espécie ocupando um estrato durante um intervalo de tempo.
 *
 * Na fase 4 ganha `placement`, a regra de posicionamento no mapa — o plantio
 * guarda a REGRA ("linha X, do metro 12 ao 60, espaçamento 0,5 m") e as
 * posições dos indivíduos são derivadas dela sob demanda (docs/PLANO.md §3.3).
 */
export const planting = pgTable(
  "planting",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    speciesId: uuid("species_id")
      .notNull()
      .references(() => species.id, { onDelete: "restrict" }),

    /**
     * Estrato em que a planta foi de fato posicionada.
     *
     * Normalmente é o da espécie. Guardamos aqui, e não só na espécie, por dois
     * motivos: espécies sem estrato informado precisam que o usuário escolha um,
     * e um agrofloresteiro experiente às vezes conduz uma planta noutro andar —
     * caso em que `estratoForcado` marca a divergência explicitamente.
     */
    estrato: estratoEnum("estrato").notNull(),
    /** Verdadeiro quando o estrato escolhido difere do da espécie. */
    estratoForcado: boolean("estrato_forcado").notNull().default(false),

    /** Meses relativos ao início do projeto. Fim exclusivo. */
    mesInicio: integer("mes_inicio").notNull(),
    mesFim: integer("mes_fim").notNull(),

    intencao: intencaoEnum("intencao"),
    status: statusDoPlantioEnum("status").notNull().default("planejado"),
    notas: text("notas"),

    /** Regra de posicionamento no mapa. Preenchida na fase 4. */
    placement: jsonb("placement").$type<Record<string, unknown> | null>(),

    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (tabela) => [
    index("planting_project_idx").on(tabela.projectId),
    index("planting_species_idx").on(tabela.speciesId),
  ],
);

export type Project = typeof project.$inferSelect;
export type Planting = typeof planting.$inferSelect;
export type ProjectMember = typeof projectMember.$inferSelect;
