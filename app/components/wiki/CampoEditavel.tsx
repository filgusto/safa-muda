"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { validarEdicao } from "@/app/actions/wiki.ts";
import { SeletorDeFonte } from "@/components/wiki/SeletorDeFonte.tsx";
import {
  LocalDaObservacao,
  useLocalDaObservacao,
} from "@/components/wiki/LocalDaObservacao.tsx";
import {
  CAMPOS_POR_CHAVE,
  CHAVE_GRUPOS_PROPOSTOS,
  type DefinicaoDeCampo,
} from "@/lib/especie-schema.ts";
import {
  useModoDeEdicao,
  type AlteracaoDeCampo,
} from "@/components/wiki/ModoDeEdicao.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * Um par rótulo–valor da ficha que, no modo de edição, ganha um lápis ao lado
 * do valor. O lápis troca o valor, ali mesmo, por um controle do tipo do campo
 * (seleção, múltipla escolha, número com unidade, faixa mín.–máx., texto) e
 * pede a fonte — sem ela não há sugestão (ver CLAUDE.md, "a regra de ouro").
 *
 * "Aplicar" não envia: valida no servidor e guarda a alteração no rascunho do
 * modo de edição, que vai inteiro em "Salvar e enviar" (ver ModoDeEdicao.tsx).
 * Enquanto isso, a ficha mostra o valor atual riscado e o proposto ao lado.
 *
 * O tipo do controle vem de CAMPOS (lib/especie-schema.ts), a mesma definição
 * que valida no servidor e traduz o diff na moderação.
 *
 * Valores derivados (a luz que chega, do estrato; a poda drástica, da rebrota)
 * não ganham lápis: sem `chaves`, o campo só exibe. Corrigi-los é corrigir o
 * campo de onde vêm.
 */
