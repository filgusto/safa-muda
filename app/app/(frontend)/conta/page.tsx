import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioDeConta } from "@/components/auth/FormularioDeConta.tsx";
import { rotuloDoPapel } from "@/core/tratamento.ts";
import { getViewer } from "@/lib/access.ts";
import { obterPerfilDaConta } from "@/lib/conta.ts";

export const metadata: Metadata = { title: "Minha conta · Safa Muda" };

// Depende da sessão de quem pede.
export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?destino=/conta");

  const perfil = await obterPerfilDaConta(viewer.id);

  return (
    <main className="container mx-auto max-w-xl px-6 py-16">
      <header className="mb-10">
        <h1 className="font-serif text-display-md font-semibold tracking-tight">
          Minha conta
        </h1>
      </header>

      <FormularioDeConta
        nome={viewer.name}
        email={viewer.email}
        imagem={viewer.image ?? null}
        perfil={perfil}
        papel={rotuloDoPapel(viewer.role, perfil.tratamento)}
        membroDesde={viewer.createdAt.toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />
    </main>
  );
}
