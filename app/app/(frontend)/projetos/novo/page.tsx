import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getViewer } from "@/lib/access.ts";
import { FormularioDeProjeto } from "@/components/planejador/FormularioDeProjeto.tsx";

export const metadata: Metadata = { title: "Novo projeto · Safa Muda" };
export const dynamic = "force-dynamic";

export default async function NovoProjetoPage() {
  if (!(await getViewer())) redirect("/entrar?destino=/projetos/novo");

  return (
    <main className="container mx-auto max-w-lg px-6 py-16">
      <Link
        href="/projetos"
        className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-240 hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Projetos
      </Link>

      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Planejamento
        </span>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Novo projeto
        </h1>
      </header>

      <FormularioDeProjeto />
    </main>
  );
}
