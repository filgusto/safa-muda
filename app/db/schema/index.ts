/**
 * Schema do banco. Cada arquivo cobre um domínio; este índice reexporta tudo
 * para o cliente Drizzle e para o drizzle-kit.
 *
 * As tabelas de catálogo, projeto e diário entram nas fases 1, 3 e 5 —
 * ver docs/PLANO.md §5 e §6.
 */
export * from "./enums.ts";
export * from "./auth.ts";
export * from "./media.ts";
export * from "./species.ts";
export * from "./wiki.ts";
export * from "./projeto.ts";
export * from "./espaco.ts";
export * from "./diario.ts";
