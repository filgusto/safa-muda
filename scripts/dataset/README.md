# Pipeline do dataset de espécies

Como a Tabela Guia de Estratos Agroflorestais vira o catálogo do Safa Muda.

Tudo aqui é commitado de propósito: o dataset precisa ser **revisável em PR**,
não um efeito colateral de rodar um script sobre um PDF.

```
_references/TABELA GUIA…pdf
        │
        │  extrair-tabela.py          parser com vocabulários fechados
        ▼
tabela-bruta.tsv                      433 linhas lidas automaticamente
tabela-bruta-relatorio.json           11 linhas recusadas + normalizações
        │
        │  montar-dataset.py          + correcoes.json
        │                             + enriquecimento-neto-cap10.json
        ▼
app/db/seed/especies.json             442 espécies, com proveniência por campo
        │
        │  npm run db:seed
        ▼
tabela `species`
```

## Regenerar

```bash
python3 scripts/dataset/extrair-tabela.py \
    "_references/TABELA GUIA DE ESTRATOS AGROFLORESTAIS - NAMASTÊ MESSERSCHMIDT.pdf" \
    scripts/dataset/tabela-bruta.tsv

python3 scripts/dataset/montar-dataset.py

cd app && npm run db:seed
```

Requer `pdfplumber` (`pip install pdfplumber`) apenas para a extração.

## Por que o parser lê da direita para a esquerda

O PDF não tem estrutura de tabela recuperável — cada linha vem como texto
corrido, e os campos têm número variável de palavras ("Matéria Orgânica",
"Secundária Tardia", "Abóbora Moranga Cucurbita maxima").

Lendo da direita, ancorado nos vocabulários fechados (grupo → sistema →
sucessão → estrato), sobra à esquerda exatamente nome comum + nome científico +
família. O nome científico é então separado do comum pelo gênero: o primeiro
token capitalizado à esquerda dos epítetos.

**O parser nunca adivinha.** Linha que não casa vai para o relatório de
anomalias e precisa de correção manual explícita em `correcoes.json`.

## Os arquivos

| Arquivo | O que é |
| --- | --- |
| `extrair-tabela.py` | PDF → TSV. Uso único, mantido para auditoria |
| `tabela-bruta.tsv` | Saída da extração, sem correção nenhuma |
| `tabela-bruta-relatorio.json` | Linhas recusadas e normalizações aplicadas |
| `correcoes.json` | Correções manuais, cada uma com motivo declarado |
| `enriquecimento-neto-cap10.json` | Ciclo e espaçamento do livro |
| `montar-dataset.py` | Junta tudo e resolve a proveniência |

## Proveniência

Cada espécie carrega `fontes`, um mapa campo → origem:

| Origem | Significa |
| --- | --- |
| `messerschmidt` | Valor como publicado na Tabela Guia |
| `correcao-editorial` | Corrigido aqui, com motivo em `correcoes.json` |
| `neto-cap10` | Tabelas de consórcio de *Agroflorestando o Mundo* |
| `comunidade` | Contribuição aprovada pela wiki (fase 2) |

É o que permite corrigir a tabela original sem perder o rastro, e mostrar "de
onde veio este número" na ficha da espécie.

## Como corrigir um dado

1. Abra uma issue com o modelo *Correção de dado do catálogo* — **com fonte**.
2. Acrescente a entrada em `correcoes.json`, com `motivo` explícito.
3. Rode `montar-dataset.py` e commite o `especies.json` regerado junto.

Nunca preencha um campo por estimativa própria. Se a fonte não informa, o valor
fica `null` e a interface mostra "não informado" — ver a regra de ouro dos dados
em [CONTRIBUTING.md](../../CONTRIBUTING.md).
