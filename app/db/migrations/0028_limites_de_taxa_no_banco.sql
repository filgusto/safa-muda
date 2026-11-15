CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "limite_de_taxa" (
	"chave" text NOT NULL,
	"janela" bigint NOT NULL,
	"expira_em" bigint NOT NULL,
	"total" integer NOT NULL,
	CONSTRAINT "limite_de_taxa_chave_janela_pk" PRIMARY KEY("chave","janela")
);
--> statement-breakpoint
CREATE INDEX "limite_de_taxa_expira_idx" ON "limite_de_taxa" USING btree ("expira_em");