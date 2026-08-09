"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { species, changeProposal, notification } from "@/db/schema/index.ts";
import { requireViewer, requireModerator, AccessError } from "@/lib/access.ts";
import {
  propostaDeEdicaoSchema,
  propostaDeNovaEspecieSchema,
  calcularPatch,
} from "@/lib/especie-schema.ts";
import { aplicarPropostaAprovada } from "@/lib/aplicar-proposta.ts";

/**
 * Ações da wiki.
 *
 * O catálogo nunca é escrito direto por um usuário comum: `propor*` só cria
 * proposta, e `aprovarProposta` é a única porta que altera `species`.
 */

export interface Resultado {
  ok: boolean;
  erro?: string;
  mensagem?: string;
}

function tratar(erro: unknown): Resultado {
  if (erro instanceof AccessError) return { ok: false, erro: erro.message };
  console.error("Falha em ação da wiki:", erro);
  return { ok: false, erro: "Não foi possível concluir. Tente de novo." };
}

/** Cria uma proposta de edição sobre uma espécie existente. */
export async function proporEdicao(entrada: unknown): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    const analise = propostaDeEdicaoSchema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: primeiroErro(analise.error) };
    }
    const { slug, patch: propostos, fonte, justificativa } = analise.data;

    const especie = await db.query.species.findFirst({
      where: eq(species.slug, slug),
    });
    if (!especie) return { ok: false, erro: "Espécie não encontrada." };

    // Só o que de fato muda entra na proposta — ver calcularPatch().
    const patch = calcularPatch(
      especie as unknown as Record<string, unknown>,
      propostos,
    );

    if (Object.keys(patch).length === 0) {
      return { ok: false, erro: "Nenhum campo foi alterado." };
    }

    await db.insert(changeProposal).values({
      tipo: "edicao",
      speciesId: especie.id,
      patch,
      fonte,
      justificativa,
      autorId: viewer.id,
    });

    revalidatePath("/moderacao");
    revalidatePath("/sugestoes");

    return {
      ok: true,
      mensagem: `Sugestão enviada com ${Object.keys(patch).length} alteração(ões). Um moderador vai avaliar.`,
    };
  } catch (erro) {
    return tratar(erro);
  }
}

/** Cria uma proposta de espécie nova. Nada é gravado em `species` ainda. */
export async function proporNovaEspecie(entrada: unknown): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    const analise = propostaDeNovaEspecieSchema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: primeiroErro(analise.error) };
    }
    const { campos, fonte, justificativa } = analise.data;

    await db.insert(changeProposal).values({
      tipo: "nova_especie",
      speciesId: null,
      patch: campos,
      fonte,
      justificativa,
      autorId: viewer.id,
    });

    revalidatePath("/moderacao");
    revalidatePath("/sugestoes");

    return {
      ok: true,
      mensagem: "Espécie proposta. Um moderador vai avaliar antes de publicar.",
    };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Aprova uma proposta: aplica o patch, marca a proveniência dos campos tocados
 * como `comunidade`, grava a revisão e avisa o autor. Tudo numa transação — uma
 * espécie alterada sem revisão correspondente seria um dado sem rastro.
 */
export async function aprovarProposta(
  id: string,
  nota?: string,
): Promise<Resultado> {
  try {
    const revisor = await requireModerator();
    const resultado = await aplicarPropostaAprovada(id, revisor.id, nota);

    if (!resultado.ok) return { ok: false, erro: resultado.erro };

    revalidatePath("/moderacao");
    revalidatePath("/catalogo");
    revalidatePath(`/catalogo/${resultado.slug}`);

    return { ok: true, mensagem: "Proposta aprovada e publicada." };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function rejeitarProposta(
  id: string,
  nota: string,
): Promise<Resultado> {
  try {
    const revisor = await requireModerator();

    if (!nota?.trim()) {
      // Rejeitar sem explicar desperdiça o trabalho de quem contribuiu e não
      // ensina nada a quem vier depois.
      return { ok: false, erro: "Explique o motivo da rejeição." };
    }

    const proposta = await db.query.changeProposal.findFirst({
      where: eq(changeProposal.id, id),
    });
    if (!proposta) return { ok: false, erro: "Proposta não encontrada." };
    if (proposta.status !== "pendente") {
      return { ok: false, erro: "Esta proposta já foi avaliada." };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(changeProposal)
        .set({
          status: "rejeitada",
          revisorId: revisor.id,
          notaDaRevisao: nota.trim(),
          revisadoEm: new Date(),
        })
        .where(eq(changeProposal.id, id));

      await tx.insert(notification).values({
        userId: proposta.autorId,
        titulo: "Sua sugestão não foi aceita",
        corpo: nota.trim(),
        link: "/sugestoes",
      });
    });

    revalidatePath("/moderacao");
    revalidatePath("/sugestoes");

    return { ok: true, mensagem: "Proposta rejeitada." };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Chamada direto de um `<form action>`, então não devolve nada: o React exige
 * que a action de formulário resolva para void.
 */
export async function marcarNotificacoesComoLidas(): Promise<void> {
  try {
    const viewer = await requireViewer();
    await db
      .update(notification)
      .set({ lidaEm: new Date() })
      .where(eq(notification.userId, viewer.id));

    revalidatePath("/notificacoes");
    revalidatePath("/", "layout");
  } catch (erro) {
    // Falhar aqui não deve derrubar a página: o pior caso é o contador
    // continuar mostrando não lidas.
    console.error("Falha ao marcar notificações como lidas:", erro);
  }
}

function primeiroErro(erro: { issues: { message: string }[] }): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}
