import { asc, eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { species, speciesRevision } from "@/db/schema/index.ts";
import { desfazerRevisao } from "@/core/procedencia.ts";
import { chaveDeFonte } from "@/lib/especie-schema.ts";

/**
 * Exclusão de uma contribuição aprovada, feita pela moderação.
 *
 * Separada da server action, como `aplicarPropostaAprovada`: aqui não há
 * sessão, só a operação. Devolve cada campo ao que era antes da contribuição
 * (valor e fonte) e apaga a revisão — o que tira o autor da seção Fontes e do
 * histórico do perfil, já que ambos são lidos das revisões.
 */
export type ResultadoDaExclusao =
  { ok: true; slug: string } | { ok: false; erro: string };

export async function excluirContribuicao(
  revisaoId: string,
): Promise<ResultadoDaExclusao> {
  return db.transaction(async (tx): Promise<ResultadoDaExclusao> => {
    const alvo = await tx.query.speciesRevision.findFirst({
      where: eq(speciesRevision.id, revisaoId),
      columns: { speciesId: true },
    });
    if (!alvo) return { ok: false, erro: "Contribuição não encontrada." };

    // Trava a espécie: duas exclusões (ou uma aprovação) simultâneas na mesma
    // ficha recalculariam o "antes" sobre um estado que já mudou.
    const [atual] = await tx
      .select()
      .from(species)
      .where(eq(species.id, alvo.speciesId))
      .for("update");
    if (!atual) return { ok: false, erro: "Espécie não existe mais." };

    const revisoes = await tx
      .select({
        id: speciesRevision.id,
        patch: speciesRevision.patch,
        antes: speciesRevision.antes,
      })
      .from(speciesRevision)
      .where(eq(speciesRevision.speciesId, alvo.speciesId))
      .orderBy(asc(speciesRevision.criadoEm));

    const desfeita = desfazerRevisao(revisoes, revisaoId);
    if (!desfeita.ok) return desfeita;

    const { restaurar, reancorar } = desfeita;
    const campos = Object.keys(restaurar.valores);

    if (campos.length > 0) {
      const fontes = { ...atual.fontes };
      for (const campo of campos) {
        const fonte = restaurar.fontes[campo];
        if (fonte) fontes[chaveDeFonte(campo)] = fonte;
        else delete fontes[chaveDeFonte(campo)];
      }

      await tx
        .update(species)
        .set({
          ...(restaurar.valores as Record<string, never>),
          fontes,
          atualizadoEm: new Date(),
        })
        .where(eq(species.id, atual.id));
    }

    for (const { id, antes } of reancorar) {
      await tx
        .update(speciesRevision)
        .set({ antes })
        .where(eq(speciesRevision.id, id));
    }

    await tx.delete(speciesRevision).where(eq(speciesRevision.id, revisaoId));

    return { ok: true, slug: atual.slug };
  });
}
