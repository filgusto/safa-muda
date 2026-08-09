"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { aprovarProposta, rejeitarProposta } from "@/app/actions/wiki.ts";

export function AcoesDeModeracao({ propostaId }: { propostaId: string }) {
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<"aprovar" | "rejeitar" | null>(
    null,
  );

  async function executar(acao: "aprovar" | "rejeitar") {
    setErro(null);
    setEmAndamento(acao);

    const resultado =
      acao === "aprovar"
        ? await aprovarProposta(propostaId, nota.trim() || undefined)
        : await rejeitarProposta(propostaId, nota);

    setEmAndamento(null);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível concluir.");
      return;
    }
    router.push("/moderacao");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Nota da revisão
        </span>
        <textarea
          value={nota}
          onChange={(evento) => setNota(evento.target.value)}
          rows={3}
          placeholder="Opcional ao aprovar. Obrigatória ao rejeitar — quem contribuiu precisa entender o porquê."
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      {erro && (
        <p
          role="alert"
          className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => executar("aprovar")}
          disabled={emAndamento !== null}
          className="inline-flex items-center gap-2 rounded-md border border-primary bg-transparent px-6 py-2 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-bg-base hover:shadow-[0_0_14px_0_rgba(63,175,92,0.3)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {emAndamento === "aprovar" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Check size={15} />
          )}
          Aprovar e publicar
        </button>

        <button
          type="button"
          onClick={() => executar("rejeitar")}
          disabled={emAndamento !== null}
          className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-transparent px-6 py-2 text-sm font-medium text-destructive transition-all duration-240 hover:bg-destructive/10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {emAndamento === "rejeitar" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <X size={15} />
          )}
          Rejeitar
        </button>
      </div>
    </div>
  );
}
