import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getViewer } from "@/lib/access.ts";
import { FormularioEspecie } from "@/components/wiki/FormularioEspecie.tsx";

export const metadata: Metadata = { title: "Adicionar espécie · Safa Muda" };
export const dynamic = "force-dynamic";

export default async function NovaEspeciePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?destino=/safdex/nova");

  return (
    <main className="container mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/safdex"
        className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-240 hover:text-foreground"
      >
        <ArrowLeft size={13} />
        SAFdex
      </Link>

      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Nova espécie
        </span>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Adicionar espécie
        </h1>
        <p className="max-w-[60ch] leading-[1.7] text-muted-foreground">
          Proponha uma espécie para o SAFdex. Um moderador vai avaliar antes de
          publicar.
        </p>
      </header>

      <FormularioEspecie modo="nova" />
    </main>
  );
}
