"use client";

import { useEffect, useState } from "react";
import type { EspecieComFoto } from "@/lib/catalogo.ts";
import { CardEspecie } from "@/components/catalogo/CardEspecie.tsx";

const LINHAS_POR_PAGINA = 20;

/**
 * Colunas do grid abaixo (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
 * xl:grid-cols-4`) — os pontos de quebra precisam casar com as classes do
 * `<ul>` para que "20 linhas" corresponda de fato a linhas completas.
 */
const PONTOS_DE_QUEBRA: Array<{ consulta: string; colunas: number }> = [
  { consulta: "(min-width: 1280px)", colunas: 4 },
  { consulta: "(min-width: 1024px)", colunas: 3 },
  { consulta: "(min-width: 640px)", colunas: 2 },
];

function useColunasDoGrid(): number {
  const [colunas, setColunas] = useState(1);

  useEffect(() => {
    const medias = PONTOS_DE_QUEBRA.map(({ consulta }) =>
      window.matchMedia(consulta),
    );

    function atualizar() {
      const encontrado = medias.findIndex((media) => media.matches);
      setColunas(encontrado === -1 ? 1 : PONTOS_DE_QUEBRA[encontrado].colunas);
    }

    atualizar();
    medias.forEach((media) => media.addEventListener("change", atualizar));
    return () => {
      medias.forEach((media) => media.removeEventListener("change", atualizar));
    };
  }, []);

  return colunas;
}

/**
 * Renderiza os cards em lotes de 20 linhas completas: o servidor já buscou
 * todas as espécies filtradas, mas montar centenas de cards de uma vez pesa
 * no navegador.
 */
export function ListaDeEspecies({ especies }: { especies: EspecieComFoto[] }) {
  const colunas = useColunasDoGrid();
  const [paginasCarregadas, setPaginasCarregadas] = useState(1);

  const quantidadeVisivel = colunas * LINHAS_POR_PAGINA * paginasCarregadas;
  const visiveis = especies.slice(0, quantidadeVisivel);
  const temMais = quantidadeVisivel < especies.length;

  return (
    <>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visiveis.map((especie) => (
          <li key={especie.id}>
            <CardEspecie especie={especie} />
          </li>
        ))}
      </ul>

      {temMais && (
        <button
          type="button"
          onClick={() => setPaginasCarregadas((atual) => atual + 1)}
          className="mt-8 w-full rounded-xl border border-bg-border bg-bg-surface1 px-6 py-2.5 text-sm font-medium text-foreground transition-colors duration-240 hover:border-primary/50 hover:text-primary"
        >
          Mostrar mais
        </button>
      )}
    </>
  );
}
