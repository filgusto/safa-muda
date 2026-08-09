import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getViewer, isModerator } from "@/lib/access.ts";
import { buscarProposta } from "@/lib/wiki.ts";
import { buscarEspeciePorSlug } from "@/lib/catalogo.ts";
import { Diff } from "@/components/wiki/Diff.tsx";
import { AcoesDeModeracao } from "@/components/wiki/AcoesDeModeracao.tsx";

export const metadata: Metadata = { title: "Revisar sugestão · Safa Muda" };
export const dynamic = "force-dynamic";

export default async function RevisarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?destino=/moderacao");
  if (!isModerator(viewer)) redirect("/");

  const proposta = await buscarProposta((await params).id);
  if (!proposta) notFound();

  const nova = proposta.tipo === "nova_especie";
  const especie =
    !nova && proposta.especieSlug
      ? await buscarEspeciePorSlug(proposta.especieSlug)
      : null;

  const titulo = nova
    ? String(proposta.patch.nomeComum ?? "Espécie nova")
    : (proposta.especieNome ?? "Espécie");

  return (
    <main className="container mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/moderacao"
        className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-240 hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Moderação
      </Link>

      <header className="mb-8 space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          {nova ? "Nova espécie" : "Edição"}
        </span>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {titulo}
        </h1>
        <p className="text-sm text-muted-foreground">
          Proposta por {proposta.autorNome ?? "autor removido"} em{" "}
          {proposta.criadoEm.toLocaleDateString("pt-BR")}
        </p>
      </header>

      <Secao titulo="Fonte declarada">
        <p className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm leading-[1.7]">
          {proposta.fonte}
        </p>
      </Secao>

      {proposta.justificativa && (
        <Secao titulo="Observação do autor">
          <p className="text-sm leading-[1.7] text-muted-foreground">
            {proposta.justificativa}
          </p>
        </Secao>
      )}

      <Secao titulo={nova ? "Valores propostos" : "Alterações"}>
        <Diff
          patch={proposta.patch}
          atual={
            especie ? (especie as unknown as Record<string, unknown>) : null
          }
        />
      </Secao>

      {proposta.status === "pendente" ? (
        <Secao titulo="Decisão">
          <AcoesDeModeracao propostaId={proposta.id} />
        </Secao>
      ) : (
        <Secao titulo="Decisão">
          <p className="text-sm text-muted-foreground">
            Esta proposta já foi{" "}
            <strong className="text-foreground">{proposta.status}</strong>
            {proposta.revisadoEm &&
              ` em ${proposta.revisadoEm.toLocaleDateString("pt-BR")}`}
            .
          </p>
          {proposta.notaDaRevisao && (
            <p className="mt-2 text-sm leading-[1.7] text-muted-foreground">
              {proposta.notaDaRevisao}
            </p>
          )}
        </Secao>
      )}
    </main>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
        {titulo}
      </h2>
      {children}
    </section>
  );
}
