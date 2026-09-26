import { desc, eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { species, speciesRevision, user } from "@/db/schema/index.ts";
import {
  cartaoPublico,
  type CartaoPublico,
  type DadosDoPerfilPublico,
} from "@/lib/cartao-publico.ts";

/** As colunas de `user` de que o card público precisa — e só elas. */
export const colunasDoCartao = {
  name: user.name,
  role: user.role,
  tratamento: user.tratamento,
  image: user.image,
  creditoNome: user.creditoNome,
  creditoNomeOutro: user.creditoNomeOutro,
  regiao: user.regiao,
  perfilDeUso: user.perfilDeUso,
  perfilDeUsoOutro: user.perfilDeUsoOutro,
  experiencia: user.experiencia,
  bio: user.bio,
  linkInstagram: user.linkInstagram,
  linkSite: user.linkSite,
  linkLattes: user.linkLattes,
  publicoFoto: user.publicoFoto,
  publicoRegiao: user.publicoRegiao,
  publicoPerfilDeUso: user.publicoPerfilDeUso,
  publicoExperiencia: user.publicoExperiencia,
  publicoBio: user.publicoBio,
  publicoInstagram: user.publicoInstagram,
  publicoSite: user.publicoSite,
  publicoLattes: user.publicoLattes,
};

/** Como uma linha vinda de `leftJoin` (tudo pode ser nulo) vira o card. */
export function cartaoDaLinha(linha: {
  [K in keyof DadosDoPerfilPublico]: DadosDoPerfilPublico[K] | null;
}): CartaoPublico | null {
  if (linha.name === null) return null;
  return cartaoPublico({
    ...linha,
    name: linha.name,
    role: linha.role ?? "user",
    image: linha.image ?? null,
    publicoFoto: linha.publicoFoto ?? false,
    publicoRegiao: linha.publicoRegiao ?? false,
    publicoPerfilDeUso: linha.publicoPerfilDeUso ?? false,
    publicoExperiencia: linha.publicoExperiencia ?? false,
    publicoBio: linha.publicoBio ?? false,
    publicoInstagram: linha.publicoInstagram ?? false,
    publicoSite: linha.publicoSite ?? false,
    publicoLattes: linha.publicoLattes ?? false,
  });
}

export type Contribuicao = {
  id: string;
  criadoEm: Date;
  fonte: string;
  campos: string[];
  especie: { slug: string; nomeComum: string; nomeCientifico: string };
};

export type PerfilPublico = {
  cartao: CartaoPublico;
  membroDesde: Date;
  contribuicoes: Contribuicao[];
};

const LIMITE_DE_CONTRIBUICOES = 200;

/**
 * O perfil público de uma pessoa, ou `null` se ela não existe ou pediu para
 * não ser identificada (`cartaoPublico` devolve `null`): nos dois casos a
 * página é a mesma, um 404, para não revelar quem escolheu o anonimato.
 */
export async function obterPerfilPublico(
  id: string,
): Promise<PerfilPublico | null> {
  const [linha] = await db
    .select({ ...colunasDoCartao, criadoEm: user.createdAt })
    .from(user)
    .where(eq(user.id, id));
  if (!linha) return null;

  const cartao = cartaoDaLinha(linha);
  if (!cartao) return null;

  const revisoes = await db
    .select({
      id: speciesRevision.id,
      criadoEm: speciesRevision.criadoEm,
      fonte: speciesRevision.fonte,
      patch: speciesRevision.patch,
      slug: species.slug,
      nomeComum: species.nomeComum,
      nomeCientifico: species.nomeCientifico,
    })
    .from(speciesRevision)
    .innerJoin(species, eq(speciesRevision.speciesId, species.id))
    .where(eq(speciesRevision.autorId, id))
    .orderBy(desc(speciesRevision.criadoEm))
    .limit(LIMITE_DE_CONTRIBUICOES);

  return {
    cartao,
    membroDesde: linha.criadoEm,
    contribuicoes: revisoes.map((r) => ({
      id: r.id,
      criadoEm: r.criadoEm,
      fonte: r.fonte,
      campos: Object.keys(r.patch),
      especie: {
        slug: r.slug,
        nomeComum: r.nomeComum,
        nomeCientifico: r.nomeCientifico,
      },
    })),
  };
}
