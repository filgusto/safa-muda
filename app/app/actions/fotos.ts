"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index.ts";
import { species, speciesFoto, media } from "@/db/schema/index.ts";
import {
  requireViewer,
  requireModerator,
  requireAdmin,
  isModerator,
  AccessError,
} from "@/lib/access.ts";
import {
  removerObjeto,
  s3,
  BUCKET,
  gerarChave,
  ehTipoPermitido,
} from "@/lib/storage.ts";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { TAGS_DE_FOTO, type TagDeFoto } from "@/core/fotos.ts";
import { avisarAvaliacao } from "@/lib/aviso-de-avaliacao.ts";
import {
  extrairTituloDoArquivo,
  buscarMetadadosWikimedia,
  baixarImagemWikimedia,
  sugerirCredito,
  WikimediaError,
} from "@/lib/wikimedia.ts";
import {
  comprimirParaArmazenar,
  ImagemGrandeDemais,
} from "@/lib/comprimir-imagem-servidor.ts";

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
  revalidatePath(`/safdex/${slug}`);
  revalidatePath(`/safdex/${slug}/fotos`);
  revalidatePath("/safdex");
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

/**
 * Vincula uma mídia já existente a uma espécie. Compartilhada por
 * `adicionarFoto` (mídia enviada do computador) e `importarFotoDoWikimedia`
 * (mídia baixada do Commons) — a partir daqui os dois fluxos são idênticos:
 * mesma regra de moderação, mesma revalidação.
 */
async function criarSpeciesFoto(params: {
  viewerId: string;
  aprovada: boolean;
  speciesId: string;
  mediaId: string;
  tag: TagDeFoto;
  credito: string;
  legenda: string | null;
}) {
  await db.insert(speciesFoto).values({
    speciesId: params.speciesId,
    mediaId: params.mediaId,
    tag: params.tag,
    credito: params.credito,
    legenda: params.legenda,
    enviadaPor: params.viewerId,
    aprovadaEm: params.aprovada ? new Date() : null,
    aprovadaPor: params.aprovada ? params.viewerId : null,
  });
}

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

    await criarSpeciesFoto({
      viewerId: viewer.id,
      aprovada: isModerator(viewer),
      speciesId: especie.id,
      mediaId,
      tag,
      credito,
      legenda: legenda ?? null,
    });

    revalidar(slug);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

export interface ResultadoDePrevia {
  ok: boolean;
  erro?: string;
  previa?: {
    thumbUrl: string;
    autor: string | null;
    licencaNome: string | null;
    licencaUrl: string | null;
    credito: string;
  };
}

/**
 * Busca os metadados de um arquivo do Wikimedia Commons para prévia no
 * formulário — não baixa nem grava nada ainda. O usuário confere autor e
 * licença (e pode ajustar o crédito) antes de importar de fato.
 */
export async function buscarPreviaDoWikimedia(
  url: string,
): Promise<ResultadoDePrevia> {
  try {
    await requireViewer();

    const titulo = extrairTituloDoArquivo(url);
    if (!titulo) {
      return {
        ok: false,
        erro: "Link inválido. Cole o link da ficha do arquivo no Wikimedia Commons (ex.: commons.wikimedia.org/wiki/File:...).",
      };
    }

    const metadados = await buscarMetadadosWikimedia(titulo);
    if (!ehTipoPermitido(metadados.mimeType)) {
      return {
        ok: false,
        erro: `Este tipo de arquivo (${metadados.mimeType}) não é suportado. Aceitos: JPEG, PNG, WebP, AVIF.`,
      };
    }

    return {
      ok: true,
      previa: {
        thumbUrl: metadados.thumbUrl,
        autor: metadados.autor,
        licencaNome: metadados.licencaNome,
        licencaUrl: metadados.licencaUrl,
        credito: sugerirCredito(metadados),
      },
    };
  } catch (erro) {
    if (erro instanceof WikimediaError)
      return { ok: false, erro: erro.message };
    return tratar(erro);
  }
}

const importarWikimediaSchema = z.object({
  slug: z.string().min(1),
  url: z.string().url(),
  credito: z.string().trim().min(2).max(200),
  tag: z.enum(TAGS_DE_FOTO),
  legenda: z.string().trim().max(300).nullable().optional(),
});

/**
 * Baixa a imagem do Commons, espelha no MinIO como qualquer outra foto do
 * catálogo, e vincula à espécie. A URL da ficha do Commons fica guardada em
 * `media.sourceUrl` como proveniência.
 */
