# Contribuindo com o Safa Muda

Obrigado pelo interesse. Este projeto vive de duas competências que raramente
moram na mesma pessoa: **agrofloresta** e **software**. As duas são bem-vindas,
e a maior parte do que precisamos não exige saber React.

## Onde sua contribuição rende mais

**Se você entende de agrofloresta**, o lugar mais valioso é `app/core/`. São
funções puras de TypeScript, com testes, que codificam as regras do domínio —
estratos, luz, sucessão, tempo. Ler e corrigir esses arquivos exige entender de
plantas, não de front-end. O catálogo de espécies (a partir da fase 1) também
aceita correções via wiki, direto pela aplicação.

**Se você entende de software**, veja as issues abertas e o
[plano de implementação](docs/PLANO.md), que descreve as fases e o que está em
aberto em cada uma.

## Regra de ouro dos dados

**Nunca preencha um campo do catálogo por estimativa própria.** Todo valor tem
proveniência declarada — de qual livro, tabela ou observação de campo ele veio.

Um card com lacunas honestas vale mais que um card completo e inventado. Se o
dado não existe na literatura, ele fica nulo e a interface mostra "não
informado". É isso que sustenta a credibilidade do projeto junto a quem entende
do assunto.

O mesmo vale para o código: se uma fonte não estima um valor (a transmissão de
luz do estrato rasteiro, por exemplo), o código guarda `null`, não um chute.

## Idioma

- **Interface, documentação e domínio:** português (pt-BR).
- **Código e identificadores:** inglês, **exceto os termos do domínio
  agroflorestal**, que ficam em português: `estrato`, `sucessao`, `placenta`,
  `plantio`, `leira`, `consorcio`.

Traduzir "estrato emergente" para código romperia o vínculo com a literatura de
referência, que é toda em português. Essa inconsistência é deliberada.

## Fluxo de trabalho

1. Abra uma issue antes de um PR grande — para não duplicar trabalho.
2. Faça um fork e crie um branch a partir de `main`.
3. Rode a validação local (abaixo) antes de abrir o PR.
4. Descreva **o que muda para o usuário**, não só o que mudou no código.

### Validação antes do PR

Protocolo de duas fases — a primeira é rápida e pega quase tudo:

```bash
cd app
npm run typecheck
npm run lint
npm run test
npm run format
```

Só depois, se você mexeu em infraestrutura ou banco:

```bash
docker compose up -d --build
docker compose logs -f web
```

### Mudanças no banco

Toda alteração de schema gera uma migration versionada, commitada junto:

```bash
cd app
npm run db:generate -- --name descricao_curta
```

Nunca edite uma migration já mergeada — crie outra.

### Decisões arquiteturais

Mudanças estruturais (trocar uma biblioteca central, mudar o modelo de dados,
alterar o sistema de coordenadas) merecem um ADR curto em `docs/adr/`,
explicando o contexto, a decisão e as consequências.

## Licença e autoria (DCO)

O projeto é **AGPL-3.0-or-later**. Ao contribuir, você concorda em licenciar sua
contribuição nos mesmos termos.

Usamos **DCO** (Developer Certificate of Origin), não CLA. Na prática: assine
seus commits com `-s`, que adiciona a linha `Signed-off-by:`.

```bash
git commit -s -m "corrige o estrato da acerola"
```

Isso é uma declaração de que você tem o direito de submeter aquele código. Você
mantém a autoria; não há transferência de copyright.

## Código de conduta

Ver [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Em resumo: agrofloresta é sobre
cooperação, não competição. Trate as pessoas assim.
