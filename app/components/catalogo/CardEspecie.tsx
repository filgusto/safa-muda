import Link from "next/link";
import type { EspecieComFoto } from "@/lib/catalogo.ts";
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
export function CardEspecie({ especie }: { especie: EspecieComFoto }) {
  return (
    <Link
      href={`/catalogo/${especie.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-bg-border bg-bg-surface1 p-5 transition-all duration-320 hover:border-primary/50"
    >
      {especie.foto && <FotoDeFundo foto={especie.foto} />}

      <div className="relative mb-3 min-w-0">
        <h2 className="truncate font-semibold leading-snug text-foreground transition-colors duration-240 group-hover:text-primary">
          {especie.nomeComum}
        </h2>
        <p className="truncate font-mono text-xs text-secondary">
          <span className="italic">{especie.nomeCientifico}</span>
          {especie.familia && <span> — {especie.familia}</span>}
        </p>
      </div>

      <dl className="relative mb-4 space-y-1 text-xs">
        <Linha rotulo="Estrato" valor={rotuloEstrato(especie.estrato)} />
        <Linha rotulo="Sucessão" valor={rotuloSucessao(especie.sucessao)} />
        <Linha rotulo="Sistema" valor={rotuloSistema(especie.sistema)} />
      </dl>

      <div className="relative mt-auto flex flex-wrap gap-1.5">
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

/**
 * A foto ocupa a metade direita do card e se dissolve para a esquerda: o
 * degradê termina opaco na cor da superfície, onde ficam nome e campos, para
 * que o texto continue legível sobre qualquer imagem.
 */
function FotoDeFundo({ foto }: { foto: NonNullable<EspecieComFoto["foto"]> }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-3/5 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/media/${foto.key}`}
        alt={foto.alt ?? ""}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-bg-surface1 from-15% via-bg-surface1/70 to-transparent" />
    </div>
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

export function rotuloEstrato(valor: string | null): string | null {
  return valor ? (ESTRATO_LABEL[valor as Estrato] ?? valor) : null;
}

export function rotuloSucessao(valor: string | null): string | null {
  return valor ? (SUCESSAO_LABEL[valor as Sucessao] ?? valor) : null;
}

export function rotuloSistema(valor: string | null): string | null {
  return valor ? (SISTEMA_LABEL[valor as Sistema] ?? valor) : null;
}
