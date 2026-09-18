import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { getViewer, isModerator } from "@/lib/access.ts";
import { contarSugestoesPendentes } from "@/lib/sugestoes.ts";

export const metadata: Metadata = { title: "Administração · Safa Muda" };
export const dynamic = "force-dynamic";

/**
 * Área da equipe. Aberta a moderadores e admins: é o mesmo corte que as
 * actions de aprovação já fazem (`requireModerator`), então esconder a tela de
 * um papel que pode agir seria só atrapalhar.
 */
export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?destino=/admin");
  if (!isModerator(viewer)) redirect("/");

  const pendentes = await contarSugestoesPendentes();

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Equipe Safa Muda
        </span>
        <h1 className="font-serif text-display-md font-semibold tracking-tight">
          Administração
        </h1>
      </header>

      <Link
        href="/admin/sugestoes"
        className="group flex items-center gap-4 rounded-xl border border-bg-border bg-bg-surface1 p-5 transition-all duration-320 hover:border-primary/50"
      >
        <span className="shrink-0 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-primary">
          <ClipboardCheck size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-snug transition-colors duration-240 group-hover:text-primary">
            Revisar sugestões do catálogo
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pendentes === 0
              ? "Nenhuma sugestão aguardando."
              : `${pendentes} ${pendentes === 1 ? "sugestão aguardando" : "sugestões aguardando"} avaliação.`}
          </p>
        </div>
        <ArrowRight
          size={16}
          className="shrink-0 text-muted-foreground transition-transform duration-240 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </Link>
    </main>
  );
}
