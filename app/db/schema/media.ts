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
  /**
   * Ficha do arquivo no Wikimedia Commons, quando a foto foi importada de lá
   * em vez de enviada do computador de quem contribuiu. O objeto ainda é
   * espelhado no MinIO (mesma leitura por /media/<key> de sempre) — esta URL
   * é só a proveniência para auditoria futura de autoria e licença.
   */
  sourceUrl: text("source_url"),
  uploadedBy: text("uploaded_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
