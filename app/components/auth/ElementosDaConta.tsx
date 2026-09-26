"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, X } from "lucide-react";

/** Peças compartilhadas pelos quadros da área do usuário (/conta). */

export const CLASSE_DO_BOTAO =
  "inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-6 py-2 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

/** Mesma superfície do card de espécie em /safdex. */
export const CLASSE_DO_CARTAO =
  "rounded-xl border border-bg-border bg-bg-surface1 p-5 transition-colors duration-320 focus-within:border-primary/50 hover:border-primary/30";

export const CLASSE_DO_ERRO =
  "rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-900 dark:text-red-200";

export const CLASSE_DO_AVISO =
  "rounded-lg border-l-4 border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-900 dark:text-emerald-200";

export function TituloDeSecao({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
      {children}
    </h2>
  );
}

export const CLASSE_DO_INPUT =
  "w-full rounded-md border border-border bg-input px-3 py-1.5 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function LinhaDeDado({
  rotulo,
  rotuloDoLapis,
  aoEditar,
  quebrar,
  children,
}: {
  rotulo: React.ReactNode;
  /** Sem `aoEditar`, o campo é só de leitura e não mostra o lápis. */
  rotuloDoLapis?: string;
  aoEditar?: () => void;
  /** Texto longo (bio): quebra em várias linhas em vez de cortar com reticências. */
  quebrar?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-11 grid-cols-[7rem_1fr_auto] items-center gap-3 py-2">
      <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </dt>
      <dd
        className={`min-w-0 text-sm text-foreground/90 ${quebrar ? "whitespace-pre-line break-words" : "truncate"}`}
      >
        {children}
      </dd>
      {aoEditar ? (
        <BotaoLapis rotulo={rotuloDoLapis ?? "Editar"} onClick={aoEditar} />
      ) : (
        <span aria-hidden="true" className="size-7" />
      )}
    </div>
  );
}

export function BotaoLapis({
  rotulo,
  ...props
}: { rotulo: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      {...props}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-240 hover:bg-primary/10 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
    >
      <Pencil size={14} />
    </button>
  );
}

/** Modal das trocas que pedem confirmação. O conteúdo remonta a cada abertura. */
export function ModalDeConta({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={(novo) => !novo && aoFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg-base/60 duration-240 animate-in fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-bg-border bg-bg-surface1 p-6 shadow-2xl duration-240 animate-in fade-in-0 zoom-in-95"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <Dialog.Title className="font-serif text-xl font-semibold tracking-tight">
              {titulo}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
            >
              <X size={16} />
            </Dialog.Close>
          </div>
          {aberto && children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
