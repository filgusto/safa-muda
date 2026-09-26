CREATE TYPE "public"."user_tratamento" AS ENUM('feminino', 'masculino', 'neutro');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "tratamento" "user_tratamento";