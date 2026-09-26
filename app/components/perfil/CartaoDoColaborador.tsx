import Link from "next/link";
import { GraduationCap, Globe, Instagram } from "lucide-react";
import type { CartaoPublico } from "@/lib/cartao-publico.ts";

const ICONE_DO_LINK = {
  instagram: Instagram,
  site: Globe,
  lattes: GraduationCap,
} as const;

const MASCARA_DA_FOTO =
  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 12%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.65) 55%, black 85%)";

export function CartaoDoColaborador({
  cartao,
  href,
}: {
  cartao: CartaoPublico;
  /** Com destino, o card inteiro leva a ele; os links de dentro seguem próprios. */
  href?: string;
}) {
  const { nome, papel, foto, regiao, perfilDeUso, experiencia, bio, links } =
    cartao;

  return (
    <article className="relative flex min-h-[10rem] flex-col overflow-hidden p-4">
      {href && (
        <Link
          href={href}
          aria-label={`Ver o perfil de ${nome}`}
          className="absolute inset-0 z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 select-none"
        style={{ maskImage: MASCARA_DA_FOTO, WebkitMaskImage: MASCARA_DA_FOTO }}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/5 font-serif text-7xl font-semibold text-primary/20">
            {nome.trim().charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="relative mb-3 min-w-0">
        <p className="truncate font-semibold leading-snug text-foreground">
          {nome}
        </p>
        <p className="truncate font-mono text-xs text-secondary">
          <span className="italic">Homo sapiens</span>
          <span> — Hominidae</span>
        </p>
      </div>

      {(regiao || experiencia) && (
        <dl className="relative mb-3 space-y-1 text-xs">
          {regiao && <Linha rotulo="Região" valor={regiao} />}
          {experiencia && <Linha rotulo="Experiência" valor={experiencia} />}
        </dl>
      )}

      {bio && (
        <p className="relative mb-3 text-xs leading-[1.6] text-muted-foreground">
          {bio}
        </p>
      )}

      {links.length > 0 && (
        <div className="relative mb-3 flex items-center gap-1.5">
          {links.map(({ tipo, rotulo, url }) => {
            const Icone = ICONE_DO_LINK[tipo];
            return (
              <a
                key={tipo}
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={rotulo}
                title={rotulo}
                className="relative z-10 flex size-6 items-center justify-center rounded-md border border-border/60 bg-bg-surface1/70 text-muted-foreground backdrop-blur-sm transition-colors duration-240 hover:border-primary/50 hover:text-primary"
              >
                <Icone size={13} />
              </a>
            );
          })}
        </div>
      )}

      <div className="relative mt-auto flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-secondary/30 bg-secondary/5 px-2 py-0.5 font-mono text-[0.65rem] text-secondary">
          {papel}
        </span>
        {perfilDeUso && (
          <span className="rounded-md border border-secondary/30 bg-secondary/5 px-2 py-0.5 font-mono text-[0.65rem] text-secondary">
            {perfilDeUso}
          </span>
        )}
      </div>
    </article>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 font-mono uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </dt>
      <dd className="min-w-0 text-foreground/90">{valor}</dd>
    </div>
  );
}
