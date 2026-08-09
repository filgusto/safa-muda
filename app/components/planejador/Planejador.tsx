"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Info } from "lucide-react";
import type { ZOOM_TIMELINE } from "@/core/tempo.ts";
import { mesRelativoParaData } from "@/core/tempo.ts";
import {
  coberturaPorEstrato,
  lacunasDeCobertura,
} from "@/core/planejamento.ts";
import { PainelDoCatalogo } from "./PainelDoCatalogo.tsx";
import { ProvedorDeArraste } from "./ArrasteContext.tsx";
import { criarPlantio } from "@/app/actions/projetos.ts";
import { Timeline } from "./Timeline.tsx";
import { InspetorDePlantio } from "./InspetorDePlantio.tsx";
import type { PlantioLocal, CargaDeArraste, PontoDeClique } from "./tipos.ts";

/**
 * Orquestra o planejador: catálogo em cima, timeline no meio e o inspetor como
 * caixa sobreposta, ancorada na barra clicada.
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
  zoom,
  onZoom,
  catalogoAberto,
}: {
  projectId: string;
  horizonteMeses: number;
  dataInicio: string;
  plantiosIniciais: PlantioLocal[];
  podeEditar: boolean;
  /** Mora no Workspace por sobreviver à troca de vista; os botões estão no
   *  rodapé da timeline. */
  zoom: (typeof ZOOM_TIMELINE)[number];
  onZoom: (zoom: (typeof ZOOM_TIMELINE)[number]) => void;
  /** Idem: quem alterna a gaveta de plantas é o botão da barra. */
  catalogoAberto: boolean;
}) {
  const router = useRouter();
  const [plantios, setPlantios] = useState(plantiosIniciais);
  /** O inspetor é uma caixa sobreposta: guarda também onde o clique caiu. */
  const [selecao, setSelecao] = useState<{
    id: string;
    ponto: PontoDeClique;
  } | null>(null);
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

  /** Ano do calendário de um mês relativo — a régua da timeline usa no tooltip. */
  const mesParaAno = useCallback(
    (mes: number) => mesRelativoParaData(inicio, mes).getFullYear(),
    [inicio],
  );

  const selecionado = selecao
    ? (plantios.find((p) => p.id === selecao.id) ?? null)
    : null;

  const selecionar = useCallback((id: string | null, ponto?: PontoDeClique) => {
    setSelecao(id && ponto ? { id, ponto } : null);
  }, []);

  const fecharInspetor = useCallback(() => {
    setSelecao(null);
    router.refresh();
  }, [router]);

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
        {podeEditar && (
          <PainelDoCatalogo
            aberto={catalogoAberto}
            onAdicionar={adicionarNoInicio}
          />
        )}

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

        <div className="flex min-h-0 flex-1 flex-col">
          <Timeline
            projectId={projectId}
            horizonteMeses={horizonteMeses}
            mesDeHoje={mesDeHoje}
            plantios={plantios}
            podeEditar={podeEditar}
            zoom={zoom}
            onZoom={onZoom}
            cobertura={cobertura}
            lacunas={lacunas}
            mesParaData={mesParaData}
            mesParaAno={mesParaAno}
            mesDoAnoInicial={inicio.getMonth()}
            selecionadoId={selecao?.id ?? null}
            onSelecionar={selecionar}
            onMudanca={aoMudar}
            onAviso={setAviso}
          />

          {selecionado && selecao && (
            <InspetorDePlantio
              key={selecionado.id}
              plantio={selecionado}
              projectId={projectId}
              podeEditar={podeEditar}
              horizonteMeses={horizonteMeses}
              dataInicio={inicio}
              mesParaData={mesParaData}
              ponto={selecao.ponto}
              onFechar={fecharInspetor}
            />
          )}
        </div>
      </div>
    </ProvedorDeArraste>
  );
}
