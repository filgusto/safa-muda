"use client";

import { useState } from "react";
import { ESTRATO_LABEL } from "@/core/estratos.ts";
import type { OcupacaoDoEstrato, Veredito } from "@/core/analise.ts";

/**
 * Ocupação medida de cada andar, contra a referência do cap. 10.
 *
 * Decisões de leitura, deliberadas:
 *
 * - **Uma série só.** A barra mede ocupação; ela não muda de cor conforme o
 *   veredito. Pintar por estado colocaria verde e âmbar lado a lado, e o
 *   validador de paleta mostra que esse par fica a ΔE 5,3 em protanopia —
 *   indistinguível para parte dos leitores.
 * - **O veredito é texto.** Vai escrito ao lado, em tokens de texto, nunca só
 *   em cor.
 * - **A referência é uma marca discreta** no eixo, não uma segunda barra.
 * - **Os números aparecem rotulados** em cada linha, então a leitura não
 *   depende de comparar comprimentos.
 */
export function OcupacaoPorEstrato({
  linhas,
  mes,
}: {
  linhas: OcupacaoDoEstrato[];
  mes: number;
}) {
  const [focada, setFocada] = useState<string | null>(null);

  // A escala precisa comportar tanto a referência quanto o excesso: um andar
  // pode passar de 100% sem que isso seja erro de medida.
  const maximo = Math.max(
    1,
    ...linhas.map((linha) => linha.ocupacao),
    ...linhas.map((linha) => (linha.ideal ?? 0) * 1.25),
  );

  return (
    <section>
      <h3 className="mb-1 font-mono text-[0.65rem] uppercase tracking-widest text-primary">
        Ocupação por estrato
      </h3>
      <p className="mb-4 max-w-[62ch] text-xs leading-[1.6] text-muted-foreground">
        Fração do talhão que cada andar ocuparia na densidade das espécies
        plantadas, no mês {mes}. A marca cinza é a referência do cap. 10 de{" "}
        <em>Agroflorestando o Mundo</em>.
      </p>

      <ul className="space-y-2.5">
        {linhas.map((linha) => {
          const largura = (linha.ocupacao / maximo) * 100;
          const referencia =
            linha.ideal !== null ? (linha.ideal / maximo) * 100 : null;

          return (
            <li
              key={linha.estrato}
              onMouseEnter={() => setFocada(linha.estrato)}
              onMouseLeave={() => setFocada(null)}
              className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3"
            >
              <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                {ESTRATO_LABEL[linha.estrato]}
              </span>

              <div className="relative h-4">
                {/* Trilho */}
                <div className="absolute inset-y-0 left-0 right-0 rounded-sm bg-muted/40" />

                {/* A barra: extremidade arredondada, ancorada na base */}
                <div
                  className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-320"
                  style={{
                    width: `${Math.min(largura, 100)}%`,
                    background: "var(--cor-ocupacao)",
                    opacity: focada && focada !== linha.estrato ? 0.55 : 1,
                  }}
                />

                {/* Referência do livro */}
                {referencia !== null && (
                  <div
                    className="absolute -top-0.5 bottom-[-2px] w-px"
                    style={{
                      left: `${referencia}%`,
                      background: "var(--cor-referencia)",
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="flex items-baseline gap-2 text-right">
                <span className="metric w-12 text-xs">
                  {linha.veredito === "sem_medida"
                    ? "—"
                    : `${Math.round(linha.ocupacao * 100)}%`}
                </span>
                <SeloDoVeredito veredito={linha.veredito} ideal={linha.ideal} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Tabela equivalente: a leitura nunca depende do gráfico. */}
      <details className="mt-4">
        <summary className="cursor-pointer font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
          Ver como tabela
        </summary>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-left">
              <th className="py-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                Estrato
              </th>
              <th className="py-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                Medido
              </th>
              <th className="py-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                Referência
              </th>
              <th className="py-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                Leitura
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.estrato} className="border-b border-border/20">
                <td className="py-1">{ESTRATO_LABEL[linha.estrato]}</td>
                <td className="py-1 font-mono">
                  {linha.veredito === "sem_medida"
                    ? "não medido"
                    : `${Math.round(linha.ocupacao * 100)}%`}
                </td>
                <td className="py-1 font-mono">
                  {linha.ideal !== null
                    ? `${Math.round(linha.ideal * 100)}%`
                    : "—"}
                </td>
                <td className="py-1 text-muted-foreground">
                  {ROTULO_DO_VEREDITO[linha.veredito]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

const ROTULO_DO_VEREDITO: Record<Veredito, string> = {
  vazio: "andar vazio",
  sub: "abaixo da referência",
  adequado: "próximo da referência",
  sobre: "acima da referência",
  sem_medida: "sem espaçamento no catálogo",
};

function SeloDoVeredito({
  veredito,
  ideal,
}: {
  veredito: Veredito;
  ideal: number | null;
}) {
  const titulo =
    ideal !== null
      ? `${ROTULO_DO_VEREDITO[veredito]} (referência ${Math.round(ideal * 100)}%)`
      : ROTULO_DO_VEREDITO[veredito];

  return (
    <span
      title={titulo}
      className="w-32 shrink-0 text-left font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground"
    >
      {ROTULO_DO_VEREDITO[veredito]}
    </span>
  );
}
