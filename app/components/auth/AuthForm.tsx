"use client";

import { destinoSeguro } from "@/lib/destino-seguro.ts";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn, signUp, emailOtp, mensagemDeErro } from "@/lib/auth-client.ts";
import { VERSAO_DOS_TERMOS } from "@/lib/termos.ts";
import { AceiteDosTermos } from "./AceiteDosTermos.tsx";
import { MENSAGEM_DO_CAPTCHA, useCaptcha } from "./Captcha.tsx";

type Modo = "entrar" | "cadastro";

function mensagemDeValidacao(input: HTMLInputElement): string | null {
  const validade = input.validity;

  if (validade.valid) return null;
  if (validade.valueMissing && input.type === "checkbox") {
    return "Aceite os Termos e a Política para criar a conta.";
  }
  if (validade.valueMissing) return "Preencha este campo.";
  if (validade.typeMismatch && input.type === "email") {
    return "Informe um e-mail válido.";
  }
  if (validade.tooShort) {
    return `Use pelo menos ${input.minLength} caracteres (faltam ${
      input.minLength - input.value.length
    }).`;
  }
  return "Verifique o valor informado.";
}

export function AuthForm({ modo }: { modo: Modo }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [erro, setErro] = useState<string | null>(
    searchParams.get("erro") === "google"
      ? "Não foi possível entrar com o Google. Tente de novo."
      : null,
  );
  const [errosDeCampo, setErrosDeCampo] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [entrandoComGoogle, setEntrandoComGoogle] = useState(false);
  // Só usado no cadastro: a sessão não abre mais no signUp (ver
  // emailAndPassword.autoSignIn em lib/auth.ts), então essa é a segunda
  // etapa, com o código que chegou por e-mail.
  const [aguardandoCodigoPara, setAguardandoCodigoPara] = useState<
    string | null
  >(null);

  // Só o cadastro passa pelo desafio anti-robô (lib/captcha.ts).
  const captcha = useCaptcha(modo === "cadastro");

  function entrarEIr() {
    router.push(destinoSeguro(searchParams.get("destino")));
    router.refresh();
  }

  async function handleGoogle() {
    setErro(null);
    setEntrandoComGoogle(true);
    // Cadastro novo via Google não passa pelo formulário de termos: o botão
    // manda para /conta, que já mostra o aviso de aceite pendente
    // (LinhaDosTermos, em PerfilOpcional.tsx) para quem ainda não aceitou.
    await signIn.social({
      provider: "google",
      callbackURL: destinoSeguro(searchParams.get("destino")),
      newUserCallbackURL: "/conta",
      errorCallbackURL: "/entrar?erro=google",
    });
  }

  async function handleSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const form = evento.currentTarget;
    const entradas = Array.from(form.elements).filter(
      (elemento): elemento is HTMLInputElement =>
        elemento instanceof HTMLInputElement,
    );

    const novosErros: Record<string, string> = {};
    for (const entrada of entradas) {
      const mensagem = mensagemDeValidacao(entrada);
      if (mensagem) novosErros[entrada.name] = mensagem;
    }

    const dados = new FormData(form);
    const email = String(dados.get("email"));
    const password = String(dados.get("password"));

    if (
      modo === "cadastro" &&
      !novosErros.password &&
      password !== String(dados.get("password-confirmation"))
    ) {
      novosErros["password-confirmation"] = "As senhas não coincidem.";
    }

    setErrosDeCampo(novosErros);
    if (Object.keys(novosErros).length > 0) {
      entradas.find((entrada) => novosErros[entrada.name])?.focus();
      return;
    }

    if (captcha.exigido && !captcha.token) {
      setErro(MENSAGEM_DO_CAPTCHA);
      return;
    }

    setEnviando(true);

    const resultado =
      modo === "cadastro"
        ? await signUp.email(
            {
              email,
              password,
              name: String(dados.get("name")),
              termosVersao: VERSAO_DOS_TERMOS,
            },
            { headers: captcha.cabecalhos },
          )
        : await signIn.email({ email, password });

    setEnviando(false);
    // A resposta do desafio vale para uma tentativa só.
    captcha.reiniciar();
    if (resultado.error) {
      // Conta que nunca confirmou o e-mail: o servidor já mandou um código
      // novo (sendOnSignIn), então vai direto para a etapa do código.
      if (resultado.error.code === "EMAIL_NOT_VERIFIED") {
        setAguardandoCodigoPara(email);
        return;
      }
      setErro(mensagemDeErro(resultado.error));
      return;
    }

    if (modo === "cadastro") {
      setAguardandoCodigoPara(email);
      return;
    }

    entrarEIr();
  }

  if (aguardandoCodigoPara) {
    return (
      <EtapaDeCodigo
        email={aguardandoCodigoPara}
        voltar={() => setAguardandoCodigoPara(null)}
        concluir={entrarEIr}
      />
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={entrandoComGoogle}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-transparent px-8 py-2.5 text-sm font-medium text-foreground transition-colors duration-240 hover:bg-muted active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        {entrandoComGoogle ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {modo === "cadastro"
          ? "Criar conta com o Google"
          : "Entrar com o Google"}
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        ou
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {modo === "cadastro" && (
          <Campo
            id="name"
            name="name"
            label="Nome"
            type="text"
            autoComplete="name"
            required
            erro={errosDeCampo.name}
          />
        )}

        <Campo
          id="email"
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          erro={errosDeCampo.email}
        />

        <Campo
          id="password"
          name="password"
          label="Senha"
          type="password"
          autoComplete={
            modo === "cadastro" ? "new-password" : "current-password"
          }
          required
          minLength={8}
          hint={modo === "cadastro" ? "Mínimo de 8 caracteres." : undefined}
          erro={errosDeCampo.password}
        />

        {modo === "cadastro" && (
          <Campo
            id="password-confirmation"
            name="password-confirmation"
            label="Confirme sua senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            erro={errosDeCampo["password-confirmation"]}
          />
        )}

        {modo === "cadastro" && (
          <AceiteDosTermos id="termos" erro={errosDeCampo.termos} />
        )}

        {captcha.elemento}

        {erro && (
          <p
            role="alert"
            className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-900 dark:text-red-200"
          >
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="inline-flex w-full items-center justify-center rounded-md border border-primary bg-transparent px-8 py-2.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_0_rgba(63,175,92,0.3)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
          {modo === "cadastro" ? "Criar conta" : "Entrar"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          {modo === "cadastro" ? (
            <>
              Já tem conta?{" "}
              <Link href="/entrar" className="bio-link">
                Entrar
              </Link>
            </>
          ) : (
            <>
              Ainda não tem conta?{" "}
              <Link href="/cadastro" className="bio-link">
                Criar conta
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

/**
 * Segunda etapa do cadastro: o código de 6 dígitos que chegou por e-mail.
 * Confirmar aqui já abre a sessão (autoSignInAfterVerification, em
 * lib/auth.ts) — não tem um passo de login separado depois.
 */
function EtapaDeCodigo({
  email,
  voltar,
  concluir,
}: {
  email: string;
  voltar: () => void;
  concluir: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<
    "confirmar" | "reenviar" | null
  >(null);

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    setEmAndamento("confirmar");

    const { error } = await emailOtp.verifyEmail({ email, otp: codigo.trim() });

    setEmAndamento(null);
    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }

    concluir();
  }

  async function reenviar() {
    setErro(null);
    setAviso(null);
    setEmAndamento("reenviar");

    const { error } = await emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });

    setEmAndamento(null);
    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }
    setAviso("Enviamos um novo código.");
  }

  return (
    <form onSubmit={confirmar} className="space-y-5">
      <p className="max-w-[60ch] leading-[1.7] text-muted-foreground">
        Enviamos um código para{" "}
        <strong className="text-foreground">{email}</strong>. Olhe sua caixa de
        entrada (e o spam) e cole o código abaixo.
      </p>

      <Campo
        id="otp"
        name="otp"
        label="Código de confirmação"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        autoFocus
        maxLength={6}
        value={codigo}
        onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, ""))}
        className="text-center font-mono text-lg tracking-[0.5em]"
        erro={erro ?? undefined}
      />

      {aviso && (
        <p
          role="status"
          className="rounded-lg border-l-4 border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {aviso}
        </p>
      )}

      <button
        type="submit"
        disabled={emAndamento !== null || codigo.length < 6}
        className="inline-flex w-full items-center justify-center rounded-md border border-primary bg-transparent px-8 py-2.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_0_rgba(63,175,92,0.3)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        {emAndamento === "confirmar" && (
          <Loader2 size={16} className="mr-2 animate-spin" />
        )}
        Confirmar código
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={voltar}
          disabled={emAndamento !== null}
          className="bio-link disabled:pointer-events-none disabled:opacity-50"
        >
          Usar outro e-mail
        </button>
        <button
          type="button"
          onClick={reenviar}
          disabled={emAndamento !== null}
          className="inline-flex items-center bio-link disabled:pointer-events-none disabled:opacity-50"
        >
          {emAndamento === "reenviar" && (
            <Loader2 size={13} className="mr-1.5 animate-spin" />
          )}
          Reenviar código
        </button>
      </div>
    </form>
  );
}

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function Campo({
  id,
  label,
  hint,
  erro,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  erro?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block font-mono text-xs uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        {...props}
        className={`w-full rounded-md border bg-input px-3 py-2 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:outline-none focus-visible:ring-1 ${
          erro
            ? "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/50"
            : "border-border focus-visible:border-primary focus-visible:ring-ring"
        } ${className ?? ""}`}
      />
      {erro ? (
        <p
          id={`${id}-erro`}
          role="alert"
          className="text-xs text-red-600 dark:text-red-400"
        >
          {erro}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
