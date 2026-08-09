import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/index.ts";
import * as schema from "@/db/schema/index.ts";

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
      // Verificação por e-mail exige SMTP configurado; fica para quando houver
      // deploy público. Em dev, o cadastro é imediato.
      requireEmailVerification: false,
      minPasswordLength: 8,
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

    // Precisa ser o último plugin: adapta o set-cookie ao runtime do Next.
    plugins: [nextCookies()],
  });
}

function obterAuth(): Auth {
  if (!instancia) instancia = criarAuth();
  return instancia;
}

export const auth = new Proxy({} as Auth, {
  get: (_alvo, propriedade) => Reflect.get(obterAuth(), propriedade),
});

export type Session = Auth["$Infer"]["Session"];
