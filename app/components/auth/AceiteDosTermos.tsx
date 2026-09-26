import { cn } from "@/lib/utils.ts";

/**
 * Caixa de aceite dos Termos e da Política no cadastro. O consentimento é
 * registrado no servidor (lib/auth.ts): sem a versão vigente, a conta não é
 * criada.
 */
export function AceiteDosTermos({
  id,
  erro,
  compacto,
}: {
  id: string;
  erro?: string;
  compacto?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-2 leading-snug text-muted-foreground",
          compacto ? "text-xs" : "text-sm",
        )}
      >
        <input
          id={id}
          name="termos"
          type="checkbox"
          required
          aria-invalid={erro ? true : undefined}
          className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
        />
        <span>
          Li e aceito os{" "}
          <a
            href="/termos"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a
            href="/privacidade"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Política de Privacidade
          </a>
          .
        </span>
      </label>
      {erro && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}
