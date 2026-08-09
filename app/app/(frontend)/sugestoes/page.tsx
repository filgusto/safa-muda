import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getViewer } from "@/lib/access.ts";
import { listarPropostasDoAutor } from "@/lib/wiki.ts";
import { Diff } from "@/components/wiki/Diff.tsx";
import type { ChangeProposal } from "@/db/schema/wiki.ts";

export const metadata: Metadata = { title: "Minhas sugestões · Safa Muda" };
export const dynamic = "force-dynamic";

export default async function SugestoesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?destino=/sugestoes");

  const propostas = await listarPropostasDoAutor(viewer.id);

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Contribuições
          </span>
          <h1 className="font-serif text-display-md font-semibold tracking-tight">
            Minhas sugestões
          </h1>
        </div>
        <Link
          href="/sugestoes/nova"
          className="inline-flex items-center gap-2 rounded-md border border-primary bg-transparent px-5 py-2 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-bg-base active:scale-[0.98]"
        >
          <Plus size={15} />
          Propor espécie
        </Link>
      </header>

      {propostas.length === 0 ? (
        <p className="rounded-xl border border-bg-border bg-bg-surface1 p-8 text-center text-sm leading-[1.7] text-muted-foreground">
          Você ainda não enviou nenhuma sugestão. Abra qualquer espécie do{" "}
          <Link href="/catalogo" className="bio-link">
            catálogo
          </Link>{" "}
          e use &ldquo;sugerir correção&rdquo;.
        </p>
      ) : (
        <ul className="space-y-4">
          {propostas.map((proposta) => (
            <li
              key={proposta.id}
              className="rounded-xl border border-bg-border bg-bg-surface1 p-5"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold leading-snug">
                    {proposta.tipo === "nova_especie"
                      ? String(proposta.patch.nomeComum ?? "Espécie nova")
                      : proposta.especieNome}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {proposta.tipo === "nova_especie"
                      ? "Nova espécie"
                      : "Edição"}
                    {" · "}
                    {proposta.criadoEm.toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Selo status={proposta.status} />
              </div>

              <Diff patch={proposta.patch} />

              {proposta.notaDaRevisao && (
                <p className="mt-3 rounded-lg border-l-4 border-blue-500/30 bg-blue-500/5 p-3 text-sm leading-[1.7] text-blue-900 dark:text-blue-200">
                  {proposta.notaDaRevisao}
                </p>
              )}

              {proposta.status === "aprovada" && proposta.especieSlug && (
                <Link
                  href={`/catalogo/${proposta.especieSlug}`}
                  className="mt-3 inline-block bio-link text-sm"
                >
                  Ver no catálogo
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const ESTILO_DO_SELO: Record<ChangeProposal["status"], string> = {
  pendente: "border-secondary/40 bg-secondary/5 text-secondary",
  aprovada: "border-primary/40 bg-primary/5 text-primary",
  rejeitada: "border-destructive/40 bg-destructive/5 text-destructive",
  retirada: "border-border bg-muted/40 text-muted-foreground",
};

function Selo({ status }: { status: ChangeProposal["status"] }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider ${ESTILO_DO_SELO[status]}`}
    >
      {status}
    </span>
  );
}
