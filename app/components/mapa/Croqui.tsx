"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { FundoDeMapa } from "./FundoDeMapa.tsx";
import type { Georreferencia } from "@/core/geo.ts";
import type { ProvedorDeMapa } from "@/lib/tiles.ts";
import type { PontoLocal } from "@/core/geo.ts";
import {
  limites,
  passoDaRegua,
  posicoesDaRegra,
  type RegraDePosicionamento,
} from "@/core/croqui.ts";

/**
 * Renderizador do croqui em SVG.
 *
 * Desenha o plano métrico local diretamente: o SVG tem `viewBox` em METROS,
 * então uma linha de 10 m mede 10 unidades — sem conversão em lugar nenhum.
 * O eixo Y é invertido (`scale(1,-1)`) porque no plano local Y cresce para o
 * norte, e no SVG cresce para baixo.
 *
 * É o mesmo componente nos dois modos: no SIG ele apenas ganha um fundo de
 * mapa atrás. A geometria renderizada é exatamente a mesma
 * (docs/adr/0001-plano-metrico-local.md).
 */

export interface LinhaDesenhada {
  id: string;
  tipo: "plantio" | "entrelinha" | "servico";
  rotulo: string | null;
  pathLocal: PontoLocal[];
  comprimentoM: number;
}

export interface MudasDeUmPlantio {
  plantingId: string;
  nomeComum: string;
  regra: RegraDePosicionamento;
}

export type Ferramenta = "navegar" | "poligono" | "linha";

interface Props {
  poligono: PontoLocal[];
  linhas: LinhaDesenhada[];
  mudas: MudasDeUmPlantio[];
  ferramenta: Ferramenta;
  rascunho: PontoLocal[];
  linhaSelecionadaId: string | null;
  onRascunho: (pontos: PontoLocal[]) => void;
  onSelecionarLinha: (id: string | null) => void;
  /** Presentes só quando a área está georreferenciada e o fundo está ligado. */
  georref?: Georreferencia | null;
  provedorDeMapa?: ProvedorDeMapa | null;
}

const MARGEM_M = 6;
const CORES_DA_LINHA: Record<LinhaDesenhada["tipo"], string> = {
  plantio: "var(--cor-plantio)",
  entrelinha: "var(--cor-entrelinha)",
  servico: "var(--cor-servico)",
};

