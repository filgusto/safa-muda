import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { species } from "./species.ts";

/**
 * A wiki do catálogo: proposta → moderação → revisão.
 *
 * O catálogo não é editável direto. Toda mudança passa por uma proposta que um
 * moderador aprova ou rejeita, e toda aprovação vira uma revisão com autoria.
 * É isso que permite abrir o catálogo à comunidade sem abrir mão da
 * confiabilidade do dado.
 */

export const propostaTipoEnum = pgEnum("proposta_tipo", [
  "edicao",
  "nova_especie",
]);

export const propostaStatusEnum = pgEnum("proposta_status", [
  "pendente",
  "aprovada",
  "rejeitada",
  "retirada",
]);

export const changeProposal = pgTable(
  "change_proposal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: propostaTipoEnum("tipo").notNull(),

    /** Nulo quando `tipo = nova_especie`. */
    speciesId: uuid("species_id").references(() => species.id, {
      onDelete: "cascade",
    }),

    /**
     * Só os campos que mudam, não o registro inteiro.
     *
     * Guardar um patch em vez de um snapshot mantém o diff trivial e evita que
     * uma proposta antiga, ao ser aprovada, sobrescreva campos que outra
     * proposta alterou nesse meio-tempo.
     */
    patch: jsonb("patch").$type<Record<string, unknown>>().notNull(),

    /**
     * De onde vem o valor proposto. Obrigatório — é a regra de ouro dos dados
     * aplicada na porta de entrada: sem fonte, não entra.
     */
    fonte: text("fonte").notNull(),
    justificativa: text("justificativa"),

    status: propostaStatusEnum("status").notNull().default("pendente"),

    autorId: text("autor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    revisorId: text("revisor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    notaDaRevisao: text("nota_da_revisao"),

    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    revisadoEm: timestamp("revisado_em"),
  },
  (tabela) => [
    index("proposal_status_idx").on(tabela.status),
    index("proposal_autor_idx").on(tabela.autorId),
    index("proposal_species_idx").on(tabela.speciesId),
  ],
);

/**
 * Histórico da espécie. Uma linha por proposta aprovada.
 *
 * Guarda o patch aplicado e o estado resultante: o patch responde "o que
 * mudou", o snapshot responde "como estava depois" sem precisar reconstruir a
 * cadeia inteira.
 */
export const speciesRevision = pgTable(
  "species_revision",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    speciesId: uuid("species_id")
      .notNull()
      .references(() => species.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id").references(() => changeProposal.id, {
      onDelete: "set null",
    }),

    patch: jsonb("patch").$type<Record<string, unknown>>().notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    fonte: text("fonte").notNull(),

    autorId: text("autor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    revisorId: text("revisor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (tabela) => [index("revision_species_idx").on(tabela.speciesId)],
);

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    corpo: text("corpo"),
    link: text("link"),
    lidaEm: timestamp("lida_em"),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (tabela) => [index("notification_user_idx").on(tabela.userId)],
);

export type ChangeProposal = typeof changeProposal.$inferSelect;
export type SpeciesRevision = typeof speciesRevision.$inferSelect;
export type Notification = typeof notification.$inferSelect;
