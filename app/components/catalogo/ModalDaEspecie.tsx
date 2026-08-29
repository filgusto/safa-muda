"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
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
 * Moldura do modal da ficha.
 *
 * Abrir e fechar percorrem o mesmo caminho em sentidos opostos: o painel nasce
 * no retângulo do card correspondente, cresce até o lugar final e, ao fechar,
 * volta para o card antes de a navegação desfazer. Sem card na tela — link
 * colado, ou a grade rolada para longe — resta o esmaecimento.
 *
 * Fechar significa desfazer a navegação (`router.back()`), então o catálogo
 * volta exatamente como estava — filtros, busca e posição de rolagem incluídos.
 */
export function ModalDaEspecie({
  titulo,
  destino,
  children,
}: {
  titulo: string;
  /** Rota da ficha: é por ela que se acha o card de origem na grade. */
  destino: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const painel = useRef<HTMLDivElement | null>(null);
  const overlay = useRef<HTMLDivElement | null>(null);
  const fechando = useRef(false);

  /**
   * O fundo é desfocado pelo conteúdo, e não por um `backdrop-filter` no
   * overlay. Medindo as duas versões na abertura, sem aceleração de GPU: com o
   * filtro no overlay, 75 ms no quadro mais longo e 13 quadros acima de 20 ms;
   * com o filtro no conteúdo, 17 ms e nenhum. O `backdrop-filter` reprocessa a
   * pintura de trás a cada quadro — e o gradiente animado de `body::before`
   * garante que "a cada quadro" seja literal —, enquanto o filtro no conteúdo é
   * rasterizado uma vez e depois só composto. Reduzir o raio não ajuda: 4 px
   * custa o mesmo que 12 px.
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

      const percurso = medirPercurso(elemento, cardDaGrade(destino));
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

    const percurso = medirPercurso(elemento, cardDaGrade(destino));
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

  return (
    <Dialog.Root
      open
      onOpenChange={(aberto) => {
        if (!aberto) fechar();
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
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(48rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-bg-border bg-bg-surface1 shadow-2xl"
        >
          <Dialog.Title className="sr-only">{titulo}</Dialog.Title>

          <Dialog.Close
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
          >
            <X size={16} />
          </Dialog.Close>

          <div className="overflow-y-auto px-6 py-10 sm:px-10">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * A grade continua montada atrás do modal, então o próprio card serve de
 * origem — não é preciso anotar nada no clique nem tornar o card cliente.
 */
function cardDaGrade(destino: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `a[href="${CSS.escape(destino)}"]`,
  );
}
