import { and, eq, inArray, lt, notExists, sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  event,
  eventMedia,
  media,
  project,
  speciesFoto,
  user,
} from "@/db/schema/index.ts";
import { removerObjeto } from "./storage.ts";

/**
 * Limpeza dos arquivos que ficam sem dono quando um evento, um projeto ou uma
 * conta são apagados.
 *
 * O banco resolve as linhas em cascata (`event_media` some com o evento), mas
 * o registro em `media` e o objeto no Garage não têm quem os apague — e foto
 * de diário é dado privado: a Política de Privacidade promete que sai junto.
 */

/** Ids das mídias anexadas aos eventos de um ou mais projetos. */
export async function midiasDosProjetos(
  projectIds: string[],
): Promise<string[]> {
  if (projectIds.length === 0) return [];
  const linhas = await db
    .select({ mediaId: eventMedia.mediaId })
    .from(eventMedia)
    .innerJoin(event, eq(event.id, eventMedia.eventId))
    .where(inArray(event.projectId, projectIds));
  return linhas.map((linha) => linha.mediaId);
}

/** Ids das mídias anexadas a um evento. */
export async function midiasDoEvento(eventId: string): Promise<string[]> {
  const linhas = await db
    .select({ mediaId: eventMedia.mediaId })
    .from(eventMedia)
    .where(eq(eventMedia.eventId, eventId));
  return linhas.map((linha) => linha.mediaId);
}

/**
 * Apaga, dentre as mídias dadas, as que nada mais usa: nenhuma foto do
 * catálogo, nenhum evento, nenhuma foto de perfil. Chame DEPOIS de remover o
 * que as referenciava.
 *
 * A ordem é objeto primeiro, registro depois — a mesma de `removerFoto`: se o
 * Garage falhar, a linha continua lá apontando para o arquivo. Nunca lança: o
 * evento/projeto já foi apagado quando isto roda, e uma falha de limpeza não
 * deve aparecer como erro da ação.
 */
export async function apagarMidiasSemUso(ids: string[]): Promise<void> {
  const candidatas = [...new Set(ids)];
  if (candidatas.length === 0) return;

  try {
    const [noCatalogo, emEventos, registros] = await Promise.all([
      db
        .select({ mediaId: speciesFoto.mediaId })
        .from(speciesFoto)
        .where(inArray(speciesFoto.mediaId, candidatas)),
      db
        .select({ mediaId: eventMedia.mediaId })
        .from(eventMedia)
        .where(inArray(eventMedia.mediaId, candidatas)),
      db
        .select({ id: media.id, key: media.key })
        .from(media)
        .where(inArray(media.id, candidatas)),
    ]);
    const emUso = new Set(
      [...noCatalogo, ...emEventos].map((linha) => linha.mediaId),
    );
    const livres = registros.filter((registro) => !emUso.has(registro.id));
    if (livres.length === 0) return;

    const dePerfil = await db
      .select({ image: user.image })
      .from(user)
      .where(
        inArray(
          user.image,
          livres.map((registro) => `/media/${registro.key}`),
        ),
      );
    const fotosDePerfil = new Set(dePerfil.map((linha) => linha.image));

    for (const registro of livres) {
      if (fotosDePerfil.has(`/media/${registro.key}`)) continue;
      try {
        await removerObjeto(registro.key);
        await db.delete(media).where(eq(media.id, registro.id));
      } catch (erro) {
        console.error("Falha ao apagar mídia sem uso:", registro.key, erro);
      }
    }
  } catch (erro) {
    console.error("Falha na limpeza de mídias sem uso:", erro);
  }
}

/**
 * Antes de excluir uma conta: apaga os projetos dela e os arquivos privados
 * que ficariam para trás — as fotos dos diários desses projetos e os envios
 * dela que nada usa. O que já está no catálogo (ou no diário de um projeto de
 * outra pessoa) permanece, como diz a Política de Privacidade.
 *
 * Os projetos sairiam de qualquer forma, em cascata com a conta; saem aqui,
 * um passo antes, porque só depois disso dá para saber quais fotos ficaram
 * sem uso. Nunca lança: a exclusão da conta não pode falhar por causa da
 * limpeza.
 */
export async function apagarMidiasPrivadasDaConta(
  userId: string,
): Promise<void> {
  try {
    const projetos = await db
      .select({ id: project.id })
      .from(project)
      .where(eq(project.ownerId, userId));
    const idsDosProjetos = projetos.map((projeto) => projeto.id);

    const dosDiarios = await midiasDosProjetos(idsDosProjetos);
    if (idsDosProjetos.length > 0) {
      await db.delete(project).where(inArray(project.id, idsDosProjetos));
    }

    const enviadas = await db
      .select({ id: media.id })
      .from(media)
      .where(eq(media.uploadedBy, userId));

    await apagarMidiasSemUso([
      ...dosDiarios,
      ...enviadas.map((registro) => registro.id),
    ]);
  } catch (erro) {
    console.error("Falha ao apagar as mídias privadas da conta:", erro);
  }
}

/** Folga antes de considerar um envio abandonado. */
const IDADE_MINIMA_DO_ORFAO_MS = 24 * 60 * 60_000;
const LOTE_DA_VARREDURA = 500;

/**
 * Apaga envios que nunca foram usados: a linha em `media` nasce antes do
 * upload (ver /api/media/upload), e quem desiste no meio — ou envia e fecha a
 * aba — deixa um registro (e às vezes um arquivo) que nenhuma tela alcança.
 *
 * Só entra o que tem mais de um dia: todo formulário anexa a mídia logo depois
 * de enviá-la, então nessa idade não há envio "em andamento". Devolve quantos
 * registros foram examinados; `apagarMidiasSemUso` confere o uso de novo antes
 * de apagar cada um.
 */
export async function varrerUploadsOrfaos(agora = new Date()): Promise<number> {
  const limite = new Date(agora.getTime() - IDADE_MINIMA_DO_ORFAO_MS);

  const orfas = await db
    .select({ id: media.id })
    .from(media)
    .where(
      and(
        lt(media.createdAt, limite),
        notExists(
          db
            .select({ um: sql`1` })
            .from(speciesFoto)
            .where(eq(speciesFoto.mediaId, media.id)),
        ),
        notExists(
          db
            .select({ um: sql`1` })
            .from(eventMedia)
            .where(eq(eventMedia.mediaId, media.id)),
        ),
        notExists(
          db
            .select({ um: sql`1` })
            .from(user)
            .where(eq(user.image, sql`'/media/' || ${media.key}`)),
        ),
      ),
    )
    .limit(LOTE_DA_VARREDURA);

  await apagarMidiasSemUso(orfas.map((registro) => registro.id));
  return orfas.length;
}
