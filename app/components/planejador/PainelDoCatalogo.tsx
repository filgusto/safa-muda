"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Loader2,
  GripVertical,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  FilterX,
  ArrowLeft,
} from "lucide-react";
import { ESTRATOS, ESTRATO_LABEL } from "@/core/estratos.ts";
import {
  SUCESSOES,
  SUCESSAO_LABEL,
  SISTEMAS,
  SISTEMA_LABEL,
  type Sucessao,
} from "@/core/sucessao.ts";
import { GRUPOS, GRUPO_LABEL } from "@/core/grupos.ts";
import {
  FAIXAS_DE_COLHEITA,
  FAIXA_DE_COLHEITA_LABEL,
} from "@/core/colheita.ts";
import { type EspecieDoPainel, type CargaDeArraste } from "./tipos.ts";
import { useArraste } from "./ArrasteContext.tsx";

/** Dimensões de filtro, na ordem em que aparecem na sub-barra. */
const DIMENSOES = [
  "estrato",
  "sucessao",
  "sistema",
  "grupo",
  "colheita",
  "familia",
] as const;

type Dimensao = (typeof DIMENSOES)[number];

const DIMENSAO_LABEL: Record<Dimensao, string> = {
  estrato: "Estrato",
  sucessao: "Sucessão",
  sistema: "Sistema",
  grupo: "Grupo",
  colheita: "Colheita",
  familia: "Família",
};

type Opcao = { valor: string; rotulo: string };

const SELECAO_VAZIA: Record<Dimensao, string[]> = {
  estrato: [],
  sucessao: [],
  sistema: [],
  grupo: [],
  colheita: [],
  familia: [],
};

/**
 * Catálogo acoplado à timeline, em gaveta horizontal.
 *
 * Fica recolhido por padrão: quem já desenhou o consórcio quer a timeline
 * inteira, não o catálogo ocupando uma coluna permanente. Abre entre a barra de
 * comandos e a timeline, com os cards em fila — a rolagem é lateral, e a faixa
 * de destino continua visível logo abaixo enquanto se arrasta.
 *
 * Arrastar daqui para uma faixa cria o plantio — pela alça, que funciona com
 * mouse, toque e caneta (ver ArrasteContext.tsx). O botão "+" oferece um caminho
 * sem arraste, que também é o caminho do teclado.
 */
