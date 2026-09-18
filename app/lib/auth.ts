import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/index.ts";
import * as schema from "@/db/schema/index.ts";
import {
  enviarEmail,
  moldeDeEmail,
  paragrafoDoEmail,
  boxDoCodigo,
} from "./email.ts";

/**
 * Configuração do Better Auth.
 *
 * Inicialização preguiçosa pelo mesmo motivo de db/index.ts: `next build` roda
 * com NODE_ENV=production e importa este módulo antes de AUTH_SECRET existir.
 * Validar no topo do módulo quebraria o build.
 */

type Auth = ReturnType<typeof criarAuth>;

let instancia: Auth | undefined;

function criarAuth() {
  const secret = process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET é obrigatória em produção. Gere com `openssl rand -base64 32`.",
    );
  }

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: secret ?? "dev-secret-nao-use-em-producao",
    baseURL: process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000",

    emailAndPassword: {
      enabled: true,
      // A conta só entra sozinha depois do código de confirmação (ver o
      // plugin email-otp abaixo) — por isso o cadastro não abre sessão.
      // `requireEmailVerification` fica false de propósito: aquela flag
      // também bloquearia o LOGIN de quem nunca confirmou (inclusive contas
      // já existentes, criadas antes deste recurso), o que não foi pedido.
      autoSignIn: false,
      requireEmailVerification: false,
      minPasswordLength: 8,
      // Redefinir a senha encerra as outras sessões: se alguém tinha a senha
      // antiga, perde o acesso junto.
      revokeSessionsOnPasswordReset: true,
    },

    // sendOnSignUp dispara o envio a cada cadastro, mesmo sem exigir
    // verificação para logar depois (ver o comentário acima). O plugin
    // email-otp substitui o link padrão por um código de 6 dígitos, e
    // autoSignInAfterVerification é o que abre a sessão quando o código bate.
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
    },

    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          // O papel só muda por ação de admin, nunca pelo próprio usuário.
          input: false,
        },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 dias
      updateAge: 60 * 60 * 24, // renova a cada 24h de uso
    },

    plugins: [
      emailOTP({
        // Sem isto o plugin manda o código só em fluxos próprios dele
        // (entrar sem senha, trocar e-mail); com isto, ele passa a responder
        // também pelo emailVerification.sendOnSignUp acima.
        overrideDefaultEmailVerification: true,
        otpLength: 6,
        expiresIn: 60 * 10, // 10 minutos para o usuário checar o e-mail
        sendVerificationOTP: async ({ email, otp, type }) => {
          // O plugin também usa OTP para entrar sem senha e para trocar
          // e-mail — recursos que o Safa Muda não oferece. Só confirmação de
          // cadastro e recuperação de senha deveriam chegar aqui.
          if (type === "email-verification") {
            await enviarCodigoDeConfirmacao(email, otp);
            return;
          }
          if (type === "forget-password") {
            await enviarCodigoDeRecuperacao(email, otp);
            return;
          }
          console.error(`Pedido de OTP do tipo "${type}" sem tratamento.`);
        },
      }),
      // Precisa ser o último plugin: adapta o set-cookie ao runtime do Next.
      nextCookies(),
    ],
  });
}

/**
 * Código de recuperação de senha. Em produção não vai para o log, nem em caso
 * de falha: quem lê o log poderia tomar a conta. Em dev o e-mail cai no
 * Mailpit (ver docker-compose.yml).
 */
async function enviarCodigoDeRecuperacao(email: string, codigo: string) {
  try {
    await enviarEmail({
      para: email,
      assunto: `${codigo} · Código de recuperação · Safa Muda`,
      texto: [
        "Recebemos um pedido para redefinir a senha da sua conta no Safa Muda.",
        "Use o código abaixo para continuar:",
        "",
        codigo,
        "",
        "Ele vale por 10 minutos. Se não foi você, ignore este e-mail: sua senha continua a mesma.",
      ].join("\n"),
      html: moldeDeEmail(
        [
          paragrafoDoEmail(
            "Recebemos um pedido para redefinir a senha da sua conta no Safa Muda. Use o código abaixo para continuar:",
          ),
          boxDoCodigo(codigo),
          paragrafoDoEmail(
            "Ele vale por 10 minutos. Se não foi você, ignore este e-mail: sua senha continua a mesma.",
          ),
        ].join(""),
      ),
    });
  } catch (erro) {
    console.error(`Falha ao enviar código de recuperação para ${email}:`, erro);
  }
}

/**
 * Código de confirmação do cadastro. Igual à recuperação de senha, não vai
 * para o log em produção — o código sozinho não abre a conta de ninguém
 * (precisa também da senha), mas ainda assim é um segredo de curta duração.
 */
async function enviarCodigoDeConfirmacao(email: string, codigo: string) {
  try {
    await enviarEmail({
      para: email,
      assunto: `${codigo} · Código de confirmação · Safa Muda`,
      texto: [
        "Use o código abaixo para confirmar seu cadastro no Safa Muda:",
        "",
        codigo,
        "",
        "Ele vale por 10 minutos. Se você não pediu este cadastro, ignore este e-mail.",
      ].join("\n"),
      html: moldeDeEmail(
        [
          paragrafoDoEmail(
            "Use o código abaixo para confirmar seu cadastro no Safa Muda:",
          ),
          boxDoCodigo(codigo),
          paragrafoDoEmail(
            "Ele vale por 10 minutos. Se você não pediu este cadastro, ignore este e-mail.",
          ),
        ].join(""),
      ),
    });
  } catch (erro) {
    console.error(`Falha ao enviar código de confirmação para ${email}:`, erro);
  }
}

function obterAuth(): Auth {
  if (!instancia) instancia = criarAuth();
  return instancia;
}

export const auth = new Proxy({} as Auth, {
  get: (_alvo, propriedade) => Reflect.get(obterAuth(), propriedade),
});

export type Session = Auth["$Infer"]["Session"];
