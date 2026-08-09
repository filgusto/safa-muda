import { eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  species,
  changeProposal,
  speciesRevision,
  notification,
} from "@/db/schema/index.ts";
import { gerarSlugUnico } from "./wiki.ts";

/**
 * Aplicação de uma proposta aprovada.
 *
 * Separado da server action de propósito: aqui não há sessão nem `headers()`,
 * só a operação. A action cuida da autorização e chama isto — o que também
 * torna a parte delicada (patch + proveniência + revisão) testável sem
 * simular uma requisição.
 */

export type ResultadoDaAplicacao =
  { ok: true; slug: string } | { ok: false; erro: string };

export async function aplicarPropostaAprovada(
  propostaId: string,
  revisorId: string,
  nota?: string,
): Promise<ResultadoDaAplicacao> {
  return db.transaction(async (tx): Promise<ResultadoDaAplicacao> => {
    const proposta = await tx.query.changeProposal.findFirst({
      where: eq(changeProposal.id, propostaId),
    });
    if (!proposta) return { ok: false, erro: "Proposta não encontrada." };
    if (proposta.status !== "pendente") {
      return { ok: false, erro: "Esta proposta já foi avaliada." };
    }

    const patch = proposta.patch as Record<string, unknown>;
    let speciesId = proposta.speciesId;
    let slug: string;

    if (proposta.tipo === "nova_especie") {
      const nomeComum = String(patch.nomeComum);
      slug = await gerarSlugUnico(nomeComum);

      const [criada] = await tx
        .insert(species)
        .values({
          ...(patch as Record<string, never>),
          slug,
          nomeComum,
          nomeCientifico: String(patch.nomeCientifico),
          fontes: proveniencia(patch),
          criadoPor: proposta.autorId,
        })
        .returning();

      speciesId = criada!.id;
    } else {
      const atual = await tx.query.species.findFirst({
        where: eq(species.id, proposta.speciesId!),
      });
      if (!atual) return { ok: false, erro: "Espécie não existe mais." };
      slug = atual.slug;

      await tx
        .update(species)
        .set({
          ...(patch as Record<string, never>),
          // Preserva a proveniência dos campos não tocados; só os do patch
          // passam a ser atribuídos à comunidade.
          fontes: { ...atual.fontes, ...proveniencia(patch) },
          atualizadoEm: new Date(),
        })
        .where(eq(species.id, atual.id));
    }

    const depois = await tx.query.species.findFirst({
      where: eq(species.id, speciesId!),
    });

    await tx.insert(speciesRevision).values({
      speciesId: speciesId!,
      proposalId: proposta.id,
      patch,
      snapshot: depois as unknown as Record<string, unknown>,
      fonte: proposta.fonte,
      autorId: proposta.autorId,
      revisorId,
    });

    await tx
      .update(changeProposal)
      .set({
        status: "aprovada",
        revisorId,
        notaDaRevisao: nota,
        revisadoEm: new Date(),
      })
      .where(eq(changeProposal.id, proposta.id));

    await tx.insert(notification).values({
      userId: proposta.autorId,
      titulo: "Sua sugestão foi aprovada",
      corpo: nota ?? null,
      link: `/catalogo/${slug}`,
    });

    return { ok: true, slug };
  });
}

/** Todo campo tocado por uma proposta passa a ter proveniência `comunidade`. */
export function proveniencia(
  patch: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    Object.keys(patch).map((chave) => [chaveDeFonte(chave), "comunidade"]),
  );
}

/**
 * As chaves de `fontes` seguem os nomes das COLUNAS (snake_case), herdados do
 * dataset original, enquanto os campos do schema são camelCase.
 * `nomeCientifico` → `nome_cientifico`, `espacamentoNaLinhaMinM` →
 * `espacamento_na_linha_min_m`.
 */
export function chaveDeFonte(chave: string): string {
  return chave.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
}
