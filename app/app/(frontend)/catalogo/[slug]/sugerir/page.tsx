import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buscarEspeciePorSlug } from "@/lib/catalogo.ts";
import { getViewer } from "@/lib/access.ts";
import { FormularioEspecie } from "@/components/wiki/FormularioEspecie.tsx";
import { CAMPOS } from "@/lib/especie-schema.ts";

export const metadata: Metadata = { title: "Sugerir correção · Safa Muda" };
export const dynamic = "force-dynamic";

export default async function SugerirPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?destino=/catalogo/${slug}/sugerir`);

  const especie = await buscarEspeciePorSlug(slug);
  if (!especie) notFound();

  // Pré-preenche com os valores atuais: a pessoa edita o que quer mudar, e o
  // servidor calcula o patch comparando com o estado gravado.
  const registro = especie as unknown as Record<string, unknown>;
  const iniciais = Object.fromEntries(
    CAMPOS.map((campo) => [campo.chave, registro[campo.chave] ?? null]),
  );

  return (
    <main className="container mx-auto max-w-2xl px-6 py-16">
      <Link
        href={`/catalogo/${slug}`}
        className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-240 hover:text-foreground"
      >
        <ArrowLeft size={13} />
        {especie.nomeComum}
      </Link>

      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Sugerir correção
        </span>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {especie.nomeComum}
        </h1>
        <p className="max-w-[60ch] leading-[1.7] text-muted-foreground">
          Altere apenas o que precisa mudar. Um moderador vai comparar sua
          sugestão com o valor atual antes de publicar.
        </p>
      </header>

      <FormularioEspecie modo="edicao" slug={slug} iniciais={iniciais} />
    </main>
  );
}
