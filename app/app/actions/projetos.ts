"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index.ts";
import { project, planting, species } from "@/db/schema/index.ts";
import { requireViewer, AccessError } from "@/lib/access.ts";
import { podeEditarProjeto } from "@/lib/projetos.ts";
import { ESTRATOS } from "@/core/estratos.ts";
import {
  normalizarIntervalo,
  duracaoSugeridaMeses,
} from "@/core/planejamento.ts";

/**
 * Ações de projeto e de plantio.
 *
 * Toda ação que altera o desenho passa por `garantirEdicao`: a permissão é
 * verificada no servidor, nunca só na interface.
 */

export interface Resultado<T = undefined> {
  ok: boolean;
  erro?: string;
  dados?: T;
}

function tratar(erro: unknown): Resultado<never> {
  if (erro instanceof AccessError) return { ok: false, erro: erro.message };
  console.error("Falha em ação de projeto:", erro);
  return { ok: false, erro: "Não foi possível concluir. Tente de novo." };
}

async function garantirEdicao(projectId: string) {
  const viewer = await requireViewer();
  if (!(await podeEditarProjeto(projectId, viewer))) {
    throw new AccessError("Você não pode editar este projeto.");
  }
  return viewer;
}

// ── Projeto ──────────────────────────────────────────────────────────────────

