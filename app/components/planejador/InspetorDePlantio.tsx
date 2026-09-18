"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trash2,
  ExternalLink,
  AlertTriangle,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { ESTRATO_LABEL, type Estrato } from "@/core/estratos.ts";
import { SUCESSAO_LABEL, type Sucessao } from "@/core/sucessao.ts";
import {
  normalizarIntervalo,
  DURACAO_MINIMA_MESES,
} from "@/core/planejamento.ts";
import {
  editarPlantio,
  removerPlantio,
  moverPlantio,
} from "@/app/actions/projetos.ts";
import { SeletorDeMes } from "./SeletorDeMes.tsx";
import type { PlantioLocal, PontoDeClique } from "./tipos.ts";

const INTENCOES = [
  { valor: "producao", rotulo: "Produção" },
  { valor: "materia_organica", rotulo: "Matéria orgânica" },
  { valor: "adubacao", rotulo: "Adubação" },
  { valor: "quebra_vento", rotulo: "Quebra-vento" },
  { valor: "servico", rotulo: "Serviço" },
];

/** Folga entre o ponteiro e a caixa, e entre a caixa e a borda da janela. */
const AFASTAMENTO = 12;
const MARGEM_DA_JANELA = 8;

export function InspetorDePlantio({
  plantio,
  projectId,
  podeEditar,
  horizonteMeses,
  dataInicio,
  mesParaData,
  ponto,
  onFechar,
}: {
  plantio: PlantioLocal;
  projectId: string;
  podeEditar: boolean;
  horizonteMeses: number;
  /** Início do projeto: âncora das conversões mês relativo ↔ data. */
  dataInicio: Date;
  mesParaData: (mes: number) => string;
  /** Onde o clique ocorreu, em coordenadas de viewport. */
  ponto: PontoDeClique;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [editandoPeriodo, setEditandoPeriodo] = useState<
    "inicio" | "fim" | null
  >(null);
  const [notasAbertas, setNotasAbertas] = useState(Boolean(plantio.notas));
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);
  const notasRef = useRef<HTMLTextAreaElement>(null);
  /** Último texto de notas já enviado — evita salvar duas vezes o mesmo valor. */
  const notasSalvasRef = useRef(plantio.notas ?? "");
  const [posicao, setPosicao] = useState<{ left: number; top: number } | null>(
    null,
  );

  /**
   * Ancora a caixa no ponto do clique e a mantém dentro da janela.
   *
   * Abre à direita e abaixo do ponteiro; se não couber, espelha para o outro
   * lado antes de recorrer ao simples grude na borda. Reposiciona quando o
   * conteúdo cresce — abrir o calendário ou as notas muda a altura.
   */
  useLayoutEffect(() => {
    const posicionar = () => {
      const caixa = caixaRef.current;
      if (!caixa) return;

      const { width, height } = caixa.getBoundingClientRect();
      const limiteX = window.innerWidth - MARGEM_DA_JANELA;
      const limiteY = window.innerHeight - MARGEM_DA_JANELA;

      let left = ponto.x + AFASTAMENTO;
      if (left + width > limiteX) left = ponto.x - AFASTAMENTO - width;

      let top = ponto.y + AFASTAMENTO;
      if (top + height > limiteY) top = ponto.y - AFASTAMENTO - height;

      setPosicao({
        left: Math.max(MARGEM_DA_JANELA, Math.min(left, limiteX - width)),
        top: Math.max(MARGEM_DA_JANELA, Math.min(top, limiteY - height)),
      });
    };

    posicionar();
    window.addEventListener("resize", posicionar);
    return () => window.removeEventListener("resize", posicionar);
  }, [ponto, editandoPeriodo, notasAbertas, confirmandoRemocao]);

  /**
   * Envia as notas se o texto mudou desde o último salvamento.
   *
   * Fica atrás de um ref porque também é chamada de dentro do efeito de
   * fechamento: um clique fora desmonta o textarea antes que o `blur` aconteça,
   * e sem esta descarga o que foi digitado se perderia.
   */
  const salvarNotasRef = useRef<() => void>(() => {});
  salvarNotasRef.current = () => {
    const campo = notasRef.current;
    if (!campo || !podeEditar) return;
    const valor = campo.value.trim();
    if (valor === notasSalvasRef.current) return;
    notasSalvasRef.current = valor;
    void aplicar({ notas: valor || null });
  };

  function fechar() {
    salvarNotasRef.current();
    onFechar();
  }

  // Fecha com Esc ou com um clique fora — é uma caixa sobreposta, não um painel.
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      // Esc desfaz primeiro a confirmação; só depois fecha o inspetor.
      if (confirmandoRemocao) {
        setConfirmandoRemocao(false);
        return;
      }
      salvarNotasRef.current();
      onFechar();
    };
    const aoApontar = (evento: PointerEvent) => {
      if (caixaRef.current?.contains(evento.target as Node)) return;
      salvarNotasRef.current();
      onFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("pointerdown", aoApontar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("pointerdown", aoApontar);
    };
  }, [onFechar, confirmandoRemocao]);

  async function aplicar(mudancas: Record<string, unknown>) {
    setSalvando(true);
    setErro(null);
    const resultado = await editarPlantio({
      id: plantio.id,
      projectId,
      ...mudancas,
    });
    setSalvando(false);
    if (!resultado.ok) setErro(resultado.erro ?? "Não foi possível salvar.");
  }

  /**
   * Move uma das pontas do plantio. `normalizarIntervalo` garante a duração
   * mínima e o horizonte, então escolher um mês "impossível" empurra a outra
   * ponta em vez de recusar a escolha.
   */
  async function mover(ponta: "inicio" | "fim", mes: number) {
    setEditandoPeriodo(null);
    const intervalo = normalizarIntervalo(
      ponta === "inicio"
        ? { mesInicio: mes, mesFim: plantio.mesFim }
        : { mesInicio: plantio.mesInicio, mesFim: mes },
      horizonteMeses,
    );

    setSalvando(true);
    setErro(null);
    const resultado = await moverPlantio({
      id: plantio.id,
      projectId,
      ...intervalo,
    });
    setSalvando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível mover.");
      return;
    }
    router.refresh();
  }

  async function remover() {
    setSalvando(true);
    const resultado = await removerPlantio(plantio.id, projectId);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível remover.");
      setConfirmandoRemocao(false);
      return;
    }
    onFechar();
  }

  return (
    <div
      ref={caixaRef}
      role="dialog"
      aria-label={`Plantio de ${plantio.nomeComum}`}
      style={{
        left: posicao?.left ?? ponto.x,
        top: posicao?.top ?? ponto.y,
        maxHeight: `calc(100vh - ${MARGEM_DA_JANELA * 2}px)`,
        // Antes da primeira medição a caixa existe mas ainda não tem lugar.
        visibility: posicao ? "visible" : "hidden",
      }}
      className="fixed z-50 flex w-72 flex-col overflow-hidden rounded-lg border border-bg-border bg-bg-surface1 shadow-xl"
    >
      <div className="flex items-start gap-2 border-b border-bg-border p-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold leading-snug">
            {plantio.nomeComum}
          </h2>
          <p className="truncate font-mono text-xs italic text-secondary">
            {plantio.nomeCientifico}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {salvando && (
            <Loader2
              size={13}
              className="mr-1 animate-spin text-muted-foreground"
            />
          )}

          {podeEditar && (
            <button
              type="button"
              onClick={() => setConfirmandoRemocao((aberto) => !aberto)}
              disabled={salvando}
              aria-label="Remover do planejamento"
              aria-expanded={confirmandoRemocao}
              title="Remover do planejamento"
              className={`rounded-md p-1.5 text-destructive transition-colors duration-240 hover:bg-destructive/10 disabled:opacity-50 ${
                confirmandoRemocao
                  ? "bg-destructive/20 ring-1 ring-destructive"
                  : ""
              }`}
            >
              <Trash2 size={14} />
            </button>
          )}

          <Link
            href={`/safdex/${plantio.slug}`}
            target="_blank"
            aria-label="Ver no catálogo"
            title="Ver no catálogo"
            className="rounded-md p-1.5 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
          >
            <ExternalLink size={14} />
          </Link>

          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {confirmandoRemocao && (
        <div
          role="alertdialog"
          aria-label="Confirmar remoção"
          className="border-b border-destructive/30 bg-destructive/5 p-3"
        >
          <p className="text-xs leading-[1.6]">
            Remover <strong>{plantio.nomeComum}</strong> do planejamento? A
            barra e o que estiver anotado nela se perdem.
          </p>
          <div className="mt-2.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmandoRemocao(false)}
              className="rounded-md px-3 py-1 text-xs text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={remover}
              disabled={salvando}
              autoFocus
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1 text-xs text-destructive transition-colors duration-240 hover:bg-destructive/10 disabled:opacity-50"
            >
              {salvando && <Loader2 size={12} className="animate-spin" />}
              Remover
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div>
          <span className="mb-1 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Período
          </span>
          <div className="flex items-center gap-1.5 text-sm">
            <PontaDoPeriodo
              rotulo={mesParaData(plantio.mesInicio)}
              descricao="Entrada no plantio"
              ativo={editandoPeriodo === "inicio"}
              podeEditar={podeEditar}
              onClick={() =>
                setEditandoPeriodo((atual) =>
                  atual === "inicio" ? null : "inicio",
                )
              }
            />
            <span className="text-muted-foreground">→</span>
            <PontaDoPeriodo
              rotulo={mesParaData(plantio.mesFim)}
              descricao="Saída do plantio"
              ativo={editandoPeriodo === "fim"}
              podeEditar={podeEditar}
              onClick={() =>
                setEditandoPeriodo((atual) => (atual === "fim" ? null : "fim"))
              }
            />
          </div>

          {editandoPeriodo && (
            <SeletorDeMes
              // Trocar de ponta reinicia o ano exibido no calendário.
              key={editandoPeriodo}
              mes={
                editandoPeriodo === "inicio"
                  ? plantio.mesInicio
                  : plantio.mesFim
              }
              dataInicio={dataInicio}
              mesMinimo={
                editandoPeriodo === "inicio"
                  ? 0
                  : plantio.mesInicio + DURACAO_MINIMA_MESES
              }
              mesMaximo={
                editandoPeriodo === "inicio"
                  ? plantio.mesFim - DURACAO_MINIMA_MESES
                  : horizonteMeses
              }
              onEscolher={(mes) => mover(editandoPeriodo, mes)}
            />
          )}
        </div>

        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {["Sucessão", "Estrato", "Intenção"].map((titulo) => (
                <th
                  key={titulo}
                  scope="col"
                  className="border-b border-bg-border pb-1 font-mono text-[0.6rem] font-normal uppercase tracking-wider text-muted-foreground"
                >
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="align-top">
              <td className="pr-2 pt-1.5 text-xs leading-snug">
                {plantio.sucessao
                  ? (SUCESSAO_LABEL[plantio.sucessao as Sucessao] ??
                    plantio.sucessao)
                  : "—"}
              </td>

              <td className="pr-2 pt-1.5 text-xs leading-snug">
                <span className="flex items-start gap-1">
                  {ESTRATO_LABEL[plantio.estrato]}
                  {plantio.estratoForcado && plantio.estratoDaEspecie && (
                    <AlertTriangle
                      size={11}
                      className="mt-0.5 shrink-0 text-amber-500"
                      aria-label={`O catálogo indica ${ESTRATO_LABEL[plantio.estratoDaEspecie as Estrato]}`}
                    />
                  )}
                </span>
              </td>

              <td className="pt-1.5">
                <select
                  value={plantio.intencao ?? ""}
                  disabled={!podeEditar || salvando}
                  aria-label="Intenção do plantio"
                  onChange={(evento) =>
                    aplicar({ intencao: evento.target.value || null })
                  }
                  className="-ml-1 w-full cursor-pointer rounded bg-transparent px-1 py-0.5 text-xs leading-snug hover:bg-bg-surface2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60"
                >
                  <option value="">—</option>
                  {INTENCOES.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>

        {plantio.estratoDaEspecie === null && (
          <p className="text-[0.7rem] leading-[1.5] text-muted-foreground">
            Sem estrato no catálogo.{" "}
            <Link href={`/safdex/${plantio.slug}/sugerir`} className="bio-link">
              Sugerir correção
            </Link>
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={() => {
              // Recolher a seção desmonta o textarea: salva antes de perder.
              if (notasAbertas) salvarNotasRef.current();
              setNotasAbertas((aberto) => !aberto);
            }}
            aria-expanded={notasAbertas}
            className="-ml-1 flex w-full items-center gap-1 rounded px-1 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors duration-240 hover:text-foreground"
          >
            {notasAbertas ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
            Notas
            {!notasAbertas && plantio.notas && (
              <span
                className="ml-1 h-1.5 w-1.5 rounded-full bg-secondary"
                aria-label="Há notas escritas"
              />
            )}
          </button>

          {notasAbertas && (
            <textarea
              ref={notasRef}
              defaultValue={plantio.notas ?? ""}
              disabled={!podeEditar || salvando}
              rows={3}
              autoFocus
              onBlur={() => salvarNotasRef.current()}
              className="mt-1.5 w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
            />
          )}
        </div>

        {erro && (
          <p
            role="alert"
            className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-2 text-xs text-red-900 dark:text-red-200"
          >
            {erro}
          </p>
        )}
      </div>
    </div>
  );
}

/** Uma das pontas do período: mostra a data e abre o calendário de meses. */
function PontaDoPeriodo({
  rotulo,
  descricao,
  ativo,
  podeEditar,
  onClick,
}: {
  rotulo: string;
  descricao: string;
  ativo: boolean;
  podeEditar: boolean;
  onClick: () => void;
}) {
  if (!podeEditar) return <span className="text-sm">{rotulo}</span>;

  return (
    <button
      type="button"
      onClick={onClick}
      title={descricao}
      aria-label={`${descricao}: ${rotulo}`}
      aria-expanded={ativo}
      className={`rounded px-1.5 py-0.5 text-sm transition-colors duration-240 hover:bg-bg-surface2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        ativo
          ? "bg-primary/20 ring-1 ring-primary"
          : "underline decoration-dotted underline-offset-4"
      }`}
    >
      {rotulo}
    </button>
  );
}
