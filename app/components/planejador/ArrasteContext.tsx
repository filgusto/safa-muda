"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import type { CargaDeArraste } from "./tipos.ts";

/**
 * Arraste do catálogo para a timeline.
 *
 * Usa Pointer Events em vez do drag-and-drop nativo do HTML. O nativo é mais
 * simples, mas **não existe em toque** — num tablet em campo, arrastar uma
 * espécie para a faixa simplesmente não acontecia.
 *
 * Pointer Events cobrem mouse, toque e caneta com o mesmo caminho de código.
 * O preço é ter de carregar a carga e a posição num contexto, já que a origem
 * (painel do catálogo) e o destino (faixa da timeline) são componentes
 * distantes na árvore.
 */

interface EstadoDoArraste {
  carga: CargaDeArraste;
  x: number;
  y: number;
  /** Verdadeiro só depois de passar do limiar — evita disparar num toque. */
  ativo: boolean;
}

type ResolvedorDeSoltura = (
  carga: CargaDeArraste,
  clientX: number,
  clientY: number,
) => void;

interface ContextoDeArraste {
  estado: EstadoDoArraste | null;
  iniciar: (carga: CargaDeArraste, evento: React.PointerEvent) => void;
  definirResolvedor: (resolvedor: ResolvedorDeSoltura | null) => void;
}

const Contexto = createContext<ContextoDeArraste | null>(null);

/**
 * Distância mínima antes de considerar arraste.
 *
 * Sem isso, um toque para rolar a lista viraria um plantio acidental.
 */
const LIMIAR_PX = 8;

export function ProvedorDeArraste({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoDoArraste | null>(null);
  const resolvedorRef = useRef<ResolvedorDeSoltura | null>(null);
  const inicioRef = useRef<{ x: number; y: number } | null>(null);
  /**
   * Espelho do estado para leitura na soltura.
   *
   * A soltura não pode ler o estado de dentro do updater do `setEstado`: em
   * modo estrito o React chama o updater duas vezes, e o plantio era criado em
   * duplicata.
   */
  const estadoRef = useRef<EstadoDoArraste | null>(null);

  const definirResolvedor = useCallback(
    (resolvedor: ResolvedorDeSoltura | null) => {
      resolvedorRef.current = resolvedor;
    },
    [],
  );

  const iniciar = useCallback(
    (carga: CargaDeArraste, evento: React.PointerEvent) => {
      inicioRef.current = { x: evento.clientX, y: evento.clientY };
      setEstado({ carga, x: evento.clientX, y: evento.clientY, ativo: false });
    },
    [],
  );

  useEffect(() => {
    estadoRef.current = estado;
    if (!estado) return;

    const aoMover = (evento: PointerEvent) => {
      const inicio = inicioRef.current;
      if (!inicio) return;

      const distancia = Math.hypot(
        evento.clientX - inicio.x,
        evento.clientY - inicio.y,
      );

      setEstado((anterior) =>
        anterior
          ? {
              ...anterior,
              x: evento.clientX,
              y: evento.clientY,
              ativo: anterior.ativo || distancia > LIMIAR_PX,
            }
          : null,
      );
    };

    const aoSoltar = (evento: PointerEvent) => {
      const anterior = estadoRef.current;
      setEstado(null);
      inicioRef.current = null;

      if (anterior?.ativo) {
        resolvedorRef.current?.(anterior.carga, evento.clientX, evento.clientY);
      }
    };

    const aoCancelar = () => {
      setEstado(null);
      inicioRef.current = null;
    };

    // No documento, não no elemento: o ponteiro sai do item de origem já no
    // primeiro pixel de movimento.
    document.addEventListener("pointermove", aoMover);
    document.addEventListener("pointerup", aoSoltar);
    document.addEventListener("pointercancel", aoCancelar);

    return () => {
      document.removeEventListener("pointermove", aoMover);
      document.removeEventListener("pointerup", aoSoltar);
      document.removeEventListener("pointercancel", aoCancelar);
    };
  }, [estado]);

  return (
    <Contexto.Provider value={{ estado, iniciar, definirResolvedor }}>
      {children}
      {estado?.ativo && <PreviaDoArraste estado={estado} />}
    </Contexto.Provider>
  );
}

export function useArraste(): ContextoDeArraste {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useArraste precisa estar dentro de ProvedorDeArraste.");
  }
  return contexto;
}

/**
 * Etiqueta que segue o dedo.
 *
 * O arraste nativo desenhava uma prévia sozinho; com Pointer Events, sem uma
 * prévia o usuário não vê que está carregando alguma coisa.
 */
function PreviaDoArraste({ estado }: { estado: EstadoDoArraste }) {
  return (
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md border border-primary bg-bg-surface1 px-2.5 py-1 text-xs shadow-[0_0_14px_0_rgba(63,175,92,0.35)]"
      style={{ left: estado.x, top: estado.y }}
      aria-hidden="true"
    >
      {estado.carga.nomeComum}
    </div>
  );
}
