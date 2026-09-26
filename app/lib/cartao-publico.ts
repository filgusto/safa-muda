import { rotuloDoPapel, type Tratamento } from "@/core/tratamento.ts";
import {
  EXPERIENCIA_LABEL,
  nomeParaCredito,
  rotuloDoPerfilDeUso,
  type Experiencia,
  type PerfilDeUso,
} from "@/lib/perfil-de-usuario.ts";

/**
 * O card público de uma pessoa: o que a comunidade vê ao passar o mouse sobre
 * o nome dela numa citação. Mesma regra da "Versão pública" em /conta — só o
 * que a pessoa tornou público, com o nome do jeito que pediu para ser citada.
 *
 * Módulo puro: recebe as colunas do perfil e devolve o que pode sair delas.
 */

export type LinkDoCartao = {
  tipo: "instagram" | "site" | "lattes";
  rotulo: string;
  url: string;
};

export type CartaoPublico = {
  nome: string;
  papel: string;
  foto: string | null;
  regiao: string | null;
  perfilDeUso: string | null;
  experiencia: string | null;
  bio: string | null;
  links: LinkDoCartao[];
};

export type DadosDoPerfilPublico = {
  name: string;
  role: string;
  /** Público: quem o define escolheu como quer ser chamado. */
  tratamento: Tratamento | null;
  image: string | null;
  creditoNome: string | null;
  creditoNomeOutro: string | null;
  regiao: string | null;
  perfilDeUso: PerfilDeUso | null;
  perfilDeUsoOutro: string | null;
  experiencia: Experiencia | null;
  bio: string | null;
  linkInstagram: string | null;
  linkSite: string | null;
  linkLattes: string | null;
  publicoFoto: boolean;
  publicoRegiao: boolean;
  publicoPerfilDeUso: boolean;
  publicoExperiencia: boolean;
  publicoBio: boolean;
  publicoInstagram: boolean;
  publicoSite: boolean;
  publicoLattes: boolean;
};

/**
 * `null` para quem escolheu "sem identificação": a citação vira "Pessoa
 * colaboradora" e não há card, nem com campos marcados como públicos — a
 * pessoa pediu para não ser identificada, e um card seria justamente isso.
 */
export function cartaoPublico(
  dados: DadosDoPerfilPublico,
): CartaoPublico | null {
  if (dados.creditoNome === "anonimo") return null;

  const links: LinkDoCartao[] = [
    ["instagram", "Instagram", dados.linkInstagram, dados.publicoInstagram],
    ["site", "Site", dados.linkSite, dados.publicoSite],
    ["lattes", "Currículo Lattes", dados.linkLattes, dados.publicoLattes],
  ].flatMap(([tipo, rotulo, url, publico]) =>
    url && publico ? [{ tipo, rotulo, url } as LinkDoCartao] : [],
  );

  return {
    nome: nomeParaCredito(
      dados.name,
      dados.creditoNome,
      dados.creditoNomeOutro,
    ),
    papel: rotuloDoPapel(dados.role, dados.tratamento),
    foto: dados.publicoFoto ? dados.image : null,
    regiao: dados.publicoRegiao ? dados.regiao : null,
    perfilDeUso: dados.publicoPerfilDeUso
      ? rotuloDoPerfilDeUso(
          dados.perfilDeUso,
          dados.perfilDeUsoOutro,
          dados.tratamento,
        )
      : null,
    experiencia:
      dados.publicoExperiencia && dados.experiencia
        ? EXPERIENCIA_LABEL[dados.experiencia]
        : null,
    bio: dados.publicoBio ? dados.bio?.trim() || null : null,
    links,
  };
}

/** O card tem algo além do nome? Sem isso, não vale abrir uma janela vazia. */
export function cartaoTemConteudo(cartao: CartaoPublico): boolean {
  return Boolean(
    cartao.foto ||
    cartao.regiao ||
    cartao.perfilDeUso ||
    cartao.experiencia ||
    cartao.bio ||
    cartao.links.length,
  );
}