const projetoSchema = z.object({
  nome: z.string().trim().min(2, "Dê um nome ao projeto.").max(120),
  descricao: z.string().trim().max(2000).optional(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  horizonteAnos: z.number().int().min(1).max(60),
});

export async function criarProjeto(
  entrada: unknown,
): Promise<Resultado<{ id: string }>> {
  try {
    const viewer = await requireViewer();

    const analise = projetoSchema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { nome, descricao, dataInicio, horizonteAnos } = analise.data;

    const [criado] = await db
      .insert(project)
      .values({
        nome,
        descricao,
        dataInicio: dataDeIso(dataInicio),
        horizonteMeses: horizonteAnos * 12,
        ownerId: viewer.id,
      })
      .returning();

    revalidatePath("/projetos");
    return { ok: true, dados: { id: criado!.id } };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function atualizarProjeto(
  id: string,
  entrada: unknown,
): Promise<Resultado> {
  try {
    await garantirEdicao(id);

    const analise = projetoSchema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { nome, descricao, dataInicio, horizonteAnos } = analise.data;

    await db
      .update(project)
      .set({
        nome,
        descricao,
        dataInicio: dataDeIso(dataInicio),
        horizonteMeses: horizonteAnos * 12,
        atualizadoEm: new Date(),
      })
      .where(eq(project.id, id));

    revalidatePath(`/projetos/${id}`);
    revalidatePath("/projetos");
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function removerProjeto(id: string): Promise<Resultado> {
  try {
    const viewer = await requireViewer();
    const projeto = await db.query.project.findFirst({
      where: eq(project.id, id),
    });

    // Só o dono apaga: um editor pode alterar o desenho, não destruí-lo.
    if (!projeto || projeto.ownerId !== viewer.id) {
      throw new AccessError("Apenas o dono pode remover o projeto.");
    }

    await db.delete(project).where(eq(project.id, id));
    revalidatePath("/projetos");
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

// ── Plantio ──────────────────────────────────────────────────────────────────

const criarPlantioSchema = z.object({
  projectId: z.string().uuid(),
  speciesId: z.string().uuid(),
  estrato: z.enum(ESTRATOS),
  mesInicio: z.number().int(),
  /** Ausente quando a interface quer a duração sugerida pelo ciclo da espécie. */
  mesFim: z.number().int().optional(),
});

export async function criarPlantio(
  entrada: unknown,
): Promise<Resultado<{ id: string }>> {
  try {
    const analise = criarPlantioSchema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { projectId, speciesId, estrato, mesInicio } = analise.data;

    await garantirEdicao(projectId);

    const [projeto, especie] = await Promise.all([
      db.query.project.findFirst({ where: eq(project.id, projectId) }),
      db.query.species.findFirst({ where: eq(species.id, speciesId) }),
    ]);
    if (!projeto) return { ok: false, erro: "Projeto não encontrado." };
    if (!especie) return { ok: false, erro: "Espécie não encontrada." };

    const mesFim =
      analise.data.mesFim ??
      mesInicio +
        duracaoSugeridaMeses({
          diasParaColherMax: especie.diasParaColherMax,
          estrato,
        });

    const intervalo = normalizarIntervalo(
      { mesInicio, mesFim },
      projeto.horizonteMeses,
    );

    const [criado] = await db
      .insert(planting)
      .values({
        projectId,
        speciesId,
        estrato,
        // Marca a divergência quando a espécie tem estrato e ele é outro.
        estratoForcado: especie.estrato !== null && especie.estrato !== estrato,
        mesInicio: intervalo.mesInicio,
        mesFim: intervalo.mesFim,
      })
      .returning();

    await tocarProjeto(projectId);
    revalidatePath(`/projetos/${projectId}`);
    return { ok: true, dados: { id: criado!.id } };
  } catch (erro) {
    return tratar(erro);
  }
}

const moverPlantioSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  mesInicio: z.number().int(),
  mesFim: z.number().int(),
});

/** Move ou redimensiona uma barra. */
export async function moverPlantio(entrada: unknown): Promise<Resultado> {
  try {
    const analise = moverPlantioSchema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { id, projectId, mesInicio, mesFim } = analise.data;

    await garantirEdicao(projectId);

    const projeto = await db.query.project.findFirst({
      where: eq(project.id, projectId),
    });
    if (!projeto) return { ok: false, erro: "Projeto não encontrado." };

    // Normaliza de novo no servidor: o cliente já o faz para dar retorno
    // imediato, mas quem grava não pode confiar no que vem de fora.
    const intervalo = normalizarIntervalo(
      { mesInicio, mesFim },
      projeto.horizonteMeses,
    );

    await db
      .update(planting)
      .set({ ...intervalo, atualizadoEm: new Date() })
      .where(and(eq(planting.id, id), eq(planting.projectId, projectId)));

    await tocarProjeto(projectId);
    revalidatePath(`/projetos/${projectId}`);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

const editarPlantioSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  estrato: z.enum(ESTRATOS).optional(),
  intencao: z
    .enum([
      "producao",
      "materia_organica",
      "adubacao",
      "quebra_vento",
      "servico",
    ])
    .nullable()
    .optional(),
  notas: z.string().trim().max(2000).nullable().optional(),
});

export async function editarPlantio(entrada: unknown): Promise<Resultado> {
  try {
    const analise = editarPlantioSchema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { id, projectId, estrato, intencao, notas } = analise.data;

    await garantirEdicao(projectId);

    const atual = await db.query.planting.findFirst({
      where: and(eq(planting.id, id), eq(planting.projectId, projectId)),
    });
    if (!atual) return { ok: false, erro: "Plantio não encontrado." };

    const mudancas: Record<string, unknown> = { atualizadoEm: new Date() };

    if (estrato !== undefined) {
      const especie = await db.query.species.findFirst({
        where: eq(species.id, atual.speciesId),
      });
      mudancas.estrato = estrato;
      mudancas.estratoForcado =
        especie?.estrato != null && especie.estrato !== estrato;
    }
    if (intencao !== undefined) mudancas.intencao = intencao;
    if (notas !== undefined) mudancas.notas = notas;

    await db.update(planting).set(mudancas).where(eq(planting.id, id));

    await tocarProjeto(projectId);
    revalidatePath(`/projetos/${projectId}`);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function removerPlantio(
  id: string,
  projectId: string,
): Promise<Resultado> {
  try {
    await garantirEdicao(projectId);

    await db
      .delete(planting)
      .where(and(eq(planting.id, id), eq(planting.projectId, projectId)));

    await tocarProjeto(projectId);
    revalidatePath(`/projetos/${projectId}`);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/** Mantém `atualizadoEm` do projeto em dia para ordenar a lista por atividade. */
async function tocarProjeto(projectId: string) {
  await db
    .update(project)
    .set({ atualizadoEm: new Date() })
    .where(eq(project.id, projectId));
}

/**
 * Interpreta AAAA-MM-DD como data local.
 *
 * `new Date("2026-03-01")` seria meia-noite UTC, que em fuso negativo cai no
 * dia 28/02 — e o mês 0 do planejamento passaria a ser o mês errado.
 */
function dataDeIso(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano!, mes! - 1, dia!);
}
