# Safa Muda

Sistema integrado de planejamento e gestão agroflorestal.

Planeje uma agrofloresta no tempo e no espaço, acompanhe o que foi realmente
plantado, e deixe o planejamento se corrigir com a realidade.

> **Status:** as seis fases do plano estão concluídas — catálogo, wiki,
> timeline, croqui, diário de campo e análise. Ver [docs/PLANO.md](docs/PLANO.md).

## O que é

Existe muita tabela de agrofloresta circulando em PDF. O que não existe é uma
ferramenta que **valide um desenho** e **acompanhe o sistema ao longo do tempo**.

| Peça | O que faz |
| --- | --- |
| **Catálogo** | 442 espécies com estrato, sucessão, sistema e grupo — wiki colaborativa e moderada |
| **Planejador** | Timeline (tempo × estrato) e croqui com medidas reais, opcionalmente sobre mapa — duas vistas do mesmo desenho |
| **Diário** | Registro de manejos com foto — a timeline mostra o planejado versus o realizado |
| **Análise** | Ocupação medida de cada estrato contra a referência do livro, diagnósticos e consórcios testados em campo |

Serve tanto para quem cultiva uma ilha agroflorestal no quintal quanto para quem
maneja leiras em linha de produção.

## Fundamentação

Os parâmetros do sistema vêm da literatura agroflorestal brasileira, não de
estimativa nossa:

- **Agroflorestando o Mundo — De Facão a Trator** (Corrêa Neto, Messerschmidt,
  Steenbock, Monnerat; Cooperafloresta, 2016) — a espiral sucessional, os
  degraus de fertilidade e as estimativas de luz por estrato de Ernst Götsch.
- **Guia dos Estratos Agroflorestais** e a tabela de espécies de
  **Namastê Messerschmidt**.

Números centrais, do cap. 7.3 e do cap. 10:

| Estrato | Luz que deixa passar | Ocupação ideal |
| --- | --- | --- |
| Emergente | ~80% | 20% |
| Alto | ~60% | 40% |
| Médio | ~40% | 60% |
| Baixo | ~20% | 80% |

A ocupação ideal é o complemento da luz transmitida. É essa relação que permite
somar 170%–277% de área plantada num mesmo canteiro.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19 |
| Banco | PostgreSQL 16 + PostGIS |
| ORM | Drizzle |
| Autenticação | Better Auth |
| Arquivos | MinIO (S3-compatível) |
| Estilo | Tailwind CSS + shadcn/ui + tokens Kuara |
| Fontes | Fraunces (serifada), IBM Plex Sans, IBM Plex Mono |
| Orquestração | Docker Compose, Traefik ou Nginx |
| Testes | Vitest (unidade) + Playwright (ponta a ponta) |

## Rodando localmente

```bash
cp .env.example .env
# preencha POSTGRES_PASSWORD e AUTH_SECRET (qualquer valor serve em dev)

docker compose up -d --build
```

- Aplicação: <http://localhost:3000>
- Console do MinIO: <http://localhost:9001>

Logs: `docker compose logs -f web`

Crie sua conta em `/cadastro` e promova-se a administrador:

```bash
docker compose exec web npm run db:seed
```

> Rode pela Docker Compose, não com `npm run dev` na máquina — a stack fornece
> Postgres, PostGIS e MinIO.

### Portas ocupadas

Se 3000, 9000 ou 9001 já estiverem em uso, defina no `.env`:

```bash
WEB_PORT=3100
MINIO_API_PORT=9100
MINIO_CONSOLE_PORT=9101
```

### Imagem de satélite no mapa

O fundo de mapa usa OpenStreetMap por padrão, sem chave. Para imagem aérea,
defina no `.env` o provedor de sua escolha — os termos de uso variam, então o
projeto não impõe nenhum:

