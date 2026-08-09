import { cn } from "@/lib/utils.ts";

/**
 * Superfície padrão da webapp: mesma linguagem do `SiteNav` — fundo
 * semitransparente com blur, hairline de borda e cantos arredondados.
 *
 * O `titulo` usa o "eyebrow" da casa (mono, caixa alta, tracking largo),
 * ancorado no canto superior-esquerdo.
 */
export function Painel({
  titulo,
  className,
  children,
}: {
  titulo?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/40 bg-background/60 p-3 shadow-lg backdrop-blur",
        className,
      )}
    >
      {titulo && (
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {titulo}
        </h2>
      )}
      {children}
    </section>
  );
}
