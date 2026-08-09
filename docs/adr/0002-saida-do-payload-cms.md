# ADR 0002 — Remover o Payload CMS

**Data:** 2026-08-09
**Status:** aceito

## Contexto

O projeto nasceu de um boilerplate que trazia Payload CMS 3 como camada de
dados e administração. Payload é excelente para conteúdo editorial: define
coleções, gera admin, resolve upload e autenticação.

Mas os três pilares do Safa Muda não são conteúdo editorial.

## Decisão

Remover o Payload. Persistência direta em Postgres via Drizzle ORM,
autenticação via Better Auth, upload direto ao MinIO por URL pré-assinada.

## Motivos

1. **Wiki moderada.** O catálogo precisa de proposta → revisão → aprovação, com
   diff campo a campo e histórico por espécie. Isso não é o modelo de drafts do
   Payload, e adaptar o admin dele custaria mais do que construir a fila sob
   medida.
2. **O planejador é uma SPA de estado complexo.** Timeline e mapa com geometria
   não se beneficiam de nada que o Payload oferece.
3. **PostGIS não é cidadão de primeira classe no Payload.**

## Consequências

**Assumimos explicitamente:** autenticação, RBAC, migrations, upload de arquivos
e as telas de administração. Todo esse trabalho é conhecido, mas não é de graça.

**Ganhamos:** controle total do schema, PostGIS nativo, e liberdade para desenhar
a moderação e o planejador do jeito que o domínio pede.

**Armadilha herdada, que continua valendo:** o `payload.config.ts` original
documentava que um `throw` em nível de módulo quebra o `next build`, porque o
build roda com `NODE_ENV=production` e importa os módulos antes de qualquer
segredo de runtime existir. A mesma armadilha nos pegou com `AUTH_SECRET` e
`DATABASE_URL`. Por isso `app/db/index.ts` e `app/lib/auth.ts` usam
inicialização preguiçosa atrás de um `Proxy` — a variável só é exigida no
primeiro uso real, nunca na importação.