export function CampoEditavel({
  rotulo,
  valor,
  slug,
  chaves,
  atuais = {},
}: {
  rotulo: string;
  valor: string | null;
  slug: string;
  /** Campos exibidos: um só, ou dois para uma faixa (mín., máx.). */
  chaves?: string[];
  atuais?: Record<string, unknown>;
}) {
  const { ativo, campoAberto, abrirCampo, alteracoes, desfazerAlteracao } =
    useModoDeEdicao();
  const id = chaves?.[0];
  const aberto = ativo && id !== undefined && campoAberto === id;
  const alteracao = id ? alteracoes[id] : undefined;

  function editar() {
    if (id) abrirCampo(id);
  }

  return (
    <div
      id={id ? idDoCampo(id) : undefined}
      className="border-b border-border/40 py-2.5"
    >
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
        <span className="w-40 shrink-0 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {rotulo}
        </span>
        {aberto ? (
          <Editor
            definicoes={chaves!.map((chave) => CAMPOS_POR_CHAVE.get(chave)!)}
            atuais={atuais}
            slug={slug}
            rotulo={rotulo}
            fechar={() => abrirCampo(null)}
          />
        ) : alteracao ? (
          <Alterado
            antes={valor}
            alteracao={alteracao}
            editar={editar}
            desfazer={() => desfazerAlteracao(id!)}
          />
        ) : (
          <span className="flex items-baseline gap-1.5">
            <span
              className={
                valor
                  ? "text-foreground"
                  : "text-sm italic text-muted-foreground/60"
              }
            >
              {valor ?? "não informado"}
            </span>
            {ativo && id && (
              <Lapis
                titulo={`Sugerir alteração em "${rotulo}"`}
                onClick={editar}
              />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Nome comum ou científico, no cabeçalho da ficha. Mesmo editor dos campos,
 * mas sem a linha rótulo–valor: o nome segue com a tipografia do título, e o
 * lápis fica logo depois dele.
 *
 * O nome em si vem pronto do servidor (`children`), já com o estilo de cada
 * um — aqui só se decide entre mostrá-lo e trocá-lo pelo editor.
 */
export function NomeEditavel({
  chave,
  atual,
  slug,
  className,
  children,
}: {
  chave: "nomeComum" | "nomeCientifico";
  atual: string;
  slug: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { ativo, campoAberto, abrirCampo, alteracoes, desfazerAlteracao } =
    useModoDeEdicao();
  const definicao = CAMPOS_POR_CHAVE.get(chave)!;
  const aberto = ativo && campoAberto === chave;
  const alteracao = alteracoes[chave];

  if (aberto) {
    return (
      // `basis-full`: no cabeçalho, o nome comum divide a linha com as
      // pastilhas de grupo; aberto, o editor precisa da largura toda.
      <div id={idDoCampo(chave)} className="w-full basis-full py-1">
        <Editor
          definicoes={[definicao]}
          atuais={{ [chave]: atual }}
          slug={slug}
          rotulo={definicao.rotulo}
          fechar={() => abrirCampo(null)}
          comRotulo
        />
      </div>
    );
  }

  return (
    <div id={idDoCampo(chave)} className={className}>
      <div className="flex items-center gap-2">
        {children}
        {ativo && (
          <Lapis
            titulo={`Sugerir alteração em "${definicao.rotulo}"`}
            onClick={() => abrirCampo(chave)}
          />
        )}
      </div>
      {alteracao && (
        <div className="mt-1 text-sm">
          <Alterado
            alteracao={alteracao}
            editar={() => abrirCampo(chave)}
            desfazer={() => desfazerAlteracao(chave)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Valor com alteração no rascunho: o atual riscado, o proposto em destaque,
 * e os controles para reabrir o editor ou desfazer só esta alteração.
 */
function Alterado({
  antes,
  alteracao,
  editar,
  desfazer,
}: {
  /** Omitido quando o valor atual já está à vista, como no nome da ficha. */
  antes?: string | null;
  alteracao: AlteracaoDeCampo;
  editar: () => void;
  desfazer: () => void;
}) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {antes !== undefined && (
        <span className="text-sm text-muted-foreground/70 line-through decoration-1">
          {antes ?? "não informado"}
        </span>
      )}
      <span className="text-primary">{alteracao.resumo}</span>
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-primary/70">
        alterado
      </span>
      <span className="flex items-center gap-0.5 self-center">
        <Lapis
          titulo={`Editar a alteração em "${alteracao.rotulo}"`}
          onClick={editar}
        />
        <button
          type="button"
          onClick={desfazer}
          aria-label={`Desfazer a alteração em "${alteracao.rotulo}"`}
          title="Desfazer esta alteração"
          className="shrink-0 rounded p-0.5 text-muted-foreground/60 transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
        >
          <RotateCcw size={12} />
        </button>
      </span>
    </span>
  );
}

function Lapis({ titulo, onClick }: { titulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={titulo}
      title={titulo}
      className="shrink-0 self-center rounded p-0.5 text-muted-foreground/60 transition-colors duration-240 hover:bg-bg-surface2 hover:text-primary"
    >
      <Pencil size={12} />
    </button>
  );
}

function idDoCampo(chave: string): string {
  return `ficha-campo-${chave}`;
}

type Rascunho = Record<string, string | string[]>;

function Editor({
  definicoes,
  atuais,
  slug,
  rotulo,
  fechar,
  comRotulo = false,
}: {
  definicoes: DefinicaoDeCampo[];
  atuais: Record<string, unknown>;
  slug: string;
  rotulo: string;
  fechar: () => void;
  /** Fora de uma linha rótulo–valor, o próprio editor diz o que se edita. */
  comRotulo?: boolean;
}) {
  const {
    ultimaFonte,
    lembrarFonte,
    ultimoLocal,
    lembrarLocal,
    alteracoes,
    aplicarAlteracao,
    desfazerAlteracao,
  } = useModoDeEdicao();
  const raiz = useRef<HTMLFormElement>(null);
  const id = definicoes[0]!.chave;
  // Reabrir um campo já alterado retoma o que foi digitado, não o gravado.
  const anterior = alteracoes[id];

  const [rascunho, setRascunho] = useState<Rascunho>(
    () =>
      anterior?.rascunho ??
      Object.fromEntries(
        definicoes.map((def) => [
          def.chave,
          paraRascunho(def, atuais[def.chave]),
        ]),
      ),
  );
  const [gruposNovos, setGruposNovos] = useState<string[]>(
    anterior?.gruposNovos ?? [],
  );
  const [fonte, setFonte] = useState(anterior?.fonte ?? ultimaFonte);
  const [justificativa, setJustificativa] = useState(
    anterior?.justificativa ?? "",
  );
  const { local, definirLocal } = useLocalDaObservacao(
    true,
    anterior ? anterior.local : ultimoLocal,
  );
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Foco no controle do campo, para editar sem voltar ao mouse.
  useEffect(() => {
    raiz.current
      ?.querySelector<HTMLElement>("input, select, button[aria-pressed]")
      ?.focus();
  }, []);

  /**
   * Esc fecha só o editor. O modal da ficha (Radix) ouve o Esc na fase de
   * captura do `document`; parar o evento antes, na captura da `window`, é o
   * que impede que ele feche a ficha inteira junto.
   */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      if (!raiz.current?.contains(document.activeElement)) return;
      evento.stopPropagation();
      fechar();
    }
    window.addEventListener("keydown", aoTeclar, { capture: true });
    return () =>
      window.removeEventListener("keydown", aoTeclar, { capture: true });
  }, [fechar]);

  const definir = (chave: string, valor: string | string[]) =>
    setRascunho((anterior) => ({ ...anterior, [chave]: valor }));

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    const propostos: Record<string, unknown> = {};
    for (const def of definicoes) {
      const convertido = doRascunho(def, rascunho[def.chave]!);
      if (convertido === INVALIDO) {
        setErro(`Informe um número maior que zero em "${def.rotulo}".`);
        return;
      }
      // Os obrigatórios de uma espécie nova são as colunas NOT NULL: nome
      // comum e científico. Apagá-los não é sugestão que se possa aplicar.
      if (def.obrigatorioEmNova && convertido === null) {
        setErro(`"${def.rotulo}" não pode ficar vazio.`);
        return;
      }
      propostos[def.chave] = convertido;
    }

    if (definicoes.length === 2) {
      const [min, max] = definicoes.map((def) => propostos[def.chave]);
      if (typeof min === "number" && typeof max === "number" && min > max) {
        setErro("O mínimo não pode ser maior que o máximo.");
        return;
      }
    }

    // Só o que muda vai na proposta. Múltipla escolha compara como conjunto:
    // reordenar não é alteração.
    const patch = Object.fromEntries(
      Object.entries(propostos).filter(
        ([chave, proposto]) => !mesmoValor(atuais[chave], proposto),
      ),
    );
    if (gruposNovos.length) patch[CHAVE_GRUPOS_PROPOSTOS] = gruposNovos;

    if (Object.keys(patch).length === 0) {
      // Voltar ao valor atual num campo já alterado é desfazer a alteração.
      if (anterior) {
        desfazerAlteracao(id);
        fechar();
        return;
      }
      setErro("Nada mudou em relação ao valor atual.");
      return;
    }

    // Só valida: o envio é em lote, no fim (ver ModoDeEdicao.tsx).
    setEnviando(true);
    const resultado = await validarEdicao({
      slug,
      patch,
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
    aplicarAlteracao(id, {
      rotulo,
      propostos: patch,
      rascunho,
      gruposNovos,
      fonte: fonte.trim(),
      local,
      justificativa: justificativa.trim(),
      resumo: resumir(definicoes, propostos, gruposNovos),
    });
    fechar();
  }

  const ajuda = definicoes
    .map((def) => def.ajuda)
    .filter(Boolean)
    .join(" ");

  return (
    <form
      ref={raiz}
      onSubmit={enviar}
      aria-label={`Sugerir alteração em ${rotulo}`}
      className="min-w-0 flex-1 space-y-3 pt-1 sm:pt-0"
    >
      {comRotulo && <span className={ROTULO}>{rotulo}</span>}
      <Controle
        definicoes={definicoes}
        rascunho={rascunho}
        definir={definir}
        gruposNovos={gruposNovos}
        setGruposNovos={setGruposNovos}
        setErro={setErro}
      />

      {ajuda && (
        <p className="max-w-[60ch] text-xs leading-[1.6] text-muted-foreground">
          {ajuda}
        </p>
      )}

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
          onClick={fechar}
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
  );
}

/** O controle de edição, conforme o tipo do campo. */
function Controle({
  definicoes,
  rascunho,
  definir,
  gruposNovos,
  setGruposNovos,
  setErro,
}: {
  definicoes: DefinicaoDeCampo[];
  rascunho: Rascunho;
  definir: (chave: string, valor: string | string[]) => void;
  gruposNovos: string[];
  setGruposNovos: (novos: string[]) => void;
  setErro: (erro: string | null) => void;
}) {
  const def = definicoes[0]!;

  if (definicoes.length === 2) {
    const [min, max] = definicoes as [DefinicaoDeCampo, DefinicaoDeCampo];
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <EntradaNumerica
          def={min}
          valor={rascunho[min.chave] as string}
          definir={definir}
          placeholder="mín."
        />
        <span className="text-muted-foreground">a</span>
        <EntradaNumerica
          def={max}
          valor={rascunho[max.chave] as string}
          definir={definir}
          placeholder="máx."
        />
        {def.unidade && (
          <span className="text-muted-foreground">{def.unidade}</span>
        )}
      </div>
    );
  }

  switch (def.tipo) {
    case "enum":
      return (
        <select
          value={rascunho[def.chave] as string}
          onChange={(evento) => definir(def.chave, evento.target.value)}
          aria-label={def.rotulo}
          className={cn(CAMPO, "sm:w-auto sm:min-w-56")}
        >
          <option value="">Não informado</option>
          {def.opcoes!.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      );

    case "multi_enum":
      return (
        <MultiplaEscolha
          def={def}
          selecionados={rascunho[def.chave] as string[]}
          definir={(valores) => definir(def.chave, valores)}
          gruposNovos={def.chave === "grupos" ? gruposNovos : undefined}
          setGruposNovos={setGruposNovos}
          setErro={setErro}
        />
      );

    case "numero":
      return (
        <div className="flex items-center gap-2 text-sm">
          <EntradaNumerica
            def={def}
            valor={rascunho[def.chave] as string}
            definir={definir}
          />
          {def.unidade && (
            <span className="text-muted-foreground">{def.unidade}</span>
          )}
        </div>
      );

    default:
      return (
        <input
          value={rascunho[def.chave] as string}
          onChange={(evento) => definir(def.chave, evento.target.value)}
          aria-label={def.rotulo}
          maxLength={200}
          placeholder={PLACEHOLDER[def.chave]}
          className={cn(
            CAMPO,
            def.chave in PLACEHOLDER_DE_LINK ? "sm:max-w-md" : "sm:max-w-xs",
          )}
        />
      );
  }
}

/** Só dígitos e uma vírgula, com no máximo uma casa decimal ("." vira ","). */
function umaCasaDecimal(texto: string): string {
  const limpo = texto.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [inteiro = "", ...resto] = limpo.split(",");
  if (resto.length === 0) return inteiro;
  return `${inteiro},${resto.join("").slice(0, 1)}`;
}

/**
 * Texto com teclado numérico, e não `type="number"`: este aceita ou recusa a
 * vírgula decimal conforme o idioma do navegador, e "2,5" é o que se digita.
 */
function EntradaNumerica({
  def,
  valor,
  definir,
  placeholder,
}: {
  def: DefinicaoDeCampo;
  valor: string;
  definir: (chave: string, valor: string) => void;
  placeholder?: string;
}) {
  const emMetros = def.unidade === "m";
  return (
    <input
      value={valor}
      onChange={(evento) =>
        definir(
          def.chave,
          emMetros ? umaCasaDecimal(evento.target.value) : evento.target.value,
        )
      }
      inputMode="decimal"
      aria-label={def.rotulo}
      placeholder={placeholder}
      className={cn(CAMPO, "w-24")}
    />
  );
}

/**
 * Pastilhas que ligam e desligam. Em Grupos, dá também para sugerir um grupo
 * que não está na lista — ele vai à parte na proposta, porque criá-lo pede
 * código (ver CHAVE_GRUPOS_PROPOSTOS).
 */
function MultiplaEscolha({
  def,
  selecionados,
  definir,
  gruposNovos,
  setGruposNovos,
  setErro,
}: {
  def: DefinicaoDeCampo;
  selecionados: string[];
  definir: (valores: string[]) => void;
  gruposNovos?: string[];
  setGruposNovos: (novos: string[]) => void;
  setErro: (erro: string | null) => void;
}) {
  const [nome, setNome] = useState("");

  const alternar = (valor: string) =>
    definir(
      selecionados.includes(valor)
        ? selecionados.filter((item) => item !== valor)
        : [...selecionados, valor],
    );

  function sugerirGrupo() {
    if (!gruposNovos) return;
    const limpo = nome.trim().replace(/\s+/g, " ");
    if (limpo.length < 2) return;

    // Se já existe com esse nome, marca o existente em vez de duplicar.
    const existente = def.opcoes!.find(
      (opcao) => normalizar(opcao.rotulo) === normalizar(limpo),
    );
    if (existente) {
      if (!selecionados.includes(existente.valor)) alternar(existente.valor);
    } else if (
      !gruposNovos.some((novo) => normalizar(novo) === normalizar(limpo))
    ) {
      if (gruposNovos.length >= 5) {
        setErro("Sugira no máximo 5 grupos novos de uma vez.");
        return;
      }
      setGruposNovos([...gruposNovos, limpo.slice(0, 40)]);
    }
    setErro(null);
    setNome("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {def.opcoes!.map((opcao) => {
          const marcado = selecionados.includes(opcao.valor);
          return (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={marcado}
              onClick={() => alternar(opcao.valor)}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors duration-240 ${
                marcado
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {opcao.rotulo}
            </button>
          );
        })}
        {gruposNovos?.map((novo) => (
          <span
            key={novo}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/60 py-0.5 pl-2.5 pr-1 text-xs text-primary"
          >
            {novo}
            <span className="font-mono text-[0.6rem] uppercase tracking-wider text-primary/70">
              novo
            </span>
            <button
              type="button"
              aria-label={`Remover ${novo}`}
              onClick={() =>
                setGruposNovos(gruposNovos.filter((item) => item !== novo))
              }
              className="rounded-full p-0.5 hover:bg-primary/10"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      {gruposNovos && (
        <div className="flex items-center gap-2">
          <input
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                evento.preventDefault();
                sugerirGrupo();
              }
            }}
            maxLength={40}
            aria-label="Nome do grupo novo"
            placeholder="Grupo que não está na lista"
            className={cn(CAMPO, "sm:max-w-xs")}
          />
          <button
            type="button"
            onClick={sugerirGrupo}
            disabled={nome.trim().length < 2}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground disabled:opacity-50"
          >
            <Plus size={14} />
            Sugerir grupo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Conversões ───────────────────────────────────────────────────────────────

const INVALIDO = Symbol("invalido");

function paraRascunho(
  def: DefinicaoDeCampo,
  valor: unknown,
): string | string[] {
  if (def.tipo === "multi_enum") return Array.isArray(valor) ? [...valor] : [];
  if (valor === null || valor === undefined) return "";
  if (def.tipo === "numero") {
    return (valor as number).toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
      useGrouping: false,
    });
  }
  return String(valor);
}

function doRascunho(
  def: DefinicaoDeCampo,
  valor: string | string[],
): unknown | typeof INVALIDO {
  if (def.tipo === "multi_enum") {
    // Na ordem da lista, que é a do vocabulário, e não na ordem do clique.
    const marcados = valor as string[];
    return def
      .opcoes!.map((opcao) => opcao.valor)
      .filter((opcao) => marcados.includes(opcao));
  }

  const texto = (valor as string).trim();
  if (texto === "") return null;

  if (def.tipo === "numero") {
    if (!/^\d+([.,]\d+)?$/.test(texto)) return INVALIDO;
    const numero = Number(texto.replace(",", "."));
    return numero > 0 ? numero : INVALIDO;
  }
  return texto;
}

function mesmoValor(atual: unknown, proposto: unknown): boolean {
  if (Array.isArray(proposto)) {
    const antes = Array.isArray(atual) ? atual : [];
    return (
      antes.length === proposto.length &&
      proposto.every((item) => antes.includes(item))
    );
  }
  if (atual == null && proposto == null) return true;
  return atual === proposto;
}

function resumir(
  definicoes: DefinicaoDeCampo[],
  propostos: Record<string, unknown>,
  gruposNovos: string[],
): string {
  const formatar = (def: DefinicaoDeCampo) => {
    const valor = propostos[def.chave];
    if (valor === null || (Array.isArray(valor) && valor.length === 0)) {
      return null;
    }
    const traduzir = (item: unknown) =>
      def.opcoes?.find((opcao) => opcao.valor === item)?.rotulo ??
      String(item).replace(".", ",");
    return Array.isArray(valor)
      ? valor.map(traduzir).join(", ")
      : traduzir(valor);
  };

  const unidade = definicoes[0]!.unidade ? ` ${definicoes[0]!.unidade}` : "";
  let texto: string;
  if (definicoes.length === 2) {
    const [min, max] = definicoes.map(formatar);
    texto =
      min && max
        ? `${min} a ${max}${unidade}`
        : min
          ? `${min}${unidade}`
          : max
            ? `até ${max}${unidade}`
            : "não informado";
  } else {
    const valor = formatar(definicoes[0]!);
    texto = valor ? `${valor}${unidade}` : "não informado";
  }

  if (gruposNovos.length) {
    texto += ` (e grupo novo: ${gruposNovos.join(", ")})`;
  }
  return texto;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const PLACEHOLDER_DE_LINK: Record<string, string> = {
  gbifId: "https://www.gbif.org/species/…",
  inaturalistId: "https://www.inaturalist.org/taxa/…",
};

const PLACEHOLDER: Record<string, string> = {
  familia: "Ex.: Lauraceae",
  ...PLACEHOLDER_DE_LINK,
};

const ROTULO =
  "mb-1 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground";

const CAMPO =
  "w-full rounded-md border border-border bg-input px-3 py-1.5 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