export async function importarFotoDoWikimedia(
  entrada: unknown,
): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    const analise = importarWikimediaSchema.safeParse(entrada);
    if (!analise.success) {
      return {
        ok: false,
        erro: analise.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }
    const { slug, url, credito, tag, legenda } = analise.data;

    const titulo = extrairTituloDoArquivo(url);
    if (!titulo)
      return { ok: false, erro: "Link do Wikimedia Commons inválido." };

    const especie = await db.query.species.findFirst({
      where: eq(species.slug, slug),
    });
    if (!especie) return { ok: false, erro: "Espécie não encontrada." };

    const metadados = await buscarMetadadosWikimedia(titulo);
    if (!ehTipoPermitido(metadados.mimeType)) {
      return {
        ok: false,
        erro: `Este tipo de arquivo (${metadados.mimeType}) não é suportado.`,
      };
    }

    const original = await baixarImagemWikimedia(metadados.thumbUrl);
    const comprimida = await comprimirParaArmazenar(original);

    const key = gerarChave(`${titulo}.jpg`);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: comprimida.buffer,
        ContentType: comprimida.mimeType,
      }),
    );

    const [registro] = await db
      .insert(media)
      .values({
        key,
        filename: `${titulo}.jpg`,
        mimeType: comprimida.mimeType,
        size: comprimida.buffer.length,
        width: comprimida.largura,
        height: comprimida.altura,
        alt: metadados.descricao,
        sourceUrl: metadados.paginaUrl,
        uploadedBy: viewer.id,
      })
      .returning();

    await criarSpeciesFoto({
      viewerId: viewer.id,
      aprovada: isModerator(viewer),
      speciesId: especie.id,
      mediaId: registro!.id,
      tag,
      credito,
      legenda: legenda ?? null,
    });

    revalidar(slug);
    return { ok: true };
  } catch (erro) {
    if (erro instanceof WikimediaError || erro instanceof ImagemGrandeDemais) {
      return { ok: false, erro: erro.message };
    }
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
    if (especie) {
      revalidar(especie.slug);
      if (foiEnviadaParaAvaliacao(foto, viewer.id)) {
        await avisarAvaliacao({
          autorId: foto.enviadaPor!,
          aprovada: true,
          oQue: "Sua foto",
          nomeDaEspecie: especie.nomeComum,
          slug: especie.slug,
        });
      }
    }
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Escolhe a foto que ilustra o card do catálogo e o cabeçalho da ficha,
 * no lugar da escolha automática pela fase da planta. Só a administração:
 * é a vitrine da espécie, e não passa pela fila de sugestões.
 *
 * Desmarcar a anterior e marcar a nova vão na mesma transação — o índice
 * parcial `species_media_principal_unica` recusaria duas marcadas ao mesmo
 * tempo, e fora da transação uma falha no meio deixaria a espécie sem
 * nenhuma.
 */
export async function definirFotoPrincipal(id: string): Promise<Resultado> {
  try {
    await requireAdmin();

    const foto = await db.query.speciesFoto.findFirst({
      where: eq(speciesFoto.id, id),
    });
    if (!foto) return { ok: false, erro: "Foto não encontrada." };
    if (!foto.aprovadaEm) {
      return {
        ok: false,
        erro: "A foto precisa ser aprovada antes de virar a principal.",
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(speciesFoto)
        .set({ principal: false })
        .where(
          and(
            eq(speciesFoto.speciesId, foto.speciesId),
            ne(speciesFoto.id, id),
          ),
        );
      await tx
        .update(speciesFoto)
        .set({ principal: true })
        .where(eq(speciesFoto.id, id));
    });

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
    const viewer = await requireModerator();

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
    if (especie) {
      revalidar(especie.slug);
      // Remover uma foto pendente é rejeitá-la; remover uma já publicada é
      // manutenção do catálogo, e não pede aviso.
      if (foiEnviadaParaAvaliacao(foto, viewer.id)) {
        await avisarAvaliacao({
          autorId: foto.enviadaPor!,
          aprovada: false,
          oQue: "Sua foto",
          nomeDaEspecie: especie.nomeComum,
          slug: especie.slug,
        });
      }
    }
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Foto que esperava avaliação, enviada por outra pessoa — só essa merece o
 * e-mail de resultado. A da equipe já entra publicada.
 */
function foiEnviadaParaAvaliacao(
  foto: { aprovadaEm: Date | null; enviadaPor: string | null },
  avaliadorId: string,
): boolean {
  return (
    foto.aprovadaEm === null &&
    foto.enviadaPor !== null &&
    foto.enviadaPor !== avaliadorId
  );
}
