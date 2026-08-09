import Link from "next/link";
import { ArrowRight, Layers, Map, NotebookPen } from "lucide-react";
import { getViewer } from "@/lib/access.ts";

/**
 * Lê a sessão para saudar quem já entrou, então não pode ser estática.
 * As páginas do catálogo (fase 1) serão estáticas/ISR justamente por NÃO
 * dependerem do viewer — é o que mantém a leitura pública boa para SEO.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await getViewer();

  return (
    <main className="container mx-auto max-w-4xl px-6 py-24">
      <header className="mb-14 space-y-4">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          Planejamento e gestão agroflorestal
        </span>
        <h1 className="font-serif text-display-md font-semibold tracking-tight">
          Safa Muda
        </h1>
        <p className="max-w-[60ch] text-lg leading-[1.7] text-muted-foreground">
          Planeje uma agrofloresta no tempo e no espaço, acompanhe o que foi
          realmente plantado e deixe o sistema se corrigir com a realidade.
        </p>
      </header>

      <div className="mb-14 grid gap-5 sm:grid-cols-3">
        <Recurso
          icon={<Layers size={18} />}
          titulo="Catálogo"
          descricao="Espécies com estrato, sucessão e sistema — um wiki que melhora com o uso."
        />
        <Recurso
          icon={<NotebookPen size={18} />}
          titulo="Timeline"
          descricao="Tempo no eixo X, estratos no Y. O desenho da sucessão, ano a ano."
        />
        <Recurso
          icon={<Map size={18} />}
          titulo="Mapa"
          descricao="Croqui com medidas reais ou desenho sobre imagem de satélite."
        />
      </div>

      {viewer ? (
        <p className="text-sm text-muted-foreground">
          Você está autenticado como{" "}
          <span className="text-foreground">{viewer.name}</span>. O catálogo e o
          planejador chegam nas próximas fases.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/cadastro"
            className="group inline-flex items-center rounded-md border border-primary bg-transparent px-8 py-2.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-bg-base hover:shadow-[0_0_20px_0_rgba(63,175,92,0.3)] active:scale-[0.98]"
          >
            Criar conta
            <ArrowRight
              size={16}
              className="ml-2 transition-transform duration-240 group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/entrar"
            className="px-4 py-2.5 text-sm text-muted-foreground transition-colors duration-240 hover:text-foreground"
          >
            Já tenho conta
          </Link>
        </div>
      )}
    </main>
  );
}

function Recurso({
  icon,
  titulo,
  descricao,
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-surface1 p-6 transition-all duration-320 hover:border-primary/50">
      <div className="mb-4 inline-flex rounded-md border border-primary/20 bg-primary/5 p-2.5 text-primary">
        {icon}
      </div>
      <h2 className="mb-2 font-semibold leading-snug">{titulo}</h2>
      <p className="text-sm leading-[1.7] text-muted-foreground">{descricao}</p>
    </div>
  );
}
