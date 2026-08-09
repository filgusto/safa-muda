CREATE TYPE "public"."intencao" AS ENUM('producao', 'materia_organica', 'adubacao', 'quebra_vento', 'servico');--> statement-breakpoint
CREATE TYPE "public"."papel_no_projeto" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."status_do_plantio" AS ENUM('planejado', 'plantado', 'removido');--> statement-breakpoint
CREATE TYPE "public"."visibilidade" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
CREATE TABLE "planting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"species_id" uuid NOT NULL,
	"estrato" "estrato" NOT NULL,
	"estrato_forcado" boolean DEFAULT false NOT NULL,
	"mes_inicio" integer NOT NULL,
	"mes_fim" integer NOT NULL,
	"intencao" "intencao",
	"status" "status_do_plantio" DEFAULT 'planejado' NOT NULL,
	"notas" text,
	"placement" jsonb,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"owner_id" text NOT NULL,
	"data_inicio" date NOT NULL,
	"horizonte_meses" integer DEFAULT 240 NOT NULL,
	"visibilidade" "visibilidade" DEFAULT 'private' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"papel" "papel_no_projeto" DEFAULT 'viewer' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_member_unico" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "planting" ADD CONSTRAINT "planting_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting" ADD CONSTRAINT "planting_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "planting_project_idx" ON "planting" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "planting_species_idx" ON "planting" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "project_owner_idx" ON "project" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "project_member_user_idx" ON "project_member" USING btree ("user_id");