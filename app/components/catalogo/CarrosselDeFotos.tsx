"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { TAG_DE_FOTO_LABEL, escolherFotoPrincipal } from "@/core/fotos.ts";
import type { FotoDaEspecie } from "@/lib/catalogo.ts";
import { useModoDeEdicao } from "@/components/wiki/ModoDeEdicao.tsx";
import { useSessaoHidratada } from "@/lib/auth-client.ts";
import { cn } from "@/lib/utils.ts";
import {
  medirPercurso,
  semAnimacao,
  DURACAO_MS,
  DURACAO_SAIDA_MS,
  CURVA,
  CURVA_SAIDA,
} from "@/components/catalogo/percursoDoModal.ts";

/**
 * Galeria da ficha: uma faixa horizontal, na ordem do desenvolvimento da planta
 * (semente → jovem → adulta → diversas), definida em core/fotos.ts.
 *
 * A faixa rola em vez de quebrar em grade: assim a fase seguinte fica sempre à
 * direita da anterior, e a leitura acompanha o crescimento da planta.
 *
 * Clicar abre a foto em tela quase cheia. O visor é um segundo diálogo, que se
 * sobrepõe ao modal da espécie sem fechá-lo — quem veio da grade continua na
 * ficha ao sair da imagem.
 *
 * O visor cresce da própria miniatura clicada e volta para ela ao fechar, como
 * o modal da ficha faz com o card da grade (ver percursoDoModal.ts). Sem isso a
 * imagem parece vir de fora da tela, e o olho perde de onde ela saiu.
 *
 * No modo de edição, a administração vê uma estrela em cada miniatura: a
 * preenchida marca a foto que ilustra o card e o cabeçalho da ficha, e clicar
 * noutra troca a escolha no rascunho (ver ModoDeEdicao.tsx).
 */