export function Croqui({
  poligono,
  linhas,
  mudas,
  ferramenta,
  rascunho,
  linhaSelecionadaId,
  onRascunho,
  onSelecionarLinha,
  georref = null,
  provedorDeMapa = null,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });
  const [cursor, setCursor] = useState<PontoLocal | null>(null);
  const [pan, setPan] = useState<PontoLocal>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [arrastandoVista, setArrastandoVista] = useState(false);

  /** Enquadramento inicial: tudo que existe, mais uma margem. */
  const enquadramento = useMemo(() => {
    const todos = [
      ...poligono,
      ...rascunho,
      ...linhas.flatMap((linha) => linha.pathLocal),
    ];
    const caixa = limites(todos);

    if (!caixa) return { minX: -50, minY: -50, largura: 100, altura: 100 };

    return {
      minX: caixa.minX - MARGEM_M,
      minY: caixa.minY - MARGEM_M,
      largura: Math.max(caixa.maxX - caixa.minX + MARGEM_M * 2, 10),
      altura: Math.max(caixa.maxY - caixa.minY + MARGEM_M * 2, 10),
    };
  }, [poligono, rascunho, linhas]);

  const vista = useMemo(() => {
    const largura = enquadramento.largura / zoom;
    const altura = enquadramento.altura / zoom;
    return {
      x: enquadramento.minX + pan.x + (enquadramento.largura - largura) / 2,
      y: enquadramento.minY + pan.y + (enquadramento.altura - altura) / 2,
      largura,
      altura,
    };
  }, [enquadramento, zoom, pan]);

  /** Converte o ponteiro em coordenada do plano local, em metros. */
  const pontoNoPlano = useCallback(
    (clientX: number, clientY: number): PontoLocal | null => {
      const svg = svgRef.current;
      if (!svg) return null;

      const caixa = svg.getBoundingClientRect();
      const fracaoX = (clientX - caixa.left) / caixa.width;
      const fracaoY = (clientY - caixa.top) / caixa.height;

      return {
        x: vista.x + fracaoX * vista.largura,
        // Y invertido: o topo do SVG é o maior Y do plano.
        y: vista.y + (1 - fracaoY) * vista.altura,
      };
    },
    [vista],
  );

  function aoClicar(evento: React.MouseEvent) {
    if (ferramenta === "navegar") return;
    const ponto = pontoNoPlano(evento.clientX, evento.clientY);
    if (!ponto) return;
    onRascunho([...rascunho, arredondar(ponto)]);
  }

  function aoMoverPonteiro(evento: React.PointerEvent) {
    const ponto = pontoNoPlano(evento.clientX, evento.clientY);
    setCursor(ponto);

    if (arrastandoVista && ponto) {
      setPan((anterior) => ({
        x:
          anterior.x -
          evento.movementX *
            (vista.largura / (svgRef.current?.clientWidth ?? 1)),
        y:
          anterior.y +
          evento.movementY *
            (vista.altura / (svgRef.current?.clientHeight ?? 1)),
      }));
    }
  }

  // O fundo de mapa precisa do tamanho em pixels para converter metros em
  // tela; o SVG sozinho não expõe isso.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const observador = new ResizeObserver(([entrada]) => {
      const caixa = entrada!.contentRect;
      setTamanho({ largura: caixa.width, altura: caixa.height });
    });
    observador.observe(svg);
    return () => observador.disconnect();
  }, []);

  // O listener de roda precisa ser não-passivo para poder cancelar a rolagem
  // da página; React o registra como passivo por padrão.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const aoRolar = (evento: WheelEvent) => {
      evento.preventDefault();
      setZoom((anterior) =>
        Math.min(
          40,
          Math.max(0.2, anterior * (evento.deltaY < 0 ? 1.12 : 0.89)),
        ),
      );
    };

    svg.addEventListener("wheel", aoRolar, { passive: false });
    return () => svg.removeEventListener("wheel", aoRolar);
  }, []);

  const passo = passoDaRegua(vista.largura);
  const desenhando = ferramenta !== "navegar";
  const comFundo = georref !== null && provedorDeMapa !== null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {comFundo && (
        <FundoDeMapa
          georref={georref}
          provedor={provedorDeMapa}
          vista={vista}
          largura={tamanho.largura}
          altura={tamanho.altura}
        />
      )}

      <svg
        ref={svgRef}
        /* O conteúdo é desenhado dentro de um scale(1,-1), então o topo do
           viewBox é o Y local MÁXIMO negado. Usar `vista.y` direto aqui
           deslocava a área visível para o lugar errado. */
        viewBox={`${vista.x} ${-(vista.y + vista.altura)} ${vista.largura} ${vista.altura}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full w-full touch-none ${
          desenhando ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
        } ${comFundo ? "sobre-mapa" : "bg-[var(--fundo-croqui)]"}`}
        onClick={aoClicar}
        onPointerMove={aoMoverPonteiro}
        onPointerDown={() => !desenhando && setArrastandoVista(true)}
        onPointerUp={() => setArrastandoVista(false)}
        onPointerLeave={() => {
          setArrastandoVista(false);
          setCursor(null);
        }}
        role="img"
        aria-label="Croqui da área de plantio"
      >
        {/* O plano local tem Y para cima; o SVG, para baixo. */}
        <g transform="scale(1,-1)" style={{ transformOrigin: "0 0" }}>
          <Malha vista={vista} passo={passo} />

          {poligono.length >= 3 && (
            <polygon
              points={paraPontos(poligono)}
              className="fill-[var(--cor-area)] stroke-[var(--cor-borda-area)]"
              strokeWidth={vista.largura / 400}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {linhas.map((linha) => (
            <polyline
              key={linha.id}
              points={paraPontos(linha.pathLocal)}
              fill="none"
              stroke={CORES_DA_LINHA[linha.tipo]}
              strokeWidth={linha.id === linhaSelecionadaId ? 3 : 1.5}
              strokeDasharray={linha.tipo === "servico" ? "6 4" : undefined}
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer"
              onClick={(evento) => {
                evento.stopPropagation();
                onSelecionarLinha(
                  linha.id === linhaSelecionadaId ? null : linha.id,
                );
              }}
            />
          ))}

          {mudas.map((plantio) => (
            <Mudas
              key={plantio.plantingId}
              plantio={plantio}
              linhas={linhas}
              raio={Math.max(vista.largura / 300, 0.15)}
            />
          ))}

          {rascunho.length > 0 && (
            <>
              <polyline
                points={paraPontos(rascunho)}
                fill="none"
                className="stroke-primary"
                strokeWidth={2}
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
              {rascunho.map((ponto, indice) => (
                <circle
                  key={indice}
                  cx={ponto.x}
                  cy={ponto.y}
                  r={vista.largura / 220}
                  className="fill-primary"
                />
              ))}
              {cursor && (
                <line
                  x1={rascunho.at(-1)!.x}
                  y1={rascunho.at(-1)!.y}
                  x2={cursor.x}
                  y2={cursor.y}
                  className="stroke-primary/50"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </>
          )}
        </g>
      </svg>

      <BarraDeEscala
        metrosVisiveis={vista.largura}
        passo={passo}
        cursor={cursor}
        onZoom={(fator) =>
          setZoom((anterior) => Math.min(40, Math.max(0.2, anterior * fator)))
        }
        onCentralizar={() => {
          setPan({ x: 0, y: 0 });
          setZoom(1);
        }}
      />
    </div>
  );
}

/** Uma muda por posição derivada da regra — nada disso está no banco. */
function Mudas({
  plantio,
  linhas,
  raio,
}: {
  plantio: MudasDeUmPlantio;
  linhas: LinhaDesenhada[];
  raio: number;
}) {
  const linha = linhas.find((item) => item.id === plantio.regra.rowId);
  if (!linha) return null;

  const posicoes = posicoesDaRegra(plantio.regra, linha.pathLocal);

  // Acima de alguns milhares de círculos o SVG engasga. Nesse caso a linha
  // grossa comunica melhor a ocupação do que pontos indistinguíveis.
  if (posicoes.length > 3000) {
    return (
      <polyline
        points={paraPontos(linha.pathLocal)}
        fill="none"
        className="stroke-primary/70"
        strokeWidth={4}
        vectorEffect="non-scaling-stroke"
      >
        <title>
          {plantio.nomeComum}: {posicoes.length} mudas
        </title>
      </polyline>
    );
  }

  return (
    <g className="fill-primary">
      <title>
        {plantio.nomeComum}: {posicoes.length} mudas
      </title>
      {posicoes.map((posicao, indice) => (
        <circle key={indice} cx={posicao.x} cy={posicao.y} r={raio} />
      ))}
    </g>
  );
}

function Malha({
  vista,
  passo,
}: {
  vista: { x: number; y: number; largura: number; altura: number };
  passo: number;
}) {
  const verticais: number[] = [];
  const horizontais: number[] = [];

  const inicioX = Math.ceil(vista.x / passo) * passo;
  const inicioY = Math.ceil(vista.y / passo) * passo;

  for (let x = inicioX; x <= vista.x + vista.largura; x += passo) {
    verticais.push(x);
  }
  for (let y = inicioY; y <= vista.y + vista.altura; y += passo) {
    horizontais.push(y);
  }

  return (
    <g
      className="stroke-[var(--cor-malha)]"
      strokeWidth={0.5}
      vectorEffect="non-scaling-stroke"
    >
      {verticais.map((x) => (
        <line
          key={`v${x}`}
          x1={x}
          y1={vista.y}
          x2={x}
          y2={vista.y + vista.altura}
        />
      ))}
      {horizontais.map((y) => (
        <line
          key={`h${y}`}
          x1={vista.x}
          y1={y}
          x2={vista.x + vista.largura}
          y2={y}
        />
      ))}
    </g>
  );
}

function BarraDeEscala({
  metrosVisiveis,
  passo,
  cursor,
  onZoom,
  onCentralizar,
}: {
  metrosVisiveis: number;
  passo: number;
  cursor: PontoLocal | null;
  onZoom: (fator: number) => void;
  onCentralizar: () => void;
}) {
  const fracao = passo / metrosVisiveis;

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
      <div className="rounded-md border border-bg-border bg-background/80 px-2.5 py-1.5 backdrop-blur">
        <div
          className="mb-1 border-b-2 border-l-2 border-r-2 border-foreground/70"
          style={{ width: `${Math.min(fracao * 220, 220)}px`, height: 5 }}
        />
        <span className="metric text-[0.65rem]">
          {passo >= 1000 ? `${passo / 1000} km` : `${passo} m`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {cursor && (
          <span className="rounded-md border border-bg-border bg-background/80 px-2 py-1 font-mono text-[0.65rem] text-muted-foreground backdrop-blur">
            {cursor.x.toFixed(1)} , {cursor.y.toFixed(1)} m
          </span>
        )}
        <div className="pointer-events-auto flex gap-1">
          {[
            { rotulo: "−", acao: () => onZoom(0.8), aria: "Afastar" },
            { rotulo: "+", acao: () => onZoom(1.25), aria: "Aproximar" },
            { rotulo: "⊙", acao: onCentralizar, aria: "Centralizar" },
          ].map((botao) => (
            <button
              key={botao.aria}
              type="button"
              onClick={botao.acao}
              aria-label={botao.aria}
              className="h-7 w-7 rounded-md border border-bg-border bg-background/80 font-mono text-sm text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
            >
              {botao.rotulo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function paraPontos(pontos: readonly PontoLocal[]): string {
  return pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(" ");
}

/** Centímetro é precisão de sobra para desenho agroflorestal. */
function arredondar(ponto: PontoLocal): PontoLocal {
  return {
    x: Math.round(ponto.x * 100) / 100,
    y: Math.round(ponto.y * 100) / 100,
  };
}
