import { and, eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { media } from "@/db/schema/index.ts";
import { removerObjeto } from "./storage.ts";

/**
 * Apaga do armazenamento a foto de perfil anterior. É dado pessoal: trocar ou
 * remover a foto não pode deixar a antiga guardada no MinIO.
 *
 * Só apaga o que é de fato dela — um registro em `media` enviado por ela e
 * com a chave que a URL aponta — para que uma URL forjada não derrube a
 * mídia de outra pessoa. Nunca lança: a foto nova/removida já foi gravada e
 * uma falha de limpeza não deve desfazê-la.
 */
export async function apagarFotoDePerfil(
  userId: string,
  url: string | null | undefined,
): Promise<void> {
  if (!url?.startsWith("/media/")) return;
  const key = url.slice("/media/".length);

  try {
    const [registro] = await db
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.key, key), eq(media.uploadedBy, userId)));
    if (!registro) return;

    await db.delete(media).where(eq(media.id, registro.id));
    await removerObjeto(key);
  } catch (erro) {
    console.error("Falha ao apagar a foto de perfil anterior:", erro);
  }
}
