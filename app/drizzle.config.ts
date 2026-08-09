import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // Nomes legíveis nos arquivos de migration, já que eles são commitados
  // e revisados em PR.
  verbose: true,
  strict: true,
});