export function CarrosselDeFotos({ fotos }: { fotos: FotoDaEspecie[] }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const miniaturas = useRef<(HTMLButtonElement | null)[]>([]);
  const painel = useRef<HTMLDivElement | null>(null);
  const overlay = useRef<HTMLDivElement | null>(null);
  const indiceAberto = useRef<number | null>(null);
  indiceAberto.current = aberta;

  const { data: sessao } = useSessaoHidratada();
  const edicao = useModoDeEdicao();
  const escolhendoPrincipal = edicao.ativo && sessao?.user.role === "admin";
  const principalSalva = escolherFotoPrincipal(fotos)?.id ?? null;
  const principal = edicao.fotoPrincipal ?? principalSalva;

  /** A miniatura de onde o visor sai — e para onde volta. */
  const origem = useCallback(
    () =>
      indiceAberto.current === null
        ? null
        : (miniaturas.current[indiceAberto.current] ?? null),
    [],
  );

  /**
   * A entrada vive no callback de ref, e não num efeito: o `Portal` do Radix só
   * monta o conteúdo num segundo commit, então um `useLayoutEffect` daqui
   * rodaria com o painel ainda inexistente.
   */
  const animarEntrada = useCallback(
    (elemento: HTMLDivElement | null) => {
      painel.current = elemento;
      if (!elemento || semAnimacao()) return;

      const percurso = medirPercurso(elemento, origem());
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
    [origem],
  );

  /**
   * Fechar é a entrada ao contrário, e só então o desmonte. Fecha na miniatura
   * da foto que estava em tela — não na que abriu o visor —, porque as setas
   * podem ter mudado de foto no caminho.
   */
  const fechar = useCallback(() => {
    const elemento = painel.current;
    if (!elemento || semAnimacao()) {
      setAberta(null);
      return;
    }

    elemento.style.pointerEvents = "none";

    const percurso = medirPercurso(elemento, origem());
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

    // `finally`, e não `then`: um `cancel` durante a saída ainda precisa
    // desmontar o visor, ou ele fica preso na tela.
    saida.finished.catch(() => {}).finally(() => setAberta(null));
  }, [origem]);

  const irPara = useCallback(
    (passo: number) =>
      setAberta((atual) =>
        atual === null ? null : (atual + passo + fotos.length) % fotos.length,
      ),
    [fotos.length],
  );

  // Setas do teclado no visor: é o gesto esperado de uma galeria, e o Radix só
  // cuida do Esc.
  useEffect(() => {
    if (aberta === null) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "ArrowRight") irPara(1);
      if (evento.key === "ArrowLeft") irPara(-1);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberta, irPara]);

  if (fotos.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground/60">
        Nenhuma foto ainda.
      </p>
    );
  }

  const foco = aberta === null ? null : fotos[aberta];

  return (
    <>
      <ul className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
        {fotos.map((foto, indice) => (
          <li key={foto.id} className="relative shrink-0 snap-start">
            <button
              type="button"
              ref={(elemento) => {
                miniaturas.current[indice] = elemento;
              }}
              onClick={() => setAberta(indice)}
              className="group relative block overflow-hidden rounded-lg border border-bg-border transition-colors duration-240 hover:border-primary/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/media/${foto.key}`}
                alt={foto.alt ?? ""}
                loading="lazy"
                className="h-40 w-56 object-cover transition-transform duration-320 group-hover:scale-[1.03]"
              />
              <span className="absolute bottom-1.5 left-1.5 rounded-md border border-bg-border/60 bg-bg-base/75 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-foreground/90">
                {TAG_DE_FOTO_LABEL[foto.tag]}
              </span>
            </button>
            {escolhendoPrincipal && (
              <EstrelaDePrincipal
                marcada={foto.id === principal}
                onClick={() =>
                  // Voltar à que já está salva é desfazer a troca, não uma
                  // troca a mais no rascunho.
                  edicao.escolherFotoPrincipal(
                    foto.id === principalSalva ? null : foto.id,
                  )
                }
              />
            )}
          </li>
        ))}
      </ul>

      <Dialog.Root
        open={foco !== null}
        onOpenChange={(estado) => {
          if (!estado) fechar();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay
            ref={overlay}
            className="fixed inset-0 z-[60] bg-bg-base/85 duration-320 animate-in fade-in-0"
          />
          <Dialog.Content
            ref={animarEntrada}
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[60] flex h-[94vh] w-[96vw] -translate-x-1/2 -translate-y-1/2 flex-col"
          >
            <Dialog.Title className="sr-only">
              {foco?.legenda ?? foco?.alt ?? "Foto da espécie"}
            </Dialog.Title>

            {foco && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/media/${foco.key}`}
                  alt={foco.alt ?? ""}
                  className="min-h-0 flex-1 rounded-lg object-contain"
                />
                <div className="mt-3 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center">
                  <span className="font-mono text-[0.65rem] uppercase tracking-wider text-primary">
                    {TAG_DE_FOTO_LABEL[foco.tag]}
                  </span>
                  {foco.legenda && (
                    <span className="text-sm text-foreground/90">
                      {foco.legenda}
                    </span>
                  )}
                  <span className="font-mono text-[0.65rem] text-muted-foreground/70">
                    {foco.credito}
                  </span>
                </div>
              </>
            )}

            {fotos.length > 1 && (
              <>
                <Controle
                  lado="esquerda"
                  rotulo="Foto anterior"
                  onClick={() => irPara(-1)}
                />
                <Controle
                  lado="direita"
                  rotulo="Próxima foto"
                  onClick={() => irPara(1)}
                />
              </>
            )}

            <Dialog.Close
              aria-label="Fechar"
              className="absolute right-2 top-2 rounded-md bg-bg-base/70 p-2 text-muted-foreground transition-colors duration-240 hover:text-foreground"
            >
              <X size={18} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/**
 * Fora do botão da miniatura, e não dentro: botão dentro de botão é HTML
 * inválido, e o clique na estrela abriria o visor junto.
 */
function EstrelaDePrincipal({
  marcada,
  onClick,
}: {
  marcada: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={marcada}
      aria-label={
        marcada ? "Foto principal da espécie" : "Usar como foto principal"
      }
      title={marcada ? "Foto principal" : "Usar como foto principal"}
      className="absolute right-1.5 top-1.5 rounded-full border border-bg-border/60 bg-bg-base/75 p-1 transition-transform duration-240 hover:scale-110 active:scale-95"
    >
      <Star
        size={16}
        fill={marcada ? "currentColor" : "none"}
        className={cn(
          "transition-colors duration-240",
          marcada
            ? "text-amber-400"
            : "text-foreground/80 hover:text-amber-400",
        )}
      />
    </button>
  );
}

function Controle({
  lado,
  rotulo,
  onClick,
}: {
  lado: "esquerda" | "direita";
  rotulo: string;
  onClick: () => void;
}) {
  const Icone = lado === "esquerda" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-bg-base/70 p-2 text-muted-foreground transition-colors duration-240 hover:text-foreground ${
        lado === "esquerda" ? "left-2" : "right-2"
      }`}
    >
      <Icone size={22} />
    </button>
  );
}
