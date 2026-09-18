import { ArrowRight } from "lucide-react";
import {
  CAMPOS_POR_CHAVE,
  CHAVE_FONTES_AUTOMATICAS,
  CHAVE_GRUPOS_PROPOSTOS,
  chaveDeFonte,
  rotuloDaChave,
} from "@/lib/especie-schema.ts";
import { FONTE_LABEL_CURTO } from "@/core/grupos.ts";

/**
 * Diff campo a campo de uma proposta.
 *
 * Mostra valor atual → valor proposto, com os identificadores traduzidos para
 * os rótulos do domínio: quem modera precisa ler "Secundária Tardia", não
 * "secundaria_tardia".
 */
export function Diff({
  patch,
  atual,
}: {
  patch: Record<string, unknown>;
  atual?: Record<string, unknown> | null;
}) {
  // A proveniência automática não é campo: vira uma nota em cada campo que o
  // servidor completou, para quem modera saber o que não veio da pessoa.
  const chaves = Object.keys(patch).filter(
    (chave) => chave !== CHAVE_FONTES_AUTOMATICAS,
  );
  const automaticas = (patch[CHAVE_FONTES_AUTOMATICAS] ?? {}) as Record<
    string,
    string
  >;

  if (chaves.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Nenhuma alteração registrada.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/40">
      {chaves.map((chave) => {
        const definicao = CAMPOS_POR_CHAVE.get(chave);
        const antes = atual ? formatar(chave, atual[chave]) : null;
        const depois = formatar(chave, patch[chave]);
        const fonteAutomatica = automaticas[chaveDeFonte(chave)];

        return (
          <li key={chave} className="py-3">
            <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {rotuloDaChave(chave)}
              {definicao?.unidade && ` (${definicao.unidade})`}
            </span>
            {chave === CHAVE_GRUPOS_PROPOSTOS && (
              <p className="mb-1.5 text-xs leading-[1.6] text-muted-foreground">
                Não existem na lista de grupos. Aprovar não os cria: isso pede
                inclusão no código.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {atual && chave !== CHAVE_GRUPOS_PROPOSTOS && (
                <>
                  <Valor texto={antes} tom="antes" />
                  <ArrowRight
                    size={14}
                    className="shrink-0 text-muted-foreground"
                    aria-label="passa a ser"
                  />
                </>
              )}
              <Valor texto={depois} tom="depois" />
            </div>
            {fonteAutomatica && (
              <p className="mt-1.5 text-xs leading-[1.6] text-muted-foreground">
                Completado automaticamente:{" "}
                {FONTE_LABEL_CURTO[fonteAutomatica] ?? fonteAutomatica}.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Valor({
  texto,
  tom,
}: {
  texto: string | null;
  tom: "antes" | "depois";
}) {
  if (texto === null) {
    return (
      <span className="rounded-md border border-border px-2 py-0.5 text-xs italic text-muted-foreground/60">
        não informado
      </span>
    );
  }
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-xs ${
        tom === "antes"
          ? "border-border bg-muted/40 text-muted-foreground line-through decoration-1"
          : "border-primary/40 bg-primary/5 text-primary"
      }`}
    >
      {texto}
    </span>
  );
}

function formatar(chave: string, valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;

  // Campos de vocabulário trazem os rótulos na própria definição.
  const opcoes = CAMPOS_POR_CHAVE.get(chave)?.opcoes;
  const traduzir = (item: string) =>
    opcoes?.find((opcao) => opcao.valor === item)?.rotulo ?? item;

  if (Array.isArray(valor)) {
    if (valor.length === 0) return null;
    return valor.map((item) => traduzir(String(item))).join(", ");
  }

  return traduzir(String(valor));
}
