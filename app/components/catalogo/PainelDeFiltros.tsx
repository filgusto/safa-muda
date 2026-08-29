"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2, FilterX, ArrowLeft, ChevronDown } from "lucide-react";
import {
  DIMENSOES,
  DIMENSAO_LABEL,
  type Dimensao,
  type Opcao,
  type Selecao,
} from "./dimensoes.ts";

/**
 * Filtros por chips, em dois níveis.
 *
 * A barra de cima escolhe a categoria; a de baixo mostra os chips dela, onde
 * clicar liga e clicar de novo desliga. Dentro de uma categoria vale OU, entre
 * categorias vale E — a mesma semântica que `lib/catalogo.ts` aplica na
 * consulta.
 *
 * O componente é controlado: não guarda seleção nenhuma. Quem o usa decide
 * onde ela mora — na URL, no catálogo público, para que um filtro seja
 * linkável; em memória, na gaveta do planejador.
 */
export function PainelDeFiltros({
  aberto,
  id,
  dimensaoAberta,
  onAbrirDimensao,
  selecao,
  opcoesPorDimensao,
  onAlternar,
  onLimparDimensao,
  onLimparTudo,
  totalSelecionado,
}: {
  aberto: boolean;
  id: string;
  dimensaoAberta: Dimensao | null;
  onAbrirDimensao: (dimensao: Dimensao | null) => void;
  selecao: Selecao;
  opcoesPorDimensao: Record<Dimensao, Opcao[]>;
  onAlternar: (dimensao: Dimensao, valor: string) => void;
  onLimparDimensao: (dimensao: Dimensao) => void;
  onLimparTudo: () => void;
  totalSelecionado: number;
}) {
  const [dicaLimparTudo, setDicaLimparTudo] = useState(false);

  // Mantém a última dimensão aberta para que a sub-barra tenha conteúdo
  // enquanto recolhe — sem isso ela sumiria de uma vez, sem animação.
  const [ultimaDimensao, setUltimaDimensao] = useState<Dimensao | null>(null);
  useEffect(() => {
    if (dimensaoAberta) setUltimaDimensao(dimensaoAberta);
  }, [dimensaoAberta]);

  const dimensaoVisivel = dimensaoAberta ?? ultimaDimensao ?? "estrato";

  return (
    <Expansivel aberto={aberto} id={id}>
      <div className="flex flex-wrap items-center gap-2 border-b border-bg-border bg-bg-base/30 px-4 py-2">
        {/* Mesmo botão da faixa de chips, um nível acima: ali limpa uma
            categoria, aqui limpa todas. */}
        <span className="relative shrink-0">
          <Dica visivel={dicaLimparTudo && totalSelecionado > 0}>
            Limpar todos os filtros
          </Dica>

          <button
            type="button"
            onClick={onLimparTudo}
            onMouseEnter={() => setDicaLimparTudo(true)}
            onMouseLeave={() => setDicaLimparTudo(false)}
            onFocus={() => setDicaLimparTudo(true)}
            onBlur={() => setDicaLimparTudo(false)}
            disabled={totalSelecionado === 0}
            aria-label="Limpar todos os filtros"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-240 hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <FilterX size={12} />
          </button>
        </span>

        <span aria-hidden className="h-4 w-px shrink-0 bg-bg-border" />

        {DIMENSOES.map((dimensao) => {
          const quantos = selecao[dimensao].length;
          const aberta = dimensaoAberta === dimensao;
          return (
            <button
              key={dimensao}
              type="button"
              onClick={() => onAbrirDimensao(aberta ? null : dimensao)}
              aria-expanded={aberta}
              aria-controls={`${id}-opcoes`}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-240 ${
                aberta || quantos > 0
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {DIMENSAO_LABEL[dimensao]}
              {quantos > 0 && (
                <span className="metric text-[0.6rem]">{quantos}</span>
              )}
              <ChevronDown
                size={12}
                aria-hidden
                className={`transition-transform duration-240 motion-reduce:transition-none ${
                  aberta ? "rotate-180" : ""
                }`}
              />
            </button>
          );
        })}
      </div>

      <Expansivel aberto={dimensaoAberta !== null} id={`${id}-opcoes`}>
        <ChipsDaDimensao
          // `key` por dimensão: trocar de categoria zera a busca de chips, que
          // é local e não deve vazar de uma para outra.
          key={dimensaoVisivel}
          dimensao={dimensaoAberta ? dimensaoVisivel : null}
          opcoes={opcoesPorDimensao[dimensaoVisivel]}
          selecionados={selecao[dimensaoVisivel]}
          onAlternar={onAlternar}
          onLimpar={onLimparDimensao}
        />
      </Expansivel>
    </Expansivel>
  );
}

/**
 * Faixa que abre e fecha animando a altura.
 *
 * Grade de uma linha indo de `0fr` a `1fr`: é o jeito de animar até a altura do
 * conteúdo sem medi-lo, porque `height: auto` não é animável. Fechada, recebe
 * `inert` — nada lá dentro pega foco por Tab.
 */
export function Expansivel({
  aberto,
  id,
  children,
}: {
  aberto: boolean;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      inert={!aberto}
      className={`grid overflow-hidden transition-[grid-template-rows] duration-320 ease-bio-ease motion-reduce:transition-none ${
        aberto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * Dica de mouse dos botões redondos.
 *
 * Sai à direita do botão, e nunca acima ou abaixo: a faixa dos chips vive
 * dentro de um contêiner com `overflow-hidden` (ver Expansivel), que recortaria
 * qualquer coisa fora da altura da faixa.
 */
export function Dica({
  visivel,
  children,
}: {
  visivel: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      role="tooltip"
      aria-hidden={!visivel}
      className={`pointer-events-none absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-bg-border bg-bg-surface2 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground shadow-lg transition-opacity duration-240 motion-reduce:transition-none ${
        visivel ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </span>
  );
}

/** Sem acento e em minúsculas: "família" acha "Familia" e vice-versa. */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Chips de uma dimensão: clicar seleciona, clicar de novo tira.
 *
 * Famílias passam de noventa e não cabem numa varredura visual, daí a lupa —
 * ela filtra os chips à medida que se digita, sem tocar na seleção já feita.
 */
function ChipsDaDimensao({
  dimensao,
  opcoes,
  selecionados,
  onAlternar,
  onLimpar,
}: {
  dimensao: Dimensao | null;
  opcoes: Opcao[];
  selecionados: string[];
  onAlternar: (dimensao: Dimensao, valor: string) => void;
  onLimpar: (dimensao: Dimensao) => void;
}) {
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const [dica, setDica] = useState<
    "lupa" | "limparBusca" | "limparSelecao" | null
  >(null);
  const campo = useRef<HTMLInputElement>(null);

  // Abrir a lupa sem levar o cursor junto obrigaria a um clique a mais.
  useEffect(() => {
    if (buscaAberta) campo.current?.focus();
  }, [buscaAberta]);

  const visiveis = useMemo(() => {
    if (!termo.trim()) return opcoes;
    const alvo = normalizar(termo.trim());
    return opcoes.filter((opcao) => normalizar(opcao.rotulo).includes(alvo));
  }, [opcoes, termo]);

  if (!dimensao) return null;

  const rotuloDaDimensao = DIMENSAO_LABEL[dimensao].toLowerCase();

  return (
    <div
      role="group"
      aria-label={`Filtrar por ${rotuloDaDimensao}`}
      className="border-b border-bg-border bg-bg-base/50 px-4 py-2"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {/*
          A pastilha recorta o próprio conteúdo enquanto cresce, então as dicas
          ficam neste invólucro, fora dela — senão sairiam cortadas.
        */}
        <div className="relative shrink-0">
          <Dica visivel={dica === "lupa"}>Buscar opções</Dica>
          <Dica visivel={dica === "limparBusca"}>Limpar a busca</Dica>

          {/*
            A própria lupa vira o campo: a mesma pastilha cresce de 24px à
            largura do input, com o ícone parado à esquerda. Fechada, um botão
            sobreposto cobre a pastilha inteira e recebe o clique e o foco.
          */}
          <div
            className={`relative h-6 overflow-hidden rounded-full border transition-[width,border-color] duration-320 ease-bio-ease motion-reduce:transition-none ${
              buscaAberta
                ? "w-44 border-primary/60 bg-input"
                : "w-6 border-border bg-transparent"
            }`}
          >
            <Search
              size={12}
              aria-hidden
              // 6px de cada lado: (24 − 12) / 2 centra a lupa na pastilha fechada.
              className={`pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 transition-colors duration-240 ${
                buscaAberta ? "text-primary" : "text-muted-foreground"
              }`}
            />

            <input
              ref={campo}
              type="text"
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              // Sai o foco, some o campo — mas só quando está vazio: retrair com
              // termo digitado esconderia um filtro que segue valendo, e o foco
              // sai justamente quando se clica no primeiro chip encontrado.
              onBlur={() => {
                if (!termo.trim()) setBuscaAberta(false);
              }}
              onKeyDown={(evento) => {
                if (evento.key === "Escape") {
                  setTermo("");
                  setBuscaAberta(false);
                }
              }}
              tabIndex={buscaAberta ? undefined : -1}
              placeholder={`Filtrar ${rotuloDaDimensao}…`}
              aria-label={`Filtrar opções de ${rotuloDaDimensao}`}
              className={`h-full w-full bg-transparent pl-6 pr-7 font-mono text-[0.65rem] uppercase tracking-wider text-foreground outline-none transition-opacity duration-240 ${
                buscaAberta ? "opacity-100" : "opacity-0"
              }`}
            />

            {buscaAberta && (
              <button
                type="button"
                // `onMouseDown` barrado: sem isso o clique tiraria o foco do
                // campo e o `onBlur` o recolheria antes mesmo de limpar.
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() => {
                  setTermo("");
                  campo.current?.focus();
                }}
                onMouseEnter={() => setDica("limparBusca")}
                onMouseLeave={() => setDica(null)}
                onFocus={() => setDica("limparBusca")}
                onBlur={() => setDica(null)}
                aria-label="Limpar a busca"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground transition-colors duration-240 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <ArrowLeft size={12} />
              </button>
            )}

            {!buscaAberta && (
              <button
                type="button"
                onClick={() => setBuscaAberta(true)}
                onMouseEnter={() => setDica("lupa")}
                onMouseLeave={() => setDica(null)}
                onFocus={() => setDica("lupa")}
                onBlur={() => setDica(null)}
                aria-expanded={false}
                aria-label={`Buscar entre as opções de ${rotuloDaDimensao}`}
                className="absolute inset-0 rounded-full text-transparent transition-colors duration-240 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            )}
          </div>
        </div>

        {/*
          `FilterX` e não `X`: ao lado de um campo de busca, um "x" se lê como
          "apagar o que digitei". Aqui o que se apaga é a seleção de chips.
        */}
        <span className="relative shrink-0">
          <Dica visivel={dica === "limparSelecao" && selecionados.length > 0}>
            Limpar seleções
          </Dica>

          <button
            type="button"
            onClick={() => onLimpar(dimensao)}
            onMouseEnter={() => setDica("limparSelecao")}
            onMouseLeave={() => setDica(null)}
            onFocus={() => setDica("limparSelecao")}
            onBlur={() => setDica(null)}
            disabled={selecionados.length === 0}
            aria-label={`Limpar seleções de ${rotuloDaDimensao}`}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-240 hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <FilterX size={12} />
          </button>
        </span>

        <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-bg-border" />

        {opcoes.length === 0 ? (
          <p className="flex items-center gap-2 py-0.5 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />
            Carregando opções…
          </p>
        ) : visiveis.length === 0 ? (
          <p className="py-0.5 text-xs text-muted-foreground">
            Nenhuma opção com “{termo}”.
          </p>
        ) : (
          visiveis.map((opcao) => {
            const ativo = selecionados.includes(opcao.valor);
            return (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => onAlternar(dimensao, opcao.valor)}
                aria-pressed={ativo}
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-240 ${
                  ativo
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {opcao.rotulo}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
