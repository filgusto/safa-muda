"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { AlertTriangle, Sprout } from "lucide-react";
import {
  ESTRATOS_DE_CIMA_PARA_BAIXO,
  ESTRATO_LABEL,
  OCUPACAO_IDEAL,
  type Estrato,
} from "@/core/estratos.ts";
import { MESES_POR_PASSO, type ZoomTimeline } from "@/core/tempo.ts";
import {
  pixelsPorMes,
  mesParaPixel,
  encaixarNaEscala,
  normalizarIntervalo,
  duracaoSugeridaMeses,
  distribuirEmSublinhas,
  alturaEmSublinhas,
  DURACAO_MINIMA_MESES,
} from "@/core/planejamento.ts";
import { criarPlantio, moverPlantio } from "@/app/actions/projetos.ts";
import { type PlantioLocal, type CargaDeArraste } from "./tipos.ts";
import { useArraste } from "./ArrasteContext.tsx";

const ALTURA_DA_SUBLINHA = 34;
const ESPACO_ENTRE_BARRAS = 4;
const LARGURA_DO_ROTULO = 104;

interface Props {
  projectId: string;
  horizonteMeses: number;
  mesDeHoje: number | null;
  plantios: PlantioLocal[];
  podeEditar: boolean;
  zoom: ZoomTimeline;
  selecionadoId: string | null;
  onSelecionar: (id: string | null) => void;
  onMudanca: (plantios: PlantioLocal[]) => void;
  onAviso: (mensagem: string | null) => void;
}

/**
 * A timeline: tempo no eixo X, estratos no Y.
 *
 * Cada faixa é um andar da agrofloresta. As barras são posicionadas em pixels
 * derivados de meses (core/planejamento.ts), e toda edição é otimista: o estado
 * local muda na hora e a action confirma depois. Se a action falhar, o estado
 * volta — arrastar uma barra não pode travar esperando a rede.
 */
