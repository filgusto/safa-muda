"use client";

import { useCallback, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useSessaoHidratada } from "@/lib/auth-client.ts";
import { FormularioEspecie } from "@/components/wiki/FormularioEspecie.tsx";
import {
  AcoesDeDescarte,
  DialogoDeConfirmacao,
} from "@/components/wiki/DialogoDeConfirmacao.tsx";

/**
 * Botão que abre, por cima do catálogo, o formulário de proposta de espécie
 * nova — só aparece para quem está logado, já que propor exige conta (ver
 * `proporNovaEspecie` em app/actions/wiki.ts).
 *
 * Um modal local (sem rota própria), e não a interceptação usada pela ficha
 * da espécie (ModalDoCatalogo.tsx): o App Router não resolve de forma
 * confiável duas rotas interceptadas no mesmo nível quando uma é estática
 * (`nova`) e a outra dinâmica (`[slug]`) — a navegação client-side cai sempre
 * na dinâmica e devolve 404. `/safdex/nova` continua existindo como página
 * própria, para quem chega por link direto ou sem JS.
 *
 * Com o formulário já preenchido, fechar — clique fora, Esc ou X — não fecha:
 * pergunta antes, porque fechar desmonta o formulário e o que foi digitado vai
 * junto. Mesma regra da ficha da espécie (ver ModalDaEspecie.tsx); intocado,
 * fecha direto.
 */
export function BotaoAdicionarEspecie() {
  const { data: sessao } = useSessaoHidratada();
  const [aberto, setAberto] = useState(false);
  const [preenchido, setPreenchido] = useState(false);
  const [perguntando, setPerguntando] = useState(false);

  const fechar = useCallback(() => {
    setPerguntando(false);
    setPreenchido(false);
    setAberto(false);
  }, []);

  if (!sessao) return null;

  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(estado) => {
        if (estado) {
          setAberto(true);
          return;
        }
        if (preenchido) {
          setPerguntando(true);
          return;
        }
        fechar();
      }}
    >
      <Dialog.Trigger className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-primary transition-colors duration-240 hover:bg-primary/20">
        <Plus size={13} />
        Adicionar espécie
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg-base/50 duration-320 animate-in fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88dvh] w-[min(48rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-bg-border bg-bg-surface1 shadow-2xl duration-320 animate-in fade-in-0 zoom-in-95"
        >
          <Dialog.Close
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
          >
            <X size={16} />
          </Dialog.Close>

          <div className="overflow-y-auto px-6 py-10 sm:px-10">
            <span className="mb-3 block font-mono text-xs uppercase tracking-widest text-primary">
              Nova espécie
            </span>
            <Dialog.Title className="mb-2 font-serif text-2xl font-semibold tracking-tight">
              Adicionar espécie
            </Dialog.Title>
            <p className="mb-8 max-w-[60ch] leading-[1.7] text-muted-foreground">
              Proponha uma espécie para o SAFdex. Os únicos campos obrigatórios
              são o nome comum e o nome científico da planta. Um moderador vai
              avaliar antes de publicar.
            </p>

            {/* Remontado a cada abertura: o formulário sempre começa vazio. */}
            {aberto && (
              <FormularioEspecie
                modo="nova"
                aoConcluir={fechar}
                aoMudarPreenchimento={setPreenchido}
              />
            )}
          </div>

          <DialogoDeConfirmacao
            aberto={perguntando}
            aoMudar={setPerguntando}
            titulo="Fechar sem enviar?"
            descricao="Você está propondo uma espécie nova. Se fechar esta janela sem enviar, os dados que você preencheu serão perdidos."
            acoes={
              <AcoesDeDescarte
                rotuloDescartar="Sair e descartar"
                aoDescartar={fechar}
                aoContinuar={() => setPerguntando(false)}
              />
            }
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
