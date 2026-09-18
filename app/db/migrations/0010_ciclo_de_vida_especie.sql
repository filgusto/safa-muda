CREATE TYPE "public"."ciclo_de_vida" AS ENUM('anual', 'bienal', 'perene');--> statement-breakpoint
CREATE TYPE "public"."frutificacao" AS ENUM('monocarpica', 'policarpica');--> statement-breakpoint
CREATE TYPE "public"."habito" AS ENUM('erva', 'subarbusto', 'arbusto', 'arvore', 'liana', 'palmeira', 'bambu', 'suculenta', 'dracenoide');--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN "ciclo_de_vida" "ciclo_de_vida"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN "frutificacao" "frutificacao";--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN "habito" "habito"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN "longevidade_min_anos" real;--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN "longevidade_max_anos" real;--> statement-breakpoint
ALTER TABLE "species" DROP COLUMN "longevidade_anos";