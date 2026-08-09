"use client";

import { useState, useMemo } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Sprout,
  BookOpen,
} from "lucide-react";
import {
  ocupacaoPorEstratoNoMes,
  diagnosticar,
  mesesDeAmostra,
  colheitasPrevistas,
  type PlantioAnalisado,
  type Gravidade,
} from "@/core/analise.ts";
import { consorciosRelacionados } from "@/core/consorcios.ts";
import { ESTRATO_LABEL } from "@/core/estratos.ts";
import { mesRelativoParaData } from "@/core/tempo.ts";
import { OcupacaoPorEstrato } from "./OcupacaoPorEstrato.tsx";

type PlantioComCiclo = PlantioAnalisado & {
  diasParaColherMin: number | null;
  diasParaColherMax: number | null;
};

/**
 * Análise do desenho.
 *
 * Tudo aqui é derivado — nada é opinião do software. Cada número vem da
 * geometria do mapa ou do catálogo, e cada diagnóstico cita o princípio da
 * literatura que o motiva.
 */
export function PainelDeAnalise({
  plantios,
  areaTotalM2,
  horizonteMeses,
  dataInicio,
}: {
  plantios: PlantioComCiclo[];
  areaTotalM2: number;
  horizonteMeses: number;
  dataInicio: string;
}) {
  const marcos = useMemo(
    () => mesesDeAmostra(plantios, horizonteMeses),
    [plantios, horizonteMeses],
  );

  const [mes, setMes] = useState(marcos[0] ?? 0);

  const inicio = useMemo(() => new Date(dataInicio), [dataInicio]);
  const ocupacao = useMemo(
    () => ocupacaoPorEstratoNoMes(plantios, areaTotalM2, mes),
    [plantios, areaTotalM2, mes],
  );
  const diagnosticos = useMemo(
    () => diagnosticar({ plantios, horizonteMeses, areaM2: areaTotalM2 }),
    [plantios, horizonteMeses, areaTotalM2],
  );
  const colheitas = useMemo(() => colheitasPrevistas(plantios), [plantios]);
  const consorcios = useMemo(
    () => consorciosRelacionados(plantios.map((p) => p.nomeComum)),
    [plantios],
  );

  const totalOcupado = ocupacao.reduce(
    (soma, linha) => soma + linha.ocupacao,
    0,
  );

  const formatarMes = (valor: number) =>
    mesRelativoParaData(inicio, valor).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });

  if (plantios.length === 0) {
    return (
      <Vazio
        titulo="Nada a analisar ainda"
        texto="Adicione espécies na timeline. A análise cruza o que você desenhou no tempo com o que posicionou no mapa."
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-6">
        {areaTotalM2 === 0 ? (
          <Aviso gravidade="atencao">
            <strong>Sem área desenhada.</strong> A ocupação dos estratos é uma
            medida de espaço — sem o talhão no mapa não há denominador. Os
            diagnósticos de tempo e sucessão abaixo continuam valendo.
          </Aviso>
        ) : (
          <section>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <label className="flex items-center gap-2">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                  Mês
                </span>
                <select
                  value={mes}
                  onChange={(evento) => setMes(Number(evento.target.value))}
                  className="rounded-md border border-border bg-bg-surface1 px-2 py-1 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {marcos.map((valor) => (
                    <option key={valor} value={valor}>
                      {valor} · {formatarMes(valor)}
                    </option>
                  ))}
                </select>
              </label>

              <p className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                Total{" "}
                <span className="metric">
                  {Math.round(totalOcupado * 100)}%
                </span>{" "}
                do talhão
              </p>
            </div>

            <OcupacaoPorEstrato linhas={ocupacao} mes={mes} />

            <p className="mt-4 max-w-[62ch] text-xs leading-[1.6] text-muted-foreground">
              Somar acima de 100% não é erro: é o próprio princípio do
              consórcio. As tabelas do cap. 10 chegam a 277% — &ldquo;2,77
              canteiros dentro de um canteiro&rdquo;.
            </p>
          </section>
        )}

        <section>
          <h3 className="mb-3 font-mono text-[0.65rem] uppercase tracking-widest text-primary">
            Diagnósticos
          </h3>

          {diagnosticos.length === 0 ? (
            <p className="text-xs leading-[1.6] text-muted-foreground">
              Nada a apontar no desenho atual.
            </p>
          ) : (
            <ul className="space-y-2">
              {diagnosticos.map((item) => (
                <li key={item.chave}>
                  <Aviso gravidade={item.gravidade}>
                    <strong>{item.titulo}</strong>
                    {item.de !== undefined && (
                      <span className="ml-1 font-mono text-[0.7rem] opacity-80">
                        (mês {item.de}
                        {item.ate !== undefined && item.ate !== item.de
                          ? `–${item.ate}`
                          : ""}
                        )
                      </span>
                    )}
                    <br />
                    <span className="opacity-90">{item.detalhe}</span>
                  </Aviso>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-primary">
            <Sprout size={13} />
            Colheita prevista
          </h3>
          <p className="mb-3 max-w-[62ch] text-xs leading-[1.6] text-muted-foreground">
            Projetada a partir do ciclo informado no catálogo. Não há previsão
            de poda: nenhuma das fontes disponíveis dá periodicidade de poda, e
            arbitrar uma seria inventar manejo.
          </p>

          {colheitas.length === 0 ? (
            <p className="text-xs leading-[1.6] text-muted-foreground">
              Nenhuma das espécies do projeto tem ciclo informado no catálogo.
            </p>
          ) : (
            <ul className="divide-y divide-border/30">
              {colheitas.map((item) => (
                <li
                  key={item.plantioId}
                  className="flex items-baseline justify-between gap-3 py-1.5 text-xs"
                >
                  <span>{item.nomeComum}</span>
                  <span className="font-mono text-muted-foreground">
                    {formatarMes(item.mesDe)}
                    {item.mesAte !== item.mesDe &&
                      ` – ${formatarMes(item.mesAte)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {consorcios.length > 0 && (
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-primary">
              <BookOpen size={13} />
              Consórcios de referência
            </h3>
            <p className="mb-3 max-w-[62ch] text-xs leading-[1.6] text-muted-foreground">
              Arranjos testados em campo, do cap. 10 de{" "}
              <em>Agroflorestando o Mundo</em>, que incluem espécies do seu
              desenho. Não são sugestões geradas por algoritmo.
            </p>

            <ul className="space-y-3">
              {consorcios.map(({ consorcio, emComum }) => (
                <li
                  key={consorcio.id}
                  className="rounded-xl border border-bg-border bg-bg-surface1 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold">
                      Tabela {consorcio.tabela} · renovação em{" "}
                      {consorcio.renovacaoDias} dias
                    </h4>
                    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                      <span className="metric">
                        {consorcio.totalDePlantio}%
                      </span>{" "}
                      de plantio
                    </span>
                  </div>

                  <p className="mb-2 text-xs text-muted-foreground">
                    Otimizado para {consorcio.otimizadoPara}. Em comum com o seu
                    desenho: {emComum.join(", ")}.
                  </p>

                  <ul className="space-y-1">
                    {consorcio.linhas.map((linha, indice) => (
                      <li
                        key={indice}
                        className="flex flex-wrap items-baseline gap-x-2 text-xs"
                      >
                        <span className="w-20 shrink-0 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                          {ESTRATO_LABEL[linha.estrato]}
                        </span>
                        <span className="flex-1">
                          {linha.especies.join(" ou ")}
                        </span>
                        <span className="metric text-[0.7rem]">
                          {linha.percentagemDePlantio}%
                        </span>
                      </li>
                    ))}
                  </ul>

                  {consorcio.nota && (
                    <p className="mt-2 text-[0.7rem] leading-[1.5] text-muted-foreground">
                      {consorcio.nota}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

const ESTILO: Record<Gravidade, { classe: string; icone: React.ReactNode }> = {
  info: {
    classe: "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-200",
    icone: <Info size={14} />,
  },
  atencao: {
    classe:
      "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200",
    icone: <AlertTriangle size={14} />,
  },
  alerta: {
    classe: "border-red-500/30 bg-red-500/5 text-red-900 dark:text-red-200",
    icone: <AlertOctagon size={14} />,
  },
};

/** Ícone + texto sempre juntos: a gravidade nunca é comunicada só por cor. */
function Aviso({
  gravidade,
  children,
}: {
  gravidade: Gravidade;
  children: React.ReactNode;
}) {
  const estilo = ESTILO[gravidade];
  return (
    <p
      className={`flex gap-2 rounded-lg border-l-4 p-3 text-xs leading-[1.6] ${estilo.classe}`}
    >
      <span className="mt-0.5 shrink-0">{estilo.icone}</span>
      <span>{children}</span>
    </p>
  );
}

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8">
      <div className="max-w-[48ch] text-center">
        <Sprout
          size={26}
          className="mx-auto mb-3 text-primary/60"
          aria-hidden
        />
        <p className="mb-1 text-sm font-semibold">{titulo}</p>
        <p className="text-sm leading-[1.7] text-muted-foreground">{texto}</p>
      </div>
    </div>
  );
}
