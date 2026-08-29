import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buscarEspeciePorSlug, listarFotosDaEspecie } from "@/lib/catalogo.ts";
import { listarRevisoesDaEspecie } from "@/lib/wiki.ts";
import { DetalheEspecie } from "@/components/catalogo/DetalheEspecie.tsx";

/**
 * ISR em vez de `generateStaticParams`.
 *
 * Pré-renderizar as 442 páginas no build exigiria banco disponível em tempo de
 * build, o que quebraria a invariante de que `npm run build` roda sem nenhuma
 * variável de ambiente (ver .github/workflows/ci.yml e ADR 0002).
 *
 * Com ISR cada página é gerada na primeira visita e servida do cache depois —
 * igualmente indexável, e com o bônus de que uma correção aprovada na wiki
 * aparece sem precisar de novo deploy.
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const especie = await buscarEspeciePorSlug((await params).slug);
  if (!especie) return { title: "Espécie não encontrada · Safa Muda" };

  return {
    title: `${especie.nomeComum} · Safa Muda`,
    description: `${especie.nomeComum} (${especie.nomeCientifico}): estrato, sucessão e sistema para planejamento agroflorestal.`,
  };
}

export default async function EspeciePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const especie = await buscarEspeciePorSlug((await params).slug);
  if (!especie) notFound();

  const [revisoes, fotos] = await Promise.all([
    listarRevisoesDaEspecie(especie.id),
    listarFotosDaEspecie(especie.id),
  ]);

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/catalogo"
        className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-240 hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Catálogo
      </Link>

      <DetalheEspecie especie={especie} revisoes={revisoes} fotos={fotos} />
    </main>
  );
}
