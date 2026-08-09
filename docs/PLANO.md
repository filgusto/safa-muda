# Safa Muda — Plano de Implementação

Sistema integrado de planejamento e gestão agroflorestal.
Planejamento 4D (tempo × estratos × espaço) + catálogo colaborativo + diário de campo.

> **Status:** todas as seis fases do plano concluídas. O que segue são
> melhorias, não etapas pendentes — ver §7.4.
> Documento vivo — decisões arquiteturais significativas geram um ADR em
> `docs/adr/`.

## 0. Decisões fechadas

| Tema | Decisão | Implicação |
|---|---|---|
| **Licença** | **AGPL-3.0** | Quem hospedar versão modificada como serviço abre o código. Cabeçalho de licença nos arquivos e `LICENSE` na raiz, Fase 0. |
| **Nome** | **`safa-muda`** | Rename global na Fase 0: rede `safa-muda-net`, volumes `safa-muda-pgdata` / `safa-muda-minio-data`, bucket `safa-muda-media`, usuário/DB `safa_muda`. |
| **Acesso** | Catálogo **público**; projetos **privados** por padrão | Leitura do catálogo e fichas sem login (SEO + valor público do wiki). Login para propor edição e para criar/ver projetos. Link não-listado opcional por projeto. Middleware e políticas de leitura precisam distinguir os dois desde a Fase 0. |
| **Granularidade da timeline** | **Mês**, com zoom agregando em anos | `t_start_month` / `t_end_month` inteiros. Escala horizontal virtualizada; níveis de zoom mês → trimestre → ano. Suporta tanto alface de 45 dias quanto jequitibá de 40 anos. |

---

## 1. Visão

Existe muita tabela de agrofloresta circulando em PDF. O que não existe é uma
ferramenta que **valide um desenho** e **acompanhe o sistema ao longo do tempo**.

Safa Muda tem três peças que só fazem sentido juntas:

| Peça | O que é | O que a torna diferente |
|---|---|---|
| **Catálogo** | Wiki de espécies com parâmetros agroflorestais | Colaborativo e moderado — o conhecimento melhora com o uso |
| **Planejador** | Timeline (tempo × estrato) + Mapa (croqui ou SIG) | Duas vistas do **mesmo** desenho, integradas |
| **Diário** | Registro do que foi realmente plantado/podado/colhido | O planejamento se corrige com a realidade |

O público vai do hobbista com uma ilha agroflorestal ao produtor com leiras em
linha de produção. A modelagem precisa escalar de 20 plantas a dezenas de
milhares sem mudar de paradigma.

### Princípio norteador

> *"Deixamos de cultivar plantas para começar a cultivar processos."*
> — Guia dos Estratos Agroflorestais

O software instrumenta o **processo**. O catálogo é meio, não fim.

---

## 2. Fundamentação técnica (das referências)

Os números abaixo vêm de `_references/` e são a base do futuro motor de análise.
Ficam codificados em `core/` desde já, mesmo que a v1 use pouco deles.

### 2.1 Estratos e luz

Estimativas de Ernst Götsch, registradas em *Agroflorestando o Mundo*, cap. 7.3:

| Estrato | Luz que **deixa passar** | Ocupação ideal do andar |
|---|---|---|
| Emergente | ~80% | 20% |
| Alto | ~60% | 40% |
| Médio | ~40% | 60% |
| Baixo | ~20% | 80% |
| Rasteiro | — | (citado no Guia, sem número) |

`ocupação_ideal = 100% − luz_transmitida`. É essa complementaridade que permite
somar 170%–277% de área plantada num mesmo canteiro (cap. 10, tabelas 2–6).

### 2.2 Sucessão

Eixo ordinal, do mais efêmero ao mais longevo:

```
Placenta 1 → Placenta 2 → Pioneira → Secundária Inicial
           → Secundária Média → Secundária Tardia → Clímax
```

Cada degrau prepara o seguinte. **Estrato é espaço, sucessão é tempo** — e a
altura da planta não determina seu papel: o momento e a função determinam.

### 2.3 Sistemas (degraus de fertilidade)

