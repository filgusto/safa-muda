-- Contas criadas pelo Google antes da correção em lib/auth.ts guardaram a URL
-- da foto de lá em "image". Foto de perfil aqui é só arquivo enviado pela
-- própria pessoa (/media/<key>): a URL externa nunca foi exibida (o CSP a
-- bloqueia) e não deveria ter sido gravada.
UPDATE "user"
SET "image" = NULL, "publico_foto" = false
WHERE "image" IS NOT NULL AND "image" NOT LIKE '/media/%';
