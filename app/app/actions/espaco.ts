"use server";

import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index.ts";
import { area, row, planting } from "@/db/schema/index.ts";
import { requireViewer, AccessError } from "@/lib/access.ts";
import { podeEditarProjeto } from "@/lib/projetos.ts";
import { area as areaDoPoligono, comprimento } from "@/core/geo.ts";
import { gerarLinhasParalelas } from "@/core/croqui.ts";

/** Ações do desenho espacial. */

export interface Resultado<T = undefined> {
  ok: boolean;
  erro?: string;
  dados?: T;
}

function tratar(erro: unknown): Resultado<never> {
  if (erro instanceof AccessError) return { ok: false, erro: erro.message };
  console.error("Falha em ação espacial:", erro);
  return { ok: false, erro: "Não foi possível concluir. Tente de novo." };
}

async function garantirEdicao(projectId: string) {
  const viewer = await requireViewer();
  if (!(await podeEditarProjeto(projectId, viewer))) {
    throw new AccessError("Você não pode editar este projeto.");
  }
  return viewer;
}

/** Confere que a área pertence ao projeto antes de qualquer escrita. */
async function areaDoProjeto(areaId: string, projectId: string) {
  const registro = await db.query.area.findFirst({
    where: and(eq(area.id, areaId), eq(area.projectId, projectId)),
  });
  if (!registro) throw new AccessError("Área não encontrada neste projeto.");
  return registro;
}

const pontoSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const poligonoSchema = z
  .array(pontoSchema)
  .min(3, "Um polígono precisa de ao menos três vértices.")
  .max(500);

// ── Área ─────────────────────────────────────────────────────────────────────

