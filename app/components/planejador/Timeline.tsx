"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { AlertTriangle, ChevronRight, Sprout, Info } from "lucide-react";
import {
  ESTRATOS_DE_CIMA_PARA_BAIXO,
  ESTRATO_LABEL,
  OCUPACAO_IDEAL,
  type Estrato,
} from "@/core/estratos.ts";
import {
  MESES_POR_PASSO,
  ZOOM_TIMELINE,
  type ZoomTimeline,
} from "@/core/tempo.ts";
import {
  pixelsPorMes,
  mesParaPixel,
  encaixarNaEscala,
  normalizarIntervalo,
  duracaoSugeridaMeses,
  distribuirEmSublinhas,
  alturaEmSublinhas,
  coberturaPorEstrato,
  DURACAO_MINIMA_MESES,
} from "@/core/planejamento.ts";
import { criarPlantio, moverPlantio } from "@/app/actions/projetos.ts";
import {
  type PlantioLocal,
  type CargaDeArraste,
  type PontoDeClique,
} from "./tipos.ts";
import { useArraste } from "./ArrasteContext.tsx";

const ALTURA_DA_SUBLINHA = 34;
const ESPACO_ENTRE_BARRAS = 4;
const LARGURA_DO_ROTULO = 104;

const ROTULO_DO_ZOOM = { mes: "Mês", trimestre: "Trimestre", ano: "Ano" };

/**
 * Escalas oferecidas no rodapé.
 *
 * O trimestre existe em `ZOOM_TIMELINE` — projetos antigos podem estar nele, e
 * o rótulo continua sendo exibido —, mas não se escolhe mais: mês e ano cobrem
 * a leitura de perto e a de longe, e a terceira opção só dividia a decisão.
 */
const ESCALAS_OFERECIDAS: readonly ZoomTimeline[] = ZOOM_TIMELINE.filter(
  (nivel) => nivel !== "trimestre",
);

/**
 * Como a régua nomeia o tempo.
 *
 * "relativo" conta a partir do plantio (A0, A1, mês 3) — é a leitura do
 * projeto, a que compara desenhos independentes da data em que foram feitos.
 * "absoluto" nomeia o calendário (Jan, '27) — é a leitura de quem vai a campo e
 * precisa saber em que mês chuvoso aquela barra cai.
 */
type ModoDeTempo = "relativo" | "absoluto";

const MODOS_DE_TEMPO = ["relativo", "absoluto"] as const;
const ROTULO_DO_MODO: Record<ModoDeTempo, string> = {
  relativo: "Relativo",
  absoluto: "Calendário",
};

