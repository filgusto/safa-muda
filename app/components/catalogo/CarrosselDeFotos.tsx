"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import {
  TAGS_DE_FOTO,
  TAG_DE_FOTO_LABEL,
  escolherFotoPrincipal,
  type TagDeFoto,
} from "@/core/fotos.ts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
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

function ehDoCommons(url: string): boolean {
  try {
    return new URL(url).hostname === "commons.wikimedia.org";
  } catch {
    return false;
  }
}

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
 * No modo de edição, a equipe vê controles em cada miniatura: a lixeira, que
 * marca a foto para sair da espécie, e o lápis ao lado da pastilha, que troca
 * a fase retratada, ambos para moderação e administração; e a estrela, cuja
 * versão preenchida marca a foto que ilustra o card e o cabeçalho da ficha,
 * só para a administração — a capa é escolha dela. Os três entram no rascunho
 * e só valem no envio (ver ModoDeEdicao.tsx) — a foto marcada para sair fica
 * apagada até lá, e a lixeira desmarca.
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
  const papel = sessao?.user.role;
  const podeEscolherCapa = edicao.ativo && papel === "admin";
  const daEquipe = papel === "admin" || papel === "moderator";
  const podeRemover = edicao.ativo && daEquipe;
  const podeTrocarFase = edicao.ativo && daEquipe;
  // A capa automática ignora as marcadas para sair: elas não ficam.
  const principalSalva =
    escolherFotoPrincipal(
      fotos.filter((foto) => !edicao.fotosRemovidas.includes(foto.id)),
    )?.id ?? null;
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
        {fotos.map((foto, indice) => {
          const saindo = edicao.fotosRemovidas.includes(foto.id);
          // A fase do rascunho, quando há: a miniatura mostra o que vai valer.
          const fase = edicao.fasesDeFoto[foto.id] ?? foto.tag;
          return (
            <li key={foto.id} className="relative shrink-0 snap-start">
              <button
                type="button"
                ref={(elemento) => {
                  miniaturas.current[indice] = elemento;
                }}
                onClick={() => setAberta(indice)}
                className={cn(
                  "group relative block overflow-hidden rounded-lg border border-bg-border transition-all duration-240 hover:border-primary/60",
                  saindo && "border-red-500/60 opacity-40 grayscale",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/media/${foto.key}`}
                  alt={foto.alt ?? ""}
                  loading="lazy"
                  className="h-40 w-56 object-cover transition-transform duration-320 group-hover:scale-[1.03]"
                />
              </button>

              {/*
                Fora do botão da miniatura, mas sem capturar o clique: a
                pastilha continua parecendo parte da foto, e clicar nela ainda
                abre o visor. Só o lápis volta a receber eventos.
              */}
              <div className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1">
                <span
                  className={cn(
                    "rounded-md border border-bg-border/60 bg-bg-base/75 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-foreground/90",
                    fase !== foto.tag && "border-primary/60 text-primary",
                  )}
                >
                  {TAG_DE_FOTO_LABEL[fase]}
                </span>
                {podeTrocarFase && !saindo && (
                  <EscolherFase
                    fase={fase}
                    aoEscolher={(escolhida) =>
                      // Voltar à fase gravada é desfazer a troca, não uma
                      // troca a mais no rascunho.
                      edicao.definirFaseDeFoto(
                        foto.id,
                        escolhida === foto.tag ? null : escolhida,
                      )
                    }
                  />
                )}
              </div>
              {(podeEscolherCapa || podeRemover) && (
                <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                  {podeEscolherCapa && !saindo && (
                    <ControleDaFoto
                      rotulo={
                        foto.id === principal
                          ? "Foto principal da espécie"
                          : "Usar como foto principal"
                      }
                      marcado={foto.id === principal}
                      onClick={() =>
                        // Voltar à que já está salva é desfazer a troca, não uma
                        // troca a mais no rascunho.
                        edicao.escolherFotoPrincipal(
                          foto.id === principalSalva ? null : foto.id,
                        )
                      }
                    >
                      <Star
                        size={16}
                        fill={foto.id === principal ? "currentColor" : "none"}
                        className={
                          foto.id === principal
                            ? "text-amber-400"
                            : "text-foreground/80 hover:text-amber-400"
                        }
                      />
                    </ControleDaFoto>
                  )}
                  {podeRemover && (
                    <ControleDaFoto
                      rotulo={
                        saindo
                          ? "Manter esta foto"
                          : "Remover esta foto da espécie"
                      }
                      marcado={saindo}
                      onClick={() => edicao.alternarRemocaoDeFoto(foto.id)}
                    >
                      <Trash2
                        size={16}
                        className={
                          saindo
                            ? "text-red-500"
                            : "text-foreground/80 hover:text-red-500"
                        }
                      />
                    </ControleDaFoto>
                  )}
                </div>
              )}
            </li>
          );
        })}
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
            className="fixed left-1/2 top-1/2 z-[60] flex h-[94dvh] w-[96vw] -translate-x-1/2 -translate-y-1/2 flex-col"
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
                    {TAG_DE_FOTO_LABEL[edicao.fasesDeFoto[foco.id] ?? foco.tag]}
                  </span>
                  {foco.legenda && (
                    <span className="text-sm text-foreground/90">
                      {foco.legenda}
                    </span>
                  )}
                  <span className="font-mono text-[0.65rem] text-muted-foreground/70">
                    {foco.credito}
                  </span>
                  {foco.sourceUrl && ehDoCommons(foco.sourceUrl) && (
                    <a
                      href={foco.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[0.65rem] text-primary underline-offset-2 hover:underline"
                    >
                      Ver no Wikimedia Commons
                      <ExternalLink size={11} />
                    </a>
                  )}
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
 * O lápis ao lado da pastilha: abre a lista de fases e troca a da foto.
 *
 * A fase governa a ordem da galeria e a escolha automática da capa
 * (core/fotos.ts), então é classificação do catálogo — por isso fica com a
 * equipe, e não com quem envia a foto.
 */
function EscolherFase({
  fase,
  aoEscolher,
}: {
  fase: TagDeFoto;
  aoEscolher: (fase: TagDeFoto) => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        aria-label="Trocar a fase retratada"
        title="Trocar a fase retratada"
        className="pointer-events-auto rounded-full border border-bg-border/60 bg-bg-base/75 p-1 text-foreground/80 transition-all duration-240 hover:scale-110 hover:text-primary active:scale-95"
      >
        <Pencil size={13} />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-44 p-1">
        <p className="px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
          Fase retratada
        </p>
        {TAGS_DE_FOTO.map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={opcao === fase}
            onClick={() => {
              aoEscolher(opcao);
              setAberto(false);
            }}
            className={cn(
              "block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-240 hover:bg-bg-surface2",
              opcao === fase
                ? "font-medium text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {TAG_DE_FOTO_LABEL[opcao]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Estrela e lixeira do modo de edição. Ficam fora do botão da miniatura, e não
 * dentro: botão dentro de botão é HTML inválido, e o clique abriria o visor
 * junto.
 */
function ControleDaFoto({
  rotulo,
  marcado,
  onClick,
  children,
}: {
  rotulo: string;
  marcado: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={marcado}
      aria-label={rotulo}
      title={rotulo}
      className="rounded-full border border-bg-border/60 bg-bg-base/75 p-1 transition-transform duration-240 hover:scale-110 active:scale-95 [&>svg]:transition-colors [&>svg]:duration-240"
    >
      {children}
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
