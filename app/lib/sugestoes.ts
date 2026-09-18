import { count, eq, isNull } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  changeProposal,
  media,
  species,
  speciesFoto,
  user,
} from "@/db/schema/index.ts";
import type { TagDeFoto } from "@/core/fotos.ts";

/**
 * Fila de sugestões do catálogo, para a revisão da equipe.
 *
 * Junta as duas portas de entrada da comunidade — propostas de campo
 * (`change_proposal`) e fotos enviadas (`species_media` sem aprovação) — numa
 * lista só, porque para quem revisa é tudo a mesma pergunta: isto entra no
 * catálogo? As mutações continuam nas actions de cada uma (wiki.ts, fotos.ts).
 */

type Base = {
  id: string;
  criadoEm: Date;
  autorNome: string | null;
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
        autorNome: user.name,
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
        autorNome: user.name,
      })
      .from(speciesFoto)
      .innerJoin(media, eq(media.id, speciesFoto.mediaId))
      .innerJoin(species, eq(species.id, speciesFoto.speciesId))
      .leftJoin(user, eq(speciesFoto.enviadaPor, user.id))
      .where(isNull(speciesFoto.aprovadaEm)),
  ]);

  const deCampo = propostas.map(
    ({ proposta, especie, autorNome }): SugestaoDeCampo => ({
      tipo: proposta.tipo,
      id: proposta.id,
      criadoEm: proposta.criadoEm,
      autorNome,
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
    ({ especieNome, especieSlug, ...foto }): SugestaoDeFoto => ({
      ...foto,
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
