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

  const filtrado = especies.length !== total;

  return (
    <main className="container mx-auto max-w-7xl px-6 py-16">
      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Catálogo
        </span>
        <h1 className="font-serif text-display-md font-semibold tracking-tight">
          Espécies agroflorestais
        </h1>
        <p className="max-w-[60ch] leading-[1.7] text-muted-foreground">
          Cada espécie traz o andar que ocupa no espaço (estrato) e o momento em
          que entra no tempo (sucessão). Campos que as fontes não informam
          aparecem como <em>não informado</em> — nunca preenchidos por
          estimativa.
        </p>
      </header>

      <div className="mb-8">
        <Suspense fallback={<div className="h-24" />}>
          <FiltrosCatalogo familias={familias} />
        </Suspense>
      </div>

      <p className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <span className="metric">{especies.length}</span>
        {filtrado ? ` de ${total} espécies` : " espécies"}
      </p>

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
