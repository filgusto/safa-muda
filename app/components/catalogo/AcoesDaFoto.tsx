"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { aprovarFoto, removerFoto } from "@/app/actions/fotos.ts";

/** Botões de moderação de uma foto. Só renderizados para moderador. */
export function AcoesDaFoto({
  id,
  aprovada,
}: {
  id: string;
  aprovada: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function executar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    iniciar(async () => {
      const resultado = await acao();
      if (!resultado.ok) setErro(resultado.erro ?? "Falha na operação.");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!aprovada && (
        <button
          type="button"
          disabled={pendente}
          onClick={() => executar(() => aprovarFoto(id))}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1 text-xs text-primary transition-colors duration-240 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          <Check size={13} />
          Aprovar
        </button>
      )}
      <button
        type="button"
        disabled={pendente}
        onClick={() => executar(() => removerFoto(id))}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs text-muted-foreground transition-colors duration-240 hover:border-destructive hover:text-destructive disabled:opacity-50"
      >
        <Trash2 size={13} />
        Remover
      </button>
      {erro && <span className="text-xs text-destructive">{erro}</span>}
    </div>
  );
}
