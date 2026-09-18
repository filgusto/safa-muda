CREATE TYPE "public"."gema_de_rebrota" AS ENUM('tronco', 'colo', 'raiz', 'subterraneo');--> statement-breakpoint
CREATE TYPE "public"."rebrota" AS ENUM('rebrota', 'nao_rebrota');--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN "rebrota" "rebrota";--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN "gemas_de_rebrota" "gema_de_rebrota"[] DEFAULT '{}' NOT NULL;