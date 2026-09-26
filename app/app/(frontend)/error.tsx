"use client";

import Link from "next/link";

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-serif text-3xl">Algo deu errado</h1>
      <p className="mt-4 text-muted-foreground">
        Não foi possível carregar esta página agora. Tente de novo em instantes.
      </p>
      <p className="mt-8 flex justify-center gap-6">
        <button type="button" onClick={reset} className="bio-link">
          Tentar de novo
        </button>
        <Link href="/" className="bio-link">
          Voltar ao início
        </Link>
      </p>
    </main>
  );
}