```bash
NEXT_PUBLIC_SATELLITE_TILE_URL=https://exemplo/{z}/{x}/{y}.jpg
NEXT_PUBLIC_SATELLITE_ATTRIBUTION="Fonte da imagem"
NEXT_PUBLIC_SATELLITE_MAX_ZOOM=19
```

### Apple Silicon

A imagem oficial do PostGIS só publica amd64, e roda emulada (lenta) em Macs
ARM. Para a build multi-arquitetura da comunidade:

```bash
POSTGRES_IMAGE=imresamu/postgis:16-3.5
```

## Estrutura

```
.
├── app/                        # Aplicação Next.js
│   ├── app/(frontend)/         # Páginas públicas
│   ├── app/api/                # Rotas de API (auth, health, media, catálogo)
│   ├── app/actions/            # Server actions (wiki, projetos, espaço, diário)
│   ├── core/                   # Domínio agroflorestal — puro, sem React nem banco
│   ├── db/                     # Schema Drizzle, migrations, seed
│   ├── e2e/                    # Testes Playwright dos fluxos críticos
│   ├── components/             # ui/, layout/, catalogo/, wiki/, planejador/, mapa/, diario/, analise/
│   ├── lib/                    # auth, access, storage, catálogo, projetos, espaço
│   └── tailwind.config.ts      # Tokens de design
├── docs/
│   ├── PLANO.md                # Plano de implementação por fases
│   └── adr/                    # Decisões arquiteturais
├── docker-compose.yml          # Stack de desenvolvimento
├── docker-compose.prod.yml     # Stack de produção
├── docker-compose.traefik.yml  # Proxy reverso (produção)
└── scripts/                    # Deploy, atualização, backup
```

`app/core/` é o lugar mais importante do repositório: são funções puras que
codificam as regras agroflorestais, com testes. É onde alguém que entende de
agrofloresta consegue contribuir sem saber React.

## Alterando o banco

```bash
cd app
npm run db:generate -- --name descricao_curta   # gera a migration
npm run db:migrate                              # aplica
```

Commite o schema e a migration juntos. A CI falha se estiverem fora de sincronia.

## Validando antes de commitar

```bash
cd app
npm run typecheck
npm run lint
npm run test
npm run format
```

Fluxos críticos de ponta a ponta, contra a stack já rodando:

```bash
cd app
E2E_BASE_URL=http://localhost:3000 npm run e2e
```

## Produção

1. Aponte `TRAEFIK_DOMAIN` e `S3_PUBLIC_DOMAIN` para o servidor; abra 80/443.
2. `cp .env.prod.example .env.prod` e preencha todos os `CHANGE_ME_*`.
3. Primeiro deploy: `./scripts/deploy.sh`
4. Atualizações: `./scripts/update-app-in-server.sh`
5. Backups: agende `./scripts/backup-db.sh` no cron.

> `S3_PUBLIC_DOMAIN` é necessário porque o upload é feito pelo navegador direto
> no MinIO, via URL pré-assinada — e a assinatura SigV4 cobre o cabeçalho Host.

## Como o catálogo evolui

O catálogo não é editável direto. Toda mudança passa por uma proposta:

1. Qualquer pessoa com conta abre uma espécie e usa **sugerir correção**.
2. A proposta declara a **fonte** — obrigatória, sem exceção.
3. Um moderador compara valor atual × proposto e aprova ou rejeita explicando.
4. A aprovação vira revisão com autoria, e os campos alterados passam a ter
   proveniência `comunidade`. Os não tocados mantêm a fonte original.

## Contribuindo

Contribuições são bem-vindas, de código e de conhecimento agroflorestal.
Ver [CONTRIBUTING.md](CONTRIBUTING.md).

A regra que mais importa: **nunca preencha um campo do catálogo por estimativa
própria.** Todo valor tem fonte declarada. Lacuna honesta vale mais que dado
inventado.

## Licença

[AGPL-3.0-or-later](LICENSE). Se você hospedar uma versão modificada como
serviço, o código modificado também precisa estar disponível.
