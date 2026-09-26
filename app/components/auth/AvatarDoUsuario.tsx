import { cn } from "@/lib/utils.ts";

/**
 * Foto de perfil em círculo; sem foto, a inicial do nome. Ocupa o tamanho que
 * a classe recebida der (`size-*`), com o texto proporcional via `text-*`.
 */
export function AvatarDoUsuario({
  nome,
  imagem,
  className,
}: {
  nome: string;
  imagem?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-semibold text-primary",
        className,
      )}
    >
      {imagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagem} alt="" className="size-full object-cover" />
      ) : (
        nome.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}
