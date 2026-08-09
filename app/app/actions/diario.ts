"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index.ts";
import {
  event,
  eventMedia,
  plantIndividual,
  planting,
  area,
  row,
} from "@/db/schema/index.ts";
import { requireViewer, AccessError } from "@/lib/access.ts";
import { podeEditarProjeto } from "@/lib/projetos.ts";
import { TIPOS_DE_EVENTO } from "@/core/diario.ts";
import { posicoesDaRegra, type RegraDePosicionamento } from "@/core/croqui.ts";

/** Ações do diário de campo. */

export interface Resultado<T = undefined> {
  ok: boolean;
  erro?: string;
  dados?: T;
}

function tratar(erro: unknown): Resultado<never> {
  if (erro instanceof AccessError) return { ok: false, erro: erro.message };
  console.error("Falha em ação do diário:", erro);
  return { ok: false, erro: "Não foi possível concluir. Tente de novo." };
}

async function garantirEdicao(projectId: string) {
  const viewer = await requireViewer();
  if (!(await podeEditarProjeto(projectId, viewer))) {
    throw new AccessError("Você não pode editar este projeto.");
  }
  return viewer;
}

const registrarSchema = z.object({
  projectId: z.string().uuid(),
  tipo: z.enum(TIPOS_DE_EVENTO),
  ocorridoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  quantidade: z.number().nonnegative().nullable().optional(),
  unidade: z.string().trim().max(40).nullable().optional(),
  notas: z.string().trim().max(4000).nullable().optional(),

  // Sujeito: nenhum = projeto inteiro.
  areaId: z.string().uuid().nullable().optional(),
  plantingId: z.string().uuid().nullable().optional(),
  /** Índice da muda dentro da regra de posicionamento; exige plantingId. */
  indiceDoIndividuo: z.number().int().nonnegative().nullable().optional(),

  mediaIds: z.array(z.string().uuid()).max(10).optional(),
});

/**
 * Registra um acontecimento no campo.
 *
 * Se o evento nomear uma muda específica, o indivíduo é materializado aqui —
 * e só aqui. Uma leira de 800 mudas segue como uma regra até que alguma delas
 * mereça história própria (docs/PLANO.md §3.3).
 */
export async function registrarEvento(
  entrada: unknown,
): Promise<Resultado<{ id: string }>> {
  try {
    const analise = registrarSchema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const dados = analise.data;

    const viewer = await garantirEdicao(dados.projectId);

    // O sujeito precisa pertencer ao projeto — sem isso, um id de outro
    // projeto entraria por aqui.
    if (dados.plantingId) {
      const alvo = await db.query.planting.findFirst({
        where: and(
          eq(planting.id, dados.plantingId),
          eq(planting.projectId, dados.projectId),
        ),
      });
      if (!alvo) return { ok: false, erro: "Plantio não encontrado." };
    }
    if (dados.areaId) {
      const alvo = await db.query.area.findFirst({
        where: and(
          eq(area.id, dados.areaId),
          eq(area.projectId, dados.projectId),
        ),
      });
      if (!alvo) return { ok: false, erro: "Área não encontrada." };
    }

    let individualId: string | null = null;
    if (
      dados.indiceDoIndividuo !== null &&
      dados.indiceDoIndividuo !== undefined
    ) {
      if (!dados.plantingId) {
        return {
          ok: false,
          erro: "Para registrar numa muda específica, escolha o plantio.",
        };
      }
      individualId = await materializarIndividuo(
        dados.plantingId,
        dados.indiceDoIndividuo,
      );
    }

    const [criado] = await db
      .insert(event)
      .values({
        projectId: dados.projectId,
        areaId: dados.areaId ?? null,
        plantingId: dados.plantingId ?? null,
        individualId,
        tipo: dados.tipo,
        ocorridoEm: dataDeIso(dados.ocorridoEm),
        quantidade: dados.quantidade ?? null,
        unidade: dados.unidade?.trim() || null,
        notas: dados.notas?.trim() || null,
        criadoPor: viewer.id,
      })
      .returning();

    if (dados.mediaIds?.length) {
      await db
        .insert(eventMedia)
        .values(
          dados.mediaIds.map((mediaId) => ({ eventId: criado!.id, mediaId })),
        );
    }

    // Um plantio registrado como implantado deixa de ser só planejado.
    if (
      dados.plantingId &&
      (dados.tipo === "plantio" || dados.tipo === "semeadura")
    ) {
      await db
        .update(planting)
        .set({ status: "plantado", atualizadoEm: new Date() })
        .where(eq(planting.id, dados.plantingId));
    }

    revalidatePath(`/projetos/${dados.projectId}`);
    return { ok: true, dados: { id: criado!.id } };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Cria (ou recupera) o registro de uma muda específica.
 *
 * A posição é derivada da regra de posicionamento no momento do registro e
 * congelada: se a linha for redesenhada depois, a planta que já tem história
 * não se move junto — ela existe no campo, não no desenho.
 *
 * A restrição única (plantingId, indice) garante que dois registros
 * simultâneos não criem duas plantas para a mesma posição.
 */
async function materializarIndividuo(
  plantingId: string,
  indice: number,
): Promise<string> {
  const existente = await db.query.plantIndividual.findFirst({
    where: and(
      eq(plantIndividual.plantingId, plantingId),
      eq(plantIndividual.indice, indice),
    ),
  });
  if (existente) return existente.id;

  const registro = await db.query.planting.findFirst({
    where: eq(planting.id, plantingId),
  });

  let posicao = null;
  const regra = registro?.placement as RegraDePosicionamento | null;

  if (regra?.tipo === "linha") {
    const linha = await db.query.row.findFirst({
      where: eq(row.id, regra.rowId),
    });
    if (linha) {
      posicao = posicoesDaRegra(regra, linha.pathLocal)[indice] ?? null;
    }
  }

  const [criado] = await db
    .insert(plantIndividual)
    .values({ plantingId, indice, positionLocal: posicao })
    .onConflictDoNothing()
    .returning();

  if (criado) return criado.id;

  // Perdemos a corrida para outra requisição; a planta já existe.
  const agoraExistente = await db.query.plantIndividual.findFirst({
    where: and(
      eq(plantIndividual.plantingId, plantingId),
      eq(plantIndividual.indice, indice),
    ),
  });
  if (!agoraExistente) throw new Error("Falha ao materializar o indivíduo.");
  return agoraExistente.id;
}

export async function removerEvento(
  id: string,
  projectId: string,
): Promise<Resultado> {
  try {
    await garantirEdicao(projectId);

    await db
      .delete(event)
      .where(and(eq(event.id, id), eq(event.projectId, projectId)));

    revalidatePath(`/projetos/${projectId}`);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/** Interpreta AAAA-MM-DD como data local — ver comentário em actions/projetos.ts. */
function dataDeIso(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano!, mes! - 1, dia!);
}
