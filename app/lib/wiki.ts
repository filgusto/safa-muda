import { eq, and, desc, isNull, sql, count } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  species,
  changeProposal,
  speciesRevision,
  notification,
  user,
  type ChangeProposal,
} from "@/db/schema/index.ts";

/** Consultas da wiki. Mutações ficam em app/actions/wiki.ts. */

export interface PropostaComContexto extends ChangeProposal {
  autorNome: string | null;
  revisorNome: string | null;
  especieNome: string | null;
  especieSlug: string | null;
}

const SELECAO = {
  id: changeProposal.id,
  tipo: changeProposal.tipo,
  speciesId: changeProposal.speciesId,
  patch: changeProposal.patch,
  fonte: changeProposal.fonte,
  justificativa: changeProposal.justificativa,
  status: changeProposal.status,
  autorId: changeProposal.autorId,
  revisorId: changeProposal.revisorId,
  notaDaRevisao: changeProposal.notaDaRevisao,
  criadoEm: changeProposal.criadoEm,
  revisadoEm: changeProposal.revisadoEm,
  autorNome: user.name,
  especieNome: species.nomeComum,
  especieSlug: species.slug,
};

export async function listarPropostasPendentes(): Promise<
  PropostaComContexto[]
> {
  const linhas = await db
    .select(SELECAO)
    .from(changeProposal)
    .leftJoin(user, eq(changeProposal.autorId, user.id))
    .leftJoin(species, eq(changeProposal.speciesId, species.id))
    .where(eq(changeProposal.status, "pendente"))
    .orderBy(desc(changeProposal.criadoEm));

  return linhas.map((linha) => ({ ...linha, revisorNome: null }));
}

export async function contarPropostasPendentes(): Promise<number> {
  const [linha] = await db
    .select({ total: count() })
    .from(changeProposal)
    .where(eq(changeProposal.status, "pendente"));
  return linha?.total ?? 0;
}

export async function buscarProposta(
  id: string,
): Promise<PropostaComContexto | undefined> {
  const [linha] = await db
    .select(SELECAO)
    .from(changeProposal)
    .leftJoin(user, eq(changeProposal.autorId, user.id))
    .leftJoin(species, eq(changeProposal.speciesId, species.id))
    .where(eq(changeProposal.id, id))
    .limit(1);

  return linha ? { ...linha, revisorNome: null } : undefined;
}

export async function listarPropostasDoAutor(
  autorId: string,
): Promise<PropostaComContexto[]> {
  const linhas = await db
    .select(SELECAO)
    .from(changeProposal)
    .leftJoin(user, eq(changeProposal.autorId, user.id))
    .leftJoin(species, eq(changeProposal.speciesId, species.id))
    .where(eq(changeProposal.autorId, autorId))
    .orderBy(desc(changeProposal.criadoEm));

  return linhas.map((linha) => ({ ...linha, revisorNome: null }));
}

export async function listarRevisoesDaEspecie(speciesId: string) {
  return db
    .select({
      id: speciesRevision.id,
      patch: speciesRevision.patch,
      fonte: speciesRevision.fonte,
      criadoEm: speciesRevision.criadoEm,
      autorNome: user.name,
    })
    .from(speciesRevision)
    .leftJoin(user, eq(speciesRevision.autorId, user.id))
    .where(eq(speciesRevision.speciesId, speciesId))
    .orderBy(desc(speciesRevision.criadoEm));
}

export async function listarNotificacoes(userId: string) {
  return db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.criadoEm))
    .limit(50);
}

export async function contarNotificacoesNaoLidas(
  userId: string,
): Promise<number> {
  const [linha] = await db
    .select({ total: count() })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.lidaEm)));
  return linha?.total ?? 0;
}

/**
 * Slug único a partir do nome comum. Se já existir, sufixa com -2, -3…
 * Espécies novas vêm de usuários, e nomes comuns colidem com frequência.
 */
export async function gerarSlugUnico(nomeComum: string): Promise<string> {
  const base =
    nomeComum
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "especie";

  const existentes = await db
    .select({ slug: species.slug })
    .from(species)
    .where(
      sql`${species.slug} = ${base} or ${species.slug} like ${base + "-%"}`,
    );

  const ocupados = new Set(existentes.map((linha) => linha.slug));
  if (!ocupados.has(base)) return base;

  for (let sufixo = 2; ; sufixo++) {
    const candidato = `${base}-${sufixo}`;
    if (!ocupados.has(candidato)) return candidato;
  }
}
