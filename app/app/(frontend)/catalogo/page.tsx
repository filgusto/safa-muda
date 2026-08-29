import type { Metadata } from "next";
import { Suspense } from "react";
import {
  buscarEspecies,
  contarEspecies,
  listarFamilias,
  lerFiltros,
} from "@/lib/catalogo.ts";
import { CardEspecie } from "@/components/catalogo/CardEspecie.tsx";
import { FiltrosCatalogo } from "@/components/catalogo/FiltrosCatalogo.tsx";

export const metadata: Metadata = {
  title: "Catálogo de espécies · Safa Muda",
  description:
    "Espécies agroflorestais com estrato, sucessão, sistema e grupo funcional, a partir da Tabela Guia de Estratos Agroflorestais de Namastê Messerschmidt.",
};

/**
 * Catálogo público — não lê a sessão, de propósito: é a porta de entrada do
 * projeto e precisa ser indexável.
 */
export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = lerFiltros(params);

  const [especies, total, familias] = await Promise.all([
    buscarEspecies(filtros),
    contarEspecies(),
    listarFamilias(),
  ]);

  return (
    <main className="container mx-auto max-w-7xl px-6 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="font-serif text-display-md font-semibold tracking-tight">
          Leafdex - Catálogo de plantas
        </h1>
      </header>

      <div className="mb-8">
        <Suspense fallback={<div className="h-24" />}>
          <FiltrosCatalogo
            familias={familias}
            mostrados={especies.length}
            total={total}
          />
        </Suspense>
      </div>

      {especies.length === 0 ? (
        <p className="rounded-xl border border-bg-border bg-bg-surface1 p-8 text-center text-sm text-muted-foreground">
          Nenhuma espécie encontrada com esses filtros.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {especies.map((especie) => (
            <li key={especie.id}>
              <CardEspecie especie={especie} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
