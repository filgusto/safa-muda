CREATE TYPE "public"."user_credito_de_nome" AS ENUM('completo', 'primeiro_nome', 'anonimo');--> statement-breakpoint
CREATE TYPE "public"."user_experiencia" AS ENUM('menos_de_1_ano', 'de_1_a_3_anos', 'de_3_a_10_anos', 'mais_de_10_anos');--> statement-breakpoint
CREATE TYPE "public"."user_perfil_de_uso" AS ENUM('agricultor', 'em_formacao', 'pesquisador', 'tecnico', 'curioso');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "regiao" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "perfil_de_uso" "user_perfil_de_uso";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "experiencia" "user_experiencia";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "link_instagram" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "link_site" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "link_lattes" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "credito_nome" "user_credito_de_nome" DEFAULT 'completo' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "aviso_por_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "termos_versao" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "termos_aceitos_em" timestamp;