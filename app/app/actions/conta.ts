"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { db } from "@/db/index.ts";
import { media, speciesRevision, user } from "@/db/schema/index.ts";
import { auth } from "@/lib/auth.ts";
import { requireViewer, AccessError } from "@/lib/access.ts";
import { apagarFotoDePerfil } from "@/lib/foto-de-perfil.ts";
import { validarRegiao } from "@/lib/ibge.ts";
import {
  CAMPOS_DE_PERFIL,
  DESTINOS_DAS_CONTRIBUICOES,
  citacaoAoExcluir,
  type DestinoDasContribuicoes,
  normalizarCampoDePerfil,
  normalizarCitacao,
  normalizarPerfilDeUso,
  type CampoDePerfil,
} from "@/lib/perfil-de-usuario.ts";
import { VERSAO_DOS_TERMOS } from "@/lib/termos.ts";

/**
 * Ações da área do usuário (/conta) que o Better Auth não cobre: o perfil
 * opcional, o aceite dos termos e a foto de perfil.
 *
 * Tudo age só sobre a sessão de quem chama — nenhuma recebe um id de usuário.
 */

export interface Resultado {
  ok: boolean;
  erro?: string;
}

function tratar(erro: unknown): Resultado {
  if (erro instanceof AccessError) return { ok: false, erro: erro.message };
  console.error("Falha em ação da conta:", erro);
  return { ok: false, erro: "Não foi possível concluir. Tente de novo." };
}

/**
 * Grava um campo do perfil. Valida e normaliza no servidor: a tela ajuda, mas
 * quem garante é a ação (links viram URLs canônicas, opções são conferidas).
 */
export async function atualizarPerfil(
  campo: CampoDePerfil,
  valor: unknown,
): Promise<Resultado & { valor?: string | boolean | null }> {
  try {
    const viewer = await requireViewer();

    if (!CAMPOS_DE_PERFIL.includes(campo)) {
      return { ok: false, erro: "Campo desconhecido." };
    }
    const resultado = normalizarCampoDePerfil(campo, valor);
    if (!resultado.ok) return { ok: false, erro: resultado.erro };

    // A região é "Cidade, UF" do IBGE: o servidor confere, porque a tela só
    // oferece a lista, mas a ação aceita qualquer texto que chegue nela.
    let valorFinal = resultado.valor;
    if (campo === "regiao" && typeof valorFinal === "string") {
      const regiao = await validarRegiao(valorFinal);
      if (!regiao.ok) return { ok: false, erro: regiao.erro };
      valorFinal = regiao.valor;
    }

    await db
      .update(user)
      // A coluna tem o mesmo nome do campo (ver db/schema/auth.ts).
      .set({ [campo]: valorFinal, updatedAt: new Date() })
      .where(eq(user.id, viewer.id));

    return { ok: true, valor: valorFinal };
  } catch (erro) {
    return tratar(erro);
  }
}

/** Perfil de uso, com o texto livre quando a escolha é "Outro". */
export async function atualizarPerfilDeUso(
  perfil: string | null,
  outro: string | null,
): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    const resultado = normalizarPerfilDeUso(perfil, outro);
    if (!resultado.ok) return { ok: false, erro: resultado.erro };

    await db
      .update(user)
      .set({
        perfilDeUso: resultado.perfil,
        perfilDeUsoOutro: resultado.outro,
        updatedAt: new Date(),
      })
      .where(eq(user.id, viewer.id));
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/** Como a pessoa é citada, com o texto livre quando a escolha é "Outro". */
export async function atualizarCitacao(
  citacao: string | null,
  outro: string | null,
): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    const resultado = normalizarCitacao(citacao, outro);
    if (!resultado.ok) return { ok: false, erro: resultado.erro };

    await db
      .update(user)
      .set({
        creditoNome: resultado.citacao,
        creditoNomeOutro: resultado.outro,
        updatedAt: new Date(),
      })
      .where(eq(user.id, viewer.id));
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Aceite dos termos por quem já tinha conta antes do registro de
 * consentimento (contas novas aceitam no cadastro).
 */
