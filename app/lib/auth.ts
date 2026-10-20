import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { captcha, emailOTP } from "better-auth/plugins";
import { chavesDoCaptcha, ROTAS_COM_CAPTCHA } from "./captcha.ts";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/index.ts";
import * as schema from "@/db/schema/index.ts";
import { VERSAO_DOS_TERMOS } from "./termos.ts";
import { apagarFotoDePerfil } from "./foto-de-perfil.ts";
import { apagarMidiasPrivadasDaConta } from "./limpeza-de-midia.ts";
import { consumir, MENSAGEM_DE_LIMITE, REGRAS } from "./limite-de-taxa.ts";
import { mascararEmail, registrarErro } from "./observabilidade.ts";
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

/**
 * Endpoints que mandam um código por e-mail a pedido, sem sessão: os do plugin
 * email-otp e o cadastro, que envia o código de confirmação para um endereço
 * que ninguém ainda provou ter.
 */
const ROTAS_QUE_ENVIAM_CODIGO = new Set([
  "/sign-up/email",
  "/email-otp/send-verification-otp",
  "/email-otp/request-password-reset",
  "/forget-password/email-otp",
]);

type Auth = ReturnType<typeof criarAuth>;

let instancia: Auth | undefined;

function criarAuth() {
  const emDesenvolvimento =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  const secret =
    process.env.AUTH_SECRET ||
    (emDesenvolvimento ? "dev-secret-nao-use-em-producao" : undefined);

  // Qualquer ambiente que não seja dev/test (produção, staging, NODE_ENV
  // esquecido) exige um segredo de verdade: um fallback público permitiria
  // forjar sessões.
  if (!secret || (!emDesenvolvimento && secret.length < 32)) {
    throw new Error(
      "AUTH_SECRET é obrigatória, com pelo menos 32 caracteres. Gere com `openssl rand -base64 32`.",
    );
  }

  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

  // Login com Google é opcional: sem as credenciais, o provedor simplesmente
  // não é registrado (diferente de AUTH_SECRET, nenhuma instância exige isto
  // para subir).
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleConfigurado = Boolean(googleClientId && googleClientSecret);

  // CAPTCHA do cadastro: também opcional (ver lib/captcha.ts).
  const chavesCaptcha = chavesDoCaptcha();

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
    secret,
    baseURL,
    trustedOrigins: [baseURL],

    // Vincula automaticamente a uma conta e-mail/senha existente com o
    // mesmo endereço quando a conta local já tem `emailVerified: true`
    // (garantido por `requireEmailVerification` acima) — sem isso, não há
    // configuração extra de `account.accountLinking` a fazer.
    ...(googleConfigurado && {
      socialProviders: {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        },
      },
    }),

    advanced: {
      useSecureCookies: baseURL.startsWith("https://"),
      ipAddress: {
        // Atrás do Traefik o IP do cliente vem em X-Forwarded-For; só se
        // confia nos saltos das redes privadas do Docker, para que um
        // cabeçalho forjado pelo cliente não escolha o IP contado no limite.
        trustedProxies: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
      },
    },

    // Limite por IP, em memória (uma instância do web). Ligado explicitamente:
    // o padrão do Better Auth só liga em NODE_ENV=production.
    rateLimit: {
      enabled: true,
      // Cobre tudo que não tem regra própria abaixo — inclusive
      // /get-session, chamado a cada navegação. Várias pessoas atrás do
      // mesmo NAT/escritório somam requisições rápido; 100/min era curto
      // demais mesmo para uso normal.
      window: 60,
      max: 300,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        // Generoso o bastante para não travar o próprio teste de ponta a
        // ponta (várias contas criadas em paralelo, mesmo IP) sem abrir mão
        // de barrar um script disparando centenas de cadastros por minuto.
        "/sign-up/email": { window: 60, max: 20 },
      },
    },

    emailAndPassword: {
      enabled: true,
      // A conta só entra sozinha depois do código de confirmação (ver o
      // plugin email-otp abaixo) — por isso o cadastro não abre sessão.
      // `requireEmailVerification` recusa o login de quem nunca provou ter o
      // e-mail (sem isso, dava para abrir conta com o e-mail de outra pessoa
      // e escrever em nome dela). Quem cai aqui recebe um código novo
      // (`sendOnSignIn`) e a interface leva para a etapa do código.
      autoSignIn: false,
      requireEmailVerification: true,
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
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    },

    user: {
      // Exclusão de conta (LGPD art. 18, VI), pedida em /conta com a senha
      // atual. O que a pessoa criou e é privado (projetos, propostas) sai em
      // cascata; o que já foi publicado no catálogo (histórico, fotos) fica,
      // sem vínculo com ela — ver a Política de Privacidade.
      deleteUser: {
        enabled: true,
        // A foto de perfil é dado pessoal: sai do armazenamento junto. As
        // fotos dos diários dos projetos da pessoa também — o banco apaga as
        // linhas em cascata, mas não os arquivos.
        beforeDelete: async (usuario) => {
          await apagarFotoDePerfil(usuario.id, usuario.image);
          await apagarMidiasPrivadasDaConta(usuario.id);
        },
      },
      additionalFields: {
        // Versão dos termos aceita no cadastro. `required` faz o servidor
        // recusar cadastro sem ela; o hook abaixo confere que é a vigente.
        termosVersao: { type: "string", required: true, input: true },
        // Definido só pelo servidor (hook abaixo); sem esta declaração o
        // Better Auth descartaria o valor ao gravar o usuário.
        termosAceitosEm: { type: "date", required: false, input: false },
        // Para o cliente flexionar textos dirigidos à pessoa; a gravação
        // passa pela ação atualizarPerfil, não pelo Better Auth.
        tratamento: { type: "string", required: false, input: false },
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          // O papel só muda por ação de admin, nunca pelo próprio usuário.
          input: false,
        },
      },
    },

    databaseHooks: {
      user: {
        create: {
          before: async (novo) => {
            // O cadastro por e-mail/senha já barra a ausência de
            // `termosVersao` em `additionalFields` (required: true) antes de
            // chegar aqui. No cadastro via Google o campo nunca vem
            // preenchido — o fluxo OAuth do Better Auth não manda campos
            // extras — então só confere a versão quando o campo existe, e
            // deixa passar sem ela nesse caso (o aceite fica pendente e
            // aparece no aviso de /conta, igual conta legada).
            if (
              novo.termosVersao !== undefined &&
              novo.termosVersao !== VERSAO_DOS_TERMOS
            ) {
              throw new APIError("BAD_REQUEST", {
                message: "É preciso aceitar os Termos e a Política.",
                code: "TERMS_NOT_ACCEPTED",
              });
            }
            return {
              data: {
                ...novo,
                // O cadastro via Google traz a foto do perfil de lá como URL
                // externa. Não entra: foto de perfil aqui é só arquivo
                // enviado pela pessoa (definirFotoDePerfil), pelo mesmo
                // motivo do hook de update abaixo — e o CSP nem a exibiria.
                image: null,
                termosAceitosEm: novo.termosVersao ? new Date() : undefined,
              },
            };
          },
        },
        update: {
          // O consentimento só muda pelo cadastro ou por aceitarTermos()
          // (app/actions/conta.ts) — nunca por um updateUser do navegador.
          // O Better Auth mescla o retorno com os dados originais, então
          // omitir a chave não basta: ela precisa voltar como `undefined`.
          //
          // O mesmo vale para a foto: `image` só muda por definirFotoDePerfil
          // e removerFotoDePerfil (que conferem o dono do arquivo). Um
          // updateUser do navegador não pode apontá-la para uma URL externa
          // (rastreamento) nem para o arquivo de outra pessoa. O nome é o
          // único campo do perfil editável por aqui, com teto de tamanho.
          before: async (dados) => {
            const nome = (dados as { name?: unknown }).name;
            if (
              nome !== undefined &&
              (typeof nome !== "string" ||
                nome.trim().length === 0 ||
                nome.length > 100)
            ) {
              throw new APIError("BAD_REQUEST", {
                message: "Nome inválido.",
                code: "INVALID_NAME",
              });
            }
            return {
              data: {
                termosVersao: undefined,
                termosAceitosEm: undefined,
                image: undefined,
              },
            };
          },
        },
      },
    },

    // Teto de códigos por ENDEREÇO, além do limite por IP do plugin. Cada
    // código aceita 3 tentativas; quem pede códigos sem parar para o e-mail
    // de outra pessoa ganha 3 palpites por pedido, e o limite por IP não
    // segura quem troca de IP. Com o teto, a conta-alvo recebe no máximo
    // `REGRAS.codigoPorEmail` códigos por hora, venham de onde vierem — o que
    // também impede usar o site para encher a caixa de alguém.
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!ROTAS_QUE_ENVIAM_CODIGO.has(ctx.path)) return;
        const email = (ctx.body as { email?: unknown } | undefined)?.email;
        if (typeof email !== "string") return;
        if (
          !consumir(
            `codigo:${email.trim().toLowerCase()}`,
            REGRAS.codigoPorEmail,
          )
        ) {
          throw new APIError("TOO_MANY_REQUESTS", {
            message: MENSAGEM_DE_LIMITE,
            code: "TOO_MANY_CODES",
          });
        }
      }),
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 dias
      updateAge: 60 * 60 * 24, // renova a cada 24h de uso
    },

    plugins: [
      // Barra o cadastro em massa por script: o limite por IP não segura
      // quem troca de IP, e cada conta criada dispara um e-mail. Só o
      // cadastro: o login já tem limite de tentativas e o Google faz a
      // própria verificação.
      ...(chavesCaptcha
        ? [
            captcha({
              provider: "cloudflare-turnstile",
              secretKey: chavesCaptcha.secretKey,
              endpoints: ROTAS_COM_CAPTCHA,
            }),
          ]
        : []),
      emailOTP({
        // O padrão do plugin é 3 requisições por minuto **por IP, por
        // endpoint** — aperta demais quem está atrás do mesmo NAT/escritório:
        // a terceira pessoa a confirmar a própria conta em menos de um
        // minuto já cairia no limite. O bloqueio por tentativa errada
        // (`allowedAttempts` abaixo) já protege contra força bruta do código.
        rateLimit: { window: 60, max: 15 },
        // Sem isto o plugin manda o código só em fluxos próprios dele
        // (entrar sem senha, trocar e-mail); com isto, ele passa a responder
        // também pelo emailVerification.sendOnSignUp acima.
        overrideDefaultEmailVerification: true,
        // Troca de e-mail: o código vai para o endereço NOVO, e só quando ele
        // bate o e-mail da conta muda. `verifyCurrentEmail` fica desligado —
        // quem está com a sessão aberta já provou quem é.
        changeEmail: { enabled: true, verifyCurrentEmail: false },
        otpLength: 6,
        expiresIn: 60 * 10, // 10 minutos para o usuário checar o e-mail
        sendVerificationOTP: async ({ email, otp, type }) => {
          // O plugin também usa OTP para entrar sem senha — recurso que o
          // Safa Muda não oferece. Só confirmação de cadastro, recuperação
          // de senha e troca de e-mail deveriam chegar aqui.
          if (type === "email-verification") {
            await enviarCodigoDeConfirmacao(email, otp);
            return;
          }
          if (type === "forget-password") {
            await enviarCodigoDeRecuperacao(email, otp);
            return;
          }
          if (type === "change-email") {
            await enviarCodigoDeTrocaDeEmail(email, otp);
            return;
          }
          // Entrar sem senha não existe aqui: não gera código utilizável.
          throw new APIError("BAD_REQUEST", {
            message: "Operação não disponível.",
            code: "OTP_TYPE_NOT_SUPPORTED",
          });
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
    registrarErro(
      "email.recuperacao_falhou",
      { para: mascararEmail(email) },
      erro,
    );
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
    registrarErro(
      "email.confirmacao_falhou",
      { para: mascararEmail(email) },
      erro,
    );
  }
}

/**
 * Código da troca de e-mail, enviado ao endereço NOVO. Mesmo cuidado dos
 * outros: não vai para o log em produção.
 */
async function enviarCodigoDeTrocaDeEmail(email: string, codigo: string) {
  try {
    await enviarEmail({
      para: email,
      assunto: `${codigo} · Confirme seu novo e-mail · Safa Muda`,
      texto: [
        "Use o código abaixo para confirmar este endereço como o e-mail da sua conta no Safa Muda:",
        "",
        codigo,
        "",
        "Ele vale por 10 minutos. Se você não pediu esta troca, ignore este e-mail: nada muda na conta.",
      ].join("\n"),
      html: moldeDeEmail(
        [
          paragrafoDoEmail(
            "Use o código abaixo para confirmar este endereço como o e-mail da sua conta no Safa Muda:",
          ),
          boxDoCodigo(codigo),
          paragrafoDoEmail(
            "Ele vale por 10 minutos. Se você não pediu esta troca, ignore este e-mail: nada muda na conta.",
          ),
        ].join(""),
      ),
    });
  } catch (erro) {
    registrarErro("email.troca_falhou", { para: mascararEmail(email) }, erro);
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