`Retomada → Acumulação → Abundância`. É a espiral sucessional em degraus
crescentes de fertilidade do solo (cap. 7.1, 7.8, 7.9).

### 2.4 Grupos funcionais

Fruta, Matéria Orgânica, Hortaliça, Madeira, Medicinal, Ornamental, PANC,
Palmeira, Grão, Castanha, Tempero, Aromática, Palmito, Artesanato, Tubérculo,
Casca, Bebida, Forrageira.

---

## 3. Decisões arquiteturais

### 3.1 Saída do Payload CMS

**Decisão:** remover o Payload. Persistência direta em Postgres via Drizzle ORM.

**Por quê:** o Payload é excelente para conteúdo editorial, mas aqui ele atrapalha
em três pontos que são justamente o núcleo do produto:

- O **fluxo de wiki moderado** (proposta → revisão → aprovação) não é o modelo de
  drafts do Payload, e lutar contra o admin dele custaria mais que construir a fila
  de moderação sob medida.
- O **planejador é uma SPA com estado complexo** — timeline, mapa, geometria. Ele
  não se beneficia de nada que o Payload oferece.
- Geometria PostGIS não é cidadã de primeira classe no Payload.

**O que passamos a assumir (custo real, declarado):** autenticação, RBAC,
migrations, upload de arquivos e as telas de administração. Tudo isso está no
escopo abaixo e é trabalho conhecido — mas não é de graça.

### 3.2 O plano métrico local (decisão central do mapa)

Toda geometria de desenho é armazenada **em metros, num plano cartesiano local**
com origem na âncora da área. O georreferenciamento é um *atributo opcional* da
área — não uma forma alternativa de armazenar.

```
Area {
  geom_local:   Polygon em metros (sempre presente)
  anchor_lat:   float | null   ─┐
  anchor_lon:   float | null    ├─ presentes só no modo SIG
  rotation_deg: float           ─┘
}
```

**Consequências (todas boas):**

- Espaçamento, comprimento de linha, área e densidade são aritmética simples —
  nunca trigonometria esférica.
- Croqui e SIG renderizam **a mesma geometria**. Não há conversão, sincronização
  nem risco de divergência entre os dois modos.
- O usuário pode começar em croqui e georreferenciar depois (ou nunca), sem
  migrar dado nenhum.
- Projeção local ↔ WGS84 via proj4js com UTM derivado da âncora — precisão
  centimétrica na escala de um lote.

O PostGIS entra para as consultas espaciais georreferenciadas (busca por área,
sobreposição, exportação GeoJSON/KML), não como formato canônico do desenho.

### 3.3 Plantio como regra, indivíduo como exceção

Um produtor com 5 leiras de 100 m e espaçamento de 50 cm tem ~1.000 plantas.
Gravar cada uma como linha no banco desde o desenho é insustentável e inútil.

**Modelo:**

```
Planting   = espécie + regra de posicionamento + extensão temporal
             (linha X, do metro 12 ao 60, espaçamento 0,5 m, a partir do mês 0)
             → gera as posições dos indivíduos sob demanda, no cliente

PlantIndividual = materializado APENAS quando ganha história própria
             (morreu, foi podado, produziu, recebeu foto)
```

O desenho fica leve; o diário fica preciso onde importa. A materialização é
lazy e transparente para o usuário.

### 3.4 Núcleo de domínio puro

`core/` é um módulo **sem React, sem banco, sem I/O** — só TypeScript e testes.
Contém estratos, sucessão, geometria, projeção, geração de posições e (no futuro)
o motor de análise de conflitos.

Isso não é purismo: é o que torna o projeto **contribuível**. Alguém que entende
de agrofloresta mas não de React consegue melhorar as regras agronômicas mexendo
em funções puras com testes unitários. É a superfície de contribuição mais
valiosa do projeto.

### 3.5 SPA sem perder URLs

Next.js App Router como shell; o workspace do projeto é uma rota única
(`/p/[projectId]`) que troca painéis client-side. Estado navegável via query
params (`nuqs`) — catálogo aberto, espécie selecionada, ano focado e aba ativa
são linkáveis e sobrevivem ao reload, sem transição de página.

