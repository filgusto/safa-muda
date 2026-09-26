"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { validarEdicao } from "@/app/actions/wiki.ts";
import { SeletorDeFonte } from "@/components/wiki/SeletorDeFonte.tsx";
import {
  LocalDaObservacao,
  useLocalDaObservacao,
} from "@/components/wiki/LocalDaObservacao.tsx";
import { Secao } from "@/components/catalogo/Secao.tsx";
import { useModoDeEdicao } from "@/components/wiki/ModoDeEdicao.tsx";
import { cn } from "@/lib/utils.ts";

/** Limites de `listaDeTexto` em lib/especie-schema.ts. */
const MAXIMO_DE_NOTAS = 50;
const MAXIMO_DE_CARACTERES = 2000;

const CHAVE = "notas";
const ROTULO_DO_CAMPO = "Observações";

/**
 * A seção de observações da ficha e, no modo de edição, a edição delas.
 *
 * Fora do modo de edição é a lista de sempre — e some quando não há nota.
 * Dentro, qualquer pessoa logada ganha um lápis e uma lixeira por observação
 * e um campo para escrever outra no fim da lista.
 *
 * As observações são um campo só da espécie (`notas`, uma lista de texto), não
 * um registro por linha: mexer em qualquer linha propõe a lista inteira. Por
 * isso os botões de linha alteram uma lista local e, enquanto ela difere da
 * gravada, o campo fica "aberto" no modo de edição (`abrirCampo`) até alguém
 * declarar a fonte e aplicar — a mesma regra dos demais campos (ver
 * CampoEditavel.tsx e CLAUDE.md, "a regra de ouro"). Aplicar não envia: guarda
 * no rascunho que vai inteiro em "Salvar e enviar".
 */
