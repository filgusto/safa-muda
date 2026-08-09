"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { ESTRATOS, ESTRATO_LABEL } from "@/core/estratos.ts";
import {
  SUCESSOES,
  SUCESSAO_LABEL,
  SISTEMAS,
  SISTEMA_LABEL,
} from "@/core/sucessao.ts";
import { GRUPOS, GRUPO_LABEL } from "@/core/grupos.ts";

/**
 * Controles de filtro do catálogo.
 *
 * O estado vive na URL, não em React state: um filtro aplicado é linkável,
 * sobrevive ao reload e funciona com o botão voltar. É também o que mantém a
 * página renderizável no servidor e indexável.
 */
export function FiltrosCatalogo({
  familias,
}: {
  familias: { familia: string; total: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendente, iniciarTransicao] = useTransition();

  const buscaNaUrl = searchParams.get("busca") ?? "";
  const [busca, setBusca] = useState(buscaNaUrl);

  // Mantém o campo em sincronia quando a URL muda por fora (voltar, limpar).
  useEffect(() => setBusca(buscaNaUrl), [buscaNaUrl]);

  const aplicar = useCallback(
    (chave: string, valor: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (valor) params.set(chave, valor);
      else params.delete(chave);

      const query = params.toString();
      iniciarTransicao(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [router, pathname, searchParams],
  );

  // Debounce da busca: evita uma consulta por tecla digitada.
  useEffect(() => {
    if (busca === buscaNaUrl) return;
    const temporizador = setTimeout(() => aplicar("busca", busca), 300);
    return () => clearTimeout(temporizador);
  }, [busca, buscaNaUrl, aplicar]);

  const temFiltro = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por nome comum, científico ou família…"
          aria-label="Buscar espécie"
          className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-9 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {pendente && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Seletor
          rotulo="Estrato"
          valor={searchParams.get("estrato") ?? ""}
          onChange={(valor) => aplicar("estrato", valor)}
          opcoes={ESTRATOS.map((e) => ({ valor: e, rotulo: ESTRATO_LABEL[e] }))}
        />
        <Seletor
          rotulo="Sucessão"
          valor={searchParams.get("sucessao") ?? ""}
          onChange={(valor) => aplicar("sucessao", valor)}
          opcoes={SUCESSOES.map((s) => ({
            valor: s,
            rotulo: SUCESSAO_LABEL[s],
          }))}
        />
        <Seletor
          rotulo="Sistema"
          valor={searchParams.get("sistema") ?? ""}
          onChange={(valor) => aplicar("sistema", valor)}
          opcoes={SISTEMAS.map((s) => ({ valor: s, rotulo: SISTEMA_LABEL[s] }))}
        />
        <Seletor
          rotulo="Grupo"
          valor={searchParams.get("grupo") ?? ""}
          onChange={(valor) => aplicar("grupo", valor)}
          opcoes={GRUPOS.map((g) => ({ valor: g, rotulo: GRUPO_LABEL[g] }))}
        />
        <Seletor
          rotulo="Família"
          valor={searchParams.get("familia") ?? ""}
          onChange={(valor) => aplicar("familia", valor)}
          opcoes={familias.map((f) => ({
            valor: f.familia,
            rotulo: `${f.familia} (${f.total})`,
          }))}
        />

        {temFiltro && (
          <button
            type="button"
            onClick={() => iniciarTransicao(() => router.replace(pathname))}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors duration-240 hover:text-foreground"
          >
            <X size={12} />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

function Seletor({
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  opcoes: { valor: string; rotulo: string }[];
}) {
  const ativo = valor !== "";
  return (
    <select
      value={valor}
      onChange={(evento) => onChange(evento.target.value)}
      aria-label={rotulo}
      className={`rounded-md border bg-bg-surface1 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors duration-240 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        ativo
          ? "border-primary/50 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      <option value="">{rotulo}</option>
      {opcoes.map((opcao) => (
        <option key={opcao.valor} value={opcao.valor}>
          {opcao.rotulo}
        </option>
      ))}
    </select>
  );
}
