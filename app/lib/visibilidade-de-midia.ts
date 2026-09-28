import { eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  media,
  user,
  speciesFoto,
  event,
  eventMedia,
} from "@/db/schema/index.ts";
import { isModerator, type Viewer } from "@/lib/access.ts";
import { buscarProjeto } from "@/lib/projetos.ts";

export type VisibilidadeDeMidia =
  | { ok: true; publica: boolean }
  | { ok: false; motivo: "nao_encontrada" | "sem_permissao" };

/**
 * Quem pode LER um arquivo do armazenamento (servido por /media/<key>).
 *
 * O bucket é privado — sem isto, a URL sozinha bastava para ler a foto de
 * perfil de alguém que marcou "não pública", ou uma foto do diário de um
 * projeto privado.
 *
 * Regras, na ordem em que se aplicam:
 *   1. Foto de espécie já aprovada — o catálogo é público por desenho.
 *   2. Foto de perfil marcada como pública.
 *   3. Dono do arquivo (inclusive a própria foto de perfil ainda não pública,
 *      ou uma foto de espécie sua ainda em moderação).
 *   4. Foto de um evento do diário — de quem pode LER aquele projeto (dono,
 *      membro ou admin, via buscarProjeto). Um link não-listado sozinho não
 *      abre a foto: exigir isso pediria levar o token do link até a tag
 *      <img>, expondo-o a quem só devia ver a imagem — diferença deliberada
 *      da página, que abre para o link.
 *   5. Moderador ou admin — auditoria e moderação.
 */
export async function podeLerMidia(
  chave: string,
  viewer: Viewer,
): Promise<VisibilidadeDeMidia> {
  const registro = await db.query.media.findFirst({
    where: eq(media.key, chave),
  });
  if (!registro) return { ok: false, motivo: "nao_encontrada" };

  const [fotoDeEspecie] = await db
    .select({ aprovadaEm: speciesFoto.aprovadaEm })
    .from(speciesFoto)
    .where(eq(speciesFoto.mediaId, registro.id))
    .limit(1);
  if (fotoDeEspecie?.aprovadaEm) return { ok: true, publica: true };

  const [dono] = await db
    .select({ publicoFoto: user.publicoFoto })
    .from(user)
    .where(eq(user.image, `/media/${chave}`))
    .limit(1);
  if (dono?.publicoFoto) return { ok: true, publica: true };

  if (viewer && registro.uploadedBy === viewer.id) {
    return { ok: true, publica: false };
  }

  const [doEvento] = await db
    .select({ projectId: event.projectId })
    .from(eventMedia)
    .innerJoin(event, eq(event.id, eventMedia.eventId))
    .where(eq(eventMedia.mediaId, registro.id))
    .limit(1);
  if (doEvento) {
    const projeto = await buscarProjeto(doEvento.projectId, viewer);
    if (projeto) return { ok: true, publica: false };
  }

  if (viewer && isModerator(viewer)) return { ok: true, publica: false };

  return { ok: false, motivo: "sem_permissao" };
}
