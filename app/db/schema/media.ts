import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/**
 * Arquivos guardados no MinIO. A linha aqui é o registro canônico; o objeto S3
 * é referenciado por `key`. A leitura pública passa por /media/<key> (rewrite
 * do Next para o bucket) — ver app/next.config.mjs.
 */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  /** Texto alternativo — obrigatório na UI, nulo aqui para uploads legados. */
  alt: text("alt"),
  uploadedBy: text("uploaded_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
