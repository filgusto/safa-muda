"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index.ts";
import { species, changeProposal, notification } from "@/db/schema/index.ts";
import { requireViewer, requireModerator, AccessError } from "@/lib/access.ts";
import {
  propostaDeEdicaoSchema,
  propostaDeNovaEspecieSchema,
  calcularPatch,
  CHAVE_FONTES_AUTOMATICAS,
} from "@/lib/especie-schema.ts";
import {
  aplicarPropostaAprovada,
  chaveDeFonte,
} from "@/lib/aplicar-proposta.ts";
import { avisarAvaliacao } from "@/lib/aviso-de-avaliacao.ts";
import { listarRevisoesDaEspecie } from "@/lib/wiki.ts";
import { buscarGbifId, buscarINaturalistId } from "@/lib/links-externos.ts";
import {
  buscarHabitoECiclo,
  FONTE_DO_CICLO,
  FONTE_DO_HABITO,
} from "@/lib/tracos-externos.ts";

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

export type Revisao = Awaited<
  ReturnType<typeof listarRevisoesDaEspecie>
>[number];

/**
 * Histórico de uma espécie, para a equipe.
 *
 * Vem por ação, e não junto da ficha, porque a ficha é ISR: o HTML é gerado
 * uma vez e servido a todo mundo, então tudo o que entrasse nas props ficaria
 * legível no código-fonte da página, escondido ou não. Aqui a sessão é lida a
 * cada chamada, e quem não modera não recebe nada.
 */
export async function listarHistorico(
  speciesId: string,
): Promise<{ ok: true; revisoes: Revisao[] } | { ok: false; erro: string }> {
  try {
    await requireModerator();
    return { ok: true, revisoes: await listarRevisoesDaEspecie(speciesId) };
  } catch (erro) {
    const tratado = tratar(erro);
    return { ok: false, erro: tratado.erro ?? "Não foi possível carregar." };
  }
}

/** Cria uma proposta de edição sobre uma espécie existente. */
export async function proporEdicao(entrada: unknown): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    const analise = await propostaDeEdicaoSchema.safeParseAsync(entrada);
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

    return {
      ok: true,
      mensagem: `Sugestão enviada com ${Object.keys(patch).length} alteração(ões). Um moderador vai avaliar.`,
    };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Valida uma alteração do modo de edição sem gravar nada.
 *
 * No modo de edição, as alterações se acumulam num rascunho e só vão juntas em
 * "Salvar e enviar". Validar ao aplicar cada campo mostra o erro ao lado dele
 * — um link do GBIF que não existe, por exemplo — e não num envio em lote em
 * que já não se sabe de qual campo veio.
 */
