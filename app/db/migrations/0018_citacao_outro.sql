ALTER TYPE "public"."user_credito_de_nome" ADD VALUE 'outro';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "credito_nome_outro" text;