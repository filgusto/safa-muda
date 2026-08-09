CREATE TYPE "public"."status_do_individuo" AS ENUM('vivo', 'morto', 'removido');--> statement-breakpoint
CREATE TYPE "public"."tipo_de_evento" AS ENUM('semeadura', 'plantio', 'poda', 'colheita', 'rocada', 'adubacao', 'mortalidade', 'observacao');--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"area_id" uuid,
	"planting_id" uuid,
	"individual_id" uuid,
	"tipo" "tipo_de_evento" NOT NULL,
	"ocorrido_em" date NOT NULL,
	"quantidade" real,
	"unidade" text,
	"notas" text,
	"criado_por" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	CONSTRAINT "event_media_unico" UNIQUE("event_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "plant_individual" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planting_id" uuid NOT NULL,
	"indice" integer NOT NULL,
	"position_local" jsonb,
	"rotulo" text,
	"status" "status_do_individuo" DEFAULT 'vivo' NOT NULL,
	"plantado_em" date,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "individuo_unico_por_plantio" UNIQUE("planting_id","indice")
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_area_id_area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_planting_id_planting_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."planting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_individual_id_plant_individual_id_fk" FOREIGN KEY ("individual_id") REFERENCES "public"."plant_individual"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_media" ADD CONSTRAINT "event_media_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_media" ADD CONSTRAINT "event_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_individual" ADD CONSTRAINT "plant_individual_planting_id_planting_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."planting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_project_idx" ON "event" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "event_planting_idx" ON "event" USING btree ("planting_id");--> statement-breakpoint
CREATE INDEX "event_data_idx" ON "event" USING btree ("ocorrido_em");--> statement-breakpoint
CREATE INDEX "individual_planting_idx" ON "plant_individual" USING btree ("planting_id");