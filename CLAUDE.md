# Safa Muda — Instruções do projeto

You are acting as a Senior Full-Stack Next.js Developer.

**Stack:** Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui,
Drizzle ORM, PostgreSQL 16 + PostGIS, Better Auth, MinIO (S3).

Sistema integrado de planejamento e gestão agroflorestal: catálogo colaborativo
de espécies, planejamento 4D (tempo × estratos × espaço) e diário de campo.

**Leia [docs/PLANO.md](docs/PLANO.md) antes de trabalhar.** Ele traz a
fundamentação técnica, as decisões fechadas, o modelo de dados e as fases.

## 1. Protocolo de verificação em duas fases

**Fase 1 — validação local (rápida).** De `app/`, antes de dar tarefa por
concluída ou subir o Docker:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run format`

**Fase 2 — integração.** Só depois que a fase 1 passar, da raiz:

- `docker compose up -d --build`
- Aplicação em `http://localhost:3000` (ou `WEB_PORT`), MinIO em `:9001`
- `docker compose logs -f web`
- **Não** rode `npm run dev` na máquina — use Docker Compose.

## 2. Mudanças de schema (obrigatório)

Toda alteração em `app/db/schema/` gera uma migration versionada:

```bash
cd app
npm run db:generate -- --name descricao_curta
npm run db:migrate
```

Commite o schema e a migration juntos. A CI falha se estiverem fora de sincronia.
Nunca edite uma migration já mergeada — crie outra.

Diferente do boilerplate original, **não há `push:true`**: dev e produção usam o
mesmo caminho de migrations, o que evita drift silencioso.

## 3. Regras de arquitetura

- **Domínio puro em `app/core/`.** Estratos, sucessão, tempo e geometria são
  funções puras — sem React, sem banco, sem I/O — com testes unitários. Toda
  regra agroflorestal nova vai para lá. É a superfície de contribuição mais
  valiosa do projeto.
- **Geometria em metros, no plano local.** Ver
  [ADR 0001](docs/adr/0001-plano-metrico-local.md). Nunca armazene desenho em
  lat/lon; georreferência é atributo opcional da área.
- **Plantio é regra, indivíduo é exceção.** Um plantio guarda espécie + regra de
  posicionamento e gera as posições sob demanda. Indivíduos só materializam
  quando ganham história própria (morreram, foram podados, têm foto).
- **Nada de segredo em tempo de importação.** `next build` roda com
  `NODE_ENV=production` antes de qualquer segredo existir. `db/index.ts` e
  `lib/auth.ts` usam inicialização preguiçosa atrás de `Proxy` — mantenha assim,
  e não acesse `auth.*` no topo de um módulo de rota. Ver
  [ADR 0002](docs/adr/0002-saida-do-payload-cms.md).
- **Autorização por recurso, não por rota.** O catálogo é público, projetos são
  privados. Use `lib/access.ts`; não centralize em middleware que bloqueia rotas
  inteiras.
- **Estilo via Tailwind + shadcn.** Tokens em `app/tailwind.config.ts` e
  `app/app/(frontend)/globals.css`. Sem CSS puro nem styled-components.

## 4. Dados: a regra de ouro

**Nunca preencha um campo do catálogo por estimativa própria.** Todo valor tem
proveniência declarada (livro, tabela, observação de campo). Se a fonte não
informa, o campo fica nulo e a interface mostra "não informado".

Isso vale no código também: `LUZ_TRANSMITIDA.rasteiro` é `null` porque a fonte
não estima esse número — não invente um.

## 5. Idioma

- Interface, documentação e comentários: **português (pt-BR)**.
- Código e identificadores: inglês, **exceto termos do domínio agroflorestal**
  (`estrato`, `sucessao`, `placenta`, `plantio`, `leira`, `consorcio`), que ficam
  em português para preservar o vínculo com a literatura de referência.

## 6. Estrutura

- `app/core/` — domínio agroflorestal puro (testado)
- `app/db/` — schema Drizzle, migrations, seed
- `app/lib/` — auth, access, storage, utils
- `app/app/(frontend)/` — páginas públicas
- `app/app/api/` — rotas de API
- `app/components/` — `ui/` (shadcn), `layout/`, `auth/`
- `docs/adr/` — decisões arquiteturais

## 7. Deploy

- Desenvolvimento: `docker-compose.yml`
- Produção: `docker-compose.prod.yml` + `docker-compose.traefik.yml`
- Primeiro deploy: `./scripts/deploy.sh`; atualizações:
  `./scripts/update-app-in-server.sh`
- `S3_PUBLIC_DOMAIN` é obrigatório em produção: o upload vai do navegador direto
  ao MinIO por URL pré-assinada, e a assinatura SigV4 cobre o cabeçalho Host.

## 8. Licença

AGPL-3.0-or-later. Contribuições sob DCO (`git commit -s`).
