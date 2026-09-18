"use client";

import { useSyncExternalStore } from "react";
import { createAuthClient } from "better-auth/react";
import {
  emailOTPClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000",
  plugins: [
    emailOTPClient(),
    // Espelha o `role` de lib/auth.ts, para que `useSession` o tipe. É só
    // para a interface decidir o que mostrar — a autorização de verdade
    // continua no servidor (lib/access.ts).
    inferAdditionalFields({
      user: { role: { type: "string", required: false, input: false } },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession, emailOtp } = authClient;

const nuncaMuda = () => () => {};

/**
 * `useSession`, mas sem sessão até a hidratação terminar.
 *
 * O `useSession` do Better Auth usa o mesmo snapshot no servidor e no
 * cliente. No SSR a sessão é sempre nula; no navegador, o client busca a
 * sessão assim que o módulo carrega e, se a resposta chega antes da
 * hidratação, o primeiro render já a enxerga — e o HTML diverge do servidor
 * (erro de hidratação). Use este hook em todo componente renderizado no
 * servidor que mostra ou esconde algo conforme a sessão.
 */
export function useSessaoHidratada() {
  const resultado = useSession();
  const hidratado = useSyncExternalStore(
    nuncaMuda,
    () => true,
    () => false,
  );
  return hidratado ? resultado : { ...resultado, data: null, isPending: true };
}

/**
 * O Better Auth devolve mensagens em inglês. A interface é pt-BR, então os
 * códigos que o usuário pode encontrar são traduzidos aqui; o resto cai numa
 * mensagem genérica em vez de vazar o texto em inglês.
 */
const MENSAGENS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_EMAIL: "E-mail inválido.",
  INVALID_PASSWORD: "Senha incorreta.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "Senha longa demais.",
  USER_ALREADY_EXISTS: "Já existe uma conta com esse e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com esse e-mail.",
  INVALID_OTP: "Código incorreto.",
  OTP_EXPIRED: "Este código expirou. Peça um novo.",
  TOO_MANY_ATTEMPTS: "Muitas tentativas com código errado. Peça um novo.",
};

export function mensagemDeErro(
  erro: { code?: string; status?: number } | null | undefined,
): string {
  if (erro?.status === 429) {
    return "Muitas tentativas seguidas. Espere um pouco e tente de novo.";
  }
  return (
    (erro?.code && MENSAGENS[erro.code]) ||
    "Não foi possível continuar. Tente de novo."
  );
}
