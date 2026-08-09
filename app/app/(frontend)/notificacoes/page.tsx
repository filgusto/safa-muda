import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/access.ts";
import { listarNotificacoes } from "@/lib/wiki.ts";
import { marcarNotificacoesComoLidas } from "@/app/actions/wiki.ts";

export const metadata: Metadata = { title: "Notificações · Safa Muda" };
export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?destino=/notificacoes");

  const notificacoes = await listarNotificacoes(viewer.id);
  const temNaoLidas = notificacoes.some((item) => item.lidaEm === null);

  return (
    <main className="container mx-auto max-w-2xl px-6 py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            Avisos
          </span>
          <h1 className="font-serif text-display-md font-semibold tracking-tight">
            Notificações
          </h1>
        </div>

        {temNaoLidas && (
          <form action={marcarNotificacoesComoLidas}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors duration-240 hover:text-foreground"
            >
              Marcar todas como lidas
            </button>
          </form>
        )}
      </header>

      {notificacoes.length === 0 ? (
        <p className="rounded-xl border border-bg-border bg-bg-surface1 p-8 text-center text-sm text-muted-foreground">
          Nada por aqui ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {notificacoes.map((item) => {
            const conteudo = (
              <>
                <div className="mb-1 flex items-center gap-2">
                  {item.lidaEm === null && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-label="não lida"
                    />
                  )}
                  <h2 className="font-semibold leading-snug">{item.titulo}</h2>
                </div>
                {item.corpo && (
                  <p className="text-sm leading-[1.7] text-muted-foreground">
                    {item.corpo}
                  </p>
                )}
                <p className="mt-1.5 font-mono text-xs text-muted-foreground/70">
                  {item.criadoEm.toLocaleDateString("pt-BR")}
                </p>
              </>
            );

            return (
              <li
                key={item.id}
                className={`rounded-xl border p-5 transition-colors duration-320 ${
                  item.lidaEm === null
                    ? "border-primary/30 bg-primary/5"
                    : "border-bg-border bg-bg-surface1"
                }`}
              >
                {item.link ? (
                  <Link href={item.link} className="block">
                    {conteudo}
                  </Link>
                ) : (
                  conteudo
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
