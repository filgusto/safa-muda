"use client";

import { useState } from "react";
import { Link2, Loader2, Search } from "lucide-react";
import { buscarPreviaDoWikimedia } from "@/app/actions/fotos.ts";

export interface PreviaWikimedia {
  thumbUrl: string;
  autor: string | null;
  licencaNome: string | null;
  licencaUrl: string | null;
  credito: string;
}

/**
 * Estado da busca de metadados de um arquivo do Wikimedia Commons.
 *
 * Compartilhado pelos dois formulários de foto (modal e página dedicada):
 * ambos precisam do mesmo ciclo — colar o link da ficha, buscar autor e
 * licença na API do Commons, e deixar o crédito sugerido editável antes de
 * importar de fato (a importação em si só acontece no envio do rascunho, ver
 * ModoDeEdicao.tsx e importarFotoDoWikimedia).
 */
export function useWikimediaPrevia(
  onResolvido: (previa: PreviaWikimedia) => void,
) {
  const [url, setUrl] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<PreviaWikimedia | null>(null);

  async function buscar() {
    if (!url.trim()) return;
    setBuscando(true);
    setErro(null);
    setPrevia(null);
    const resultado = await buscarPreviaDoWikimedia(url.trim());
    setBuscando(false);
    if (!resultado.ok || !resultado.previa) {
      setErro(resultado.erro ?? "Não foi possível buscar este arquivo.");
      return;
    }
    setPrevia(resultado.previa);
    onResolvido(resultado.previa);
  }

  function reiniciar() {
    setUrl("");
    setPrevia(null);
    setErro(null);
  }

  return { url, setUrl, buscar, buscando, erro, previa, reiniciar };
}

/** Campo de link + botão de busca + prévia de autor/licença. */
export function PainelDeLinkDoWikimedia({
  url,
  setUrl,
  buscar,
  buscando,
  erro,
  previa,
}: Pick<
  ReturnType<typeof useWikimediaPrevia>,
  "url" | "setUrl" | "buscar" | "buscando" | "erro" | "previa"
>) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="link-wikimedia">
          Link da ficha no Wikimedia Commons
        </label>
        <input
          id="link-wikimedia"
          value={url}
          onChange={(evento) => setUrl(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              void buscar();
            }
          }}
          placeholder="https://commons.wikimedia.org/wiki/File:..."
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          disabled={buscando || !url.trim()}
          onClick={() => void buscar()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors duration-240 hover:bg-bg-surface2 disabled:pointer-events-none disabled:opacity-50"
        >
          {buscando ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          Buscar
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Cole o link da ficha do arquivo, não o link da imagem — é de lá que vêm
        o autor e a licença.
      </p>

      {erro && (
        <p
          role="alert"
          className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}

      {previa && (
        <div className="flex gap-3 rounded-lg border border-bg-border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previa.thumbUrl}
            alt=""
            className="aspect-[4/3] w-28 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1 font-mono uppercase tracking-wider text-foreground">
              <Link2 size={12} /> Wikimedia Commons
            </p>
            <p>Autor: {previa.autor ?? "não informado"}</p>
            <p>Licença: {previa.licencaNome ?? "não identificada"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