---

## 4. Stack

| Camada | Escolha | Nota |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19 | mantido |
| Estilo | Tailwind + shadcn/ui + tokens Kuara | mantido integralmente |
| ORM | **Drizzle + drizzle-kit** | TS-nativo, SQL explícito, PostGIS via custom types |
| Banco | **postgis/postgis:16-3.4** | substitui `postgres:16-alpine` |
| Auth | **Better Auth** | self-hosted, adapter Drizzle, RBAC simples |
| Estado servidor | TanStack Query | cache + optimistic updates |
| Estado de URL | nuqs | mantém a SPA linkável |
| Validação | Zod | schemas compartilhados cliente/servidor |
| Mapa | **MapLibre GL JS** | sem token, sem vendor lock-in |
| Projeção | proj4js | local ↔ WGS84 |
| Desenho | canvas/SVG próprio sobre o plano local | mesmo código nos dois modos |
| Drag & drop | dnd-kit | catálogo → timeline |
| Arquivos | @aws-sdk/client-s3 → MinIO | upload por URL pré-assinada |
| Testes | Vitest (mantido) + Playwright (fase 5) | |
| i18n | next-intl, pt-BR default | estrutura pronta, sem traduzir agora |

**Basemaps (modo SIG):** OSM raster como padrão (livre, com atribuição), e
provedor de satélite configurável por env var. Nenhuma chave de API obrigatória
para rodar o projeto — requisito de um open-source que qualquer um deve
conseguir subir.

---

## 5. Modelo de dados

Esboço. Nomes finais no schema Drizzle; enums em Postgres nativos.

### 5.1 Identidade

```
user            id, name, email, image, role(user|moderator|admin), created_at
session/account (Better Auth)
```

### 5.2 Catálogo (wiki)

```
species         id, slug, common_name, scientific_name, family,
                stratum(enum), succession(enum), system(enum), groups(enum[]),
                -- enriquecidos, majoritariamente nulos na v1:
                days_to_harvest, productive_from_months, longevity_years,
                spacing_in_row_m, spacing_between_rows_m, mature_height_m,
                biomes(enum[]), notes(rich text), sources(jsonb),
                status(published|archived), current_revision_id, created_by

species_revision  id, species_id, snapshot(jsonb), author_id, message, created_at

change_proposal   id, species_id(null = nova espécie), proposed(jsonb),
                  author_id, status(pending|approved|rejected|withdrawn),
                  reviewer_id, review_note, created_at, reviewed_at

species_media     species_id, media_id, role(principal|folha|fruto|porte|manejo)
```

`sources` guarda a proveniência de cada campo (`messerschmidt`, `neto_cap10`,
`comunidade`) — indispensável para corrigir a tabela original sem perder rastro
e para exibir "de onde veio esse número" no card.

### 5.3 Projeto e desenho

```
project         id, name, owner_id, description, start_date, horizon_years,
                visibility(private|unlisted|public), created_at
project_member  project_id, user_id, role(owner|editor|viewer)

area            id, project_id, name, geom_local(polygon, metros),
                anchor_lat, anchor_lon, rotation_deg, geom(geography|null),
                area_m2
row             id, area_id, kind(plantio|entrelinha|servico),
                path_local(linestring), label, order_index

planting        id, project_id, species_id, stratum_override,
                placement(jsonb: {kind, row_id, from_m, to_m, spacing_m, offset_m}),
                t_start_month, t_end_month, intention(producao|materia_organica|
                adubacao|quebra_vento|servico), status(planned|planted|removed), notes

plant_individual id, planting_id, position_local(point), planted_at,
                 status(vivo|morto|removido), label
```

`t_start_month` / `t_end_month` são **meses relativos ao início do projeto**.
Ver §7.1 sobre tempo relativo vs. absoluto.

### 5.4 Diário

```
event           id, project_id, subject_type(planting|individual|area|project),
                subject_id, kind(plantio|poda|colheita|rocada|adubacao|
                mortalidade|semeadura|observacao),
                occurred_on(date), quantity, unit, notes, created_by
event_media     event_id, media_id
```

### 5.5 Arquivos

