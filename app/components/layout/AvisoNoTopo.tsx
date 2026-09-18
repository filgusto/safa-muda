"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Aviso passageiro no topo do site, para confirmar algo que já aconteceu
 * (ex.: o envio das propostas do modo de edição).
 *
 * Mora no layout raiz, fora do conteúdo que o modal da ficha desfoca, porque
 * quem avisa costuma ser um modal que está fechando — o aviso precisa
 * sobreviver a ele. `avisar()` pode ser chamado de qualquer componente
 * cliente, sem provedor.
 */

type Aviso = { id: number; texto: string };

const DURACAO_MS = 10_000;

let atual: Aviso | null = null;
let proximoId = 0;
const ouvintes = new Set<() => void>();

function publicar(aviso: Aviso | null) {
  atual = aviso;
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function avisar(texto: string) {
  publicar({ id: ++proximoId, texto });
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function AvisoNoTopo() {
  const aviso = useSyncExternalStore(
    assinar,
    () => atual,
    () => null,
  );

  useEffect(() => {
    if (!aviso) return;
    const relogio = setTimeout(() => {
      // Só apaga se ainda for o mesmo: um aviso novo reinicia a contagem.
      if (atual?.id === aviso.id) publicar(null);
    }, DURACAO_MS);
    return () => clearTimeout(relogio);
  }, [aviso]);

  if (!aviso) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div
        key={aviso.id}
        role="status"
        className="pointer-events-auto relative max-w-xl overflow-hidden rounded-xl border border-primary/40 bg-bg-surface1 shadow-2xl duration-320 animate-in fade-in-0 slide-in-from-top-4"
      >
        <div className="flex items-start gap-3 py-3 pl-4 pr-10 text-sm leading-[1.6]">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
          <p className="flex-1">{aviso.texto}</p>
        </div>
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={() => publicar(null)}
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
        >
          <X size={14} />
        </button>
        {/*
          Tempo restante até o aviso sumir. Anima em CSS, com a mesma duração
          do relógio acima: `key` no aviso reinicia a barra junto com ele.
        */}
        <div
          aria-hidden
          style={{ animationDuration: `${DURACAO_MS}ms` }}
          className="absolute inset-x-0 bottom-0 h-1 origin-left animate-esvaziar bg-primary"
        />
      </div>
    </div>
  );
}
