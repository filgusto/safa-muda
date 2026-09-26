"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  CAMPOS,
  ROTULO_DO_GRUPO,
  calcularPatch,
  type DefinicaoDeCampo,
} from "@/lib/especie-schema.ts";
import { proporEdicao, proporNovaEspecie } from "@/app/actions/wiki.ts";
import { GUIA_DOS_CAMPOS } from "@/lib/guia-dos-campos.ts";
import { SeletorDeFonte } from "@/components/wiki/SeletorDeFonte.tsx";
import {
  LocalDaObservacao,
  useLocalDaObservacao,
} from "@/components/wiki/LocalDaObservacao.tsx";

type Valores = Record<string, unknown>;

/**
 * Formulário único para propor edição e para propor espécie nova.
 *
 * Os campos vêm de CAMPOS (lib/especie-schema.ts), a mesma lista que a
 * validação e o diff da moderação usam — acrescentar um campo lá o faz
 * aparecer aqui automaticamente.
 */
export function FormularioEspecie({
  modo,
  slug,
  iniciais = {},
  aoConcluir,
  aoMudarPreenchimento,
}: {
  modo: "edicao" | "nova";
  slug?: string;
  iniciais?: Valores;
  /** Além da navegação padrão, para quem embute o formulário num modal. */
  aoConcluir?: () => void;
  /**
   * Avisa quando o formulário passa a ter (ou deixa de ter) algo a perder.
   * Quem embute num modal usa isto para perguntar antes de fechar — ver
   * BotaoAdicionarEspecie.tsx.
   */
  aoMudarPreenchimento?: (preenchido: boolean) => void;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Valores>(iniciais);
  const [fonte, setFonte] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const { local, definirLocal } = useLocalDaObservacao(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const definir = (chave: string, valor: unknown) =>
    setValores((anterior) => ({ ...anterior, [chave]: valor }));

  // Mesmo critério do patch enviado ao servidor: digitar e apagar de volta ao
  // valor de partida não é alteração pendente.
  // Enviado já não é rascunho: durante a mensagem de sucesso, fechar a janela
  // não tem nada a perder.
  const preenchido =
    sucesso === null &&
    (Object.keys(calcularPatch(iniciais, valores)).length > 0 ||
      fonte.trim() !== "" ||
      justificativa.trim() !== "");

  useEffect(() => {
    aoMudarPreenchimento?.(preenchido);
  }, [preenchido, aoMudarPreenchimento]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const resultado =
      modo === "edicao"
        ? await proporEdicao({
            slug,
            patch: valores,
            fonte,
            localDaObservacao: local || undefined,
            justificativa,
          })
        : await proporNovaEspecie({
            campos: valores,
            fonte,
            localDaObservacao: local || undefined,
            justificativa,
          });

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível enviar.");
      return;
    }

    setSucesso(resultado.mensagem ?? "Sugestão enviada.");
    setTimeout(() => {
      if (aoConcluir) aoConcluir();
      else router.push(slug ? `/safdex/${slug}` : "/safdex");
    }, 1600);
  }

  function descartar() {
    if (preenchido && !window.confirm("Descartar o que você preencheu?")) {
      return;
    }
    if (aoConcluir) aoConcluir();
    else router.push(slug ? `/safdex/${slug}` : "/safdex");
  }

  if (sucesso) {
    return (
      <p
        role="status"
        className="rounded-lg border-l-4 border-emerald-500/30 bg-emerald-500/5 p-4 text-sm leading-[1.7] text-emerald-900 dark:text-emerald-200"
      >
        {sucesso}
      </p>
    );
  }

  const grupos = [...new Set(CAMPOS.map((campo) => campo.grupo))];

  return (
    <form onSubmit={enviar} className="space-y-10">
      {grupos.map((grupo) => (
        <section key={grupo}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">
            {ROTULO_DO_GRUPO[grupo]}
          </h2>
          <div className="space-y-5">
            {CAMPOS.filter((campo) => campo.grupo === grupo).map((campo) => (
              <Campo
                key={campo.chave}
                campo={campo}
                valor={valores[campo.chave]}
                onChange={(valor) => definir(campo.chave, valor)}
                obrigatorio={modo === "nova" && campo.obrigatorioEmNova}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-primary/25 bg-primary/5 p-5">
        <SeletorDeFonte valor={fonte} aoMudar={setFonte} />

        <LocalDaObservacao
          valor={local}
          aoMudar={definirLocal}
          className="mt-4"
        />

        <label className="mt-4 block">
          <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Observação para quem for avaliar (opcional)
          </span>
          <textarea
            value={justificativa}
            onChange={(evento) => setJustificativa(evento.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
      </section>

      {erro && (
        <p
          role="alert"
          className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-8 py-2.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_0_rgba(63,175,92,0.3)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
          Enviar sugestão
        </button>
        <button
          type="button"
          onClick={descartar}
          disabled={enviando}
          className="inline-flex items-center justify-center rounded-md border border-red-600/80 bg-transparent px-8 py-2.5 text-sm font-medium text-red-600/80 transition-all duration-240 hover:bg-red-500/10 hover:text-red-600 active:scale-[0.98] dark:border-red-300/80 dark:text-red-300/80 dark:hover:text-red-300 disabled:pointer-events-none disabled:opacity-50"
        >
          Descartar sugestão
        </button>
      </div>
    </form>
  );
}

function Campo({
  campo,
  valor,
  onChange,
  obrigatorio,
}: {
  campo: DefinicaoDeCampo;
  valor: unknown;
  onChange: (valor: unknown) => void;
  obrigatorio?: boolean;
}) {
  const id = `campo-${campo.chave}`;
  const classe =
    "w-full rounded-md border border-border bg-input px-3 py-2 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label
          htmlFor={id}
          className="block font-mono text-xs uppercase tracking-wider text-muted-foreground"
        >
          {campo.rotulo}
          {campo.unidade && ` (${campo.unidade})`}
          {obrigatorio && <span className="ml-1 text-destructive">*</span>}
        </label>
        <AjudaDoCampo campo={campo} />
      </div>

      {campo.tipo === "texto" && (
        <input
          id={id}
          type="text"
          required={obrigatorio}
          value={(valor as string) ?? ""}
          onChange={(evento) => onChange(evento.target.value || null)}
          className={classe}
        />
      )}

      {campo.tipo === "numero" && (
        <input
          id={id}
          type="number"
          step={campo.unidade === "m" ? "0.1" : "any"}
          min="0"
          value={valor === null || valor === undefined ? "" : String(valor)}
          onChange={(evento) =>
            onChange(
              evento.target.value === "" ? null : Number(evento.target.value),
            )
          }
          className={classe}
        />
      )}

      {campo.tipo === "enum" && (
        <select
          id={id}
          value={(valor as string) ?? ""}
          onChange={(evento) => onChange(evento.target.value || null)}
          className={classe}
        >
          <option value="">não informado</option>
          {campo.opcoes!.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      )}

      {campo.tipo === "multi_enum" && (
        <div className="flex flex-wrap gap-1.5">
          {campo.opcoes!.map((opcao) => {
            const selecionados = (valor as string[]) ?? [];
            const ativo = selecionados.includes(opcao.valor);
            return (
              <button
                key={opcao.valor}
                type="button"
                aria-pressed={ativo}
                onClick={() =>
                  onChange(
                    ativo
                      ? selecionados.filter((item) => item !== opcao.valor)
                      : [...selecionados, opcao.valor],
                  )
                }
                className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors duration-240 ${
                  ativo
                    ? "border-secondary/50 bg-secondary/10 text-secondary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {opcao.rotulo}
              </button>
            );
          })}
        </div>
      )}

      {campo.tipo === "lista_texto" && (
        <textarea
          id={id}
          rows={3}
          value={((valor as string[]) ?? []).join("\n")}
          onChange={(evento) =>
            onChange(
              evento.target.value
                .split("\n")
                .map((linha) => linha.trim())
                .filter(Boolean),
            )
          }
          className={classe}
        />
      )}

      {campo.ajuda && (
        <p className="mt-1 text-xs text-muted-foreground">{campo.ajuda}</p>
      )}
    </div>
  );
}

/** Botão "?" que explica o campo e como preenchê-lo. */
function AjudaDoCampo({ campo }: { campo: DefinicaoDeCampo }) {
  const guia = GUIA_DOS_CAMPOS[campo.chave];
  if (!guia) return null;

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={`Ajuda: ${campo.rotulo}`}
        className="rounded-full text-muted-foreground transition-colors duration-240 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <HelpCircle size={15} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 space-y-2 text-sm leading-[1.6]"
      >
        <p className="font-medium">{campo.rotulo}</p>
        <p className="text-muted-foreground">{guia.oQue}</p>
        <p>
          <span className="font-medium">Como preencher: </span>
          <span className="text-muted-foreground">{guia.como}</span>
        </p>
        {guia.dicas && (
          <>
            <p className="font-medium">Como descobrir</p>
            <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
              {guia.dicas.map((dica) => (
                <li key={dica}>{dica}</li>
              ))}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
