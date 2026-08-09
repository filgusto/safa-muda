/**
 * Seed do catálogo a partir de `especies.json`.
 *
 * O JSON é gerado por `scripts/dataset/montar-dataset.py` e está commitado de
 * propósito: assim o dataset é revisável em PR, e não um efeito colateral de
 * rodar um script sobre um PDF.
 *
 * Idempotente: reexecutar atualiza os campos vindos das fontes bibliográficas
 * sem tocar no que a comunidade tiver acrescentado pela wiki (altura, bioma,
 * longevidade), nem apagar espécies cadastradas por usuários.
 */
import { sql } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../index.ts";
import { species } from "../schema/index.ts";
import type { NovaSpecies } from "../schema/species.ts";

type EspecieDoArquivo = Omit<NovaSpecies, "fontes"> & {
  fontes: Record<string, string>;
};

export async function semearEspecies(): Promise<number> {
  const caminho = path.join(process.cwd(), "db", "seed", "especies.json");
  const especies = JSON.parse(
    await readFile(caminho, "utf-8"),
  ) as EspecieDoArquivo[];

  if (especies.length === 0) {
    throw new Error(
      "especies.json está vazio. Rode: python3 scripts/dataset/montar-dataset.py",
    );
  }

  // Em lotes: 442 linhas num único INSERT estoura o limite de parâmetros
  // do Postgres (65535), já que cada espécie leva ~20 colunas.
  const TAMANHO_DO_LOTE = 100;

  for (let inicio = 0; inicio < especies.length; inicio += TAMANHO_DO_LOTE) {
    const lote = especies.slice(inicio, inicio + TAMANHO_DO_LOTE);

    await db
      .insert(species)
      .values(lote)
      .onConflictDoUpdate({
        target: species.slug,
        set: {
          nomeComum: sql`excluded.nome_comum`,
          nomeCientifico: sql`excluded.nome_cientifico`,
          familia: sql`excluded.familia`,
          sinonimos: sql`excluded.sinonimos`,
          estrato: sql`excluded.estrato`,
          sucessao: sql`excluded.sucessao`,
          sistema: sql`excluded.sistema`,
          grupos: sql`excluded.grupos`,
          diasParaColherMin: sql`excluded.dias_para_colher_min`,
          diasParaColherMax: sql`excluded.dias_para_colher_max`,
          espacamentoEntreLinhasMinM: sql`excluded.espacamento_entre_linhas_min_m`,
          espacamentoEntreLinhasMaxM: sql`excluded.espacamento_entre_linhas_max_m`,
          espacamentoNaLinhaMinM: sql`excluded.espacamento_na_linha_min_m`,
          espacamentoNaLinhaMaxM: sql`excluded.espacamento_na_linha_max_m`,
          notas: sql`excluded.notas`,
          fontes: sql`excluded.fontes`,
          atualizadoEm: sql`now()`,
        },
      });
  }

  return especies.length;
}
