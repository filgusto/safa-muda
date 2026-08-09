CREATE TYPE "public"."tipo_de_linha" AS ENUM('plantio', 'entrelinha', 'servico');--> statement-breakpoint
CREATE TABLE "area" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"geom_local" jsonb NOT NULL,
	"area_m2" real DEFAULT 0 NOT NULL,
	"anchor_lat" real,
	"anchor_lon" real,
	"rotation_deg" real DEFAULT 0 NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area_id" uuid NOT NULL,
	"tipo" "tipo_de_linha" DEFAULT 'plantio' NOT NULL,
	"rotulo" text,
	"path_local" jsonb NOT NULL,
	"comprimento_m" real DEFAULT 0 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "area" ADD CONSTRAINT "area_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "row" ADD CONSTRAINT "row_area_id_area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "area_project_idx" ON "area" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "row_area_idx" ON "row" USING btree ("area_id");