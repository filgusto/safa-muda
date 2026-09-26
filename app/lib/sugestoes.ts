import { count, eq, isNull } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  changeProposal,
  media,
  species,
  speciesFoto,
  user,
} from "@/db/schema/index.ts";
import type { Tratamento } from "@/core/tratamento.ts";
import type { TagDeFoto } from "@/core/fotos.ts";
import type {
  CreditoDeNome,
  Experiencia,
  PerfilDeUso,
} from "@/lib/perfil-de-usuario.ts";

const CAMPOS_DO_AUTOR = {
  nome: user.name,
  email: user.email,
  imagem: user.image,
  papel: user.role,
  tratamento: user.tratamento,
  criadoEm: user.createdAt,
  regiao: user.regiao,
  perfilDeUso: user.perfilDeUso,
  perfilDeUsoOutro: user.perfilDeUsoOutro,
  experiencia: user.experiencia,
  bio: user.bio,
  linkInstagram: user.linkInstagram,
  linkSite: user.linkSite,
  linkLattes: user.linkLattes,
  creditoNome: user.creditoNome,
  creditoNomeOutro: user.creditoNomeOutro,
};

/** Resultado do leftJoin: todas as colunas nulas quando o autor foi removido. */
function autorDoJoin(a: {
  [K in keyof typeof CAMPOS_DO_AUTOR]: unknown;
}): AutorDaSugestao | null {
  return a.nome === null ? null : (a as unknown as AutorDaSugestao);
}

/**
 * Fila de sugestões do catálogo, para a revisão da equipe.
 *
 * Junta as duas portas de entrada da comunidade — propostas de campo
 * (`change_proposal`) e fotos enviadas (`species_media` sem aprovação) — numa
 * lista só, porque para quem revisa é tudo a mesma pergunta: isto entra no
 * catálogo? As mutações continuam nas actions de cada uma (wiki.ts, fotos.ts).
 */

/**
 * Tudo o que a pessoa cadastrou, inclusive o que ela não tornou público: a
 * fila é só da equipe, e quem decide precisa saber de quem vem a sugestão.
 */
export type AutorDaSugestao = {
  nome: string;
  email: string;
  imagem: string | null;
  papel: "user" | "moderator" | "admin";
  tratamento: Tratamento | null;
  criadoEm: Date;
  regiao: string | null;
  perfilDeUso: PerfilDeUso | null;
  perfilDeUsoOutro: string | null;
  experiencia: Experiencia | null;
  bio: string | null;
  linkInstagram: string | null;
  linkSite: string | null;
  linkLattes: string | null;
  creditoNome: CreditoDeNome;
  creditoNomeOutro: string | null;
};

type Base = {
  id: string;
  criadoEm: Date;
  autorNome: string | null;
  autor: AutorDaSugestao | null;
  /** Nulo só em proposta de espécie nova — a espécie ainda não existe. */
  especie: { nome: string; slug: string } | null;
};

export type SugestaoDeCampo = Base & {
  tipo: "edicao" | "nova_especie";
  patch: Record<string, unknown>;
  /**
   * Valores atuais dos campos que a proposta toca, para o diff. Nulo em
   * espécie nova, que não tem "antes".
   */
  atual: Record<string, unknown> | null;
  fonte: string;
  justificativa: string | null;
};

export type SugestaoDeFoto = Base & {
  tipo: "foto";
  key: string;
  tag: TagDeFoto;
  legenda: string | null;
  credito: string;
};

export type Sugestao = SugestaoDeCampo | SugestaoDeFoto;

/** Tudo o que aguarda decisão, do mais antigo para o mais novo — é uma fila. */
export async function listarSugestoesPendentes(): Promise<Sugestao[]> {
  const [propostas, fotos] = await Promise.all([
    db
      .select({
        proposta: changeProposal,
        especie: species,
        autor: CAMPOS_DO_AUTOR,
      })
      .from(changeProposal)
      .leftJoin(species, eq(changeProposal.speciesId, species.id))
      .leftJoin(user, eq(changeProposal.autorId, user.id))
      .where(eq(changeProposal.status, "pendente")),
    db
      .select({
        id: speciesFoto.id,
        criadoEm: speciesFoto.criadoEm,
        tag: speciesFoto.tag,
        legenda: speciesFoto.legenda,
        credito: speciesFoto.credito,
        key: media.key,
        especieNome: species.nomeComum,
        especieSlug: species.slug,
        autor: CAMPOS_DO_AUTOR,
      })
      .from(speciesFoto)
      .innerJoin(media, eq(media.id, speciesFoto.mediaId))
      .innerJoin(species, eq(species.id, speciesFoto.speciesId))
      .leftJoin(user, eq(speciesFoto.enviadaPor, user.id))
      .where(isNull(speciesFoto.aprovadaEm)),
  ]);

  const deCampo = propostas.map(
    ({ proposta, especie, autor }): SugestaoDeCampo => ({
      tipo: proposta.tipo,
      id: proposta.id,
      criadoEm: proposta.criadoEm,
      autorNome: autor?.nome ?? null,
      autor: autor ? autorDoJoin(autor) : null,
      especie: especie ? { nome: especie.nomeComum, slug: especie.slug } : null,
      patch: proposta.patch,
      // Só os campos tocados: a ficha inteira não precisa ir para o cliente.
      atual: especie
        ? Object.fromEntries(
            Object.keys(proposta.patch).map((chave) => [
              chave,
              (especie as unknown as Record<string, unknown>)[chave] ?? null,
            ]),
          )
        : null,
      fonte: proposta.fonte,
      justificativa: proposta.justificativa,
    }),
  );

  const deFoto = fotos.map(
    ({ especieNome, especieSlug, autor, ...foto }): SugestaoDeFoto => ({
      ...foto,
      autorNome: autor?.nome ?? null,
      autor: autor ? autorDoJoin(autor) : null,
      tipo: "foto",
      especie: { nome: especieNome, slug: especieSlug },
    }),
  );

  return [...deCampo, ...deFoto].sort(
    (a, b) => a.criadoEm.getTime() - b.criadoEm.getTime(),
  );
}

/** Quantas sugestões aguardam decisão — o número do botão na área da equipe. */
export async function contarSugestoesPendentes(): Promise<number> {
  const [[propostas], [fotos]] = await Promise.all([
    db
      .select({ total: count() })
      .from(changeProposal)
      .where(eq(changeProposal.status, "pendente")),
    db
      .select({ total: count() })
      .from(speciesFoto)
      .where(isNull(speciesFoto.aprovadaEm)),
  ]);
  return (propostas?.total ?? 0) + (fotos?.total ?? 0);
}
