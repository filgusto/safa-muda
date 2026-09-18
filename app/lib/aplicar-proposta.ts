import { eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  species,
  changeProposal,
  speciesRevision,
  notification,
} from "@/db/schema/index.ts";
import { gerarSlugUnico } from "./wiki.ts";
import {
  CHAVE_FONTES_AUTOMATICAS,
  CHAVE_GRUPOS_PROPOSTOS,
  chaveDeFonte,
} from "./especie-schema.ts";

// Mora em especie-schema.ts para o cliente (Diff) poder usar sem puxar o banco.
export { chaveDeFonte };

/**
 * Aplicação de uma proposta aprovada.
 *
 * Separado da server action de propósito: aqui não há sessão nem `headers()`,
 * só a operação. A action cuida da autorização e chama isto — o que também
 * torna a parte delicada (patch + proveniência + revisão) testável sem
 * simular uma requisição.
 */

export type ResultadoDaAplicacao =
  | { ok: true; slug: string; nomeDaEspecie: string; autorId: string }
  | { ok: false; erro: string };

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

    const original = proposta.patch as Record<string, unknown>;
    const patch = camposAplicaveis(original);
    const fontesDoPatch = provenienciaDaProposta(original);
    let speciesId = proposta.speciesId;
    let slug: string;
    let nomeDaEspecie: string;

    if (proposta.tipo === "nova_especie") {
      const nomeComum = String(patch.nomeComum);
      slug = await gerarSlugUnico(nomeComum);
      nomeDaEspecie = nomeComum;

      const [criada] = await tx
        .insert(species)
        .values({
          ...(patch as Record<string, never>),
          slug,
          nomeComum,
          nomeCientifico: String(patch.nomeCientifico),
          fontes: fontesDoPatch,
          criadoPor: proposta.autorId,
        })
        .returning();

      speciesId = criada!.id;
    } else if (Object.keys(patch).length === 0) {
      // Só propunha grupo novo: nada a gravar na espécie nem a registrar no
      // histórico dela, mas a proposta ainda é encerrada e o autor, avisado.
      const atual = await tx.query.species.findFirst({
        where: eq(species.id, proposta.speciesId!),
      });
      if (!atual) return { ok: false, erro: "Espécie não existe mais." };
      slug = atual.slug;
      nomeDaEspecie = atual.nomeComum;
    } else {
      const atual = await tx.query.species.findFirst({
        where: eq(species.id, proposta.speciesId!),
      });
      if (!atual) return { ok: false, erro: "Espécie não existe mais." };
      slug = atual.slug;
      // O nome pode ser justamente o que a proposta muda: o aviso usa o novo.
      nomeDaEspecie =
        typeof patch.nomeComum === "string" ? patch.nomeComum : atual.nomeComum;

      await tx
        .update(species)
        .set({
          ...(patch as Record<string, never>),
          // Preserva a proveniência dos campos não tocados; só os do patch
          // passam a ser atribuídos à comunidade (ou à base de onde vieram).
          fontes: { ...atual.fontes, ...fontesDoPatch },
          atualizadoEm: new Date(),
        })
        .where(eq(species.id, atual.id));
    }

    if (Object.keys(patch).length > 0) {
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
    }

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
      link: `/safdex/${slug}`,
    });

    return { ok: true, slug, nomeDaEspecie, autorId: proposta.autorId };
  });
}

/**
 * O patch sem o que não é coluna de `species` — os grupos novos sugeridos, que
 * dependem de código para existir, e a proveniência dos campos completados
 * automaticamente.
 */
export function camposAplicaveis(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(patch).filter(
      ([chave]) =>
        chave !== CHAVE_GRUPOS_PROPOSTOS && chave !== CHAVE_FONTES_AUTOMATICAS,
    ),
  );
}

/**
 * Proveniência de uma proposta inteira: `comunidade` para o que a pessoa
 * preencheu, e a base de origem para o que o servidor completou sozinho
 * (CHAVE_FONTES_AUTOMATICAS) — só para campo que de fato está no patch.
 */
export function provenienciaDaProposta(
  patch: Record<string, unknown>,
): Record<string, string> {
  const campos = camposAplicaveis(patch);
  const doPatch = proveniencia(campos);
  const automaticas = patch[CHAVE_FONTES_AUTOMATICAS];
  if (!automaticas || typeof automaticas !== "object") return doPatch;

  for (const [chave, fonte] of Object.entries(automaticas)) {
    if (chave in doPatch && typeof fonte === "string") doPatch[chave] = fonte;
  }
  return doPatch;
}

/** Todo campo tocado por uma proposta passa a ter proveniência `comunidade`. */
export function proveniencia(
  patch: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    Object.keys(patch).map((chave) => [chaveDeFonte(chave), "comunidade"]),
  );
}
