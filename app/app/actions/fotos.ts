"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index.ts";
import { species, speciesFoto, media } from "@/db/schema/index.ts";
import {
  requireViewer,
  requireModerator,
  isModerator,
  AccessError,
} from "@/lib/access.ts";
import { removerObjeto } from "@/lib/storage.ts";
import { TAGS_DE_FOTO } from "@/core/fotos.ts";

/**
 * Fotos do catálogo.
 *
 * Segue a mesma porta de moderação que a wiki usa para os campos: qualquer
 * pessoa com conta envia, mas a foto só aparece no catálogo público depois de
 * aprovada. Envio de moderador já entra aprovado — seria teatro pedir que
 * aprovasse a si mesmo.
 *
 * O arquivo já está no MinIO quando estas ações rodam: o navegador subiu direto
 * por URL pré-assinada (ver /api/media/upload).
 */

export interface Resultado {
  ok: boolean;
  erro?: string;
}

function tratar(erro: unknown): Resultado {
  if (erro instanceof AccessError) return { ok: false, erro: erro.message };
  console.error("Falha em ação de foto:", erro);
  return { ok: false, erro: "Não foi possível concluir. Tente de novo." };
}

/** Revalida a ficha e a grade — a foto principal ilustra o card. */
function revalidar(slug: string) {
  revalidatePath(`/catalogo/${slug}`);
  revalidatePath(`/catalogo/${slug}/fotos`);
  revalidatePath("/catalogo");
}

const adicionarSchema = z.object({
  slug: z.string().min(1),
  mediaId: z.string().uuid(),
  /**
   * Quem fotografou, ou de onde veio e sob qual licença. Obrigatório: foto sem
   * autoria declarada é dado sem proveniência.
   */
  credito: z.string().trim().min(2).max(200),
  /** Fase da planta retratada — organiza a galeria e a escolha da foto do card. */
  tag: z.enum(TAGS_DE_FOTO),
  legenda: z.string().trim().max(300).nullable().optional(),
});

export async function adicionarFoto(entrada: unknown): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    const analise = adicionarSchema.safeParse(entrada);
    if (!analise.success) {
      return {
        ok: false,
        erro: analise.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }
    const { slug, mediaId, credito, legenda, tag } = analise.data;

    const especie = await db.query.species.findFirst({
      where: eq(species.slug, slug),
    });
    if (!especie) return { ok: false, erro: "Espécie não encontrada." };

    const aprovada = isModerator(viewer);

    await db.insert(speciesFoto).values({
      speciesId: especie.id,
      mediaId,
      tag,
      credito,
      legenda: legenda ?? null,
      enviadaPor: viewer.id,
      aprovadaEm: aprovada ? new Date() : null,
      aprovadaPor: aprovada ? viewer.id : null,
    });

    revalidar(slug);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function aprovarFoto(id: string): Promise<Resultado> {
  try {
    const viewer = await requireModerator();

    const foto = await db.query.speciesFoto.findFirst({
      where: eq(speciesFoto.id, id),
    });
    if (!foto) return { ok: false, erro: "Foto não encontrada." };

    await db
      .update(speciesFoto)
      .set({ aprovadaEm: new Date(), aprovadaPor: viewer.id })
      .where(eq(speciesFoto.id, id));

    const especie = await db.query.species.findFirst({
      where: eq(species.id, foto.speciesId),
    });
    if (especie) revalidar(especie.slug);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Remove a foto do catálogo e apaga o arquivo.
 *
 * O objeto no MinIO sai junto: mantê-lo seria guardar imagem que nenhuma tela
 * alcança. A ordem é objeto primeiro, registro depois — se o MinIO falhar, a
 * linha continua lá e a remoção pode ser repetida; o inverso deixaria arquivo
 * pago e invisível.
 */
export async function removerFoto(id: string): Promise<Resultado> {
  try {
    await requireModerator();

    const foto = await db.query.speciesFoto.findFirst({
      where: eq(speciesFoto.id, id),
    });
    if (!foto) return { ok: false, erro: "Foto não encontrada." };

    const arquivo = await db.query.media.findFirst({
      where: eq(media.id, foto.mediaId),
    });

    if (arquivo) {
      await removerObjeto(arquivo.key);
      // `species_media` sai em cascata com o registro de mídia.
      await db.delete(media).where(eq(media.id, arquivo.id));
    } else {
      await db.delete(speciesFoto).where(eq(speciesFoto.id, id));
    }

    const especie = await db.query.species.findFirst({
      where: eq(species.id, foto.speciesId),
    });
    if (especie) revalidar(especie.slug);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}
