import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getViewer, isModerator } from "@/lib/access.ts";
import { listarSugestoesPendentes } from "@/lib/sugestoes.ts";
import { TabelaDeSugestoes } from "@/components/admin/TabelaDeSugestoes.tsx";

export const metadata: Metadata = {
  title: "Revisar sugestões · Safa Muda",
};
export const dynamic = "force-dynamic";

export default async function SugestoesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?destino=/admin/sugestoes");
  if (!isModerator(viewer)) redirect("/");

  const sugestoes = await listarSugestoesPendentes();

  return (
    <main className="container mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/admin"
        className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-240 hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Administração
      </Link>

      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Catálogo
        </span>
        <h1 className="font-serif text-display-md font-semibold tracking-tight">
          Revisar sugestões
        </h1>
        <p className="max-w-[60ch] leading-[1.7] text-muted-foreground">
          Confira a fonte antes de aceitar. Na dúvida, rejeite explicando o
          porquê — é assim que o catálogo continua confiável.
        </p>
      </header>

      {sugestoes.length === 0 ? (
        <p className="rounded-xl border border-bg-border bg-bg-surface1 p-8 text-center text-sm text-muted-foreground">
          Nenhuma sugestão aguardando avaliação.
        </p>
      ) : (
        <TabelaDeSugestoes sugestoes={sugestoes} />
      )}
    </main>
  );
}
