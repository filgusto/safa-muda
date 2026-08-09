"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarRange,
  Map,
  NotebookPen,
  Activity,
  ArrowLeft,
  Eye,
  Sprout,
  ChevronDown,
} from "lucide-react";
import { zoomSugerido } from "@/core/tempo.ts";
import { Planejador } from "./Planejador.tsx";
import { PainelDoMapa } from "@/components/mapa/PainelDoMapa.tsx";
import type { PlantioLocal } from "./tipos.ts";
import type { AreaComLinhas, PlantioEspacial } from "@/lib/espaco.ts";
import { PainelDoDiario } from "@/components/diario/PainelDoDiario.tsx";
import type { EventoComContexto } from "@/lib/diario.ts";
import { PainelDeAnalise } from "@/components/analise/PainelDeAnalise.tsx";
import type { DadosDaAnalise } from "@/lib/analise.ts";

/**
 * As duas vistas do mesmo desenho.
 *
 * Timeline e mapa não são telas diferentes: são projeções do mesmo conjunto de
 * plantios, uma no tempo e outra no espaço. A troca é local, sem navegar —
 * perder a rolagem da timeline ao consultar o mapa quebraria o raciocínio de
 * quem está desenhando.
 *
 * Identificação do projeto, vistas e controles da vista ativa dividem uma única
 * barra, separados por divisores discretos: são três níveis do mesmo comando
 * (onde estou, o que olho, como olho), e empilhá-los custava três linhas de
 * altura numa tela cuja área útil é a timeline.
 */
export function Workspace({
  nome,
  projectId,
  horizonteMeses,
  dataInicio,
  plantios,
  areas,
  plantiosEspaciais,
  eventos,
  analise,
  podeEditar,
}: {
  nome: string;
  projectId: string;
  horizonteMeses: number;
  dataInicio: string;
  plantios: PlantioLocal[];
  areas: AreaComLinhas[];
  plantiosEspaciais: PlantioEspacial[];
  eventos: EventoComContexto[];
  analise: DadosDaAnalise;
  podeEditar: boolean;
}) {
  const [vista, setVista] = useState<"tempo" | "espaco" | "diario" | "analise">(
    "tempo",
  );

  // A escala vive aqui, e não no Planejador, para sobreviver à troca de vista:
  // os botões estão no rodapé da timeline, que desmonta ao sair do tempo.
  const [zoom, setZoom] = useState(() => zoomSugerido(horizonteMeses));

  // A gaveta de plantas nasce fechada: a tela abre mostrando o desenho, e o
  // catálogo entra quando se quer acrescentar algo.
  const [catalogoAberto, setCatalogoAberto] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-bg-border px-4 py-2">
        <Link
          href="/projetos"
          className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground transition-colors duration-240 hover:text-foreground"
        >
          <ArrowLeft size={12} />
          Projetos
        </Link>

        <h1 className="font-serif text-lg font-semibold tracking-tight">
          {nome}
        </h1>

        {!podeEditar && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
            <Eye size={11} />
            somente leitura
          </span>
        )}

        <Divisor />

        <nav className="flex gap-1">
          <Aba
            ativa={vista === "tempo"}
            icone={<CalendarRange size={13} />}
            rotulo="Tempo"
            contagem={plantios.length}
            onClick={() => setVista("tempo")}
          />
          <Aba
            ativa={vista === "espaco"}
            icone={<Map size={13} />}
            rotulo="Espaço"
            contagem={areas.length}
            onClick={() => setVista("espaco")}
          />
          <Aba
            ativa={vista === "diario"}
            icone={<NotebookPen size={13} />}
            rotulo="Diário"
            contagem={eventos.length}
            onClick={() => setVista("diario")}
          />
          <Aba
            ativa={vista === "analise"}
            icone={<Activity size={13} />}
            rotulo="Análise"
            contagem={0}
            onClick={() => setVista("analise")}
          />
        </nav>

        {vista === "tempo" && (
          <>
            {podeEditar && (
              <>
                <Divisor />

                <button
                  type="button"
                  onClick={() => setCatalogoAberto((antes) => !antes)}
                  aria-expanded={catalogoAberto}
                  aria-controls="gaveta-de-plantas"
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-240 ${
                    catalogoAberto
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sprout size={13} />
                  Plantas
                  <ChevronDown
                    size={12}
                    aria-hidden
                    className={`transition-transform duration-240 motion-reduce:transition-none ${
                      catalogoAberto ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </>
            )}
          </>
        )}
      </header>

      {vista === "tempo" && (
        <Planejador
          projectId={projectId}
          horizonteMeses={horizonteMeses}
          dataInicio={dataInicio}
          plantiosIniciais={plantios}
          podeEditar={podeEditar}
          zoom={zoom}
          onZoom={setZoom}
          catalogoAberto={catalogoAberto}
        />
      )}

      {vista === "espaco" && (
        <PainelDoMapa
          projectId={projectId}
          areas={areas}
          plantios={plantiosEspaciais}
          podeEditar={podeEditar}
        />
      )}

      {vista === "analise" && (
        <PainelDeAnalise
          plantios={analise.plantios}
          areaTotalM2={analise.areaTotalM2}
          horizonteMeses={horizonteMeses}
          dataInicio={dataInicio}
        />
      )}

      {vista === "diario" && (
        <PainelDoDiario
          projectId={projectId}
          eventos={eventos}
          plantios={plantios}
          areas={areas.map((item) => ({ id: item.id, nome: item.nome }))}
          podeEditar={podeEditar}
        />
      )}
    </div>
  );
}

/** Divisor vertical discreto entre os grupos da barra. */
function Divisor() {
  return <span aria-hidden className="h-5 w-px shrink-0 bg-bg-border" />;
}

function Aba({
  ativa,
  icone,
  rotulo,
  contagem,
  onClick,
}: {
  ativa: boolean;
  icone: React.ReactNode;
  rotulo: string;
  contagem: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-240 ${
        ativa
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icone}
      {rotulo}
      {contagem > 0 && <span className="metric text-[0.6rem]">{contagem}</span>}
    </button>
  );
}
