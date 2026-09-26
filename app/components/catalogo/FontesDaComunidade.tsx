"use client";

import { useEffect, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { listarFontesDaComunidade } from "@/app/actions/wiki.ts";
import type { CartaoPublico } from "@/lib/cartao-publico.ts";
import { CartaoDoColaborador } from "@/components/perfil/CartaoDoColaborador.tsx";
import type { FonteDaComunidade } from "@/lib/fontes-da-comunidade.ts";

/**
 * As fontes das sugestões aprovadas que ainda sustentam a ficha, cada uma com
 * quem a contribuiu, para a seção Fontes. Vem como itens da lista que o pai
 * abre.
 *
 * Carrega no cliente, a cada visita, e não vem embutido na ficha (ISR): assim
 * uma mudança de citação ou de privacidade vale na hora, sem esperar a página
 * ser regerada. Enquanto carrega, e se não há nenhuma, não mostra nada.
 */
export function FontesDaComunidade({ speciesId }: { speciesId: string }) {
  const [fontes, setFontes] = useState<FonteDaComunidade[]>([]);

  useEffect(() => {
    let ativo = true;
    void listarFontesDaComunidade(speciesId).then(
      (lista) => ativo && setFontes(lista),
    );
    return () => {
      ativo = false;
    };
  }, [speciesId]);

  return fontes.map(({ chave, fonte, autor }) => (
    <li key={chave}>
      {fonte}
      {autor && (
        <>
          {" "}
          — contribuição de{" "}
          {autor.cartao ? (
            <NomeComCartao
              nome={autor.nome}
              cartao={autor.cartao}
              perfilId={autor.perfilId}
            />
          ) : (
            <span className="text-foreground">{autor.nome}</span>
          )}
        </>
      )}
    </li>
  ));
}

const ATRASO_PARA_ABRIR_MS = 150;
const ATRASO_PARA_FECHAR_MS = 200;

/**
 * O nome que abre o card ao passar o mouse. É um `Popover` comandado à mão, e
 * não um card de hover, porque o hover não existe no toque nem no teclado: aqui
 * o clique, o toque e o Enter abrem o mesmo card. O atraso ao fechar deixa o
 * mouse ir do nome até o card (para alcançar os links) sem que ele suma.
 */
function NomeComCartao({
  nome,
  cartao,
  perfilId,
}: {
  nome: string;
  cartao: CartaoPublico;
  perfilId: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** Aberto pelo mouse: o foco não deve pular para dentro do card. */
  const porMouse = useRef(false);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  function agendar(abrir: boolean) {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(
      () => setAberto(abrir),
      abrir ? ATRASO_PARA_ABRIR_MS : ATRASO_PARA_FECHAR_MS,
    );
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={(abrir) => {
        // Clique, Esc ou clique fora: quem decide agora não é o mouse parado.
        clearTimeout(temporizador.current);
        porMouse.current = false;
        setAberto(abrir);
      }}
    >
      <PopoverTrigger
        onPointerEnter={(evento) => {
          if (evento.pointerType !== "mouse") return;
          porMouse.current = true;
          agendar(true);
        }}
        onPointerLeave={(evento) => {
          if (evento.pointerType === "mouse") agendar(false);
        }}
        onClick={(evento) => {
          // O card já abriu pelo hover: o clique não deve fechá-lo em seguida.
          if (porMouse.current && aberto) evento.preventDefault();
        }}
        className="cursor-default text-foreground underline decoration-dotted decoration-primary/60 underline-offset-4 transition-colors duration-240 hover:text-primary"
      >
        {nome}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        onPointerEnter={() => clearTimeout(temporizador.current)}
        onPointerLeave={(evento) => {
          if (evento.pointerType === "mouse") agendar(false);
        }}
        onOpenAutoFocus={(evento) => {
          if (porMouse.current) evento.preventDefault();
        }}
        onCloseAutoFocus={(evento) => {
          if (porMouse.current) evento.preventDefault();
        }}
        className="w-80 overflow-hidden rounded-xl border-bg-border bg-bg-surface1 p-0"
      >
        <CartaoDoColaborador
          cartao={cartao}
          href={perfilId ? `/colaboradores/${perfilId}` : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
