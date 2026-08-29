import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buscarEspeciePorSlug, listarFotosDaEspecie } from "@/lib/catalogo.ts";
import { getViewer, isModerator } from "@/lib/access.ts";
import { FormularioDeFoto } from "@/components/catalogo/FormularioDeFoto.tsx";
import { AcoesDaFoto } from "@/components/catalogo/AcoesDaFoto.tsx";
import { TAG_DE_FOTO_LABEL } from "@/core/fotos.ts";

export const metadata: Metadata = { title: "Fotos da espécie · Safa Muda" };
export const dynamic = "force-dynamic";

/**
 * Envio e moderação das fotos de uma espécie.
 *
 * Fica fora da ficha porque a ficha é ISR e não pode ler sessão (ver
 * catalogo/[slug]/page.tsx) — mesma razão pela qual "sugerir correção" também
 * é página própria.
 */
export default async function FotosDaEspeciePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?destino=/catalogo/${slug}/fotos`);

  const especie = await buscarEspeciePorSlug(slug);
  if (!especie) notFound();

  const moderador = isModerator(viewer);
  const fotos = await listarFotosDaEspecie(especie.id, moderador);

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
          Fotos
        </span>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {especie.nomeComum}
        </h1>
        <p className="max-w-[60ch] leading-[1.7] text-muted-foreground">
          {moderador
            ? "Suas fotos entram publicadas. As enviadas pela comunidade ficam aqui aguardando aprovação."
            : "Envie uma foto da planta. Um moderador avalia antes de publicar, como acontece com as correções do catálogo."}
        </p>
      </header>

      {fotos.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">
            Já enviadas
          </h2>
          <ul className="space-y-6">
            {fotos.map((foto) => (
              <li
                key={foto.id}
                className="flex flex-col gap-3 rounded-xl border border-bg-border bg-bg-surface1 p-4 sm:flex-row"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/media/${foto.key}`}
                  alt={foto.alt ?? especie.nomeComum}
                  loading="lazy"
                  className="h-28 w-full shrink-0 rounded-lg border border-bg-border object-cover sm:w-40"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider text-primary">
                    {TAG_DE_FOTO_LABEL[foto.tag]}
                  </p>
                  {foto.legenda && (
                    <p className="text-sm leading-[1.6]">{foto.legenda}</p>
                  )}
                  <p className="font-mono text-[0.65rem] text-muted-foreground/70">
                    {foto.credito}
                  </p>
                  {!foto.aprovada && (
                    <p className="font-mono text-[0.65rem] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Aguardando aprovação
                    </p>
                  )}
                  {moderador && (
                    <AcoesDaFoto id={foto.id} aprovada={foto.aprovada} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">
          Nova foto
        </h2>
        <FormularioDeFoto slug={slug} moderador={moderador} />
      </section>
    </main>
  );
}