export async function salvarArea(
  entrada: unknown,
): Promise<Resultado<{ id: string; areaM2: number }>> {
  try {
    const schema = z.object({
      id: z.string().uuid().optional(),
      projectId: z.string().uuid(),
      nome: z.string().trim().min(1).max(120),
      geomLocal: poligonoSchema,
    });

    const analise = schema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { id, projectId, nome, geomLocal } = analise.data;

    await garantirEdicao(projectId);

    // Área derivada da geometria, nunca informada de fora — o plano local
    // torna esse cálculo exato.
    const areaM2 = areaDoPoligono(geomLocal);

    if (id) {
      await areaDoProjeto(id, projectId);
      await db
        .update(area)
        .set({ nome, geomLocal, areaM2, atualizadoEm: new Date() })
        .where(eq(area.id, id));

      revalidatePath(`/projetos/${projectId}`);
      return { ok: true, dados: { id, areaM2 } };
    }

    const [criada] = await db
      .insert(area)
      .values({ projectId, nome, geomLocal, areaM2 })
      .returning();

    revalidatePath(`/projetos/${projectId}`);
    return { ok: true, dados: { id: criada!.id, areaM2 } };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function georreferenciarArea(
  entrada: unknown,
): Promise<Resultado> {
  try {
    const schema = z.object({
      id: z.string().uuid(),
      projectId: z.string().uuid(),
      anchorLat: z.number().min(-90).max(90).nullable(),
      anchorLon: z.number().min(-180).max(180).nullable(),
      rotationDeg: z.number().min(-360).max(360),
    });

    const analise = schema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { id, projectId, anchorLat, anchorLon, rotationDeg } = analise.data;

    await garantirEdicao(projectId);
    await areaDoProjeto(id, projectId);

    await db
      .update(area)
      .set({ anchorLat, anchorLon, rotationDeg, atualizadoEm: new Date() })
      .where(eq(area.id, id));

    revalidatePath(`/projetos/${projectId}`);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function removerArea(
  id: string,
  projectId: string,
): Promise<Resultado> {
  try {
    await garantirEdicao(projectId);
    await areaDoProjeto(id, projectId);

    await db.delete(area).where(eq(area.id, id));
    revalidatePath(`/projetos/${projectId}`);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

// ── Linhas ───────────────────────────────────────────────────────────────────

const TIPOS_DE_LINHA = ["plantio", "entrelinha", "servico"] as const;

export async function salvarLinha(
  entrada: unknown,
): Promise<Resultado<{ id: string }>> {
  try {
    const schema = z.object({
      id: z.string().uuid().optional(),
      projectId: z.string().uuid(),
      areaId: z.string().uuid(),
      tipo: z.enum(TIPOS_DE_LINHA),
      rotulo: z.string().trim().max(80).nullable().optional(),
      pathLocal: z.array(pontoSchema).min(2).max(500),
    });

    const analise = schema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { id, projectId, areaId, tipo, rotulo, pathLocal } = analise.data;

    await garantirEdicao(projectId);
    await areaDoProjeto(areaId, projectId);

    const comprimentoM = comprimento(pathLocal);

    if (id) {
      await db
        .update(row)
        .set({ tipo, rotulo, pathLocal, comprimentoM })
        .where(and(eq(row.id, id), eq(row.areaId, areaId)));

      revalidatePath(`/projetos/${projectId}`);
      return { ok: true, dados: { id } };
    }

    const [criada] = await db
      .insert(row)
      .values({ areaId, tipo, rotulo, pathLocal, comprimentoM })
      .returning();

    revalidatePath(`/projetos/${projectId}`);
    return { ok: true, dados: { id: criada!.id } };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Gera linhas paralelas cobrindo a área e as substitui.
 *
 * Substitui em vez de somar: gerar por cima do que já existe produziria
 * malhas sobrepostas invisíveis, e o usuário perderia a conta das mudas.
 * As linhas desenhadas à mão são preservadas.
 */
export async function gerarLinhasNaArea(
  entrada: unknown,
): Promise<Resultado<{ total: number }>> {
  try {
    const schema = z.object({
      projectId: z.string().uuid(),
      areaId: z.string().uuid(),
      direcaoGraus: z.number().min(-360).max(360),
      espacamentoM: z.number().positive().max(200),
      bordaduraM: z.number().min(0).max(200).default(0),
      tipo: z.enum(TIPOS_DE_LINHA).default("plantio"),
    });

    const analise = schema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { projectId, areaId, direcaoGraus, espacamentoM, bordaduraM, tipo } =
      analise.data;

    await garantirEdicao(projectId);
    const registro = await areaDoProjeto(areaId, projectId);

    const caminhos = gerarLinhasParalelas({
      poligono: registro.geomLocal,
      direcaoGraus,
      espacamentoM,
      bordaduraM,
    });

    if (caminhos.length === 0) {
      return {
        ok: false,
        erro: "Nenhuma linha coube na área com esses parâmetros.",
      };
    }

    await db.transaction(async (tx) => {
      const anteriores = await tx
        .select({ id: row.id })
        .from(row)
        .where(and(eq(row.areaId, areaId), eq(row.tipo, tipo)));

      // Um plantio preso a uma linha que some ficaria com regra órfã. Zera
      // apenas os que apontam para as linhas removidas — nunca os demais.
      if (anteriores.length > 0) {
        const ids = anteriores.map((anterior) => anterior.id);
        await tx
          .update(planting)
          .set({ placement: null })
          .where(
            and(
              eq(planting.projectId, projectId),
              sql`${planting.placement}->>'rowId' = any(${ids})`,
            ),
          );
      }

      await tx
        .delete(row)
        .where(and(eq(row.areaId, areaId), eq(row.tipo, tipo)));

      await tx.insert(row).values(
        caminhos.map((caminho, indice) => ({
          areaId,
          tipo,
          rotulo: `${indice + 1}`,
          pathLocal: caminho,
          comprimentoM: comprimento(caminho),
          ordem: indice,
        })),
      );
    });

    revalidatePath(`/projetos/${projectId}`);
    return { ok: true, dados: { total: caminhos.length } };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function removerLinha(
  id: string,
  areaId: string,
  projectId: string,
): Promise<Resultado> {
  try {
    await garantirEdicao(projectId);
    await areaDoProjeto(areaId, projectId);

    await db.delete(row).where(and(eq(row.id, id), eq(row.areaId, areaId)));
    revalidatePath(`/projetos/${projectId}`);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

// ── Posicionamento do plantio ────────────────────────────────────────────────

/**
 * Prende um plantio a um trecho de linha, com espaçamento.
 *
 * Grava a REGRA, não as posições — 800 mudas numa leira de 200 m viram uma
 * linha no banco, não 800 (docs/PLANO.md §3.3).
 */
export async function posicionarPlantio(entrada: unknown): Promise<Resultado> {
  try {
    const schema = z.object({
      plantingId: z.string().uuid(),
      projectId: z.string().uuid(),
      rowId: z.string().uuid(),
      deMetros: z.number().min(0),
      ateMetros: z.number().min(0),
      espacamentoM: z.number().positive().max(50),
    });

    const analise = schema.safeParse(entrada);
    if (!analise.success) {
      return { ok: false, erro: analise.error.issues[0]?.message };
    }
    const { plantingId, projectId, rowId, deMetros, ateMetros, espacamentoM } =
      analise.data;

    if (ateMetros <= deMetros) {
      return {
        ok: false,
        erro: "O trecho final precisa ser maior que o inicial.",
      };
    }

    await garantirEdicao(projectId);

    const linha = await db.query.row.findFirst({ where: eq(row.id, rowId) });
    if (!linha) return { ok: false, erro: "Linha não encontrada." };
    await areaDoProjeto(linha.areaId, projectId);

    await db
      .update(planting)
      .set({
        placement: { tipo: "linha", rowId, deMetros, ateMetros, espacamentoM },
        atualizadoEm: new Date(),
      })
      .where(
        and(eq(planting.id, plantingId), eq(planting.projectId, projectId)),
      );

    revalidatePath(`/projetos/${projectId}`);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function desposicionarPlantio(
  plantingId: string,
  projectId: string,
): Promise<Resultado> {
  try {
    await garantirEdicao(projectId);

    await db
      .update(planting)
      .set({ placement: null, atualizadoEm: new Date() })
      .where(
        and(eq(planting.id, plantingId), eq(planting.projectId, projectId)),
      );

    revalidatePath(`/projetos/${projectId}`);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}
