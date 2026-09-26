ALTER TYPE "public"."user_perfil_de_uso" ADD VALUE 'outro';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "perfil_de_uso_outro" text;