CREATE TABLE "species_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"species_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"legenda" text,
	"credito" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"aprovada_em" timestamp,
	"aprovada_por" text,
	"enviada_por" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "species_media_unico" UNIQUE("species_id","media_id")
);
--> statement-breakpoint
ALTER TABLE "species_media" ADD CONSTRAINT "species_media_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_media" ADD CONSTRAINT "species_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_media" ADD CONSTRAINT "species_media_aprovada_por_user_id_fk" FOREIGN KEY ("aprovada_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_media" ADD CONSTRAINT "species_media_enviada_por_user_id_fk" FOREIGN KEY ("enviada_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "species_media_species_idx" ON "species_media" USING btree ("species_id");