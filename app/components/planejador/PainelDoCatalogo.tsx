"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, GripVertical, Plus } from "lucide-react";
import { ESTRATOS, ESTRATO_LABEL } from "@/core/estratos.ts";
import { SUCESSAO_LABEL, type Sucessao } from "@/core/sucessao.ts";
import { type EspecieDoPainel, type CargaDeArraste } from "./tipos.ts";
import { useArraste } from "./ArrasteContext.tsx";

/**
 * Catálogo acoplado à timeline.
 *
 * Arrastar daqui para uma faixa cria o plantio — pela alça à esquerda, que
 * funciona com mouse, toque e caneta (ver ArrasteContext.tsx). O corpo do item
 * continua rolável no toque, e o botão "+" oferece um caminho sem arraste, que
 * também é o caminho do teclado.
 */
export function PainelDoCatalogo({
  onAdicionar,
}: {
  onAdicionar: (carga: CargaDeArraste) => void;
}) {
  const [busca, setBusca] = useState("");
  const [estrato, setEstrato] = useState("");
  const [especies, setEspecies] = useState<EspecieDoPainel[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const controlador = new AbortController();
    setCarregando(true);

    const temporizador = setTimeout(() => {
      const params = new URLSearchParams();
      if (busca) params.set("busca", busca);
      if (estrato) params.set("estrato", estrato);

      fetch(`/api/especies?${params}`, { signal: controlador.signal })
        .then((resposta) => resposta.json())
        .then((dados: EspecieDoPainel[]) => {
          setEspecies(dados);
          setCarregando(false);
        })
        .catch(() => {
          if (!controlador.signal.aborted) setCarregando(false);
        });
    }, 250);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [busca, estrato]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-bg-border bg-bg-surface1/40 lg:w-80">
      <div className="space-y-3 border-b border-bg-border p-4">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar espécie…"
            aria-label="Buscar espécie"
            className="w-full rounded-md border border-border bg-input py-1.5 pl-9 pr-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <select
          value={estrato}
          onChange={(evento) => setEstrato(evento.target.value)}
          aria-label="Filtrar por estrato"
          className="w-full rounded-md border border-border bg-bg-surface1 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Todos os estratos</option>
          {ESTRATOS.map((valor) => (
            <option key={valor} value={valor}>
              {ESTRATO_LABEL[valor]}
            </option>
          ))}
        </select>

        <p className="text-xs leading-[1.6] text-muted-foreground">
          Arraste pela alça até a faixa do estrato, ou use{" "}
          <span className="font-mono">+</span> para pôr no início.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {carregando ? (
          <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Buscando…
          </p>
        ) : especies.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            Nenhuma espécie encontrada.
          </p>
        ) : (
          <ul className="space-y-1">
            {especies.map((especie) => (
              <ItemArrastavel
                key={especie.id}
                especie={especie}
                onAdicionar={onAdicionar}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function ItemArrastavel({
  especie,
  onAdicionar,
}: {
  especie: EspecieDoPainel;
  onAdicionar: (carga: CargaDeArraste) => void;
}) {
  const { iniciar } = useArraste();

  const carga: CargaDeArraste = {
    speciesId: especie.id,
    nomeComum: especie.nomeComum,
    estratoDaEspecie: especie.estrato,
    diasParaColherMax: especie.diasParaColherMax,
  };

  return (
    <li className="group flex items-start gap-2 rounded-md border border-transparent p-2 transition-colors duration-240 hover:border-primary/40 hover:bg-primary/5">
      {/* `touch-none` só na alça: o corpo do item continua rolando no toque. */}
      <button
        type="button"
        onPointerDown={(evento) => iniciar(carga, evento)}
        aria-label={`Arrastar ${especie.nomeComum} para a timeline`}
        className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground/50 group-hover:text-primary active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{especie.nomeComum}</p>
        <p className="truncate font-mono text-[0.7rem] italic text-secondary">
          {especie.nomeCientifico}
        </p>
        <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {especie.estrato ? ESTRATO_LABEL[especie.estrato] : "sem estrato"}
          {especie.sucessao &&
            ` · ${SUCESSAO_LABEL[especie.sucessao as Sucessao] ?? especie.sucessao}`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onAdicionar(carga)}
        aria-label={`Adicionar ${especie.nomeComum} no início do planejamento`}
        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-primary"
      >
        <Plus size={14} />
      </button>
    </li>
  );
}
