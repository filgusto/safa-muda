import { asc, eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { speciesRevision, user } from "@/db/schema/index.ts";
import { revisoesVigentes } from "@/core/procedencia.ts";
import type { CartaoPublico } from "@/lib/cartao-publico.ts";
import { cartaoDaLinha, colunasDoCartao } from "@/lib/perfil-publico.ts";
import { nomeParaCredito } from "@/lib/perfil-de-usuario.ts";

export type FonteDaComunidade = {
  /** Chave só para a lista; é o id da revisão, que não identifica ninguém. */
  chave: string;
  fonte: string;
  autor: {
    nome: string;
    /** `null` para quem pediu para não ser identificado ou saiu do site. */
    cartao: CartaoPublico | null;
    /** Só com card: quem pediu para não ser identificado não tem perfil. */
    perfilId: string | null;
  } | null;
};

/**
 * As fontes das sugestões aprovadas que ainda sustentam a ficha, cada uma com
 * quem a contribuiu — moderador ou admin entram como qualquer colaborador: a
 * sugestão deles também passou pela moderação.
 *
 * Só entra a revisão que ainda fornece o valor atual de algum campo (ver
 * `revisoesVigentes`): fonte cujo dado foi substituído não respalda mais nada
 * ali. Feito para leitura pública: id e e-mail nunca vão junto, e o nome sai do
 * jeito que a pessoa pediu para ser citada.
 */
export async function listarFontesDaComunidade(
  speciesId: string,
): Promise<FonteDaComunidade[]> {
  const linhas = await db
    .select({
      id: speciesRevision.id,
      patch: speciesRevision.patch,
      fonte: speciesRevision.fonte,
      autorCitacao: speciesRevision.autorCitacao,
      autorId: speciesRevision.autorId,
      ...colunasDoCartao,
    })
    .from(speciesRevision)
    .leftJoin(user, eq(speciesRevision.autorId, user.id))
    .where(eq(speciesRevision.speciesId, speciesId))
    .orderBy(asc(speciesRevision.criadoEm));

  return revisoesVigentes(linhas).map((linha) => {
    const fonte = { chave: linha.id, fonte: linha.fonte };

    if (linha.name === null) {
      // Conta excluída: vale a citação que a pessoa deixou, sem card.
      return {
        ...fonte,
        autor: linha.autorCitacao
          ? { nome: linha.autorCitacao, cartao: null, perfilId: null }
          : null,
      };
    }

    const cartao = cartaoDaLinha(linha);
    return {
      ...fonte,
      autor: {
        nome: nomeParaCredito(
          linha.name,
          linha.creditoNome,
          linha.creditoNomeOutro,
        ),
        cartao,
        perfilId: cartao ? linha.autorId : null,
      },
    };
  });
}
