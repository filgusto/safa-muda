import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm.tsx";
import { getViewer } from "@/lib/access.ts";

export const metadata: Metadata = { title: "Entrar · Safa Muda" };

// Redireciona quem já está autenticado — depende da sessão.
export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  if (await getViewer()) redirect("/");

  return (
    <main className="container mx-auto max-w-sm px-6 py-24">
      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Acesso
        </span>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Entrar
        </h1>
      </header>

      <AuthForm modo="entrar" />
    </main>
  );
}