export function Timeline({
  projectId,
  horizonteMeses,
  mesDeHoje,
  plantios,
  podeEditar,
  zoom,
  selecionadoId,
  onSelecionar,
  onMudanca,
  onAviso,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [faixaAlvo, setFaixaAlvo] = useState<Estrato | null>(null);
  const { estado: estadoDoArraste, definirResolvedor } = useArraste();

  const pxPorMes = pixelsPorMes(zoom);
  const largura = horizonteMeses * pxPorMes;

  const porEstrato = useMemo(() => {
    const mapa = new Map<Estrato, PlantioLocal[]>();
    for (const estrato of ESTRATOS_DE_CIMA_PARA_BAIXO) mapa.set(estrato, []);
    for (const plantio of plantios) mapa.get(plantio.estrato)?.push(plantio);
    return mapa;
  }, [plantios]);

  /** Converte a posição do ponteiro em mês, relativo ao início da área rolável. */
  const mesNaPosicao = useCallback(
    (clientX: number): number => {
      const area = areaRef.current;
      if (!area) return 0;
      const caixa = area.getBoundingClientRect();
      const x = clientX - caixa.left + area.scrollLeft;
      return encaixarNaEscala(x / pxPorMes, zoom);
    },
    [pxPorMes, zoom],
  );

  const aoSoltarEspecie = useCallback(
    async (carga: CargaDeArraste, estrato: Estrato, clientX: number) => {
      setFaixaAlvo(null);
      if (!podeEditar) return;

      const mesInicio = Math.max(0, mesNaPosicao(clientX));
      const duracao = duracaoSugeridaMeses({
        diasParaColherMax: carga.diasParaColherMax,
        estrato,
      });
      const intervalo = normalizarIntervalo(
        { mesInicio, mesFim: mesInicio + duracao },
        horizonteMeses,
      );

      const forcado =
        carga.estratoDaEspecie !== null && carga.estratoDaEspecie !== estrato;

      if (forcado) {
        onAviso(
          `${carga.nomeComum} foi posta no estrato ${ESTRATO_LABEL[estrato]}, mas o catálogo indica ${ESTRATO_LABEL[carga.estratoDaEspecie!]}. A barra fica marcada.`,
        );
      } else if (carga.estratoDaEspecie === null) {
        onAviso(
          `${carga.nomeComum} não tem estrato informado no catálogo. Você a colocou em ${ESTRATO_LABEL[estrato]} — considere sugerir a correção na ficha da espécie.`,
        );
      } else {
        onAviso(null);
      }

      const resultado = await criarPlantio({
        projectId,
        speciesId: carga.speciesId,
        estrato,
        mesInicio: intervalo.mesInicio,
        mesFim: intervalo.mesFim,
      });

      if (!resultado.ok) {
        onAviso(resultado.erro ?? "Não foi possível adicionar a espécie.");
        return;
      }
      // A página revalida e devolve a lista já com o novo plantio.
      onMudanca(plantios);
    },
    [
      podeEditar,
      mesNaPosicao,
      horizonteMeses,
      projectId,
      onAviso,
      onMudanca,
      plantios,
    ],
  );

  /**
   * Resolve a soltura: descobre sob qual faixa o ponteiro parou.
   *
   * `elementFromPoint` em vez de guardar retângulos das faixas — as alturas
   * mudam conforme as barras se empilham, e um cache desatualizado colocaria a
   * planta no andar errado.
   */
  useEffect(() => {
    definirResolvedor((carga, clientX, clientY) => {
      const alvo = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>("[data-faixa-estrato]");

      const estrato = alvo?.dataset.faixaEstrato as Estrato | undefined;
      if (estrato) void aoSoltarEspecie(carga, estrato, clientX);
      setFaixaAlvo(null);
    });

    return () => definirResolvedor(null);
  }, [definirResolvedor, aoSoltarEspecie]);

  // Realce da faixa sob o ponteiro enquanto o arraste está em curso.
  useEffect(() => {
    if (!estadoDoArraste?.ativo) {
      setFaixaAlvo(null);
      return;
    }
    const alvo = document
      .elementFromPoint(estadoDoArraste.x, estadoDoArraste.y)
      ?.closest<HTMLElement>("[data-faixa-estrato]");

    setFaixaAlvo((alvo?.dataset.faixaEstrato as Estrato | undefined) ?? null);
  }, [estadoDoArraste]);

  /** Arrasta o corpo (move) ou uma das bordas (redimensiona) de uma barra. */
  function iniciarManipulacao(
    evento: React.PointerEvent,
    plantio: PlantioLocal,
    modo: "mover" | "inicio" | "fim",
  ) {
    if (!podeEditar) return;
    evento.preventDefault();
    evento.stopPropagation();

    const alvo = evento.currentTarget as HTMLElement;
    alvo.setPointerCapture(evento.pointerId);

    const xInicial = evento.clientX;
    const original = { mesInicio: plantio.mesInicio, mesFim: plantio.mesFim };
    setArrastando(plantio.id);

    let ultimo = original;

    const aoMover = (movimento: PointerEvent) => {
      const deltaMeses = encaixarNaEscala(
        (movimento.clientX - xInicial) / pxPorMes,
        zoom,
      );

      const proposto =
        modo === "mover"
          ? {
              mesInicio: original.mesInicio + deltaMeses,
              mesFim: original.mesFim + deltaMeses,
            }
          : modo === "inicio"
            ? {
                mesInicio: Math.min(
                  original.mesInicio + deltaMeses,
                  original.mesFim - DURACAO_MINIMA_MESES,
                ),
                mesFim: original.mesFim,
              }
            : {
                mesInicio: original.mesInicio,
                mesFim: Math.max(
                  original.mesFim + deltaMeses,
                  original.mesInicio + DURACAO_MINIMA_MESES,
                ),
              };

      ultimo = normalizarIntervalo(proposto, horizonteMeses);
      onMudanca(
        plantios.map((item) =>
          item.id === plantio.id ? { ...item, ...ultimo } : item,
        ),
      );
    };

    const aoSoltar = async () => {
      alvo.removeEventListener("pointermove", aoMover);
      alvo.removeEventListener("pointerup", aoSoltar);
      setArrastando(null);

      if (
        ultimo.mesInicio === original.mesInicio &&
        ultimo.mesFim === original.mesFim
      ) {
        return;
      }

      const resultado = await moverPlantio({
        id: plantio.id,
        projectId,
        ...ultimo,
      });

      if (!resultado.ok) {
        // Desfaz a mudança otimista.
        onMudanca(
          plantios.map((item) =>
            item.id === plantio.id ? { ...item, ...original } : item,
          ),
        );
        onAviso(resultado.erro ?? "Não foi possível mover.");
      }
    };

    alvo.addEventListener("pointermove", aoMover);
    alvo.addEventListener("pointerup", aoSoltar);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        {/* Rótulos das faixas — fora da área rolável, para não deslizarem. */}
        <div
          className="shrink-0 border-r border-bg-border"
          style={{ width: LARGURA_DO_ROTULO }}
        >
          <div className="h-8 border-b border-bg-border" />
          {ESTRATOS_DE_CIMA_PARA_BAIXO.map((estrato) => (
            <RotuloDaFaixa
              key={estrato}
              estrato={estrato}
              altura={alturaDaFaixa(porEstrato.get(estrato) ?? [])}
            />
          ))}
        </div>

        <div ref={areaRef} className="min-w-0 flex-1 overflow-x-auto">
          <div style={{ width: largura, minWidth: "100%" }}>
            <Regua
              horizonteMeses={horizonteMeses}
              zoom={zoom}
              pxPorMes={pxPorMes}
            />

            <div className="relative">
              {mesDeHoje !== null &&
                mesDeHoje >= 0 &&
                mesDeHoje <= horizonteMeses && (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-secondary"
                    style={{ left: mesParaPixel(mesDeHoje, zoom) }}
                    aria-hidden="true"
                  >
                    <span className="absolute -top-0.5 left-1 font-mono text-[0.6rem] uppercase tracking-wider text-secondary">
                      hoje
                    </span>
                  </div>
                )}

              {ESTRATOS_DE_CIMA_PARA_BAIXO.map((estrato) => {
                const doEstrato = porEstrato.get(estrato) ?? [];
                const sublinhas = distribuirEmSublinhas(doEstrato);

                return (
                  <div
                    key={estrato}
                    data-faixa-estrato={estrato}
                    className={`relative border-b border-bg-border/60 transition-colors duration-240 ${
                      faixaAlvo === estrato ? "bg-primary/10" : ""
                    }`}
                    style={{ height: alturaDaFaixa(doEstrato) }}
                  >
                    <Grade
                      horizonteMeses={horizonteMeses}
                      zoom={zoom}
                      pxPorMes={pxPorMes}
                    />

                    {doEstrato.map((plantio) => (
                      <Barra
                        key={plantio.id}
                        plantio={plantio}
                        zoom={zoom}
                        sublinha={sublinhas.get(plantio.id) ?? 0}
                        selecionado={selecionadoId === plantio.id}
                        arrastando={arrastando === plantio.id}
                        podeEditar={podeEditar}
                        onSelecionar={() => onSelecionar(plantio.id)}
                        onManipular={iniciarManipulacao}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function alturaDaFaixa(plantios: PlantioLocal[]): number {
  return alturaEmSublinhas(plantios) * ALTURA_DA_SUBLINHA + ESPACO_ENTRE_BARRAS;
}

function RotuloDaFaixa({
  estrato,
  altura,
}: {
  estrato: Estrato;
  altura: number;
}) {
  const ideal = OCUPACAO_IDEAL[estrato];
  return (
    <div
      className="flex flex-col justify-center border-b border-bg-border/60 px-3"
      style={{ height: altura }}
    >
      <span className="font-mono text-[0.65rem] uppercase tracking-wider text-foreground">
        {ESTRATO_LABEL[estrato]}
      </span>
      {ideal !== null && (
        <span
          className="font-mono text-[0.6rem] text-muted-foreground"
          title="Ocupação ideal do andar, segundo Agroflorestando o Mundo cap. 10"
        >
          ideal {Math.round(ideal * 100)}%
        </span>
      )}
    </div>
  );
}

/** Régua do topo: marca anos, e meses quando o zoom permite. */
function Regua({
  horizonteMeses,
  zoom,
  pxPorMes,
}: {
  horizonteMeses: number;
  zoom: ZoomTimeline;
  pxPorMes: number;
}) {
  const passo = MESES_POR_PASSO[zoom];
  const marcas: number[] = [];
  for (let mes = 0; mes <= horizonteMeses; mes += passo) marcas.push(mes);

  return (
    <div className="relative h-8 border-b border-bg-border">
      {marcas.map((mes) => {
        const inicioDeAno = mes % 12 === 0;
        return (
          <span
            key={mes}
            className={`absolute top-0 flex h-full items-center pl-1 font-mono text-[0.6rem] ${
              inicioDeAno
                ? "border-l border-bg-border text-muted-foreground"
                : "text-muted-foreground/50"
            }`}
            style={{ left: mes * pxPorMes }}
          >
            {inicioDeAno ? `A${mes / 12}` : zoom === "mes" ? mes % 12 : ""}
          </span>
        );
      })}
    </div>
  );
}

/** Linhas verticais de ano, para dar leitura à posição das barras. */
function Grade({
  horizonteMeses,
  zoom,
  pxPorMes,
}: {
  horizonteMeses: number;
  zoom: ZoomTimeline;
  pxPorMes: number;
}) {
  // Em horizontes longos uma linha por ano vira ruído visual.
  const passoEmAnos = zoom === "ano" ? 5 : 1;
  const linhas: number[] = [];
  for (let ano = 0; ano * 12 <= horizonteMeses; ano += passoEmAnos) {
    linhas.push(ano * 12);
  }

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {linhas.map((mes) => (
        <span
          key={mes}
          className="absolute bottom-0 top-0 w-px bg-bg-border/50"
          style={{ left: mes * pxPorMes }}
        />
      ))}
    </div>
  );
}

function Barra({
  plantio,
  zoom,
  sublinha,
  selecionado,
  arrastando,
  podeEditar,
  onSelecionar,
  onManipular,
}: {
  plantio: PlantioLocal;
  zoom: ZoomTimeline;
  sublinha: number;
  selecionado: boolean;
  arrastando: boolean;
  podeEditar: boolean;
  onSelecionar: () => void;
  onManipular: (
    evento: React.PointerEvent,
    plantio: PlantioLocal,
    modo: "mover" | "inicio" | "fim",
  ) => void;
}) {
  const esquerda = mesParaPixel(plantio.mesInicio, zoom);
  const largura = Math.max(
    mesParaPixel(plantio.mesFim - plantio.mesInicio, zoom),
    10,
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelecionar}
      onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          onSelecionar();
        }
      }}
      onPointerDown={(evento) => onManipular(evento, plantio, "mover")}
      title={tituloDaBarra(plantio)}
      className={`absolute flex items-center gap-1 overflow-hidden rounded-md border px-2 text-xs transition-shadow duration-240 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        podeEditar ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${arrastando ? "shadow-[0_0_14px_0_rgba(63,175,92,0.35)]" : ""} ${
        selecionado
          ? "border-primary bg-primary/25 text-foreground"
          : "border-primary/40 bg-primary/10 text-foreground/90 hover:border-primary/70"
      } ${plantio.estratoForcado ? "border-dashed" : ""} ${
        plantio.realizado === "plantado"
          ? "ring-1 ring-inset ring-secondary/60"
          : plantio.realizado === "encerrado"
            ? "opacity-50"
            : ""
      }`}
      style={{
        left: esquerda,
        width: largura,
        top: sublinha * ALTURA_DA_SUBLINHA + ESPACO_ENTRE_BARRAS,
        height: ALTURA_DA_SUBLINHA - ESPACO_ENTRE_BARRAS,
      }}
    >
      {plantio.estratoForcado && (
        <AlertTriangle
          size={11}
          className="shrink-0 text-amber-500"
          aria-label="Estrato diferente do indicado no catálogo"
        />
      )}
      {plantio.realizado === "plantado" && (
        <Sprout
          size={11}
          className="shrink-0 text-secondary"
          aria-label="Plantado em campo"
        />
      )}
      <span className="truncate">{plantio.nomeComum}</span>

      {podeEditar && (
        <>
          <span
            onPointerDown={(evento) => onManipular(evento, plantio, "inicio")}
            className="absolute bottom-0 left-0 top-0 w-1.5 cursor-ew-resize"
            aria-hidden="true"
          />
          <span
            onPointerDown={(evento) => onManipular(evento, plantio, "fim")}
            className="absolute bottom-0 right-0 top-0 w-1.5 cursor-ew-resize"
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
}

/** Junta o planejado e o que o diário registrou. */
function tituloDaBarra(plantio: PlantioLocal): string {
  const base = `${plantio.nomeComum} · mês ${plantio.mesInicio} a ${plantio.mesFim}`;
  if (!plantio.realizado || plantio.realizado === "planejado") return base;

  const estado =
    plantio.realizado === "encerrado"
      ? "encerrado em campo"
      : "plantado em campo";

  if (plantio.desvioMeses === null || plantio.desvioMeses === undefined) {
    return `${base} · ${estado}`;
  }
  if (plantio.desvioMeses === 0) return `${base} · ${estado}, no mês previsto`;

  const meses = Math.abs(plantio.desvioMeses);
  const sentido = plantio.desvioMeses > 0 ? "depois" : "antes";
  return `${base} · ${estado}, ${meses} ${meses === 1 ? "mês" : "meses"} ${sentido} do previsto`;
}
