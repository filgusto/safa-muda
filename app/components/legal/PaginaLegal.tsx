import Link from "next/link";
import { VERSAO_DOS_TERMOS } from "@/lib/termos.ts";

/** Moldura das páginas de Termos e de Privacidade. */
export function PaginaLegal({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  const vigencia = new Date(`${VERSAO_DOS_TERMOS}T12:00:00`).toLocaleDateString(
    "pt-BR",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <main className="container mx-auto max-w-2xl px-6 py-16">
      <header className="mb-10 space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Legal
        </span>
        <h1 className="font-serif text-display-md font-semibold tracking-tight">
          {titulo}
        </h1>
        <p className="text-sm text-muted-foreground">
          Versão de {vigencia}. Os{" "}
          <Link href="/termos" className="bio-link">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="bio-link">
            Política de Privacidade
          </Link>{" "}
          andam juntos.
        </p>
      </header>

      <div className="space-y-8 text-sm leading-[1.8] text-foreground/90">
        {children}
      </div>
    </main>
  );
}

export function SecaoLegal({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl font-semibold text-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function ListaLegal({ itens }: { itens: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-primary/60">
      {itens.map((item, indice) => (
        <li key={indice}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Contato do projeto para pedidos sobre dados pessoais. Vem do ambiente
 * (CONTATO_EMAIL) para não ficar um endereço inventado no código; sem ele, o
 * texto remete às ferramentas da própria conta.
 */
export function ContatoDoProjeto() {
  const email = process.env.CONTATO_EMAIL;
  if (!email) return null;
  return (
    <>
      {" "}
      Para qualquer pedido que a conta não resolva, escreva para{" "}
      <a href={`mailto:${email}`} className="bio-link">
        {email}
      </a>
      .
    </>
  );
}
