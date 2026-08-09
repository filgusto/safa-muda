import {
  pgTable,
  text,
  real,
  integer,
  timestamp,
  uuid,
  jsonb,
  date,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { media } from "./media.ts";
import { project, planting } from "./projeto.ts";
import { area, type PontoLocalJson } from "./espaco.ts";

/**
 * O diário de campo: o que de fato aconteceu.
 *
 * É o que separa um desenho de um acompanhamento. O planejamento diz "banana
 * do mês 3 ao 60"; o diário diz "plantei 28 mudas em 14/03, podei em 20/11,
 * colhi 62 kg".
 */

export const statusDoIndividuoEnum = pgEnum("status_do_individuo", [
  "vivo",
  "morto",
  "removido",
]);

/**
 * Uma planta específica.
 *
 * Materializada só quando ganha história própria — morreu, foi podada, produziu,
 * recebeu foto (docs/PLANO.md §3.3). Uma leira de 800 mudas continua sendo uma
 * regra de posicionamento até que alguma delas mereça um registro.
 *
 * `indice` é a posição na sequência gerada pela regra, o que permite recuperar
 * a coordenada mesmo depois de a linha ser redesenhada.
 */
export const plantIndividual = pgTable(
  "plant_individual",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plantingId: uuid("planting_id")
      .notNull()
      .references(() => planting.id, { onDelete: "cascade" }),

    indice: integer("indice").notNull(),
    /** Posição em metros no plano local, congelada no momento do registro. */
    positionLocal: jsonb("position_local").$type<PontoLocalJson | null>(),

    rotulo: text("rotulo"),
    status: statusDoIndividuoEnum("status").notNull().default("vivo"),
    plantadoEm: date("plantado_em", { mode: "date" }),

    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (tabela) => [
    // Um índice não pode virar duas plantas: sem isto, dois registros
    // simultâneos criariam duplicatas da mesma muda.
    unique("individuo_unico_por_plantio").on(tabela.plantingId, tabela.indice),
    index("individual_planting_idx").on(tabela.plantingId),
  ],
);

export const tipoDeEventoEnum = pgEnum("tipo_de_evento", [
  "semeadura",
  "plantio",
  "poda",
  "colheita",
  "rocada",
  "adubacao",
  "mortalidade",
  "observacao",
]);

/**
 * Um acontecimento no campo.
 *
 * O sujeito é opcional e hierárquico: sem nenhum, o evento é do projeto
 * inteiro (uma roçada geral); com `areaId`, é da área; com `plantingId`, do
 * consórcio; com `individualId`, de uma planta.
 *
 * As três colunas são FKs de verdade em vez de um par
 * `subject_type`/`subject_id`, para que o banco garanta a integridade e as
 * remoções em cascata funcionem sozinhas.
 */
export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),

    areaId: uuid("area_id").references(() => area.id, { onDelete: "cascade" }),
    plantingId: uuid("planting_id").references(() => planting.id, {
      onDelete: "cascade",
    }),
    individualId: uuid("individual_id").references(() => plantIndividual.id, {
      onDelete: "cascade",
    }),

    tipo: tipoDeEventoEnum("tipo").notNull(),

    /** Data em que aconteceu — absoluta, ao contrário do planejamento. */
    ocorridoEm: date("ocorrido_em", { mode: "date" }).notNull(),

    quantidade: real("quantidade"),
    /** kg, unidades, maços, litros… texto livre porque o campo é assim. */
    unidade: text("unidade"),

    notas: text("notas"),

    criadoPor: text("criado_por").references(() => user.id, {
      onDelete: "set null",
    }),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (tabela) => [
    index("event_project_idx").on(tabela.projectId),
    index("event_planting_idx").on(tabela.plantingId),
    index("event_data_idx").on(tabela.ocorridoEm),
  ],
);

export const eventMedia = pgTable(
  "event_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
  },
  (tabela) => [unique("event_media_unico").on(tabela.eventId, tabela.mediaId)],
);

export type PlantIndividual = typeof plantIndividual.$inferSelect;
export type Event = typeof event.$inferSelect;
