import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sprout } from "lucide-react";
import { getViewer } from "@/lib/access.ts";
import { listarProjetosDoUsuario } from "@/lib/projetos.ts";

export const metadata: Metadata = { title: "Projetos · Safa Muda" };
export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?destino=/projetos");

  const projetos = await listarProjetosDoUsuario(viewer.id);

  return (
    <main className="container mx-auto max-w-4xl px-6 py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Planejamento
          </span>
          <h1 className="font-serif text-display-md font-semibold tracking-tight">
            Meus projetos
          </h1>
        </div>
        <Link
          href="/projetos/novo"
          className="inline-flex items-center gap-2 rounded-md border border-primary bg-transparent px-5 py-2 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-bg-base active:scale-[0.98]"
        >
          <Plus size={15} />
          Novo projeto
        </Link>
      </header>

      {projetos.length === 0 ? (
        <div className="rounded-xl border border-bg-border bg-bg-surface1 p-8 text-center">
          <Sprout
            size={28}
            className="mx-auto mb-3 text-primary/60"
            aria-hidden="true"
          />
          <p className="mx-auto max-w-[46ch] text-sm leading-[1.7] text-muted-foreground">
            Um projeto é o desenho de uma agrofloresta no tempo: quem entra,
            quando, e em que andar. Comece definindo a data de implantação e o
            horizonte que você quer enxergar.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projetos.map((projeto) => (
            <li key={projeto.id}>
              <Link
                href={`/projetos/${projeto.id}`}
                className="group flex h-full flex-col rounded-xl border border-bg-border bg-bg-surface1 p-5 transition-all duration-320 hover:border-primary/50"
              >
                <h2 className="font-semibold leading-snug transition-colors duration-240 group-hover:text-primary">
                  {projeto.nome}
                </h2>
                {projeto.descricao && (
                  <p className="mt-1 line-clamp-2 text-sm leading-[1.6] text-muted-foreground">
                    {projeto.descricao}
                  </p>
                )}
                <p className="mt-auto pt-4 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  <span className="metric">{projeto.totalDePlantios}</span>{" "}
                  plantios ·{" "}
                  <span className="metric">{projeto.horizonteMeses / 12}</span>{" "}
                  anos · início em{" "}
                  {projeto.dataInicio.toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
