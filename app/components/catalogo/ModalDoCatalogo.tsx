"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Dica } from "@/components/ui/tooltip.tsx";
import { ID_CONTEUDO_DO_SITE } from "@/components/layout/conteudoDoSite.ts";
import {
  medirPercurso,
  semAnimacao,
  DURACAO_MS,
  DURACAO_SAIDA_MS,
  CURVA,
  CURVA_SAIDA,
} from "@/components/catalogo/percursoDoModal.ts";

/**
 * Moldura do modal do catálogo, compartilhada pela ficha de espécie
 * (ModalDaEspecie.tsx) e por qualquer outro conteúdo sobreposto à grade — o
 * formulário de nova espécie, por exemplo.
 *
 * Abrir e fechar percorrem o mesmo caminho em sentidos opostos: o painel nasce
 * no retângulo do elemento de origem — o card na grade, o botão que abriu o
 * modal — e cresce até o lugar final, voltando para lá ao fechar. Sem elemento
 * de origem na tela, resta o esmaecimento.
 *
 * Fechar significa desfazer a navegação (`router.back()`), então a página de
 * trás volta exatamente como estava.
 */
export function ModalDoCatalogo({
  titulo,
  destino,
  acoes,
  cabecalho,
  fotoDeFundo,
  aoTentarFechar,
  children,
}: {
  titulo: string;
  /** Rota do conteúdo: é por ela que se acha o elemento de origem na tela. */
  destino: string;
  /** Botões extras na moldura, à esquerda do de fechar. */
  acoes?: React.ReactNode;
  /**
   * Conteúdo fixo acima da área rolável, ao lado de `acoes` e do botão de
   * fechar — a identidade da espécie, por exemplo. Sem ele, os botões voltam
   * a flutuar soltos no canto superior-direito, como antes.
   */
  cabecalho?: React.ReactNode;
  /**
   * Foto que ilustra o fundo de `cabecalho`, à direita, esmaecendo em
   * degradê horizontal até o texto — mesmo tratamento do card do catálogo
   * (ver `FotoDeFundo` em CardEspecie.tsx). Sem `cabecalho`, é ignorada.
   */
  fotoDeFundo?: { key: string; alt: string | null } | null;
  /**
   * Chamado no lugar de fechar — clique fora, Esc ou X —, para quem tem algo
   * a perder perguntar antes. Recebe `fechar`, para seguir adiante depois de
   * confirmado. Sem ele, fecha direto.
   */
  aoTentarFechar?: (fechar: () => void) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const painel = useRef<HTMLDivElement | null>(null);
  const overlay = useRef<HTMLDivElement | null>(null);
  const fechando = useRef(false);

  /**
   * O fundo é desfocado pelo conteúdo, e não por um `backdrop-filter` no
   * overlay — ver ModalDaEspecie.tsx (o comentário original mede as duas
   * versões).
   */
  useEffect(() => {
    const conteudo = document.getElementById(ID_CONTEUDO_DO_SITE);
    conteudo?.setAttribute("data-desfocado", "true");
    return () => conteudo?.removeAttribute("data-desfocado");
  }, []);

  /**
   * A animação de entrada vive no callback de ref, e não num efeito: o `Portal`
   * do Radix só monta o conteúdo num segundo commit, então um `useLayoutEffect`
   * daqui rodaria com o painel ainda inexistente.
   */
  const animarEntrada = useCallback(
    (elemento: HTMLDivElement | null) => {
      painel.current = elemento;
      if (!elemento || semAnimacao()) return;

      const percurso = medirPercurso(elemento, elementoDeOrigem(destino));
      if (!percurso) {
        elemento.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: DURACAO_MS,
          easing: CURVA,
        });
        return;
      }

      elemento.animate(
        [
          { ...percurso.naOrigem, opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.35 },
          { ...percurso.noLugar, opacity: 1, offset: 1 },
        ],
        { duration: DURACAO_MS, easing: CURVA },
      );
    },
    [destino],
  );

  /**
   * Fechar é a entrada ao contrário, e só então a navegação. O `open` fica
   * preso em `true` de propósito: se o Radix soubesse do fechamento, desmontaria
   * o conteúdo antes de haver o que animar.
   */
  const fechar = useCallback(() => {
    if (fechando.current) return;
    fechando.current = true;

    const elemento = painel.current;
    if (!elemento || semAnimacao()) {
      router.back();
      return;
    }

    // O painel em retirada não deve mais receber cliques.
    elemento.style.pointerEvents = "none";

    const percurso = medirPercurso(elemento, elementoDeOrigem(destino));
    const quadros = percurso
      ? [
          { ...percurso.noLugar, opacity: 1, offset: 0 },
          { opacity: 1, offset: 0.55 },
          { ...percurso.naOrigem, opacity: 0, offset: 1 },
        ]
      : [{ opacity: 1 }, { opacity: 0 }];

    const saida = elemento.animate(quadros, {
      duration: DURACAO_SAIDA_MS,
      easing: CURVA_SAIDA,
      fill: "forwards",
    });
    overlay.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: DURACAO_SAIDA_MS,
      easing: CURVA_SAIDA,
      fill: "forwards",
    });

    // `finally`, e não `then`: um `cancel` durante a saída ainda precisa levar a
    // navegação adiante, ou o modal fica preso na tela.
    saida.finished.catch(() => {}).finally(() => router.back());
  }, [destino, router]);

  const botaoFechar = (
    <Dica texto="Fechar">
      <Dialog.Close
        aria-label="Fechar"
        className="rounded-md p-1.5 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
      >
        <X size={16} />
      </Dialog.Close>
    </Dica>
  );

  return (
    <Dialog.Root
      open
      onOpenChange={(aberto) => {
        if (aberto) return;
        if (aoTentarFechar) aoTentarFechar(fechar);
        else fechar();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          ref={overlay}
          className="fixed inset-0 z-50 bg-bg-base/50 duration-320 animate-in fade-in-0"
        />
        <Dialog.Content
          ref={animarEntrada}
          aria-describedby={undefined}
          // Ao abrir, o foco vai para o painel, e não para o primeiro botão da
          // moldura: focado, o botão abriria a própria dica sozinho — e o
          // leitor de tela começa pela ficha, não pelo link do GBIF.
          onOpenAutoFocus={(evento) => {
            evento.preventDefault();
            painel.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(48rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-bg-border bg-bg-surface1 shadow-2xl outline-none"
        >
          <Dialog.Title className="sr-only">{titulo}</Dialog.Title>

          {cabecalho ? (
            <div className="relative z-10 shrink-0">
              {fotoDeFundo && (
                // Mesma foto-de-fundo do card do catálogo (CardEspecie.tsx):
                // a imagem some por baixo do degradê antes de chegar ao nome,
                // por isso fica atrás — `relative` na linha abaixo garante
                // que ela pinte por cima.
                <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/media/${fotoDeFundo.key}`}
                    alt={fotoDeFundo.alt ?? ""}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-bg-surface1 from-15% via-bg-surface1/70 to-transparent" />
                </div>
              )}
              <div
                className={
                  fotoDeFundo
                    ? "relative px-6 pb-4 pr-20 pt-6 sm:px-10 sm:pr-24"
                    : "relative bg-bg-surface1/85 px-6 pb-4 pr-16 pt-6 backdrop-blur sm:px-10 sm:pr-20"
                }
              >
                {cabecalho}
              </div>
              {/* Colados no canto: a borda superior e a direita são a própria
                  borda arredondada do modal (que já corta tudo que passa do
                  canto via `overflow-hidden` no Dialog.Content), por isso só a
                  inferior e a esquerda precisam de raio próprio. */}
              <div
                className={
                  fotoDeFundo
                    ? "absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-bg-surface1/70 p-1.5 backdrop-blur-sm"
                    : "absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl p-1.5"
                }
              >
                {acoes}
                {botaoFechar}
              </div>
              {/* Esmaece o conteúdo que passa por baixo ao rolar, separando a
                  faixa fixa do restante sem uma borda dura. */}
              <div className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-bg-surface1/85 to-transparent" />
            </div>
          ) : (
            <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
              {acoes}
              {botaoFechar}
            </div>
          )}

          <div
            className={
              cabecalho
                ? "min-h-0 flex-1 overflow-y-auto px-6 pb-10 pt-6 sm:px-10"
                : "min-h-0 flex-1 overflow-y-auto px-6 py-10 sm:px-10"
            }
          >
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * A grade continua montada atrás do modal, então o próprio elemento que
 * levou até a rota interceptada serve de origem — não é preciso anotar nada
 * no clique nem tornar esse elemento cliente.
 */
function elementoDeOrigem(destino: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `a[href="${CSS.escape(destino)}"]`,
  );
}
