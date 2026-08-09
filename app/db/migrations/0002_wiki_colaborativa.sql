CREATE TYPE "public"."proposta_status" AS ENUM('pendente', 'aprovada', 'rejeitada', 'retirada');--> statement-breakpoint
CREATE TYPE "public"."proposta_tipo" AS ENUM('edicao', 'nova_especie');--> statement-breakpoint
CREATE TABLE "change_proposal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "proposta_tipo" NOT NULL,
	"species_id" uuid,
	"patch" jsonb NOT NULL,
	"fonte" text NOT NULL,
	"justificativa" text,
	"status" "proposta_status" DEFAULT 'pendente' NOT NULL,
	"autor_id" text NOT NULL,
	"revisor_id" text,
	"nota_da_revisao" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"revisado_em" timestamp
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"titulo" text NOT NULL,
	"corpo" text,
	"link" text,
	"lida_em" timestamp,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "species_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"species_id" uuid NOT NULL,
	"proposal_id" uuid,
	"patch" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"fonte" text NOT NULL,
	"autor_id" text,
	"revisor_id" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "change_proposal" ADD CONSTRAINT "change_proposal_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_proposal" ADD CONSTRAINT "change_proposal_autor_id_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_proposal" ADD CONSTRAINT "change_proposal_revisor_id_user_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_revision" ADD CONSTRAINT "species_revision_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_revision" ADD CONSTRAINT "species_revision_proposal_id_change_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."change_proposal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_revision" ADD CONSTRAINT "species_revision_autor_id_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_revision" ADD CONSTRAINT "species_revision_revisor_id_user_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_status_idx" ON "change_proposal" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proposal_autor_idx" ON "change_proposal" USING btree ("autor_id");--> statement-breakpoint
CREATE INDEX "proposal_species_idx" ON "change_proposal" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "revision_species_idx" ON "species_revision" USING btree ("species_id");