"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, ShieldCheck } from "lucide-react";

interface EstadoDoMenu {
  autenticado: boolean;
  moderador?: boolean;
  pendentes?: number;
  naoLidas?: number;
}

/**
 * Menu da navegação: sessão e contadores.
 *
 * É client de propósito. Buscar a sessão no servidor dentro do layout tornaria
 * TODA página dinâmica — inclusive as 442 fichas de espécie, que dependem de
 * ISR para serem indexáveis. Aqui o layout continua estático e só este pedaço
 * consulta a sessão, depois da hidratação.
 */
export function MenuDoUsuario() {
  const [estado, setEstado] = useState<EstadoDoMenu | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelado = false;

    fetch("/api/menu")
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados) => {
        if (!cancelado) setEstado(dados);
      })
      .catch(() => {
        if (!cancelado) setEstado({ autenticado: false });
      });

    return () => {
      cancelado = true;
    };
    // Recarrega ao navegar: aprovar uma proposta muda os contadores.
  }, [pathname]);

  // Antes da resposta não renderiza nada, para não piscar "Entrar" para quem
  // já está autenticado.
  if (estado === null) return null;

  if (!estado.autenticado) {
    return (
      <Link
        href="/entrar"
        className="px-2 text-sm text-muted-foreground transition-colors duration-240 hover:text-foreground"
      >
        Entrar
      </Link>
    );
  }

  const pendentes = estado.pendentes ?? 0;
  const naoLidas = estado.naoLidas ?? 0;

  return (
    <>
      {estado.moderador && (
        <Link
          href="/moderacao"
          aria-label={`Moderação${pendentes ? `, ${pendentes} pendente(s)` : ""}`}
          className="relative flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ShieldCheck className="h-4 w-4" />
          {pendentes > 0 && <Contador valor={pendentes} />}
        </Link>
      )}

      <Link
        href="/notificacoes"
        aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lida(s)` : ""}`}
        className="relative flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {naoLidas > 0 && <Contador valor={naoLidas} />}
      </Link>

      <Link
        href="/sugestoes"
        className="hidden px-2 text-sm text-muted-foreground transition-colors duration-240 hover:text-foreground sm:block"
      >
        Sugestões
      </Link>
    </>
  );
}

function Contador({ valor }: { valor: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[0.6rem] font-medium text-primary-foreground">
      {valor > 9 ? "9+" : valor}
    </span>
  );
}
