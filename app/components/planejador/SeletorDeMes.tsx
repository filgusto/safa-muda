"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mesRelativoParaData } from "@/core/tempo.ts";

const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/**
 * Calendário de meses.
 *
 * O planejamento vive em meses relativos ao início do projeto (core/tempo.ts),
 * então o calendário mostra meses, não dias: escolher "17 de maio" daria uma
 * precisão que o modelo não guarda. Cada célula devolve o mês relativo
 * correspondente, já limitado ao horizonte do projeto.
 */
export function SeletorDeMes({
  mes,
  dataInicio,
  mesMinimo,
  mesMaximo,
  onEscolher,
}: {
  /** Mês relativo atualmente selecionado. */
  mes: number;
  dataInicio: Date;
  mesMinimo: number;
  mesMaximo: number;
  onEscolher: (mes: number) => void;
}) {
  const dataSelecionada = mesRelativoParaData(dataInicio, mes);
  const [ano, setAno] = useState(dataSelecionada.getFullYear());

  /** Mês relativo de uma posição do grid — inverso de mesRelativoParaData. */
  const mesRelativoDe = (indice: number) =>
    (ano - dataInicio.getFullYear()) * 12 + (indice - dataInicio.getMonth());

  const anoMinimo = mesRelativoParaData(dataInicio, mesMinimo).getFullYear();
  const anoMaximo = mesRelativoParaData(dataInicio, mesMaximo).getFullYear();

  return (
    <div className="mt-2 rounded-md border border-bg-border bg-bg-surface2 p-2">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setAno((atual) => atual - 1)}
          disabled={ano <= anoMinimo}
          aria-label="Ano anterior"
          className="rounded p-1 opacity-70 transition-opacity hover:opacity-100 disabled:opacity-25"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="metric text-xs">{ano}</span>
        <button
          type="button"
          onClick={() => setAno((atual) => atual + 1)}
          disabled={ano >= anoMaximo}
          aria-label="Próximo ano"
          className="rounded p-1 opacity-70 transition-opacity hover:opacity-100 disabled:opacity-25"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {MESES_CURTOS.map((rotulo, indice) => {
          const relativo = mesRelativoDe(indice);
          const fora = relativo < mesMinimo || relativo > mesMaximo;
          const atual = relativo === mes;

          return (
            <button
              key={rotulo}
              type="button"
              disabled={fora}
              onClick={() => onEscolher(relativo)}
              className={`rounded px-1 py-1 font-mono text-[0.65rem] transition-colors duration-240 ${
                atual
                  ? "bg-primary/25 text-foreground ring-1 ring-primary"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              } disabled:pointer-events-none disabled:opacity-25`}
            >
              {rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
