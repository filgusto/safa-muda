"use client";

import { useState } from "react";
import { CalendarRange, Map, NotebookPen, Activity } from "lucide-react";
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
 */
export function Workspace({
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 border-b border-bg-border px-3 py-1.5">
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
      </div>

      {vista === "tempo" && (
        <Planejador
          projectId={projectId}
          horizonteMeses={horizonteMeses}
          dataInicio={dataInicio}
          plantiosIniciais={plantios}
          podeEditar={podeEditar}
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
