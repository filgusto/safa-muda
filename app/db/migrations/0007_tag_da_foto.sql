CREATE TYPE "public"."tag_de_foto" AS ENUM('semente', 'jovem', 'adulta', 'misc');--> statement-breakpoint
-- Em três passos: a coluna é obrigatória, mas as fotos já cadastradas não têm
-- fase declarada. Elas entram como 'misc' — que é justamente "não se
-- comprometeu com uma fase" — e a obrigatoriedade vale da migration em diante.
-- Sem DEFAULT ao final: um insert futuro que esqueça a tag deve falhar, não
-- ganhar 'misc' silenciosamente.
ALTER TABLE "species_media" ADD COLUMN "tag" "tag_de_foto";--> statement-breakpoint
UPDATE "species_media" SET "tag" = 'misc' WHERE "tag" IS NULL;--> statement-breakpoint
ALTER TABLE "species_media" ALTER COLUMN "tag" SET NOT NULL;
