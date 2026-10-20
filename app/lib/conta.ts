import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { account, user } from "@/db/schema/index.ts";
import type { PerfilDaConta } from "@/lib/perfil-de-usuario.ts";

/** Perfil opcional e consentimento de uma conta, lidos direto do banco. */
export async function obterPerfilDaConta(
  userId: string,
): Promise<PerfilDaConta> {
  const [linha] = await db
    .select({
      regiao: user.regiao,
      perfilDeUso: user.perfilDeUso,
      perfilDeUsoOutro: user.perfilDeUsoOutro,
      experiencia: user.experiencia,
      tratamento: user.tratamento,
      bio: user.bio,
      linkInstagram: user.linkInstagram,
      linkSite: user.linkSite,
      linkLattes: user.linkLattes,
      creditoNome: user.creditoNome,
      creditoNomeOutro: user.creditoNomeOutro,
      avisoPorEmail: user.avisoPorEmail,
      publicoFoto: user.publicoFoto,
      publicoRegiao: user.publicoRegiao,
      publicoPerfilDeUso: user.publicoPerfilDeUso,
      publicoExperiencia: user.publicoExperiencia,
      publicoBio: user.publicoBio,
      publicoInstagram: user.publicoInstagram,
      publicoSite: user.publicoSite,
      publicoLattes: user.publicoLattes,
      citarInstagram: user.citarInstagram,
      citarSite: user.citarSite,
      citarLattes: user.citarLattes,
      termosVersao: user.termosVersao,
      termosAceitosEm: user.termosAceitosEm,
    })
    .from(user)
    .where(eq(user.id, userId));

  if (!linha) throw new Error("Conta não encontrada.");
  return {
    ...linha,
    temSenha: await contaTemSenha(userId),
    termosAceitosEm: linha.termosAceitosEm?.toISOString() ?? null,
  };
}

/**
 * A conta tem senha própria? Quem se cadastrou pelo Google não tem — e aí o
 * que pede "sua senha" para confirmar (excluir a conta) precisa de outro
 * caminho.
 */
export async function contaTemSenha(userId: string): Promise<boolean> {
  const [credencial] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "credential"),
        isNotNull(account.password),
      ),
    )
    .limit(1);
  return Boolean(credencial);
}