```
media           id, key(S3), filename, mime, size, width, height,
                alt, uploaded_by, created_at
```

---

## 6. Fases

Cada fase termina com algo **usável e mergeado**, não com um andaime.

### Fase 0 — Fundação (infra e limpeza) — ✅ concluída

- Remover Payload: `app/(payload)/`, `collections/`, `withPayload`, deps, scripts
  de migration do Payload, `PAYLOAD_SECRET`.
- Renomear `app` → `safa-muda` em compose, volumes, rede, bucket, usuário/DB.
- Trocar imagem Postgres por `postgis/postgis:16-3.4`; extensão `postgis` na
  migration inicial.
- Instalar e configurar Drizzle + drizzle-kit; script de migration novo.
- Better Auth: cadastro, login, sessão, papéis. Seed do primeiro admin.
- Upload para MinIO por URL pré-assinada + rota de leitura.
- Andaime open-source: `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `docs/adr/`, templates de issue/PR, GitHub Actions (typecheck, lint, test, build).
- Atualizar `CLAUDE.md` e `README.md` (o protocolo de duas fases permanece; a
  seção de migrations do Payload é substituída pela do Drizzle).

**Entrega:** stack sobe, usuário se cadastra e faz login, sobe uma imagem.

### Fase 1 — Dataset e catálogo (leitura) — ✅ concluída

Resultado: **442 espécies**. Pipeline em `scripts/dataset/` (extração →
correções → montagem), com dataset e correções commitados para revisão em PR.
Proveniência por campo: 2 628 valores do Messerschmidt, 138 do cap. 10 do Neto,
24 de correção editorial. Seis campos ficaram nulos por a fonte não informar.


- **Limpeza da tabela** (script versionado em `scripts/seed/`, com log de
  correções auditável):
  - typos: `Placenda`/`Plaventa` → `Placenta`, `Secundatia` → `Secundária`
  - taxonomia: `Laurus persea` → *Persea americana*; `Acácia meransii` →
    *Acacia mearnsii*; Quinoa com família correta (Amaranthaceae); Batata Salsa
    → *Arracacia xanthorrhiza*
  - colunas deslocadas: Cangerana, Calistemo
  - duplicatas: Jenipapo/Genipapo; Cabeludinha vs. Grumixama (mesmo binômio)
  - normalização de acentos, capitalização e vocabulários fechados
- Enriquecimento manual do subconjunto coberto pelo cap. 10 do Neto
  (~60 espécies com espaçamento e dias para colher).
- Seed idempotente com proveniência por campo.
- Catálogo: busca, filtros (estrato, sucessão, sistema, grupo, família), card
  de espécie com badges e "fonte do dado".

**Entrega:** catálogo navegável e confiável, com ~435 espécies limpas.

### Fase 2 — Wiki colaborativa — ✅ concluída

Fluxo: proposta → moderação → revisão. Toda proposta declara fonte (mínimo de
10 caracteres, validado); o patch guarda só os campos alterados; a aprovação
marca como `comunidade` **apenas** a proveniência dos campos tocados,
preservando a dos demais. Rejeitar exige nota — quem contribuiu precisa
entender o porquê.


- Proposta de edição e de nova espécie (formulário com validação Zod).
- Fila de moderação: diff campo a campo, aprovar / rejeitar / comentar.
- Histórico de revisões por espécie, com autoria.
- Notificação in-app do resultado da proposta.

**Entrega:** o catálogo passa a melhorar sozinho.

### Fase 3 — Projetos e Timeline — ✅ concluída

Timeline com tempo no X e cinco faixas de estrato no Y, zoom mês/trimestre/ano,
linha do hoje e barras móveis e redimensionáveis. O catálogo fica acoplado à
esquerda; arrastar de lá cria o plantio com duração sugerida pelo ciclo da
espécie. Estrato divergente do catálogo é permitido, mas fica marcado
(borda tracejada + aviso). Todo o cálculo vive em `core/planejamento.ts`.


- CRUD de projeto (nome, data de início, horizonte em anos, membros).
- **Timeline:** eixo X = tempo (ano/mês), eixo Y = faixas de estrato
  (Emergente / Alto / Médio / Baixo / Rasteiro).
- Painel do catálogo acoplado; arrastar espécie → barra na faixa do seu estrato.
- Barra redimensionável (início e duração); *snap* configurável.
- Restrição da v1: **a espécie cai na faixa do seu estrato** (com override
  explícito e marcado, porque agrofloresteiro experiente às vezes quer isso).
- Linha "hoje" e controle de horizonte.

**Entrega:** dá para desenhar uma agrofloresta no tempo e salvar.

### Fase 4 — Mapa de plantio — ✅ concluída (com uma ressalva)

Croqui em SVG com `viewBox` em metros: uma linha de 10 m mede 10 unidades, sem
conversão em lugar nenhum. Desenho de área e de linhas, geração paramétrica
(direção, espaçamento, bordadura, recorte no polígono inclusive côncavo),
posicionamento de plantio em trecho de linha, contagem e densidade ao vivo,
georreferência opcional e exportação SVG + GeoJSON (WGS84).

O modo SIG ganhou o fundo de mapa depois, sem MapLibre — ver §7.4.


- **Modo croqui:** fundo branco, régua e escala, desenho de polígono da área com
  medidas reais, cotas.
- **Modo SIG:** MapLibre + basemap; georreferenciar a área (âncora + rotação);
  desenhar sobre imagem de satélite.
- Linhas de plantio, entrelinhas e linhas de serviço: desenho manual e geração
  paramétrica (direção, espaçamento entre linhas, bordadura).
- Vincular plantio a segmento de linha com espaçamento → posições geradas e
  renderizadas.
- Contagem de mudas e densidade por espécie, ao vivo.
- Exportação: GeoJSON, PNG e PDF do croqui com escala.

**Entrega:** desenho espacial completo, integrado à timeline (uma barra na
timeline conhece seu lugar no mapa e vice-versa).

### Fase 5 — Diário de campo — ✅ concluída

Eventos de manejo (semeadura, plantio, poda, colheita, roçada, adubação,
mortalidade, observação) com data, quantidade, notas e fotos. O sujeito é
hierárquico e opcional: projeto → área → plantio → muda. O indivíduo é
materializado **só** quando um evento o nomeia, com a posição derivada da regra
e congelada no momento do registro.

A timeline passa a mostrar o realizado: barra com anel ciano quando plantado,
esmaecida quando encerrado, e o desvio em meses entre o previsto e o que
aconteceu. Colheita somada por unidade, sem converter entre elas.

Playwright cobrindo nove fluxos críticos, com job próprio na CI.

- Registrar eventos em plantio, indivíduo ou área, com data, quantidade e fotos.
- Camada "planejado vs. realizado" na timeline e no mapa.
- Materialização lazy de indivíduos quando o evento é específico.
- Linha do tempo do projeto e resumo de colheitas.
- Playwright cobrindo os fluxos críticos.

**Entrega:** o sistema deixa de ser um desenho e vira acompanhamento.

### Fase 6 — Inteligência — ✅ concluída

A ocupação dos estratos passou a ser medida de **espaço**, não de tempo — o que
só ficou possível depois do mapa. O método é o do cap. 10: a ocupação de uma
espécie é a razão entre a densidade plantada e a densidade que ela teria em
monocultura. É daí que vêm os 170%–280% dos consórcios do livro.

Espécie sem espaçamento de monocultura no catálogo **não é estimada**: a
ocupação fica sem medida e a interface diz por quê, com convite para sugerir a
correção na wiki.

Diagnósticos: solo descoberto, primeiro ano sem placenta nem pioneira, sistema
sem espécie de ciclo longo, andar acima da referência. Cada um cita o princípio
da literatura que o motiva.

Os nove consórcios das tabelas 2 a 10 estão codificados em `core/consorcios.ts`,
com a percentagem de plantio que o livro registra. São arranjos testados em
campo, filtrados pela intersecção com o que o usuário já desenhou — não
recomendação gerada por algoritmo.

Calendário: colheita prevista a partir do ciclo do catálogo. **Não há previsão
de poda** — nenhuma fonte disponível dá periodicidade, e arbitrar uma seria
inventar manejo.

#### O que era da Fase 6 e continua fora

Não é v1, mas o modelo de dados já suporta:

- **Filtro por bioma/clima.** Continua impossível com honestidade: a Tabela Guia
  não traz bioma, e o próprio livro alerta que estrato é relativo ao ecossistema
  de origem. O campo existe no schema e a wiki pode preenchê-lo com fonte.
- **Previsão de poda.** Sem fonte de periodicidade.

---

## 7. Questões em aberto e riscos

### 7.1 Tempo relativo vs. absoluto

**Decidido:** planejar em **meses relativos** ao início do projeto (é como o
agrofloresteiro pensa: "ano 3"), e ancorar numa `start_date` real. O diário usa
datas absolutas; a conversão é trivial e mantém os dois mundos coerentes.
Sazonalidade (águas/seca) entra na Fase 6, derivada da data absoluta.

### 7.2 Escala do desenho

Uma leira de 200 m com espaçamento de 25 cm são 800 posições. Renderizar 50 mil
posições exige virtualização por viewport e agregação em zoom baixo (mostrar a
linha, não cada muda). Previsto na Fase 4 — mencionado aqui para não virar
surpresa.

### 7.3 O que os dados ainda não cobrem

Sendo honesto sobre os limites do dataset:

- **Bioma / clima / altitude:** ausente. O próprio livro alerta que estrato é
  relativo ao ecossistema de origem (o exemplo acerola × abacate). Sem isso,
  sugestão automatizada por região seria irresponsável. A v1 não sugere — só
  informa e valida o que o usuário desenhou.
- **Ciclo e espaçamento:** só existem para ~60 espécies (cap. 10). Os demais
  campos ficam nulos e o card mostra "não informado", nunca um valor inventado.
  A wiki é o caminho para preencher isso ao longo do tempo.

### 7.4 O que ficou de fora da Fase 4

**~~Fundo de satélite~~ — feito.** Implementado sem MapLibre: o croqui continua
sendo o único renderizador e o mapa é apenas uma camada de tiles atrás dele,
alinhada por uma transformação afim (`core/mercator.ts`). Mantém a promessa do
ADR 0001 — croqui e SIG desenham a MESMA geometria — e evita 200 KB de
dependência.

OpenStreetMap é o provedor padrão, sem chave. Satélite fica por
`NEXT_PUBLIC_SATELLITE_TILE_URL`: imagem aérea tem termos de uso que variam por
provedor, e escolher um por padrão imporia essa decisão a quem hospeda.

**~~Arrastar por toque~~ — feito.** O drag-and-drop nativo foi substituído por
Pointer Events (`components/planejador/ArrasteContext.tsx`), que cobrem mouse,
toque e caneta pelo mesmo caminho. O arraste sai de uma alça (o corpo do item
continua rolando no toque) e há um botão `+` como caminho sem arraste, que
também é o caminho do teclado. Coberto por teste E2E em viewport de tablet.

**PDF do croqui.** A exportação SVG cobre o caso (abre em qualquer editor
vetorial, imprime em escala). Um gerador de PDF com moldura e legenda entra
quando houver demanda real.

### 7.5 Regra de ouro do dado

**Nunca preencher campo por estimativa própria.** Todo valor no catálogo tem
proveniência declarada. Um card com lacunas honestas vale mais que um card
completo e inventado — e é o que sustenta a credibilidade do projeto junto a
quem entende do assunto.

---

## 8. Convenções para contribuição

- Português (pt-BR) na UI, no domínio e na documentação. Código e identificadores
  em inglês, **exceto os termos do domínio agroflorestal**, que ficam em
  português (`estrato`, `sucessao`, `placenta`, `plantio`) — traduzir "estrato
  emergente" para código empobrece o vínculo com a literatura de referência.
- Lógica agronômica vive em `core/`, sempre com teste unitário.
- Toda mudança de schema gera migration versionada e commitada junto.
- Protocolo de duas fases do `CLAUDE.md` mantido: validação estática local antes
  de subir o Docker.
- Decisões arquiteturais relevantes viram ADR em `docs/adr/`.
