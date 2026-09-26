"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn, signUp, emailOtp, mensagemDeErro } from "@/lib/auth-client.ts";
import { VERSAO_DOS_TERMOS } from "@/lib/termos.ts";
import { AceiteDosTermos } from "./AceiteDosTermos.tsx";

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
  const [erro, setErro] = useState<string | null>(null);
  const [errosDeCampo, setErrosDeCampo] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  // Só usado no cadastro: a sessão não abre mais no signUp (ver
  // emailAndPassword.autoSignIn em lib/auth.ts), então essa é a segunda
  // etapa, com o código que chegou por e-mail.
  const [aguardandoCodigoPara, setAguardandoCodigoPara] = useState<
    string | null
  >(null);

  function entrarEIr() {
    // Só caminhos internos: aceitar URL absoluta aqui abriria redirecionamento
    // aberto, com a nossa página de login servindo de trampolim.
    const destino = searchParams.get("destino");
    const seguro =
      destino !== null && destino.startsWith("/") && !destino.startsWith("//");
    router.push(seguro ? destino : "/");
    router.refresh();
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

    setEnviando(true);

    const resultado =
      modo === "cadastro"
        ? await signUp.email({
            email,
            password,
            name: String(dados.get("name")),
            termosVersao: VERSAO_DOS_TERMOS,
          })
        : await signIn.email({ email, password });

    setEnviando(false);
    if (resultado.error) {
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
        autoComplete={modo === "cadastro" ? "new-password" : "current-password"}
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
