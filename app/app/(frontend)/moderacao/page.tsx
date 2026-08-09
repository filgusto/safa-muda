import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2, PencilLine } from "lucide-react";
import { getViewer, isModerator } from "@/lib/access.ts";
import { listarPropostasPendentes } from "@/lib/wiki.ts";

export const metadata: Metadata = { title: "Moderação · Safa Muda" };
export const dynamic = "force-dynamic";

export default async function ModeracaoPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?destino=/moderacao");
  if (!isModerator(viewer)) redirect("/");

  const pendentes = await listarPropostasPendentes();

  return (
    <main className="container mx-auto max-w-4xl px-6 py-16">
      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Moderação
        </span>
        <h1 className="font-serif text-display-md font-semibold tracking-tight">
          Sugestões pendentes
        </h1>
        <p className="max-w-[60ch] leading-[1.7] text-muted-foreground">
          Confira a fonte antes de aprovar. Na dúvida, rejeite explicando o
          porquê — é assim que o catálogo continua confiável.
        </p>
      </header>

      {pendentes.length === 0 ? (
        <p className="rounded-xl border border-bg-border bg-bg-surface1 p-8 text-center text-sm text-muted-foreground">
          Nenhuma sugestão pendente.
        </p>
      ) : (
        <ul className="space-y-3">
          {pendentes.map((proposta) => {
            const alteracoes = Object.keys(proposta.patch).length;
            const nova = proposta.tipo === "nova_especie";

            return (
              <li key={proposta.id}>
                <Link
                  href={`/moderacao/${proposta.id}`}
                  className="group flex items-start gap-4 rounded-xl border border-bg-border bg-bg-surface1 p-5 transition-all duration-320 hover:border-primary/50"
                >
                  <span className="mt-0.5 shrink-0 rounded-md border border-primary/20 bg-primary/5 p-2 text-primary">
                    {nova ? <FilePlus2 size={16} /> : <PencilLine size={16} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold leading-snug transition-colors duration-240 group-hover:text-primary">
                      {nova
                        ? String(proposta.patch.nomeComum ?? "Espécie nova")
                        : proposta.especieNome}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {nova
                        ? "Nova espécie"
                        : `${alteracoes} campo(s) alterado(s)`}
                      {" · "}
                      {proposta.autorNome ?? "autor removido"}
                      {" · "}
                      {proposta.criadoEm.toLocaleDateString("pt-BR")}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-[1.6] text-muted-foreground/80">
                      Fonte: {proposta.fonte}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
