import { ArrowRight } from "lucide-react";
import { CAMPOS_POR_CHAVE } from "@/lib/especie-schema.ts";
import { ESTRATO_LABEL, type Estrato } from "@/core/estratos.ts";
import {
  SUCESSAO_LABEL,
  SISTEMA_LABEL,
  type Sucessao,
  type Sistema,
} from "@/core/sucessao.ts";
import { GRUPO_LABEL, type Grupo } from "@/core/grupos.ts";
import { BIOMA_LABEL, type Bioma } from "@/core/biomas.ts";

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
  const chaves = Object.keys(patch);

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

        return (
          <li key={chave} className="py-3">
            <span className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {definicao?.rotulo ?? chave}
              {definicao?.unidade && ` (${definicao.unidade})`}
            </span>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {atual && (
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

const TRADUTORES: Record<string, (valor: string) => string> = {
  estrato: (v) => ESTRATO_LABEL[v as Estrato] ?? v,
  sucessao: (v) => SUCESSAO_LABEL[v as Sucessao] ?? v,
  sistema: (v) => SISTEMA_LABEL[v as Sistema] ?? v,
  grupos: (v) => GRUPO_LABEL[v as Grupo] ?? v,
  biomas: (v) => BIOMA_LABEL[v as Bioma] ?? v,
};

function formatar(chave: string, valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;

  const traduzir = TRADUTORES[chave] ?? ((item: string) => item);

  if (Array.isArray(valor)) {
    if (valor.length === 0) return null;
    return valor.map((item) => traduzir(String(item))).join(", ");
  }

  return traduzir(String(valor));
}