export async function validarEdicao(entrada: unknown): Promise<Resultado> {
  try {
    await requireViewer();

    const analise = await propostaDeEdicaoSchema.safeParseAsync(entrada);
    if (!analise.success) {
      return { ok: false, erro: primeiroErro(analise.error) };
    }
    const { slug, patch: propostos } = analise.data;

    const especie = await db.query.species.findFirst({
      where: eq(species.slug, slug),
    });
    if (!especie) return { ok: false, erro: "Espécie não encontrada." };

    const patch = calcularPatch(
      especie as unknown as Record<string, unknown>,
      propostos,
    );
    if (Object.keys(patch).length === 0) {
      return { ok: false, erro: "Nada mudou em relação ao valor atual." };
    }
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

const loteDeEdicoesSchema = z.object({
  slug: z.string().min(1),
  propostas: z.array(z.unknown()).min(1).max(50),
});

/**
 * Envia de uma vez as alterações acumuladas no modo de edição.
 *
 * Chegam agrupadas por fonte — uma proposta por fonte, porque a moderação
 * confere cada proposta contra a fonte que ela declara. Ou entram todas, ou
 * nenhuma: validação primeiro, gravação numa transação só.
 */
export async function proporEdicoesEmLote(
  entrada: unknown,
): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    const lote = loteDeEdicoesSchema.safeParse(entrada);
    if (!lote.success) return { ok: false, erro: "Dados inválidos." };
    const { slug, propostas } = lote.data;

    const especie = await db.query.species.findFirst({
      where: eq(species.slug, slug),
    });
    if (!especie) return { ok: false, erro: "Espécie não encontrada." };

    const linhas: (typeof changeProposal.$inferInsert)[] = [];
    for (const proposta of propostas) {
      const analise = await propostaDeEdicaoSchema.safeParseAsync({
        ...(proposta as object),
        slug,
      });
      if (!analise.success) {
        return { ok: false, erro: primeiroErro(analise.error) };
      }
      const { patch: propostos, fonte, justificativa } = analise.data;

      const patch = calcularPatch(
        especie as unknown as Record<string, unknown>,
        propostos,
      );
      if (Object.keys(patch).length === 0) continue;

      linhas.push({
        tipo: "edicao",
        speciesId: especie.id,
        patch,
        fonte,
        justificativa,
        autorId: viewer.id,
      });
    }

    if (linhas.length === 0) {
      return { ok: false, erro: "Nenhum campo foi alterado." };
    }

    await db.insert(changeProposal).values(linhas);

    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/** Cria uma proposta de espécie nova. Nada é gravado em `species` ainda. */
export async function proporNovaEspecie(entrada: unknown): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    const analise = await propostaDeNovaEspecieSchema.safeParseAsync(entrada);
    if (!analise.success) {
      return { ok: false, erro: primeiroErro(analise.error) };
    }
    const { campos, fonte, justificativa } = analise.data;

    const [proposta] = await db
      .insert(changeProposal)
      .values({
        tipo: "nova_especie",
        speciesId: null,
        patch: campos,
        fonte,
        justificativa,
        autorId: viewer.id,
      })
      .returning({ id: changeProposal.id });

    // Sem esperar: a submissão responde na hora, e a busca nas bases
    // externas acontece depois, em segundo plano.
    void enriquecerPropostaComBasesExternas(proposta!.id, campos).catch(
      (erro) =>
        console.error(
          "Falha ao enriquecer a proposta com bases externas:",
          erro,
        ),
    );

    return {
      ok: true,
      mensagem: "Espécie proposta. Um moderador vai avaliar antes de publicar.",
    };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Completa uma proposta de espécie nova com o que as bases públicas trazem,
 * só nos campos que a pessoa deixou em branco — nunca sobrescreve o que ela
 * mesma informou:
 *
 * - links: GBIF e iNaturalist, pelo nome científico (lib/links-externos.ts);
 * - hábito, da Flora e Funga do Brasil (pelo `gbifId`, o informado ou o
 *   achado agora), e ciclo de vida, da USDA PLANTS (lib/tracos-externos.ts).
 *
 * A proveniência de cada campo completado vai junto, em
 * CHAVE_FONTES_AUTOMATICAS, para que a aprovação a grave em vez de
 * `comunidade`. Só grava se a proposta ainda estiver pendente: aprovada ou
 * rejeitada nesse meio-tempo (moderação é rápida às vezes), não há mais o que
 * completar.
 */
async function enriquecerPropostaComBasesExternas(
  propostaId: string,
  campos: {
    nomeCientifico?: string;
    gbifId?: number | null;
    inaturalistId?: number | null;
    habito?: readonly string[];
    cicloDeVida?: readonly string[];
  },
): Promise<void> {
  const { nomeCientifico } = campos;
  if (!nomeCientifico) return;

  const [gbifId, inaturalistId] = await Promise.all([
    campos.gbifId == null
      ? buscarGbifId(nomeCientifico)
      : Promise.resolve(null),
    campos.inaturalistId == null
      ? buscarINaturalistId(nomeCientifico)
      : Promise.resolve(null),
  ]);

  const { habito, cicloDeVida } = await buscarHabitoECiclo({
    nomeCientifico,
    gbifId: campos.gbifId ?? gbifId,
    querHabito: !campos.habito?.length,
    querCiclo: !campos.cicloDeVida?.length,
  });

  const completados: Record<string, unknown> = {};
  const fontes: Record<string, string> = {};
  if (gbifId !== null) {
    completados.gbifId = gbifId;
    fontes[chaveDeFonte("gbifId")] = "gbif";
  }
  if (inaturalistId !== null) {
    completados.inaturalistId = inaturalistId;
    fontes[chaveDeFonte("inaturalistId")] = "inaturalist";
  }
  if (habito.length) {
    completados.habito = habito;
    fontes[chaveDeFonte("habito")] = FONTE_DO_HABITO;
  }
  if (cicloDeVida.length) {
    completados.cicloDeVida = cicloDeVida;
    fontes[chaveDeFonte("cicloDeVida")] = FONTE_DO_CICLO;
  }
  if (Object.keys(completados).length === 0) return;

  const proposta = await db.query.changeProposal.findFirst({
    where: eq(changeProposal.id, propostaId),
  });
  if (!proposta || proposta.status !== "pendente") return;

  const patch = {
    ...(proposta.patch as Record<string, unknown>),
    ...completados,
    [CHAVE_FONTES_AUTOMATICAS]: fontes,
  };

  await db
    .update(changeProposal)
    .set({ patch })
    .where(
      and(
        eq(changeProposal.id, propostaId),
        eq(changeProposal.status, "pendente"),
      ),
    );
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

    revalidatePath("/safdex");
    revalidatePath(`/safdex/${resultado.slug}`);

    await avisarAvaliacao({
      autorId: resultado.autorId,
      aprovada: true,
      oQue: sujeitoDoAviso(resultado.tipo),
      nomeDaEspecie: resultado.nomeDaEspecie,
      slug: resultado.slug,
      nota,
    });

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
      });
    });

    // Proposta de espécie nova rejeitada não tem ficha para onde apontar, e a
    // espécie de uma edição pode ter sumido nesse meio-tempo. O aviso sai nos
    // dois casos — sem ele, quem escreveu uma ficha inteira nunca saberia que
    // foi recusada, porque a notificação interna ainda não tem tela.
    const especie = proposta.speciesId
      ? await db.query.species.findFirst({
          where: eq(species.id, proposta.speciesId),
        })
      : null;

    await avisarAvaliacao({
      autorId: proposta.autorId,
      aprovada: false,
      oQue: sujeitoDoAviso(proposta.tipo),
      nomeDaEspecie: especie?.nomeComum ?? nomeProposto(proposta.patch),
      slug: especie?.slug,
      nota: nota.trim(),
    });

    return { ok: true, mensagem: "Proposta rejeitada." };
  } catch (erro) {
    return tratar(erro);
  }
}

/** Sujeito da frase do e-mail de avaliação. */
function sujeitoDoAviso(tipo: "edicao" | "nova_especie"): string {
  return tipo === "nova_especie"
    ? "Sua proposta de espécie nova"
    : "Sua sugestão de alteração";
}

/** Nome da espécie proposta, para o aviso de uma ficha que nunca existiu. */
function nomeProposto(patch: Record<string, unknown>): string {
  const nome = patch.nomeComum;
  return typeof nome === "string" && nome.trim() ? nome : "a espécie proposta";
}

function primeiroErro(erro: { issues: { message: string }[] }): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}
