import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm.tsx";
import { getViewer } from "@/lib/access.ts";

export const metadata: Metadata = { title: "Criar conta · Safa Muda" };

// Redireciona quem já está autenticado — depende da sessão.
export const dynamic = "force-dynamic";

export default async function CadastroPage() {
  if (await getViewer()) redirect("/");

  return (
    <main className="container mx-auto max-w-sm px-6 py-24">
      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Acesso
        </span>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Criar conta
        </h1>
        <p className="text-sm leading-[1.7] text-muted-foreground">
          O catálogo é público. A conta serve para propor edições e criar seus
          projetos de plantio.
        </p>
      </header>

      <AuthForm modo="cadastro" />
    </main>
  );
}