export async function aceitarTermos(): Promise<Resultado> {
  try {
    const viewer = await requireViewer();
    await db
      .update(user)
      .set({
        termosVersao: VERSAO_DOS_TERMOS,
        termosAceitosEm: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(user.id, viewer.id));
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Passa a usar uma imagem já enviada (/api/media/upload) como foto de perfil
 * e apaga a anterior do armazenamento. `publica` é a escolha de "Tornar
 * pública" feita no modal da foto.
 */
export async function definirFotoDePerfil(
  publicUrl: string,
  publica: boolean,
): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    if (!publicUrl.startsWith("/media/")) {
      return { ok: false, erro: "Imagem inválida." };
    }
    const key = publicUrl.slice("/media/".length);

    // Só serve uma imagem que a própria pessoa enviou: sem isto, bastaria
    // conhecer a chave da foto de outra pessoa para usá-la como sua.
    const [enviada] = await db
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.key, key), eq(media.uploadedBy, viewer.id)));
    if (!enviada) return { ok: false, erro: "Imagem não encontrada." };

    const anterior = viewer.image;
    await db
      .update(user)
      .set({ image: publicUrl, publicoFoto: publica, updatedAt: new Date() })
      .where(eq(user.id, viewer.id));

    if (anterior && anterior !== publicUrl) {
      await apagarFotoDePerfil(viewer.id, anterior);
    }
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

export async function removerFotoDePerfil(): Promise<Resultado> {
  try {
    const viewer = await requireViewer();
    const anterior = viewer.image;

    await db
      .update(user)
      // Uma foto nova é uma nova decisão: nada fica público por herança.
      .set({ image: null, publicoFoto: false, updatedAt: new Date() })
      .where(eq(user.id, viewer.id));

    await apagarFotoDePerfil(viewer.id, anterior);
    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}

/**
 * Exclui a conta de quem chama, com a senha e a escolha sobre as contribuições
 * já publicadas.
 *
 * Passa pelo servidor (e não pelo `deleteUser` do navegador) porque a citação
 * precisa ser guardada nas contribuições ANTES de a conta sumir: depois, o
 * vínculo com a pessoa já foi desfeito (`on delete set null`) e não há mais de
 * onde tirar o nome. Se a senha estiver errada, a cópia é desfeita.
 */
export async function excluirConta(
  senha: string,
  destino: string,
): Promise<Resultado> {
  try {
    const viewer = await requireViewer();

    if (!(DESTINOS_DAS_CONTRIBUICOES as readonly string[]).includes(destino)) {
      return {
        ok: false,
        erro: "Escolha o que fazer com as suas contribuições.",
      };
    }
    if (!senha) return { ok: false, erro: "Digite sua senha para confirmar." };

    const [dados] = await db
      .select({
        nome: user.name,
        creditoNome: user.creditoNome,
        creditoNomeOutro: user.creditoNomeOutro,
      })
      .from(user)
      .where(eq(user.id, viewer.id));
    if (!dados) return { ok: false, erro: "Conta não encontrada." };

    // Só texto, nunca links: a citação guardada não leva a perfis externos.
    await db
      .update(speciesRevision)
      .set({
        autorCitacao: citacaoAoExcluir(
          destino as DestinoDasContribuicoes,
          dados.nome,
          dados.creditoNome,
          dados.creditoNomeOutro,
        ),
      })
      .where(eq(speciesRevision.autorId, viewer.id));

    try {
      await auth.api.deleteUser({
        body: { password: senha },
        headers: await headers(),
      });
    } catch (falha) {
      await db
        .update(speciesRevision)
        .set({ autorCitacao: null })
        .where(eq(speciesRevision.autorId, viewer.id));

      const codigo =
        falha instanceof APIError
          ? (falha.body as { code?: string } | undefined)?.code
          : undefined;
      if (codigo === "INVALID_PASSWORD") {
        return { ok: false, erro: "A senha está incorreta." };
      }
      throw falha;
    }

    return { ok: true };
  } catch (erro) {
    return tratar(erro);
  }
}
