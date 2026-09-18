"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Info } from "lucide-react";
import {
  CAMPOS,
  ROTULO_DO_GRUPO,
  type DefinicaoDeCampo,
} from "@/lib/especie-schema.ts";
import { proporEdicao, proporNovaEspecie } from "@/app/actions/wiki.ts";

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
}: {
  modo: "edicao" | "nova";
  slug?: string;
  iniciais?: Valores;
  /** Além da navegação padrão, para quem embute o formulário num modal. */
  aoConcluir?: () => void;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Valores>(iniciais);
  const [fonte, setFonte] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const definir = (chave: string, valor: unknown) =>
    setValores((anterior) => ({ ...anterior, [chave]: valor }));

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const resultado =
      modo === "edicao"
        ? await proporEdicao({ slug, patch: valores, fonte, justificativa })
        : await proporNovaEspecie({ campos: valores, fonte, justificativa });

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
        <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
          Fonte <span className="text-destructive">*</span>
        </h2>
        <p className="mb-4 flex gap-2 text-sm leading-[1.7] text-muted-foreground">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            De onde vem este dado? Observaçao de campo (por gentileza, diga sua
            região e condições de plantio), livro e página, artigo, publicação
            de instituição, ou observação de campo, etc. Sem fonte a sugestão
            não pode ser avaliada — se o dado não existe na literatura, o campo
            deve ficar vazio, não estimado.
          </span>
        </p>
        <textarea
          value={fonte}
          onChange={(evento) => setFonte(evento.target.value)}
          required
          minLength={10}
          rows={3}
          placeholder="Ex.: Lorenzi, Árvores Brasileiras vol. 1, p. 142"
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />

        <label className="mt-4 block">
          <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Observação para quem for avaliar (opcional)
          </span>
          <textarea
            value={justificativa}
            onChange={(evento) => setJustificativa(evento.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-8 py-2.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_0_rgba(63,175,92,0.3)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
        Enviar sugestão
      </button>
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
    "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        {campo.rotulo}
        {campo.unidade && ` (${campo.unidade})`}
        {obrigatorio && <span className="ml-1 text-destructive">*</span>}
      </label>

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
          step="any"
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
