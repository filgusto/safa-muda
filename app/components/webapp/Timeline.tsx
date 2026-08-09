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
  distribuirEmSublinhas,
  alturaEmSublinhas,
} from "@/core/planejamento.ts";

const ALTURA_DA_SUBLINHA = 34;
const ESPACO_ENTRE_BARRAS = 4;
const LARGURA_DO_ROTULO = 104;

export interface BarraDaTimeline {
  id: string;
  nomeComum: string;
  estrato: Estrato;
  mesInicio: number;
  mesFim: number;
}

interface Props {
  horizonteMeses: number;
  /** Mês relativo de hoje; `null` esconde o marcador. */
  mesDeHoje?: number | null;
  plantios: readonly BarraDaTimeline[];
  zoom?: ZoomTimeline;
}

/**
 * Timeline apresentacional: tempo no eixo X, estratos no Y.
 *
 * Mesma leitura visual da timeline de `/projetos`, mas sem edição — aqui ela
 * só desenha. A matemática de meses → pixels e o empilhamento em sublinhas vêm
 * de `core/planejamento.ts`, então as duas nunca divergem.
 */
export function Timeline({
  horizonteMeses,
  mesDeHoje = null,
  plantios,
  zoom = "trimestre",
}: Props) {
  const pxPorMes = pixelsPorMes(zoom);
  const largura = horizonteMeses * pxPorMes;

  const porEstrato = new Map<Estrato, BarraDaTimeline[]>(
    ESTRATOS_DE_CIMA_PARA_BAIXO.map((estrato) => [
      estrato,
      plantios.filter((plantio) => plantio.estrato === estrato),
    ]),
  );

  return (
    <div className="flex min-h-0">
      {/* Rótulos das faixas — fora da área rolável, para não deslizarem. */}
      <div
        className="shrink-0 border-r border-border/40"
        style={{ width: LARGURA_DO_ROTULO }}
      >
        <div className="h-8 border-b border-border/40" />
        {ESTRATOS_DE_CIMA_PARA_BAIXO.map((estrato) => (
          <RotuloDaFaixa
            key={estrato}
            estrato={estrato}
            altura={alturaDaFaixa(porEstrato.get(estrato) ?? [])}
          />
        ))}
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto">
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
                  className="relative border-b border-border/25"
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
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function alturaDaFaixa(plantios: readonly BarraDaTimeline[]): number {
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
      className="flex flex-col justify-center border-b border-border/25 px-3"
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
    <div className="relative h-8 border-b border-border/40">
      {marcas.map((mes) => {
        const inicioDeAno = mes % 12 === 0;
        return (
          <span
            key={mes}
            className={`absolute top-0 flex h-full items-center pl-1 font-mono text-[0.6rem] ${
              inicioDeAno
                ? "border-l border-border/40 text-muted-foreground"
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
          className="absolute bottom-0 top-0 w-px bg-border/30"
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
}: {
  plantio: BarraDaTimeline;
  zoom: ZoomTimeline;
  sublinha: number;
}) {
  const esquerda = mesParaPixel(plantio.mesInicio, zoom);
  const largura = Math.max(
    mesParaPixel(plantio.mesFim - plantio.mesInicio, zoom),
    10,
  );

  return (
    <div
      title={`${plantio.nomeComum} · mês ${plantio.mesInicio} a ${plantio.mesFim}`}
      className="absolute flex items-center overflow-hidden rounded-md border border-primary/40 bg-primary/10 px-2 text-xs text-foreground/90"
      style={{
        left: esquerda,
        width: largura,
        top: sublinha * ALTURA_DA_SUBLINHA + ESPACO_ENTRE_BARRAS,
        height: ALTURA_DA_SUBLINHA - ESPACO_ENTRE_BARRAS,
      }}
    >
      <span className="truncate">{plantio.nomeComum}</span>
    </div>
  );
}
