import Link from "next/link";
import type { Species } from "@/db/schema/species.ts";
import { ESTRATO_LABEL, type Estrato } from "@/core/estratos.ts";
import {
  SUCESSAO_LABEL,
  SISTEMA_LABEL,
  type Sucessao,
  type Sistema,
} from "@/core/sucessao.ts";
import { GRUPO_LABEL, type Grupo } from "@/core/grupos.ts";

/**
 * Card do catálogo.
 *
 * Campo sem valor aparece como "não informado", nunca em branco nem preenchido
 * por estimativa — é a regra de ouro dos dados tornada visível.
 */
export function CardEspecie({ especie }: { especie: Species }) {
  return (
    <Link
      href={`/catalogo/${especie.slug}`}
      className="group flex h-full flex-col rounded-xl border border-bg-border bg-bg-surface1 p-5 transition-all duration-320 hover:border-primary/50"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold leading-snug text-foreground transition-colors duration-240 group-hover:text-primary">
            {especie.nomeComum}
          </h2>
          <p className="truncate font-mono text-xs italic text-secondary">
            {especie.nomeCientifico}
          </p>
        </div>
        {especie.estrato && <PastilhaEstrato estrato={especie.estrato} />}
      </div>

      <dl className="mb-4 space-y-1 text-xs">
        <Linha rotulo="Sucessão" valor={rotuloSucessao(especie.sucessao)} />
        <Linha rotulo="Sistema" valor={rotuloSistema(especie.sistema)} />
        <Linha rotulo="Família" valor={especie.familia} />
      </dl>

      <div className="mt-auto flex flex-wrap gap-1.5">
        {especie.grupos.map((grupo) => (
          <span
            key={grupo}
            className="rounded-md border border-secondary/30 bg-secondary/5 px-2 py-0.5 font-mono text-[0.65rem] text-secondary"
          >
            {GRUPO_LABEL[grupo as Grupo] ?? grupo}
          </span>
        ))}
      </div>
    </Link>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 font-mono uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </dt>
      <dd
        className={
          valor ? "text-foreground/90" : "italic text-muted-foreground/60"
        }
      >
        {valor ?? "não informado"}
      </dd>
    </div>
  );
}

/**
 * A pastilha do estrato usa opacidade crescente de verde conforme se desce no
 * perfil vertical — o emergente é o mais claro, o rasteiro o mais denso.
 * É a mesma lógica da luz que cada andar deixa passar.
 */
const CLASSE_POR_ESTRATO: Record<Estrato, string> = {
  emergente: "border-primary/20 bg-primary/5 text-primary/70",
  alto: "border-primary/30 bg-primary/10 text-primary/85",
  medio: "border-primary/40 bg-primary/15 text-primary",
  baixo: "border-primary/55 bg-primary/20 text-primary",
  rasteiro: "border-primary/70 bg-primary/25 text-primary",
};

export function PastilhaEstrato({ estrato }: { estrato: Estrato }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider ${CLASSE_POR_ESTRATO[estrato]}`}
    >
      {ESTRATO_LABEL[estrato]}
    </span>
  );
}

export function rotuloSucessao(valor: string | null): string | null {
  return valor ? (SUCESSAO_LABEL[valor as Sucessao] ?? valor) : null;
}

export function rotuloSistema(valor: string | null): string | null {
  return valor ? (SISTEMA_LABEL[valor as Sistema] ?? valor) : null;
}
