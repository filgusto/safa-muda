"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  TAGS_DE_FOTO,
  TAG_DE_FOTO_LABEL,
  type TagDeFoto,
} from "@/core/fotos.ts";
import { cn } from "@/lib/utils.ts";

/**
 * Carrossel das fases da planta, cada uma com sua ilustração (em
 * `public/fases/`, desenhadas a partir do abacateiro).
 *
 * Por baixo são rádios nativos: as setas do teclado trocam de fase e o leitor
 * de tela anuncia o grupo como uma escolha única. A faixa rola na horizontal
 * quando não cabe, e os botões laterais só aparecem enquanto há o que rolar.
 *
 * `valor` vazio é "nenhuma escolhida ainda"; com `obrigatorio`, o próprio
 * navegador barra o envio do formulário até uma fase ser marcada.
 */
export function SeletorDeFase({
  valor,
  aoEscolher,
  rotuladoPor,
  obrigatorio = false,
}: {
  valor: TagDeFoto | "";
  aoEscolher: (tag: TagDeFoto) => void;
  rotuladoPor: string;
  obrigatorio?: boolean;
}) {
  const faixa = useRef<HTMLDivElement>(null);
  const [bordas, setBordas] = useState({ inicio: true, fim: true });

  const medir = useCallback(() => {
    const el = faixa.current;
    if (!el) return;
    setBordas({
      inicio: el.scrollLeft <= 1,
      fim: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    medir();
    const el = faixa.current;
    if (!el) return;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [medir]);

  function rolar(sentido: 1 | -1) {
    const el = faixa.current;
    if (!el) return;
    el.scrollBy({ left: sentido * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={faixa}
        role="radiogroup"
        aria-labelledby={rotuladoPor}
        onScroll={medir}
        className="flex snap-x gap-2 overflow-x-auto scroll-smooth px-0.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TAGS_DE_FOTO.map((fase) => {
          const escolhida = fase === valor;
          return (
            <label
              key={fase}
              className={cn(
                "group relative w-24 shrink-0 cursor-pointer snap-start rounded-lg border p-1 transition-colors duration-240",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                escolhida
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50",
              )}
            >
              <input
                type="radio"
                name={rotuladoPor}
                value={fase}
                checked={escolhida}
                required={obrigatorio}
                onChange={() => aoEscolher(fase)}
                onFocus={(evento) =>
                  evento.currentTarget.parentElement?.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                  })
                }
                className="sr-only"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/fases/${fase}.jpg`}
                alt=""
                width={400}
                height={300}
                className={cn(
                  "aspect-[4/3] w-full rounded-md object-cover transition-opacity duration-240",
                  escolhida
                    ? "opacity-100"
                    : "opacity-70 group-hover:opacity-100",
                )}
              />
              <span
                className={cn(
                  "mt-1 block text-center text-xs",
                  escolhida
                    ? "font-medium text-primary"
                    : "text-muted-foreground",
                )}
              >
                {TAG_DE_FOTO_LABEL[fase]}
              </span>
            </label>
          );
        })}
      </div>

      {!bordas.inicio && (
        <BotaoDeRolagem sentido={-1} aoClicar={() => rolar(-1)} />
      )}
      {!bordas.fim && <BotaoDeRolagem sentido={1} aoClicar={() => rolar(1)} />}
    </div>
  );
}

function BotaoDeRolagem({
  sentido,
  aoClicar,
}: {
  sentido: 1 | -1;
  aoClicar: () => void;
}) {
  const Icone = sentido === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={aoClicar}
      className={cn(
        "absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors duration-240 hover:border-primary hover:text-primary",
        sentido === 1 ? "-right-2" : "-left-2",
      )}
    >
      <Icone size={16} />
    </button>
  );
}