export function PainelDoCatalogo({
  aberto,
  onAdicionar,
}: {
  aberto: boolean;
  onAdicionar: (carga: CargaDeArraste) => void;
}) {
  const [busca, setBusca] = useState("");
  const [especies, setEspecies] = useState<EspecieDoPainel[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [dicaLimparTudo, setDicaLimparTudo] = useState(false);
  const [dimensaoAberta, setDimensaoAberta] = useState<Dimensao | null>(null);
  const [selecao, setSelecao] =
    useState<Record<Dimensao, string[]>>(SELECAO_VAZIA);

  // Mantém a última dimensão aberta para que a sub-sub-barra tenha conteúdo
  // enquanto recolhe — sem isso ela sumiria de uma vez, sem animação.
  const [ultimaDimensao, setUltimaDimensao] = useState<Dimensao | null>(null);
  useEffect(() => {
    if (dimensaoAberta) setUltimaDimensao(dimensaoAberta);
  }, [dimensaoAberta]);

  const [familias, setFamilias] = useState<Opcao[] | null>(null);

  // Famílias vêm do banco (são ~90 e mudam com o catálogo), então só as
  // buscamos quando alguém abre essa dimensão.
  useEffect(() => {
    if (dimensaoAberta !== "familia" || familias) return;

    const controlador = new AbortController();
    fetch("/api/especies/familias", { signal: controlador.signal })
      .then((resposta) => resposta.json())
      .then((dados: { familia: string; total: number }[]) =>
        setFamilias(
          dados.map((linha) => ({
            valor: linha.familia,
            rotulo: `${linha.familia} (${linha.total})`,
          })),
        ),
      )
      .catch(() => {
        if (!controlador.signal.aborted) setFamilias([]);
      });

    return () => controlador.abort();
  }, [dimensaoAberta, familias]);

  const opcoesPorDimensao = useMemo<Record<Dimensao, Opcao[]>>(
    () => ({
      estrato: ESTRATOS.map((valor) => ({
        valor,
        rotulo: ESTRATO_LABEL[valor],
      })),
      sucessao: SUCESSOES.map((valor) => ({
        valor,
        rotulo: SUCESSAO_LABEL[valor],
      })),
      sistema: SISTEMAS.map((valor) => ({
        valor,
        rotulo: SISTEMA_LABEL[valor],
      })),
      grupo: GRUPOS.map((valor) => ({ valor, rotulo: GRUPO_LABEL[valor] })),
      colheita: FAIXAS_DE_COLHEITA.map((dias) => ({
        valor: String(dias),
        rotulo: FAIXA_DE_COLHEITA_LABEL[dias],
      })),
      familia: familias ?? [],
    }),
    [familias],
  );

  const totalSelecionado = DIMENSOES.reduce(
    (soma, dimensao) => soma + selecao[dimensao].length,
    0,
  );

  const alternarOpcao = (dimensao: Dimensao, valor: string) =>
    setSelecao((antes) => {
      const jaTem = antes[dimensao].includes(valor);

      // Colheita é escolha única: os valores são tetos, e marcar "até 3 meses"
      // junto com "até 10 anos" só significaria "até 10 anos" — dois chips
      // acesos para um resultado só.
      if (dimensao === "colheita") {
        return { ...antes, colheita: jaTem ? [] : [valor] };
      }

      return {
        ...antes,
        [dimensao]: jaTem
          ? antes[dimensao].filter((item) => item !== valor)
          : [...antes[dimensao], valor],
      };
    });

  const limparDimensao = (dimensao: Dimensao) =>
    setSelecao((antes) => ({ ...antes, [dimensao]: [] }));

  const alternarFiltros = () =>
    setFiltrosAbertos((antes) => {
      if (antes) setDimensaoAberta(null);
      return !antes;
    });

  // A API aceita valores repetidos por dimensão (ver lib/catalogo.ts): dentro
  // de uma dimensão vale OU, entre dimensões vale E.
  const consulta = useMemo(() => {
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    for (const dimensao of DIMENSOES) {
      for (const valor of selecao[dimensao]) params.append(dimensao, valor);
    }
    return params.toString();
  }, [busca, selecao]);

  // Só busca depois da primeira abertura — e daí em diante mantém a lista, para
  // que fechar e reabrir a gaveta não custe uma ida ao servidor.
  const [jaAbriu, setJaAbriu] = useState(aberto);
  useEffect(() => {
    if (aberto) setJaAbriu(true);
  }, [aberto]);

  useEffect(() => {
    if (!jaAbriu) return;

    const controlador = new AbortController();
    setCarregando(true);

    const temporizador = setTimeout(() => {
      fetch(`/api/especies?${consulta}`, { signal: controlador.signal })
        .then((resposta) => resposta.json())
        .then((dados: EspecieDoPainel[]) => {
          setEspecies(dados);
          setCarregando(false);
        })
        .catch(() => {
          if (!controlador.signal.aborted) setCarregando(false);
        });
    }, 250);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [consulta, jaAbriu]);

  return (
    <Expansivel aberto={aberto} id="gaveta-de-plantas">
      <section
        aria-label="Catálogo de plantas"
        className="border-b border-bg-border bg-bg-surface1/40"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-bg-border px-4 py-2">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            Plantas
          </h2>

          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar espécie…"
              aria-label="Buscar espécie"
              className="w-48 rounded-md border border-border bg-input py-1 pl-8 pr-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <button
            type="button"
            onClick={alternarFiltros}
            aria-expanded={filtrosAbertos}
            aria-controls="sub-barra-de-filtros"
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-240 ${
              filtrosAbertos || totalSelecionado > 0
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal size={13} />
            Filtros
            {totalSelecionado > 0 && (
              <span className="metric text-[0.6rem]">{totalSelecionado}</span>
            )}
            <ChevronDown
              size={12}
              aria-hidden
              className={`transition-transform duration-240 motion-reduce:transition-none ${
                filtrosAbertos ? "rotate-180" : ""
              }`}
            />
          </button>

          <p className="ml-auto text-xs leading-[1.6] text-muted-foreground">
            Arraste pela alça até a faixa do estrato, ou use{" "}
            <span className="font-mono">+</span> para pôr no início.
          </p>
        </div>

        <Expansivel aberto={filtrosAbertos} id="sub-barra-de-filtros">
          <div className="flex flex-wrap items-center gap-2 border-b border-bg-border bg-bg-base/30 px-4 py-2">
            {/* Mesmo botão da faixa de chips, um nível acima: ali limpa uma
                categoria, aqui limpa todas. */}
            <span className="relative shrink-0">
              <Dica visivel={dicaLimparTudo && totalSelecionado > 0}>
                Limpar todos os filtros
              </Dica>

              <button
                type="button"
                onClick={() => setSelecao(SELECAO_VAZIA)}
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
                  onClick={() => setDimensaoAberta(aberta ? null : dimensao)}
                  aria-expanded={aberta}
                  aria-controls="sub-barra-de-opcoes"
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

          <Expansivel aberto={dimensaoAberta !== null} id="sub-barra-de-opcoes">
            <ChipsDaDimensao
              // `key` por dimensão: trocar de categoria zera a busca de chips,
              // que é local e não deve vazar de uma para outra.
              key={dimensaoAberta ?? ultimaDimensao ?? "estrato"}
              dimensao={dimensaoAberta ?? ultimaDimensao}
              opcoes={
                opcoesPorDimensao[dimensaoAberta ?? ultimaDimensao ?? "estrato"]
              }
              selecionados={
                selecao[dimensaoAberta ?? ultimaDimensao ?? "estrato"]
              }
              onAlternar={alternarOpcao}
              onLimpar={limparDimensao}
            />
          </Expansivel>
        </Expansivel>

        {carregando ? (
          <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Buscando…
          </p>
        ) : especies.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Nenhuma espécie encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto px-4 py-3">
            <ul className="flex gap-2">
              {especies.map((especie) => (
                <CardArrastavel
                  key={especie.id}
                  especie={especie}
                  onAdicionar={onAdicionar}
                />
              ))}
            </ul>
          </div>
        )}
      </section>
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
function Expansivel({
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
function Dica({
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

function CardArrastavel({
  especie,
  onAdicionar,
}: {
  especie: EspecieDoPainel;
  onAdicionar: (carga: CargaDeArraste) => void;
}) {
  const { iniciar } = useArraste();

  const carga: CargaDeArraste = {
    speciesId: especie.id,
    nomeComum: especie.nomeComum,
    estratoDaEspecie: especie.estrato,
    diasParaColherMax: especie.diasParaColherMax,
  };

  return (
    // O card inteiro é a alça: `select-none` evita que arrastar com o mouse
    // vire seleção de texto.
    <li
      onPointerDown={(evento) => iniciar(carga, evento)}
      className="group flex w-52 shrink-0 cursor-grab select-none flex-col gap-1 rounded-md border border-border bg-bg-surface1/60 p-2.5 transition-colors duration-240 hover:border-primary/40 hover:bg-primary/5 active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5">
        {/* `touch-none` só na alça: pelo resto do card o toque continua
            rolando a fila, e é a alça que garante o arraste no tablet. */}
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 touch-none text-muted-foreground/50 group-hover:text-primary"
        >
          <GripVertical size={14} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{especie.nomeComum}</p>
          <p className="truncate font-mono text-[0.7rem] italic text-secondary">
            {especie.nomeCientifico}
          </p>
        </div>

        <button
          type="button"
          // Sem isto, apertar "+" também armaria um arraste no card.
          onPointerDown={(evento) => evento.stopPropagation()}
          onClick={() => onAdicionar(carga)}
          aria-label={`Adicionar ${especie.nomeComum} no início do planejamento`}
          className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-primary"
        >
          <Plus size={14} />
        </button>
      </div>

      <p className="truncate font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {especie.estrato ? ESTRATO_LABEL[especie.estrato] : "sem estrato"}
        {especie.sucessao &&
          ` · ${SUCESSAO_LABEL[especie.sucessao as Sucessao] ?? especie.sucessao}`}
      </p>
    </li>
  );
}
