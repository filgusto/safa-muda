import Link from "next/link";

export default function NaoEncontrada() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 font-serif text-3xl">Página não encontrada</h1>
      <p className="mt-4 text-muted-foreground">
        O endereço não existe ou a página mudou de lugar.
      </p>
      <p className="mt-8">
        <Link href="/" className="bio-link">
          Voltar ao início
        </Link>
      </p>
    </main>
  );
}
