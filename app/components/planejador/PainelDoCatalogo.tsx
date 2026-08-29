"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Loader2,
  GripVertical,
  Plus,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { ESTRATO_LABEL } from "@/core/estratos.ts";
import { SUCESSAO_LABEL, type Sucessao } from "@/core/sucessao.ts";
import {
  DIMENSOES,
  OPCOES_FIXAS,
  SELECAO_VAZIA,
  alternarSelecao,
  contarSelecionados,
  type Dimensao,
  type Opcao,
  type Selecao,
} from "@/components/catalogo/dimensoes.ts";
import {
  PainelDeFiltros,
  Expansivel,
} from "@/components/catalogo/PainelDeFiltros.tsx";
import { type EspecieDoPainel, type CargaDeArraste } from "./tipos.ts";
import { useArraste } from "./ArrasteContext.tsx";

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
  const [dimensaoAberta, setDimensaoAberta] = useState<Dimensao | null>(null);
  const [selecao, setSelecao] = useState<Selecao>(SELECAO_VAZIA);

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
    () => ({ ...OPCOES_FIXAS, familia: familias ?? [] }),
    [familias],
  );

  const totalSelecionado = contarSelecionados(selecao);

  const alternarOpcao = (dimensao: Dimensao, valor: string) =>
    setSelecao((antes) => alternarSelecao(antes, dimensao, valor));

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

        <PainelDeFiltros
          aberto={filtrosAbertos}
          id="sub-barra-de-filtros"
          dimensaoAberta={dimensaoAberta}
          onAbrirDimensao={setDimensaoAberta}
          selecao={selecao}
          opcoesPorDimensao={opcoesPorDimensao}
          onAlternar={alternarOpcao}
          onLimparDimensao={limparDimensao}
          onLimparTudo={() => setSelecao(SELECAO_VAZIA)}
          totalSelecionado={totalSelecionado}
        />

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
