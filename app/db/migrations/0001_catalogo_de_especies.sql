CREATE TABLE "species" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nome_comum" text NOT NULL,
	"nome_cientifico" text NOT NULL,
	"familia" text,
	"sinonimos" text[] DEFAULT '{}' NOT NULL,
	"estrato" "estrato",
	"sucessao" "sucessao",
	"sistema" "sistema",
	"grupos" "grupo"[] DEFAULT '{}' NOT NULL,
	"dias_para_colher_min" integer,
	"dias_para_colher_max" integer,
	"espacamento_entre_linhas_min_m" real,
	"espacamento_entre_linhas_max_m" real,
	"espacamento_na_linha_min_m" real,
	"espacamento_na_linha_max_m" real,
	"altura_madura_m" real,
	"longevidade_anos" integer,
	"produtiva_a_partir_de_meses" integer,
	"biomas" "bioma"[] DEFAULT '{}' NOT NULL,
	"notas" text[] DEFAULT '{}' NOT NULL,
	"fontes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"criado_por" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "species_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "species" ADD CONSTRAINT "species_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "species_estrato_idx" ON "species" USING btree ("estrato");--> statement-breakpoint
CREATE INDEX "species_sucessao_idx" ON "species" USING btree ("sucessao");--> statement-breakpoint
CREATE INDEX "species_sistema_idx" ON "species" USING btree ("sistema");--> statement-breakpoint
CREATE INDEX "species_familia_idx" ON "species" USING btree ("familia");