export function ObservacoesEditaveis({
  slug,
  notas,
}: {
  slug: string;
  notas: string[];
}) {
  const {
    ativo,
    abrirCampo,
    alteracoes,
    aplicarAlteracao,
    desfazerAlteracao,
    ultimaFonte,
    lembrarFonte,
    ultimoLocal,
    lembrarLocal,
  } = useModoDeEdicao();
  const alteracao = alteracoes[CHAVE];
  /** A lista já aplicada ao rascunho, se houver; senão, a gravada. */
  const aplicada = (alteracao?.propostos[CHAVE] as string[]) ?? notas;

  /** Lista em edição, ainda sem fonte declarada. `null` = nada mexido agora. */
  const [pendentes, setPendentes] = useState<string[] | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [fonte, setFonte] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { local, definirLocal } = useLocalDaObservacao(
    pendentes !== null,
    alteracao ? alteracao.local : ultimoLocal,
  );

  const lista = pendentes ?? aplicada;

  if (!ativo && notas.length === 0) return null;

  function mexer(nova: string[]) {
    setErro(null);
    if (mesmaLista(nova, notas)) {
      // Voltar ao que está gravado é desfazer, não uma alteração a mais.
      setPendentes(null);
      if (alteracao) desfazerAlteracao(CHAVE);
      abrirCampo(null);
      return;
    }
    setPendentes(nova);
    setFonte((atual) => atual || alteracao?.fonte || ultimaFonte);
    setJustificativa((atual) => atual || alteracao?.justificativa || "");
    abrirCampo(CHAVE);
  }

  function cancelar() {
    setPendentes(null);
    setEditando(null);
    setErro(null);
    abrirCampo(null);
  }

  async function aplicar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!pendentes) return;
    setErro(null);
    setEnviando(true);
    const resultado = await validarEdicao({
      slug,
      patch: { [CHAVE]: pendentes },
      fonte,
      localDaObservacao: local || undefined,
      justificativa: justificativa.trim() || undefined,
    });
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível validar.");
      return;
    }

    lembrarFonte(fonte.trim());
    lembrarLocal(local);
    aplicarAlteracao(CHAVE, {
      rotulo: ROTULO_DO_CAMPO,
      propostos: { [CHAVE]: pendentes },
      rascunho: { [CHAVE]: pendentes },
      gruposNovos: [],
      fonte: fonte.trim(),
      local,
      justificativa: justificativa.trim(),
      resumo: resumir(notas, pendentes),
    });
    setPendentes(null);
    setEditando(null);
    abrirCampo(null);
  }

  /** As gravadas que saíram da lista — removidas ou reescritas. */
  const saindo = notas.filter((nota) => !lista.includes(nota));

  return (
    <Secao
      titulo={ROTULO_DO_CAMPO}
      info={
        <>
          O que não cabe nos campos acima: ressalvas regionais, variedades,
          nomes em desuso e divergências entre fontes.
        </>
      }
    >
      {lista.length > 0 && (
        <ul className="space-y-3">
          {lista.map((nota, indice) => (
            <li key={`${indice}-${nota}`} className={cn(CAIXA, "flex gap-3")}>
              {ativo && editando === indice ? (
                <EditorDaNota
                  valor={nota}
                  aoSalvar={(texto) => {
                    mexer(
                      lista.map((atual, i) => (i === indice ? texto : atual)),
                    );
                    setEditando(null);
                  }}
                  aoCancelar={() => setEditando(null)}
                />
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    {nota}
                    {!notas.includes(nota) && (
                      <span className="ml-2 font-mono text-[0.6rem] uppercase tracking-wider text-primary">
                        nova
                      </span>
                    )}
                  </span>
                  {ativo && (
                    <span className="flex shrink-0 items-start gap-0.5">
                      <BotaoDaNota
                        titulo={`Editar a observação ${indice + 1}`}
                        onClick={() => {
                          setEditando(indice);
                          setErro(null);
                        }}
                      >
                        <Pencil size={13} />
                      </BotaoDaNota>
                      <BotaoDaNota
                        titulo={`Remover a observação ${indice + 1}`}
                        destrutivo
                        onClick={() =>
                          mexer(lista.filter((_, i) => i !== indice))
                        }
                      >
                        <Trash2 size={13} />
                      </BotaoDaNota>
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {ativo && saindo.length > 0 && (
        <ul className="mt-3 space-y-2">
          {saindo.map((nota) => (
            <li
              key={nota}
              className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 p-3 text-sm leading-[1.7]"
            >
              <span className="min-w-0 flex-1 text-muted-foreground/70 line-through decoration-1">
                {nota}
              </span>
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
                sai
              </span>
              <BotaoDaNota
                titulo="Manter esta observação"
                onClick={() => mexer([...lista, nota])}
              >
                <RotateCcw size={13} />
              </BotaoDaNota>
            </li>
          ))}
        </ul>
      )}

      {ativo && lista.length === 0 && saindo.length === 0 && (
        <p className="text-sm italic text-muted-foreground/60">não informado</p>
      )}

      {ativo && (
        <NovaObservacao
          desabilitado={lista.length >= MAXIMO_DE_NOTAS}
          aoAdicionar={(texto) => mexer([...lista, texto])}
        />
      )}

      {ativo && pendentes && (
        <form onSubmit={aplicar} className="mt-4 space-y-3">
          <SeletorDeFonte valor={fonte} aoMudar={setFonte} />

          <LocalDaObservacao valor={local} aoMudar={definirLocal} />

          <label className="block">
            <span className={ROTULO}>Observação</span>
            <textarea
              value={justificativa}
              onChange={(evento) => setJustificativa(evento.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Opcional: contexto para quem vai avaliar"
              className={cn(CAMPO, "resize-y")}
            />
          </label>

          {erro && (
            <p
              role="alert"
              className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-900 dark:text-red-200"
            >
              {erro}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelar}
              disabled={enviando}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {enviando && <Loader2 size={14} className="animate-spin" />}
              Aplicar
            </button>
          </div>
        </form>
      )}

      {ativo && !pendentes && alteracao && (
        <div className="mt-3 flex items-center gap-2 text-xs text-primary">
          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-primary/70">
            alterado
          </span>
          <span>{alteracao.resumo}</span>
          <BotaoDaNota
            titulo="Desfazer as alterações nas observações"
            onClick={() => {
              desfazerAlteracao(CHAVE);
              setErro(null);
            }}
          >
            <RotateCcw size={13} />
          </BotaoDaNota>
        </div>
      )}
    </Secao>
  );
}

/** Uma observação virando texto editável, ali mesmo na lista. */
function EditorDaNota({
  valor,
  aoSalvar,
  aoCancelar,
}: {
  valor: string;
  aoSalvar: (texto: string) => void;
  aoCancelar: () => void;
}) {
  const [texto, setTexto] = useState(valor);
  const limpo = texto.trim();

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <textarea
        value={texto}
        autoFocus
        onChange={(evento) => setTexto(evento.target.value)}
        rows={3}
        maxLength={MAXIMO_DE_CARACTERES}
        aria-label="Texto da observação"
        className={cn(CAMPO, "resize-y")}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={aoCancelar}
          className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={limpo === "" || limpo === valor}
          onClick={() => aoSalvar(limpo)}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary px-2.5 py-1 text-xs font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <Check size={13} />
          Salvar
        </button>
      </div>
    </div>
  );
}

/** O campo do fim da lista, para escrever uma observação que ainda não existe. */
function NovaObservacao({
  desabilitado,
  aoAdicionar,
}: {
  desabilitado: boolean;
  aoAdicionar: (texto: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const limpo = texto.trim();

  if (desabilitado) {
    return (
      <p className="mt-4 text-xs text-muted-foreground">
        Limite de {MAXIMO_DE_NOTAS} observações atingido.
      </p>
    );
  }

  function adicionar() {
    if (limpo === "") return;
    aoAdicionar(limpo);
    setTexto("");
  }

  return (
    <div className="mt-4 space-y-2">
      <span className={ROTULO}>Nova observação</span>
      <textarea
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={(evento) => {
          // Enter grava; quebra de linha vira outra observação, então Shift
          // não escapa: o campo é de uma nota só.
          if (evento.key === "Enter" && !evento.shiftKey) {
            evento.preventDefault();
            adicionar();
          }
        }}
        rows={2}
        maxLength={MAXIMO_DE_CARACTERES}
        aria-label="Nova observação"
        placeholder="Ressalva regional, variedade, divergência entre fontes…"
        className={cn(CAMPO, "resize-y")}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={adicionar}
          disabled={limpo === ""}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground disabled:opacity-50"
        >
          <Plus size={14} />
          Adicionar observação
        </button>
      </div>
    </div>
  );
}

function BotaoDaNota({
  titulo,
  onClick,
  destrutivo = false,
  children,
}: {
  titulo: string;
  onClick: () => void;
  destrutivo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={titulo}
      title={titulo}
      className={cn(
        "shrink-0 rounded p-0.5 text-muted-foreground/70 transition-colors duration-240 hover:bg-bg-surface2",
        destrutivo ? "hover:text-red-600" : "hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function mesmaLista(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, indice) => item === b[indice]);
}

/** O que mudou, em palavras, para a barra de edição e o diálogo de envio. */
function resumir(antes: string[], depois: string[]): string {
  const novas = depois.filter((nota) => !antes.includes(nota)).length;
  const saindo = antes.filter((nota) => !depois.includes(nota)).length;
  const partes = [
    novas && `${novas} nova(s)`,
    saindo && `${saindo} removida(s) ou reescrita(s)`,
  ].filter(Boolean);
  return `${depois.length} observação(ões)${partes.length ? ` — ${partes.join(", ")}` : ""}`;
}

const CAIXA =
  "rounded-lg border-l-4 border-blue-500/30 bg-blue-500/5 p-4 text-sm leading-[1.7] text-blue-900 dark:text-blue-200";

const ROTULO =
  "mb-1 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground";

const CAMPO =
  "w-full rounded-md border border-border bg-input px-3 py-1.5 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