const MES_ABREVIADO = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface Props {
  projectId: string;
  horizonteMeses: number;
  mesDeHoje: number | null;
  plantios: PlantioLocal[];
  podeEditar: boolean;
  zoom: ZoomTimeline;
  onZoom: (zoom: ZoomTimeline) => void;
  cobertura: ReturnType<typeof coberturaPorEstrato>;
  lacunas: { de: number; ate: number }[];
  mesParaData: (mes: number) => string;
  mesParaAno: (mes: number) => number;
  /** Mês do calendário (0–11) em que o projeto começa. */
  mesDoAnoInicial: number;
  selecionadoId: string | null;
  onSelecionar: (id: string | null, ponto?: PontoDeClique) => void;
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
  onZoom,
  cobertura,
  lacunas,
  mesParaData,
  mesParaAno,
  mesDoAnoInicial,
  selecionadoId,
  onSelecionar,
  onMudanca,
  onAviso,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [modoDeTempo, setModoDeTempo] = useState<ModoDeTempo>("relativo");
  const [faixaAlvo, setFaixaAlvo] = useState<Estrato | null>(null);
  /** Mês onde a espécie arrastada pousaria; `null` fora de uma faixa válida. */
  const [mesAlvo, setMesAlvo] = useState<number | null>(null);
  const { estado: estadoDoArraste, definirResolvedor } = useArraste();

  const pxPorMes = pixelsPorMes(zoom);
  const largura = horizonteMeses * pxPorMes;

  // No modo calendário, as viradas de ano são as de janeiro — não as do
  // aniversário do projeto. Quantos meses até o primeiro janeiro.
  const deslocamentoDoAno =
    modoDeTempo === "absoluto" ? (12 - mesDoAnoInicial) % 12 : 0;

  /**
   * Estrato em que a espécie arrastada pode pousar.
   *
   * `null` quer dizer "qualquer um": ou não há arraste em curso, ou o catálogo
   * não informa o estrato da espécie — e nesse caso quem decide é quem planta,
   * não o sistema (ver a regra de ouro em CLAUDE.md §4).
   */
  const estratoPermitido = estadoDoArraste?.ativo
    ? estadoDoArraste.carga.estratoDaEspecie
    : null;

  const arrastandoEspecie = Boolean(estadoDoArraste?.ativo);

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

  /**
   * Mês em que a espécie pousaria se fosse solta aqui.
   *
   * A prévia da coluna e a soltura chamam esta mesma função — se as duas
   * fizessem a conta por conta própria, o realce mentiria sobre onde a muda vai
   * cair.
   */
  const mesDeInicioNaPosicao = useCallback(
    (clientX: number): number => {
      const ultimoInicio = Math.max(0, horizonteMeses - DURACAO_MINIMA_MESES);
      return Math.min(Math.max(0, mesNaPosicao(clientX)), ultimoInicio);
    },
    [mesNaPosicao, horizonteMeses],
  );

  const aoSoltarEspecie = useCallback(
    async (carga: CargaDeArraste, estrato: Estrato, clientX: number) => {
      setFaixaAlvo(null);
      setMesAlvo(null);
      if (!podeEditar) return;

      // Espécie com estrato no catálogo só pousa no andar dela. Sem isso, um
      // deslize de alguns pixels plantava uma bananeira no rasteiro.
      if (
        carga.estratoDaEspecie !== null &&
        carga.estratoDaEspecie !== estrato
      ) {
        onAviso(
          `${carga.nomeComum} é do estrato ${ESTRATO_LABEL[carga.estratoDaEspecie]} — solte-a naquela faixa.`,
        );
        return;
      }

      const duracao = duracaoSugeridaMeses({
        diasParaColherMax: carga.diasParaColherMax,
        estrato,
      });

      // O plantio começa onde a espécie foi solta. Uma árvore de ciclo longo
      // quase sempre estoura o horizonte do projeto; nesse caso a barra é
      // cortada no fim do horizonte, e não recuada — recuar movia a muda para
      // um mês que ninguém escolheu.
      const mesInicio = mesDeInicioNaPosicao(clientX);
      const intervalo = normalizarIntervalo(
        { mesInicio, mesFim: Math.min(mesInicio + duracao, horizonteMeses) },
        horizonteMeses,
      );

      if (carga.estratoDaEspecie === null) {
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
      mesDeInicioNaPosicao,
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
      setMesAlvo(null);
    });

    return () => definirResolvedor(null);
  }, [definirResolvedor, aoSoltarEspecie]);

  // Realce da faixa sob o ponteiro enquanto o arraste está em curso — só se ela
  // aceitar a espécie; sobre uma faixa proibida, nada acende.
  useEffect(() => {
    if (!estadoDoArraste?.ativo) {
      setFaixaAlvo(null);
      setMesAlvo(null);
      return;
    }
    const alvo = document
      .elementFromPoint(estadoDoArraste.x, estadoDoArraste.y)
      ?.closest<HTMLElement>("[data-faixa-estrato]");

    const sob = (alvo?.dataset.faixaEstrato as Estrato | undefined) ?? null;
    const permitido = estadoDoArraste.carga.estratoDaEspecie;
    const aceita = sob !== null && (permitido === null || permitido === sob);

    setFaixaAlvo(aceita ? sob : null);
    setMesAlvo(aceita ? mesDeInicioNaPosicao(estadoDoArraste.x) : null);
  }, [estadoDoArraste, mesDeInicioNaPosicao]);

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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* As faixas ocupam a altura que as barras pedem; o rodapé vem logo
          abaixo do rasteiro, e a sobra fica em branco no fim da coluna. */}
      <div className="flex shrink-0">
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
              esmaecido={
                estratoPermitido !== null && estratoPermitido !== estrato
              }
            />
          ))}
        </div>

        <div ref={areaRef} className="min-w-0 flex-1 overflow-x-auto">
          <div style={{ width: largura, minWidth: "100%" }}>
            <Regua
              horizonteMeses={horizonteMeses}
              zoom={zoom}
              pxPorMes={pxPorMes}
              mesParaAno={mesParaAno}
              modo={modoDeTempo}
              mesDoAnoInicial={mesDoAnoInicial}
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

              {/* Coluna do mês em que a espécie arrastada vai pousar. A faixa
                  diz em que andar; esta coluna diz em que tempo. Sem ela, o
                  mês só aparece depois de soltar. */}
              {mesAlvo !== null && (
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-20 border-l border-primary/70 bg-primary/10"
                  style={{
                    left: mesParaPixel(mesAlvo, zoom),
                    width: MESES_POR_PASSO[zoom] * pxPorMes,
                  }}
                  aria-hidden="true"
                />
              )}

              {ESTRATOS_DE_CIMA_PARA_BAIXO.map((estrato) => {
                const doEstrato = porEstrato.get(estrato) ?? [];
                const sublinhas = distribuirEmSublinhas(doEstrato);

                // Durante o arraste, o andar da espécie se acende de leve e os
                // outros recuam: o destino válido se lê antes de soltar.
                const proibido =
                  estratoPermitido !== null && estratoPermitido !== estrato;
                const receptivo =
                  arrastandoEspecie && !proibido && faixaAlvo !== estrato;

                return (
                  <div
                    key={estrato}
                    data-faixa-estrato={estrato}
                    className={`relative border-b border-bg-border/60 transition-[background-color,opacity] duration-240 motion-reduce:transition-none ${
                      faixaAlvo === estrato
                        ? "bg-primary/10"
                        : receptivo
                          ? "bg-primary/[0.04]"
                          : ""
                    } ${proibido ? "opacity-30" : ""}`}
                    style={{ height: alturaDaFaixa(doEstrato) }}
                  >
                    <Grade
                      horizonteMeses={horizonteMeses}
                      zoom={zoom}
                      pxPorMes={pxPorMes}
                      deslocamento={deslocamentoDoAno}
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
                        onSelecionar={(ponto) =>
                          onSelecionar(plantio.id, ponto)
                        }
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

      <RodapeDaTimeline
        zoom={zoom}
        onZoom={onZoom}
        modoDeTempo={modoDeTempo}
        onModoDeTempo={setModoDeTempo}
        totalDePlantios={plantios.length}
        horizonteMeses={horizonteMeses}
        cobertura={cobertura}
        lacunas={lacunas}
        mesParaData={mesParaData}
      />
    </div>
  );
}

/**
 * Rodapé da timeline: escala e leitura do desenho no mesmo lugar.
 *
 * A escala morava na barra do Workspace, longe do que ela governa; a cobertura
 * ficava colada ao fim da página. Juntas embaixo do rasteiro, ambas ficam ao
 * alcance do olho que acabou de percorrer as faixas.
 *
 * A cobertura mede presença no TEMPO por andar. A ocupação ideal do livro
 * (20/40/60/80%) é de ESPAÇO — por isso aparece no rótulo da faixa como
 * referência, e não como veredito.
 */
function RodapeDaTimeline({
  zoom,
  onZoom,
  modoDeTempo,
  onModoDeTempo,
  totalDePlantios,
  horizonteMeses,
  cobertura,
  lacunas,
  mesParaData,
}: {
  zoom: ZoomTimeline;
  onZoom: (zoom: ZoomTimeline) => void;
  modoDeTempo: ModoDeTempo;
  onModoDeTempo: (modo: ModoDeTempo) => void;
  totalDePlantios: number;
  horizonteMeses: number;
  cobertura: ReturnType<typeof coberturaPorEstrato>;
  lacunas: { de: number; ate: number }[];
  mesParaData: (mes: number) => string;
}) {
  return (
    <div className="shrink-0 border-t border-bg-border bg-bg-surface1/40 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <SeletorNoRodape
          id="opcoes-de-escala"
          rotulo="Escala"
          valor={zoom}
          opcoes={ESCALAS_OFERECIDAS}
          rotuloDaOpcao={(nivel) => ROTULO_DO_ZOOM[nivel]}
          onEscolher={onZoom}
        />

        <SeletorNoRodape
          id="opcoes-de-tempo"
          rotulo="Tempo"
          valor={modoDeTempo}
          opcoes={MODOS_DE_TEMPO}
          rotuloDaOpcao={(modo) => ROTULO_DO_MODO[modo]}
          onEscolher={onModoDeTempo}
        />

        <Divisor />

        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          <span className="metric">{totalDePlantios}</span> plantios ·{" "}
          <span className="metric">{horizonteMeses / 12}</span> anos
        </span>

        <Divisor />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            Ocupação no tempo
            <CaixaDeInfo titulo="Ocupação no tempo">
              {/* `span` em vez de `p`: o gatilho é inline e um parágrafo
                  dentro de um span é aninhamento inválido. */}
              <span className="block">
                Para cada estrato, a fatia do horizonte do projeto em que existe{" "}
                <strong className="font-semibold text-foreground">
                  pelo menos uma
                </strong>{" "}
                planta em campo. Conta presença, não densidade: dez plantios no
                mesmo intervalo valem o mesmo que um.
              </span>
              <span className="block">
                Não confunda com o <em>ideal</em> ao lado de cada faixa — aquele
                é ocupação de <strong>espaço</strong> (quanto do chão o andar
                sombreia), segundo Agroflorestando o Mundo cap. 10. São
                grandezas diferentes; só o mapa permite confrontá-las.
              </span>
            </CaixaDeInfo>
          </span>

          {cobertura.map((linha) => (
            <div key={linha.estrato} className="flex items-baseline gap-1.5">
              <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                {ESTRATO_LABEL[linha.estrato]}
              </span>
              <span className="metric text-xs">
                {Math.round(linha.cobertura * 100)}%
              </span>
            </div>
          ))}
        </div>
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

/**
 * Ajuste do rodapé como botão que abre as opções ao lado.
 *
 * Fechado, o rodapé mostra só o valor vigente — botões permanentes competiam
 * com a leitura de cobertura, que é o que se vem ler aqui. A grade de uma
 * coluna indo de `0fr` a `1fr` anima até a largura do conteúdo sem medi-lo
 * (mesmo truque do `Expansivel` do catálogo, deitado). Fechada, recebe `inert`:
 * nada lá dentro pega foco por Tab. Escolher uma opção fecha de volta.
 */
function SeletorNoRodape<T extends string>({
  id,
  rotulo,
  valor,
  opcoes,
  rotuloDaOpcao,
  onEscolher,
}: {
  id: string;
  rotulo: string;
  valor: T;
  opcoes: readonly T[];
  rotuloDaOpcao: (opcao: T) => string;
  onEscolher: (opcao: T) => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setAberto((antes) => !antes)}
        aria-expanded={aberto}
        aria-controls={id}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-240 ${
          aberto
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        {rotulo}
        <span className="text-primary">{rotuloDaOpcao(valor)}</span>
        <ChevronRight
          size={12}
          aria-hidden
          className={`transition-transform duration-240 motion-reduce:transition-none ${
            aberto ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        id={id}
        inert={!aberto}
        className={`grid overflow-hidden transition-[grid-template-columns] duration-320 ease-bio-ease motion-reduce:transition-none ${
          aberto ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
        }`}
      >
        <div className="flex min-w-0 gap-1 overflow-hidden">
          {opcoes.map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => {
                onEscolher(opcao);
                setAberto(false);
              }}
              aria-pressed={valor === opcao}
              className={`whitespace-nowrap rounded-md border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-240 ${
                valor === opcao
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {rotuloDaOpcao(opcao)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Divisor vertical discreto entre os grupos do rodapé. */
function Divisor() {
  return <span aria-hidden className="h-5 w-px shrink-0 bg-bg-border" />;
}

/**
 * Explicação sob demanda, sem biblioteca de tooltip.
 *
 * Abre para cima porque o rodapé encosta no fim da tela, e responde a foco além
 * do ponteiro — quem navega por teclado também precisa da explicação. O gatilho
 * é um `button` para entrar na ordem de tabulação.
 */
function CaixaDeInfo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group/info relative inline-flex">
      <button
        type="button"
        aria-label={`O que significa: ${titulo}`}
        className="inline-flex text-muted-foreground/70 transition-colors duration-240 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Info size={12} aria-hidden />
      </button>

      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-72 -translate-x-1/2 space-y-2 rounded-md border border-bg-border bg-bg-surface1 p-3 text-xs leading-[1.6] normal-case tracking-normal text-muted-foreground opacity-0 shadow-lg transition-opacity duration-240 group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100 motion-reduce:transition-none"
      >
        {children}
      </span>
    </span>
  );
}

function alturaDaFaixa(plantios: PlantioLocal[]): number {
  return alturaEmSublinhas(plantios) * ALTURA_DA_SUBLINHA + ESPACO_ENTRE_BARRAS;
}

function RotuloDaFaixa({
  estrato,
  altura,
  esmaecido,
}: {
  estrato: Estrato;
  altura: number;
  /** Arraste em curso de uma espécie que não pertence a este andar. */
  esmaecido: boolean;
}) {
  const ideal = OCUPACAO_IDEAL[estrato];
  return (
    <div
      className={`flex flex-col justify-center border-b border-bg-border/60 px-3 transition-opacity duration-240 motion-reduce:transition-none ${
        esmaecido ? "opacity-30" : ""
      }`}
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
  mesParaAno,
  modo,
  mesDoAnoInicial,
}: {
  horizonteMeses: number;
  zoom: ZoomTimeline;
  pxPorMes: number;
  mesParaAno: (mes: number) => number;
  modo: ModoDeTempo;
  mesDoAnoInicial: number;
}) {
  const passo = MESES_POR_PASSO[zoom];
  // No calendário, as células se ancoram no trimestre e no ano civis: um
  // projeto que começa em maio abre com uma célula curta até o limite seguinte.
  // No modo relativo o passo conta desde o plantio e nada se desloca.
  const primeiroLimite =
    modo === "absoluto" ? (passo - (mesDoAnoInicial % passo)) % passo : 0;

  const marcas: number[] = [];
  // Cada marca é a célula fechada [mes, mes + passo). O fim do horizonte não
  // abre célula nova — seria um rótulo sem chão embaixo.
  if (primeiroLimite > 0) marcas.push(0);
  for (let mes = primeiroLimite; mes < horizonteMeses; mes += passo) {
    marcas.push(mes);
  }

  return (
    <div className="relative h-8 border-b border-bg-border">
      {marcas.map((mes, indice) => {
        const proxima = marcas[indice + 1] ?? horizonteMeses;
        const meses = Math.min(proxima, horizonteMeses) - mes;
        const largura = meses * pxPorMes;
        const mesDoAno = (mesDoAnoInicial + mes) % 12;
        // Onde a linha do ano cai: no aniversário do projeto, ou em janeiro.
        const inicioDeAno =
          modo === "absoluto" ? mesDoAno === 0 : mes % 12 === 0;

        // O projeto raramente começa em janeiro, então uma célula "A3" pode
        // cair sobre dois anos do calendário — mostramos os dois.
        const primeiroAno = mesParaAno(mes);
        const ultimoAno = mesParaAno(mes + meses - 1);

        return (
          <span
            key={mes}
            title={
              primeiroAno === ultimoAno
                ? `${primeiroAno}`
                : `${primeiroAno}–${ultimoAno}`
            }
            className={`absolute top-0 flex h-full items-center justify-center font-mono text-[0.6rem] ${
              inicioDeAno
                ? "border-l border-bg-border text-muted-foreground"
                : "text-muted-foreground/50"
            }`}
            style={{ left: mes * pxPorMes, width: largura }}
          >
            {modo === "absoluto"
              ? rotuloAbsoluto(zoom, mesDoAno, primeiroAno)
              : inicioDeAno
                ? `A${mes / 12}`
                : zoom === "mes"
                  ? mes % 12
                  : ""}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Rótulo do calendário para uma célula da régua.
 *
 * A célula é estreita (28px no zoom de mês), então cabem três caracteres: ou o
 * mês, ou o ano. A célula que abre janeiro cede o lugar ao ano — é a marca que
 * orienta quem percorre a régua da esquerda para a direita, e o mês dela já se
 * deduz da virada.
 */
function rotuloAbsoluto(
  zoom: ZoomTimeline,
  mesDoAno: number,
  ano: number,
): string {
  const anoCurto = `'${String(ano % 100).padStart(2, "0")}`;
  if (zoom === "ano" || mesDoAno === 0) return anoCurto;
  return MES_ABREVIADO[mesDoAno];
}

/** Linhas verticais de ano, para dar leitura à posição das barras. */
function Grade({
  horizonteMeses,
  zoom,
  pxPorMes,
  deslocamento,
}: {
  horizonteMeses: number;
  zoom: ZoomTimeline;
  pxPorMes: number;
  /** Meses até a primeira virada de ano — zero no modo relativo. */
  deslocamento: number;
}) {
  // Em horizontes longos uma linha por ano vira ruído visual.
  const passoEmAnos = zoom === "ano" ? 5 : 1;
  const linhas: number[] = [];
  for (let mes = deslocamento; mes <= horizonteMeses; mes += passoEmAnos * 12) {
    linhas.push(mes);
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
  onSelecionar: (ponto: PontoDeClique) => void;
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
      onClick={(evento) => {
        evento.stopPropagation();
        onSelecionar({ x: evento.clientX, y: evento.clientY });
      }}
      onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          // Sem ponteiro: ancora o inspetor na própria barra.
          const caixa = evento.currentTarget.getBoundingClientRect();
          onSelecionar({ x: caixa.left + caixa.width / 2, y: caixa.bottom });
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
