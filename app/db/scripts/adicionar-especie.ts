/**
 * Cadastra (ou atualiza) espécies do catálogo a partir de um arquivo JSON,
 * sem passar pelo formulário do navegador.
 *
 *   npm run db:adicionar-especie -- db/scripts/especies/jambu.json
 *   npm run db:adicionar-especie -- db/scripts/especies/jambu.json --dry-run
 *
 * O arquivo é um objeto (ou um array deles) com os mesmos campos do formulário
 * "Adicionar espécie" mais a chave `fontes` — o mesmo formato de
 * `db/seed/especies.json`. Os campos passam pelo MESMO zod do formulário
 * (`lib/especie-schema.ts`), então `gbifId` e `inaturalistId` são conferidos ao
 * vivo contra as APIs antes de entrar no banco.
 *
 * A regra de ouro do projeto é verificada aqui: todo campo com valor precisa
 * declarar sua proveniência em `fontes`, ou o script recusa o arquivo. Um
 * número sem fonte é exatamente o que o catálogo não aceita.
 *
 * O que o arquivo não traz, o script tenta completar nas bases públicas, com a
 * proveniência de lá: `gbifId`/`inaturalistId` pelo nome científico, e
 * `habito`/`cicloDeVida` pela Flora e Funga do Brasil e pela USDA PLANTS —
 * a mesma trilha que uma proposta de espécie nova percorre.
 *
 * Idempotente: identifica a espécie pelo nome científico. Se já existir,
 * atualiza só os campos do arquivo e preserva a proveniência dos demais.
 */
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../index.ts";
import { species } from "../schema/index.ts";
import { gerarSlugUnico } from "../../lib/wiki.ts";
import {
  camposDaEspecieSchema,
  chaveDeFonte,
} from "../../lib/especie-schema.ts";
import { buscarGbifId, buscarINaturalistId } from "../../lib/links-externos.ts";
import {
  buscarHabitoECiclo,
  FONTE_DO_HABITO,
  FONTE_DO_CICLO,
} from "../../lib/tracos-externos.ts";

/** Vazio para efeito da regra de ouro: não é valor, é ausência de valor. */
function semValor(valor: unknown): boolean {
  if (valor === null || valor === undefined) return true;
  if (Array.isArray(valor)) return valor.length === 0;
  return valor === "";
}

/**
 * Recusa o arquivo se algum campo preenchido não declarar de onde veio.
 * Acusa o arquivo inteiro de uma vez: corrigir um erro por execução, num
 * script que faz chamada de rede a cada rodada, é tempo jogado fora.
 */
function conferirProveniencia(
  campos: Record<string, unknown>,
  fontes: Record<string, string>,
): string[] {
  return Object.entries(campos)
    .filter(([, valor]) => !semValor(valor))
    .map(([chave]) => chaveDeFonte(chave))
    .filter((chaveDaFonte) => !fontes[chaveDaFonte]);
}

async function completarDasBasesPublicas(
  campos: Record<string, unknown>,
  fontes: Record<string, string>,
) {
  const nomeCientifico = String(campos.nomeCientifico);

  if (semValor(campos.gbifId)) {
    const id = await buscarGbifId(nomeCientifico);
    if (id !== null) {
      campos.gbifId = id;
      fontes.gbif_id = "gbif";
    }
  }
  if (semValor(campos.inaturalistId)) {
    const id = await buscarINaturalistId(nomeCientifico);
    if (id !== null) {
      campos.inaturalistId = id;
      fontes.inaturalist_id = "inaturalist";
    }
  }

  const querHabito = semValor(campos.habito);
  const querCiclo = semValor(campos.cicloDeVida);
  if (!querHabito && !querCiclo) return;

  const { habito, cicloDeVida, ignorados } = await buscarHabitoECiclo({
    nomeCientifico,
    gbifId: typeof campos.gbifId === "number" ? campos.gbifId : null,
    querHabito,
    querCiclo,
  });

  if (querHabito && habito.length) {
    campos.habito = habito;
    fontes.habito = FONTE_DO_HABITO;
  }
  if (querCiclo && cicloDeVida.length) {
    campos.cicloDeVida = cicloDeVida;
    fontes.ciclo_de_vida = FONTE_DO_CICLO;
  }
  if (ignorados.length) {
    console.warn(
      `  formas de vida sem correspondência no enum (curadoria manual): ${ignorados.join(", ")}`,
    );
  }
}

async function gravar(
  campos: Record<string, unknown>,
  fontes: Record<string, string>,
) {
  const nomeCientifico = String(campos.nomeCientifico);
  const existente = await db.query.species.findFirst({
    where: eq(species.nomeCientifico, nomeCientifico),
  });

  if (existente) {
    await db
      .update(species)
      .set({
        ...(campos as Record<string, never>),
        // Só os campos do arquivo mudam de proveniência; o resto fica como está.
        fontes: { ...existente.fontes, ...fontes },
        atualizadoEm: new Date(),
      })
      .where(eq(species.id, existente.id));
    return { slug: existente.slug, novo: false };
  }

  const slug = await gerarSlugUnico(String(campos.nomeComum));
  await db.insert(species).values({
    ...(campos as Record<string, never>),
    slug,
    nomeComum: String(campos.nomeComum),
    nomeCientifico,
    fontes,
  });
  return { slug, novo: true };
}

async function main() {
  const argumentos = process.argv.slice(2);
  const simulacao = argumentos.includes("--dry-run");
  const arquivo = argumentos.find((a) => !a.startsWith("--"));

  if (!arquivo) {
    console.error(
      "Uso: npm run db:adicionar-especie -- <arquivo.json> [--dry-run]",
    );
    process.exit(1);
  }

  const bruto = JSON.parse(
    await readFile(path.resolve(process.cwd(), arquivo), "utf-8"),
  ) as unknown;
  const entradas = (Array.isArray(bruto) ? bruto : [bruto]) as Record<
    string,
    unknown
  >[];

  for (const entrada of entradas) {
    const { fontes: fontesDoArquivo, slug: _slug, ...resto } = entrada;
    const fontes = { ...((fontesDoArquivo ?? {}) as Record<string, string>) };

    // O mesmo zod do formulário: confere os enums e valida gbifId/inaturalistId
    // contra as APIs. Falhar aqui é falhar como o usuário falharia na tela.
    const campos = (await camposDaEspecieSchema.parseAsync(resto)) as Record<
      string,
      unknown
    >;

    if (semValor(campos.nomeComum) || semValor(campos.nomeCientifico)) {
      throw new Error("nomeComum e nomeCientifico são obrigatórios.");
    }

    console.log(`\n${campos.nomeComum} (${campos.nomeCientifico})`);
    await completarDasBasesPublicas(campos, fontes);

    const semFonte = conferirProveniencia(campos, fontes);
    if (semFonte.length) {
      throw new Error(
        `Campos preenchidos sem proveniência em "fontes": ${semFonte.join(", ")}.\n` +
          "Toda informação do catálogo declara de onde veio — se a fonte não informa, deixe o campo nulo.",
      );
    }

    if (simulacao) {
      console.log(JSON.stringify({ ...campos, fontes }, null, 2));
      continue;
    }

    const { slug, novo } = await gravar(campos, fontes);
    console.log(`  ${novo ? "cadastrada" : "atualizada"} em /safdex/${slug}`);
  }

  if (simulacao) console.log("\n--dry-run: nada foi gravado.");
  process.exit(0);
}

void main();
