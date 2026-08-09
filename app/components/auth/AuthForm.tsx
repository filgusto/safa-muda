"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client.ts";

type Modo = "entrar" | "cadastro";

export function AuthForm({ modo }: { modo: Modo }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get("email"));
    const password = String(dados.get("password"));

    const resultado =
      modo === "cadastro"
        ? await signUp.email({
            email,
            password,
            name: String(dados.get("name")),
          })
        : await signIn.email({ email, password });

    if (resultado.error) {
      setErro(resultado.error.message ?? "Não foi possível continuar.");
      setEnviando(false);
      return;
    }

    // Só caminhos internos: aceitar URL absoluta aqui abriria redirecionamento
    // aberto, com a nossa página de login servindo de trampolim.
    const destino = searchParams.get("destino");
    const seguro =
      destino !== null && destino.startsWith("/") && !destino.startsWith("//");
    router.push(seguro ? destino : "/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {modo === "cadastro" && (
        <Campo
          id="name"
          name="name"
          label="Nome"
          type="text"
          autoComplete="name"
          required
        />
      )}

      <Campo
        id="email"
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        required
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
      />

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
        className="inline-flex w-full items-center justify-center rounded-md border border-primary bg-transparent px-8 py-2.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-bg-base hover:shadow-[0_0_20px_0_rgba(63,175,92,0.3)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
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

function Campo({
  id,
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
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
        {...props}
        className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
