"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Info } from "lucide-react";
import {
  ZOOM_TIMELINE,
  zoomSugerido,
  mesRelativoParaData,
} from "@/core/tempo.ts";
import {
  coberturaPorEstrato,
  lacunasDeCobertura,
} from "@/core/planejamento.ts";
import { ESTRATO_LABEL } from "@/core/estratos.ts";
import { PainelDoCatalogo } from "./PainelDoCatalogo.tsx";
import { ProvedorDeArraste } from "./ArrasteContext.tsx";
import { criarPlantio } from "@/app/actions/projetos.ts";
import { Timeline } from "./Timeline.tsx";
import { InspetorDePlantio } from "./InspetorDePlantio.tsx";
import type { PlantioLocal, CargaDeArraste } from "./tipos.ts";

const ROTULO_DO_ZOOM = { mes: "Mês", trimestre: "Trimestre", ano: "Ano" };

/**
 * Orquestra o planejador: catálogo à esquerda, timeline no meio, inspetor à
 * direita.
 *
 * Mantém uma cópia local dos plantios para que arrastar responda na hora. O
 * servidor revalida a rota depois de cada ação, e o efeito abaixo ressincroniza
 * quando a lista de verdade chega.
 */
export function Planejador({
  projectId,
  horizonteMeses,
  dataInicio,
  plantiosIniciais,
  podeEditar,
}: {
  projectId: string;
  horizonteMeses: number;
  dataInicio: string;
  plantiosIniciais: PlantioLocal[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [plantios, setPlantios] = useState(plantiosIniciais);
  const [zoom, setZoom] = useState(() => zoomSugerido(horizonteMeses));
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => setPlantios(plantiosIniciais), [plantiosIniciais]);

  const inicio = useMemo(() => new Date(dataInicio), [dataInicio]);

  const mesDeHoje = useMemo(() => {
    const hoje = new Date();
    const meses =
      (hoje.getFullYear() - inicio.getFullYear()) * 12 +
      (hoje.getMonth() - inicio.getMonth());
    return meses;
  }, [inicio]);

  const mesParaData = useCallback(
    (mes: number) =>
      mesRelativoParaData(inicio, mes).toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
      }),
    [inicio],
  );

  const selecionado = plantios.find((p) => p.id === selecionadoId) ?? null;

  const cobertura = useMemo(
    () => coberturaPorEstrato(plantios, horizonteMeses),
    [plantios, horizonteMeses],
  );
  const lacunas = useMemo(
    () => lacunasDeCobertura(plantios, horizonteMeses),
    [plantios, horizonteMeses],
  );

  /**
   * Caminho sem arraste: põe a espécie no início do planejamento.
   *
   * Existe para toque e teclado — e porque nem todo mundo quer mirar um ponto
   * exato na timeline só para acrescentar uma planta.
   */
  const adicionarNoInicio = useCallback(
    async (carga: CargaDeArraste) => {
      const estrato = carga.estratoDaEspecie;
      if (!estrato) {
        setAviso(
          `${carga.nomeComum} não tem estrato informado no catálogo. Arraste-a até a faixa em que você quer conduzi-la.`,
        );
        return;
      }

      const resultado = await criarPlantio({
        projectId,
        speciesId: carga.speciesId,
        estrato,
        mesInicio: 0,
      });

      if (!resultado.ok) {
        setAviso(resultado.erro ?? "Não foi possível adicionar.");
        return;
      }
      setAviso(
        `${carga.nomeComum} entrou no mês 0. Arraste a barra para ajustar o momento.`,
      );
      router.refresh();
    },
    [projectId, router],
  );

  /** Após uma ação bem-sucedida a rota revalida e devolve a lista real. */
  const aoMudar = useCallback(
    (novos: PlantioLocal[]) => {
      setPlantios(novos);
      router.refresh();
    },
    [router],
  );

  return (
    <ProvedorDeArraste>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-bg-border px-4 py-2">
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            Escala
          </span>
          <div className="flex gap-1">
            {ZOOM_TIMELINE.map((nivel) => (
              <button
                key={nivel}
                type="button"
                onClick={() => setZoom(nivel)}
                className={`rounded-md border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-240 ${
                  zoom === nivel
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {ROTULO_DO_ZOOM[nivel]}
              </button>
            ))}
          </div>

          <span className="ml-auto font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            <span className="metric">{plantios.length}</span> plantios ·{" "}
            <span className="metric">{horizonteMeses / 12}</span> anos
          </span>
        </div>

        {aviso && (
          <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs leading-[1.6] text-amber-900 dark:text-amber-200">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">{aviso}</span>
            <button
              type="button"
              onClick={() => setAviso(null)}
              aria-label="Fechar aviso"
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {podeEditar && <PainelDoCatalogo onAdicionar={adicionarNoInicio} />}

          <div className="flex min-h-0 flex-1 flex-col">
            <Timeline
              projectId={projectId}
              horizonteMeses={horizonteMeses}
              mesDeHoje={mesDeHoje}
              plantios={plantios}
              podeEditar={podeEditar}
              zoom={zoom}
              selecionadoId={selecionadoId}
              onSelecionar={setSelecionadoId}
              onMudanca={aoMudar}
              onAviso={setAviso}
            />

            <Resumo
              cobertura={cobertura}
              lacunas={lacunas}
              mesParaData={mesParaData}
            />
          </div>

          {selecionado && (
            <InspetorDePlantio
              plantio={selecionado}
              projectId={projectId}
              podeEditar={podeEditar}
              mesParaData={mesParaData}
              onFechar={() => {
                setSelecionadoId(null);
                router.refresh();
              }}
            />
          )}
        </div>
      </div>
    </ProvedorDeArraste>
  );
}

/**
 * Resumo do desenho.
 *
 * Mede presença no TEMPO por andar. A ocupação ideal do livro (20/40/60/80%) é
 * de ESPAÇO, então aparece ao lado como referência, não como veredito — só o
 * mapa (fase 4) permitirá confrontar as duas de verdade.
 */
function Resumo({
  cobertura,
  lacunas,
  mesParaData,
}: {
  cobertura: ReturnType<typeof coberturaPorEstrato>;
  lacunas: { de: number; ate: number }[];
  mesParaData: (mes: number) => string;
}) {
  return (
    <div className="border-t border-bg-border bg-bg-surface1/40 px-4 py-3">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {cobertura.map((linha) => (
          <div key={linha.estrato} className="flex items-baseline gap-2">
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              {ESTRATO_LABEL[linha.estrato]}
            </span>
            <span className="metric text-xs">
              {Math.round(linha.cobertura * 100)}%
            </span>
            <span className="font-mono text-[0.6rem] text-muted-foreground/60">
              do tempo
            </span>
          </div>
        ))}
      </div>

      {lacunas.length > 0 && (
        <p className="mt-2 text-xs leading-[1.6] text-muted-foreground">
          Solo descoberto em{" "}
          {lacunas
            .slice(0, 3)
            .map(
              (lacuna) =>
                `${mesParaData(lacuna.de)}–${mesParaData(lacuna.ate)}`,
            )
            .join(", ")}
          {lacunas.length > 3 && ` e mais ${lacunas.length - 3} trecho(s)`}.
        </p>
      )}
    </div>
  );
}
