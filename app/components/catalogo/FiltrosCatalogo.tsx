"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  useState,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useTransition,
  useCallback,
} from "react";
import {
  Search,
  X,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import {
  DIMENSOES,
  DIMENSAO_LABEL,
  OPCOES_FIXAS,
  SELECAO_VAZIA,
  alternarSelecao,
  contarSelecionados,
  type Dimensao,
  type Opcao,
  type Selecao,
} from "./dimensoes.ts";
import { PainelDeFiltros } from "./PainelDeFiltros.tsx";
import { BotaoAdicionarEspecie } from "./BotaoAdicionarEspecie.tsx";

/**
 * Controles de filtro do catálogo.
 *
 * O estado vive na URL, não em React state: um filtro aplicado é linkável,
 * sobrevive ao reload e funciona com o botão voltar. É também o que mantém a
 * página renderizável no servidor e indexável.
 *
 * Os chips e a semântica de OU dentro da categoria / E entre categorias são os
 * mesmos da gaveta do planejador — a diferença é só onde a seleção mora
 * (ver PainelDeFiltros.tsx).
 */
export function FiltrosCatalogo({
  familias,
  mostrados,
  total,
}: {
  familias: { familia: string; total: number }[];
  /** Quantas espécies o servidor devolveu para os filtros atuais. */
  mostrados: number;
  /** Quantas existem no catálogo inteiro. */
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendente, iniciarTransicao] = useTransition();

  const buscaNaUrl = searchParams.get("busca") ?? "";
  const [busca, setBusca] = useState(buscaNaUrl);

  // Mantém o campo em sincronia quando a URL muda por fora (voltar, limpar).
  useEffect(() => setBusca(buscaNaUrl), [buscaNaUrl]);

  // A seleção é derivada da URL: não há cópia em estado que possa divergir.
  const selecaoDaUrl = useMemo<Selecao>(() => {
    const lida = { ...SELECAO_VAZIA };
    for (const dimensao of DIMENSOES) {
      lida[dimensao] = searchParams
        .getAll(dimensao)
        .flatMap((parte) => parte.split(","))
        .map((parte) => parte.trim())
        .filter(Boolean);
    }
    return lida;
  }, [searchParams]);

  // Em cima dela, uma camada otimista: no App Router a URL só muda quando o
  // servidor devolve a lista nova, e sem isto o chip clicado ficaria apagado
  // até lá. O React descarta a camada sozinho quando a transição termina.
  const [selecao, preverSelecao] = useOptimistic(selecaoDaUrl);

  const totalSelecionado = contarSelecionados(selecao);

  // Aberto de saída quando a URL já traz filtro: quem chega por um link
  // compartilhado precisa ver de imediato o que está filtrando.
  const [filtrosAbertos, setFiltrosAbertos] = useState(totalSelecionado > 0);
  const [dimensaoAberta, setDimensaoAberta] = useState<Dimensao | null>(null);

  const navegar = useCallback(
    (params: URLSearchParams, previsao?: Selecao) => {
      const query = params.toString();
      iniciarTransicao(() => {
        if (previsao) preverSelecao(previsao);
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [router, pathname, preverSelecao],
  );

  /** Reescreve todas as dimensões de uma vez, preservando a busca. */
  const aplicarSelecao = useCallback(
    (nova: Selecao) => {
      const params = new URLSearchParams();
      const termo = searchParams.get("busca");
      if (termo) params.set("busca", termo);
      for (const dimensao of DIMENSOES) {
        for (const valor of nova[dimensao]) params.append(dimensao, valor);
      }
      navegar(params, nova);
    },
    [navegar, searchParams],
  );

  const alternar = useCallback(
    (dimensao: Dimensao, valor: string) =>
      aplicarSelecao(alternarSelecao(selecao, dimensao, valor)),
    [aplicarSelecao, selecao],
  );

  const limparDimensao = useCallback(
    (dimensao: Dimensao) => aplicarSelecao({ ...selecao, [dimensao]: [] }),
    [aplicarSelecao, selecao],
  );

  // Debounce da busca: evita uma consulta por tecla digitada.
  useEffect(() => {
    if (busca === buscaNaUrl) return;
    const temporizador = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (busca) params.set("busca", busca);
      else params.delete("busca");
      navegar(params);
    }, 300);
    return () => clearTimeout(temporizador);
  }, [busca, buscaNaUrl, navegar, searchParams]);

  const opcoesPorDimensao = useMemo<Record<Dimensao, Opcao[]>>(
    () => ({
      ...OPCOES_FIXAS,
      familia: familias.map((linha) => ({
        valor: linha.familia,
        rotulo: `${linha.familia} (${linha.total})`,
      })),
    }),
    [familias],
  );

  /** Rótulo de um valor já escolhido, para o resumo abaixo da barra. */
  const rotuloDe = (dimensao: Dimensao, valor: string) =>
    opcoesPorDimensao[dimensao].find((opcao) => opcao.valor === valor)
      ?.rotulo ?? valor;

  const temFiltro = totalSelecionado > 0 || buscaNaUrl !== "";

  return (
    <div className="overflow-hidden rounded-xl border border-bg-border bg-bg-surface1/40">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        {/* A contagem abre a barra: é o resultado do que os controles à direita
            dela acabam de fazer. */}
        <p
          aria-live="polite"
          className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground"
        >
          <span className="metric">{mostrados}</span>
          {mostrados === total ? " espécies" : ` de ${total} espécies`}
        </p>

        <button
          type="button"
          onClick={() =>
            setFiltrosAbertos((antes) => {
              if (antes) setDimensaoAberta(null);
              return !antes;
            })
          }
          aria-expanded={filtrosAbertos}
          aria-controls="filtros-do-catalogo"
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

        <CampoDePesquisa
          valor={busca}
          onChange={setBusca}
          pendente={pendente}
        />

        {/*
          Resumo dos filtros ativos: com a gaveta recolhida ele é a única pista
          do que está valendo — e cada chip daqui também desliga o seu filtro.
        */}
        {DIMENSOES.flatMap((dimensao) =>
          selecao[dimensao].map((valor) => (
            <button
              key={`${dimensao}:${valor}`}
              type="button"
              onClick={() => alternar(dimensao, valor)}
              aria-label={`Remover filtro ${DIMENSAO_LABEL[dimensao]}: ${rotuloDe(dimensao, valor)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary/15 py-0.5 pl-2.5 pr-2 font-mono text-[0.65rem] uppercase tracking-wider text-primary transition-colors duration-240 hover:bg-primary/25"
            >
              {rotuloDe(dimensao, valor)}
              <X size={11} aria-hidden />
            </button>
          )),
        )}

        <div className="ml-auto flex items-center gap-2">
          {temFiltro && (
            <button
              type="button"
              onClick={() => {
                setDimensaoAberta(null);
                iniciarTransicao(() => {
                  preverSelecao(SELECAO_VAZIA);
                  router.replace(pathname);
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors duration-240 hover:text-foreground"
            >
              <X size={12} />
              Limpar
            </button>
          )}

          <BotaoAdicionarEspecie />
        </div>
      </div>

      <PainelDeFiltros
        aberto={filtrosAbertos}
        id="filtros-do-catalogo"
        dimensaoAberta={dimensaoAberta}
        onAbrirDimensao={setDimensaoAberta}
        selecao={selecao}
        opcoesPorDimensao={opcoesPorDimensao}
        onAlternar={alternar}
        onLimparDimensao={limparDimensao}
        onLimparTudo={() => aplicarSelecao(SELECAO_VAZIA)}
        totalSelecionado={totalSelecionado}
      />
    </div>
  );
}

/**
 * Botão que vira campo de busca.
 *
 * Fechado é só a pastilha "Pesquisar"; aberto, a mesma pastilha cresce até a
 * largura do campo, com a lupa parada à esquerda — o mesmo gesto dos chips de
 * família (ver PainelDeFiltros.tsx), pela mesma razão: a barra é uma linha de
 * controles do mesmo tamanho, e uma caixa de texto permanente a quebraria.
 *
 * A filtragem acontece enquanto se digita: quem chama aplica o termo na URL
 * com debounce.
 */
function CampoDePesquisa({
  valor,
  onChange,
  pendente,
}: {
  valor: string;
  onChange: (valor: string) => void;
  pendente: boolean;
}) {
  // Chega aberto quando a URL já traz um termo: o campo precisa mostrar o que
  // está filtrando a lista.
  const [aberto, setAberto] = useState(valor !== "");
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto) campo.current?.focus();
  }, [aberto]);

  return (
    <div
      className={`relative h-[26px] shrink-0 overflow-hidden rounded-md border transition-[width,border-color] duration-320 ease-bio-ease motion-reduce:transition-none ${
        aberto
          ? "w-64 border-primary/60 bg-input sm:w-80"
          : "w-[7.5rem] border-border bg-transparent"
      }`}
    >
      <Search
        size={13}
        aria-hidden
        className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors duration-240 ${
          aberto ? "text-primary" : "text-muted-foreground"
        }`}
      />

      <input
        ref={campo}
        type="text"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        // Sai o foco, recolhe — mas só quando está vazio: retrair com termo
        // digitado esconderia uma busca que segue valendo.
        onBlur={() => {
          if (!valor.trim()) setAberto(false);
        }}
        onKeyDown={(evento) => {
          if (evento.key === "Escape") {
            onChange("");
            setAberto(false);
          }
        }}
        tabIndex={aberto ? undefined : -1}
        placeholder="Nome comum, científico ou família…"
        aria-label="Buscar espécie"
        className={`h-full w-full bg-transparent pl-8 pr-8 text-sm text-foreground outline-none transition-opacity duration-240 ${
          aberto ? "opacity-100" : "opacity-0"
        }`}
      />

      {aberto &&
        (pendente ? (
          <Loader2
            size={13}
            aria-hidden
            className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : (
          valor !== "" && (
            <button
              type="button"
              // `onMouseDown` barrado: sem isso o clique tiraria o foco do campo
              // e o `onBlur` o recolheria antes mesmo de limpar.
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => {
                onChange("");
                campo.current?.focus();
              }}
              aria-label="Limpar a busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground transition-colors duration-240 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X size={13} />
            </button>
          )
        ))}

      {/* Fechado, um botão sobreposto cobre a pastilha inteira e recebe o
          clique e o foco — o input abaixo fica fora da ordem de tabulação. */}
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-expanded={false}
          className="absolute inset-0 flex items-center pl-8 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors duration-240 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Pesquisar
        </button>
      )}
    </div>
  );
}
