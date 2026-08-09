# ADR 0001 — O plano métrico local como formato canônico da geometria

**Data:** 2026-08-09
**Status:** aceito

## Contexto

O planejador precisa de dois modos de desenho:

1. **Croqui** — fundo branco, medidas reais, sem georreferência. É o que o
   usuário quer quando está desenhando uma leira no papel, ou quando não sabe
   (nem se importa com) as coordenadas do terreno.
2. **SIG** — desenho sobre imagem de satélite, com coordenadas reais.

A tentação óbvia é armazenar geometria em WGS84 (lat/lon) quando georreferenciada
e num espaço arbitrário quando não. Isso cria dois formatos, duas
implementações de desenho e uma migração dolorosa quando o usuário decide
georreferenciar um croqui existente.

Além disso, toda a matemática que importa no domínio é métrica: espaçamento
entre mudas, largura de entrelinha, comprimento de leira, densidade por hectare.
Fazer essas contas em graus exige trigonometria esférica a cada operação.

## Decisão

Toda geometria de desenho é armazenada **em metros, num plano cartesiano local**
com origem na âncora da área e eixos X=leste, Y=norte.

O georreferenciamento é um **atributo opcional da área**, não um formato
alternativo de armazenamento:

```
Area {
  geom_local:   Polygon em metros   (sempre presente)
  anchor_lat:   float | null        ─┐
  anchor_lon:   float | null         ├─ presentes só no modo SIG
  rotation_deg: float                ─┘
}
```

A conversão local ↔ WGS84 é feita por plano tangente equiretangular na âncora
(`app/core/geo.ts`). PostGIS entra para consultas espaciais e exportação, não
como formato canônico.

## Consequências

**Boas:**

- Espaçamento, comprimento, área e densidade são aritmética simples e exata.
- Croqui e SIG renderizam a **mesma** geometria. Não há conversão,
  sincronização, nem risco de os dois modos divergirem.
- Georreferenciar depois (ou nunca) não migra dado nenhum: é só preencher três
  colunas.
- As funções de geometria são puras e testáveis sem banco nem mapa.

**Custos e limites:**

- A projeção equiretangular tem erro que cresce com a distância da âncora. Na
  escala de um lote (poucos km) o erro é centimétrico — irrelevante para
  agrofloresta. Para áreas de dezenas de km seria preciso trocar por UTM via
  proj4; a interface de `core/geo.ts` foi desenhada para permitir essa troca sem
  mexer em quem a chama.
- Consultas espaciais georreferenciadas exigem materializar a geometria em
  WGS84. Isso é derivado, não canônico — pode ser coluna gerada ou recalculada.

## Alternativas consideradas

- **Armazenar tudo em WGS84.** Rejeitada: obriga trigonometria esférica em toda
  operação de espaçamento e impede o modo croqui sem georreferência.
- **Dois formatos, um por modo.** Rejeitada: duplica o código de desenho e cria
  uma migração dolorosa exatamente no momento em que o usuário decide
  georreferenciar.
