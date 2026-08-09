import {
  pgTable,
  text,
  real,
  integer,
  timestamp,
  uuid,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { project } from "./projeto.ts";

/**
 * Geometria do desenho.
 *
 * Tudo aqui é armazenado em METROS, num plano cartesiano local com origem na
 * âncora da área — ver docs/adr/0001-plano-metrico-local.md. O
 * georreferenciamento é um atributo opcional, não um formato alternativo.
 *
 * Nota sobre PostGIS: a extensão está instalada e pronta, mas ainda não há
 * coluna geométrica. Ela entra quando existir uma consulta espacial de verdade
 * (buscar áreas por proximidade, detectar sobreposição). Criar a coluna agora
 * seria schema especulativo — a exportação GeoJSON é feita em TypeScript, a
 * partir do plano local.
 */

export const tipoDeLinhaEnum = pgEnum("tipo_de_linha", [
  "plantio",
  "entrelinha",
  "servico",
]);

/** Ponto do plano local, em metros. X = leste, Y = norte. */
export type PontoLocalJson = { x: number; y: number };

export const area = pgTable(
  "area",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),

    /** Polígono em metros. Sempre presente, com ou sem georreferência. */
    geomLocal: jsonb("geom_local").$type<PontoLocalJson[]>().notNull(),

    /** Área calculada, em m². Derivada, guardada para listar sem recalcular. */
    areaM2: real("area_m2").notNull().default(0),

    // ── Georreferência: presente só no modo SIG ─────────────────────────────
    anchorLat: real("anchor_lat"),
    anchorLon: real("anchor_lon"),
    /** Rotação do plano local em relação ao norte verdadeiro, em graus. */
    rotationDeg: real("rotation_deg").notNull().default(0),

    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (tabela) => [index("area_project_idx").on(tabela.projectId)],
);

export const row = pgTable(
  "row",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    areaId: uuid("area_id")
      .notNull()
      .references(() => area.id, { onDelete: "cascade" }),

    tipo: tipoDeLinhaEnum("tipo").notNull().default("plantio"),
    rotulo: text("rotulo"),

    /** Polilinha em metros, no mesmo plano local da área. */
    pathLocal: jsonb("path_local").$type<PontoLocalJson[]>().notNull(),

    /** Comprimento em metros. Derivado. */
    comprimentoM: real("comprimento_m").notNull().default(0),

    ordem: integer("ordem").notNull().default(0),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (tabela) => [index("row_area_idx").on(tabela.areaId)],
);

/**
 * Regra de posicionamento de um plantio ao longo de uma linha.
 *
 * Guardada no campo `placement` de `planting`. O desenho guarda a REGRA; as
 * posições dos indivíduos são derivadas dela sob demanda (docs/PLANO.md §3.3).
 * É o que permite uma leira de 200 m com 800 mudas sem 800 linhas no banco.
 */
export interface RegraDePosicionamento {
  tipo: "linha";
  rowId: string;
  deMetros: number;
  ateMetros: number;
  espacamentoM: number;
}

export type Area = typeof area.$inferSelect;
export type Row = typeof row.$inferSelect;
