"use client";

import * as Dialog from "@radix-ui/react-dialog";

/**
 * Pequeno diálogo de confirmação, por cima da ficha.
 *
 * É um `Dialog` do Radix, e não um `alert()`: aninhado no modal da ficha, o
 * Radix empilha as camadas — o Esc e o clique fora fecham só este, e a ficha
 * continua aberta atrás.
 */
export function DialogoDeConfirmacao({
  aberto,
  aoMudar,
  titulo,
  descricao,
  acoes,
  children,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: string;
  descricao: string;
  acoes: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg-base/60 duration-240 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-2xl border border-bg-border bg-bg-surface1 p-6 shadow-2xl duration-240 animate-in fade-in-0 zoom-in-95">
          <Dialog.Title className="font-serif text-xl font-semibold tracking-tight">
            {titulo}
          </Dialog.Title>
          <Dialog.Description className="text-sm leading-[1.7] text-muted-foreground">
            {descricao}
          </Dialog.Description>
          {children}
          <div className="flex flex-wrap justify-end gap-2 pt-1">{acoes}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * O par de botões de "fechar com rascunho pendente", usado sempre que sair
 * de uma janela custa trabalho já feito.
 *
 * Continuar é o caminho seguro e vem em destaque, à direita; descartar fica
 * discreto e em vermelho, para não ser clicado por reflexo. Em tela estreita,
 * `wrap-reverse` põe o descartar embaixo, e não em cima.
 */
export function AcoesDeDescarte({
  rotuloDescartar,
  aoDescartar,
  aoContinuar,
  rotuloContinuar = "Continuar editando",
}: {
  rotuloDescartar: string;
  aoDescartar: () => void;
  aoContinuar: () => void;
  rotuloContinuar?: string;
}) {
  return (
    <div className="flex w-full flex-wrap-reverse items-center justify-between gap-2">
      <button
        type="button"
        onClick={aoDescartar}
        className="rounded-md px-2 py-1 text-xs text-red-600/80 transition-colors duration-240 hover:bg-red-500/10 hover:text-red-600 dark:text-red-300/80 dark:hover:text-red-300"
      >
        {rotuloDescartar}
      </button>
      <button
        type="button"
        onClick={aoContinuar}
        className="ml-auto rounded-md border border-primary bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-all duration-240 hover:bg-primary/90 active:scale-[0.98]"
      >
        {rotuloContinuar}
      </button>
    </div>
  );
}
