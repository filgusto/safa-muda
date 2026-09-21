import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";

/**
 * Bloco titulado da ficha da espécie, com a bolinha de ajuda opcional ao lado
 * do título.
 *
 * Mora fora de DetalheEspecie.tsx porque o histórico, que é um cliente à
 * parte (HistoricoDaEspecie.tsx), também precisa dela — importar de lá faria
 * um ciclo.
 */
export function Secao({
  titulo,
  info,
  acao,
  children,
}: {
  titulo: string;
  info?: React.ReactNode;
  /** Controle ao lado do título, como o "+" de fotos no modo de edição. */
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 last:mb-0">
      <h2 className="mb-4 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-primary">
        {titulo}
        {info && (
          <Popover>
            <PopoverTrigger
              className="flex size-4 items-center justify-center rounded-full text-muted-foreground/70 normal-case tracking-normal hover:text-foreground"
              aria-label={`Sobre ${titulo}`}
            >
              <HelpCircle size={14} />
            </PopoverTrigger>
            <PopoverContent className="w-72 text-sm normal-case leading-[1.7] tracking-normal text-muted-foreground">
              {info}
            </PopoverContent>
          </Popover>
        )}
        {acao}
      </h2>
      {children}
    </section>
  );
}
