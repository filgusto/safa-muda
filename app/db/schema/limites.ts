import {
  pgTable,
  text,
  bigint,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

/**
 * Limite de taxa das ações do Safa Muda (uploads, propostas, importações,
 * códigos por endereço) — ver lib/limite-de-taxa.ts.
 *
 * Janela fixa: uma linha por chave e por janela, com o total de tentativas.
 * Um `insert … on conflict do update … returning` conta de forma atômica, sem
 * trava, mesmo com requisições simultâneas e mais de uma instância do web.
 * Linhas de janelas vencidas são apagadas pela varredura diária
 * (instrumentation.ts).
 */
export const limiteDeTaxa = pgTable(
  "limite_de_taxa",
  {
    chave: text("chave").notNull(),
    /** Início da janela, em ms desde a época (múltiplo da duração). */
    janela: bigint("janela", { mode: "number" }).notNull(),
    /** Fim da janela, em ms — é por ele que a varredura apaga. */
    expiraEm: bigint("expira_em", { mode: "number" }).notNull(),
    total: integer("total").notNull(),
  },
  (tabela) => [
    primaryKey({ columns: [tabela.chave, tabela.janela] }),
    index("limite_de_taxa_expira_idx").on(tabela.expiraEm),
  ],
);
