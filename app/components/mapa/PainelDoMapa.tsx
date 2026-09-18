"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MousePointer2,
  Pentagon,
  Spline,
  Check,
  X,
  Trash2,
  Layers,
} from "lucide-react";
import { area as areaDoPoligono, comprimento } from "@/core/geo.ts";
import { contarMudas, densidadePorHectare } from "@/core/croqui.ts";
import { salvarArea, salvarLinha, removerLinha } from "@/app/actions/espaco.ts";
import { Croqui, type Ferramenta, type MudasDeUmPlantio } from "./Croqui.tsx";
import { ControlesDaArea, formatarArea } from "./ControlesDaArea.tsx";
import { PosicionarPlantios } from "./PosicionarPlantios.tsx";
import type { AreaComLinhas, PlantioEspacial } from "@/lib/espaco.ts";
import { provedoresDisponiveis, type ProvedorDeMapa } from "@/lib/tiles.ts";

/**
 * Mapa de plantio.
 *
 * Croqui e SIG são o mesmo renderizador: a geometria é sempre o plano métrico
 * local, e a georreferência é só um atributo que permite exportar em WGS84 e,
 * adiante, sobrepor um mapa de fundo.
 */
export function PainelDoMapa({
  projectId,
  areas,
  plantios,
  podeEditar,
}: {
  projectId: string;
  areas: AreaComLinhas[];
  plantios: PlantioEspacial[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [areaAtivaId, setAreaAtivaId] = useState(areas[0]?.id ?? null);
  const [ferramenta, setFerramenta] = useState<Ferramenta>("navegar");
  const [rascunho, setRascunho] = useState<{ x: number; y: number }[]>([]);
  const [linhaSelecionadaId, setLinhaSelecionadaId] = useState<string | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [fundoId, setFundoId] = useState<string>("nenhum");

  const provedores = useMemo(() => provedoresDisponiveis(), []);

  const area =
    areas.find((item) => item.id === areaAtivaId) ?? areas[0] ?? null;

  const atualizar = useCallback(() => router.refresh(), [router]);

  const mudas: MudasDeUmPlantio[] = useMemo(() => {
    if (!area) return [];
    const idsDasLinhas = new Set(area.linhas.map((linha) => linha.id));

    return plantios
      .filter(
        (plantio) =>
          plantio.placement !== null &&
          idsDasLinhas.has(plantio.placement.rowId),
      )
      .map((plantio) => ({
        plantingId: plantio.id,
        nomeComum: plantio.nomeComum,
        regra: plantio.placement!,
      }));
  }, [area, plantios]);

  const totalDeMudas = useMemo(
    () => mudas.reduce((soma, item) => soma + contarMudas(item.regra), 0),
    [mudas],
  );

  async function concluirDesenho() {
    if (!podeEditar) return;
    setErro(null);
    setSalvando(true);

    if (ferramenta === "poligono") {
      if (rascunho.length < 3) {
        setErro("Um polígono precisa de ao menos três vértices.");
        setSalvando(false);
        return;
      }
      const resultado = await salvarArea({
        id: area?.id,
        projectId,
        nome: area?.nome ?? `Área ${areas.length + 1}`,
        geomLocal: rascunho,
      });
      setSalvando(false);

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar a área.");
        return;
      }
      setAreaAtivaId(resultado.dados!.id);
    } else if (ferramenta === "linha") {
      if (!area) {
        setErro("Desenhe a área antes de traçar linhas.");
        setSalvando(false);
        return;
      }
      if (rascunho.length < 2) {
        setErro("Uma linha precisa de ao menos dois pontos.");
        setSalvando(false);
        return;
      }
      const resultado = await salvarLinha({
        projectId,
        areaId: area.id,
        tipo: "plantio",
        pathLocal: rascunho,
      });
      setSalvando(false);

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar a linha.");
        return;
      }
    }

    setRascunho([]);
    setFerramenta("navegar");
    atualizar();
  }

  async function apagarLinha(id: string) {
    if (!area) return;
    const resultado = await removerLinha(id, area.id, projectId);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível remover.");
      return;
    }
    setLinhaSelecionadaId(null);
    atualizar();
  }

  const linhaSelecionada = area?.linhas.find(
    (linha) => linha.id === linhaSelecionadaId,
  );

  const georreferenciada =
    area?.anchorLat != null && area?.anchorLon != null
      ? {
          anchorLat: area.anchorLat,
          anchorLon: area.anchorLon,
          rotationDeg: area.rotationDeg,
        }
      : null;

  const provedorAtivo: ProvedorDeMapa | null =
    georreferenciada && fundoId !== "nenhum"
      ? (provedores.find((item) => item.id === fundoId) ?? null)
      : null;

  // Medidas do rascunho, mostradas enquanto se desenha.
  const medidaDoRascunho =
    rascunho.length >= 2
      ? ferramenta === "poligono" && rascunho.length >= 3
        ? formatarArea(areaDoPoligono(rascunho))
        : `${comprimento(rascunho).toFixed(1)} m`
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-bg-border px-3 py-2">
          {podeEditar && (
            <div className="flex gap-1">
              <Ferramenta_
                ativa={ferramenta === "navegar"}
                icone={<MousePointer2 size={13} />}
                rotulo="Navegar"
                onClick={() => {
                  setFerramenta("navegar");
                  setRascunho([]);
                }}
              />
              <Ferramenta_
                ativa={ferramenta === "poligono"}
                icone={<Pentagon size={13} />}
                rotulo={area ? "Redesenhar área" : "Desenhar área"}
                onClick={() => {
                  setFerramenta("poligono");
                  setRascunho([]);
                }}
              />
              <Ferramenta_
                ativa={ferramenta === "linha"}
                icone={<Spline size={13} />}
                rotulo="Linha"
                onClick={() => {
                  setFerramenta("linha");
                  setRascunho([]);
                }}
                desabilitada={!area}
              />
            </div>
          )}

          {ferramenta !== "navegar" && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.65rem] text-muted-foreground">
                {rascunho.length} ponto(s)
                {medidaDoRascunho && ` · ${medidaDoRascunho}`}
              </span>
              <button
                type="button"
                onClick={concluirDesenho}
                disabled={salvando}
                className="inline-flex items-center gap-1 rounded-md border border-primary px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                <Check size={12} />
                Concluir
              </button>
              <button
                type="button"
                onClick={() => {
                  setRascunho([]);
                  setFerramenta("navegar");
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={12} />
                Cancelar
              </button>
            </div>
          )}

          {linhaSelecionada && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.65rem] text-secondary">
                Linha {linhaSelecionada.rotulo ?? ""} ·{" "}
                {linhaSelecionada.comprimentoM.toFixed(1)} m
              </span>
              {podeEditar && (
                <button
                  type="button"
                  onClick={() => apagarLinha(linhaSelecionada.id)}
                  aria-label="Remover linha"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}

          <label
            className="ml-auto flex items-center gap-1.5"
            title={
              georreferenciada
                ? undefined
                : "Ancore a área numa latitude e longitude para poder sobrepor um mapa."
            }
          >
            <Layers
              size={13}
              className={
                georreferenciada
                  ? "text-muted-foreground"
                  : "text-muted-foreground/40"
              }
              aria-hidden="true"
            />
            <span className="sr-only">Fundo do mapa</span>
            <select
              aria-label="Fundo do mapa"
              value={fundoId}
              disabled={!georreferenciada}
              onChange={(evento) => setFundoId(evento.target.value)}
              className="rounded-md border border-border bg-bg-surface1 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
            >
              <option value="nenhum">Sem fundo</option>
              {provedores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.rotulo}
                </option>
              ))}
            </select>
          </label>

          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            <span className="metric">
              {totalDeMudas.toLocaleString("pt-BR")}
            </span>{" "}
            mudas
            {area && area.areaM2 > 0 && (
              <>
                {" · "}
                <span className="metric">
                  {Math.round(
                    densidadePorHectare(totalDeMudas, area.areaM2) ?? 0,
                  )}
                </span>{" "}
                /ha
              </>
            )}
          </span>
        </div>

        {erro && (
          <p
            role="alert"
            className="border-b border-red-500/30 bg-red-500/5 px-4 py-2 text-xs text-red-900 dark:text-red-200"
          >
            {erro}
          </p>
        )}

        <div className="relative min-h-0 flex-1">
          {provedorAtivo && (
            <p className="pointer-events-none absolute bottom-1 right-2 z-10 rounded bg-background/70 px-1.5 py-0.5 text-[0.6rem] text-muted-foreground backdrop-blur">
              {provedorAtivo.atribuicao}
            </p>
          )}
          {area || rascunho.length > 0 || ferramenta !== "navegar" ? (
            <Croqui
              poligono={area?.geomLocal ?? []}
              linhas={area?.linhas ?? []}
              mudas={mudas}
              ferramenta={ferramenta}
              rascunho={rascunho}
              linhaSelecionadaId={linhaSelecionadaId}
              onRascunho={setRascunho}
              onSelecionarLinha={setLinhaSelecionadaId}
              georref={georreferenciada}
              provedorDeMapa={provedorAtivo}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <p className="max-w-[46ch] text-center text-sm leading-[1.7] text-muted-foreground">
                Nenhuma área desenhada ainda.{" "}
                {podeEditar
                  ? "Use “Desenhar área” e clique para marcar os vértices — as medidas saem em metros reais."
                  : "O dono do projeto ainda não desenhou a área."}
              </p>
            </div>
          )}
        </div>
      </div>

      {area && (
        <aside className="min-h-0 w-full overflow-y-auto border-l border-bg-border bg-bg-surface1/40 p-4 lg:w-72">
          <ControlesDaArea
            area={area}
            projectId={projectId}
            podeEditar={podeEditar}
            onMudanca={atualizar}
          />

          <div className="mt-6 border-t border-bg-border pt-6">
            <PosicionarPlantios
              projectId={projectId}
              area={area}
              plantios={plantios}
              podeEditar={podeEditar}
              onMudanca={atualizar}
            />
          </div>
        </aside>
      )}
    </div>
  );
}

function Ferramenta_({
  ativa,
  icone,
  rotulo,
  onClick,
  desabilitada,
}: {
  ativa: boolean;
  icone: React.ReactNode;
  rotulo: string;
  onClick: () => void;
  desabilitada?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitada}
      aria-pressed={ativa}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-240 disabled:opacity-40 ${
        ativa
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icone}
      {rotulo}
    </button>
  );
}
