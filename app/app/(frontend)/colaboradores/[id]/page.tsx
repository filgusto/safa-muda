import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Secao } from "@/components/catalogo/Secao.tsx";
import { CartaoDoColaborador } from "@/components/perfil/CartaoDoColaborador.tsx";
import { getViewer } from "@/lib/access.ts";
import { obterPerfilPublico } from "@/lib/perfil-publico.ts";
import {
  CHAVE_FONTES_AUTOMATICAS,
  rotuloDaChave,
} from "@/lib/especie-schema.ts";

// O perfil reflete na hora uma mudança de privacidade da pessoa.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const perfil = await obterPerfilPublico((await params).id);
  return {
    title: perfil
      ? `${perfil.cartao.nome} · Safa Muda`
      : "Perfil não encontrado · Safa Muda",
    robots: { index: false },
  };
}

const formatarData = (data: Date) =>
  data.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default async function ColaboradorPage({ params }: Props) {
  const { id } = await params;
  const perfil = await obterPerfilPublico(id);
  if (!perfil) {
    // Quem escolheu "sem identificação" não tem perfil público, mas o atalho do
    // menu leva a ela: manda para a conta em vez de mostrar um 404.
    if ((await getViewer())?.id === id) redirect("/conta");
    notFound();
  }

  const { cartao, membroDesde, contribuicoes } = perfil;
  const ehOProprioPerfil = (await getViewer())?.id === id;
  const especies = new Set(contribuicoes.map((c) => c.especie.slug)).size;

  const dados: [string, string | null][] = [
    ["Região", cartao.regiao],
    ["Perfil de uso", cartao.perfilDeUso],
    ["Experiência", cartao.experiencia],
  ];

  return (
    <>
      {ehOProprioPerfil && (
        <div
          role="status"
          className="border-y border-primary/30 bg-primary/5 px-6 py-3 text-sm leading-[1.6] text-foreground/90"
        >
          <p className="container mx-auto max-w-2xl px-0">
            Você está vendo o seu perfil público; toda a comunidade pode vê-lo
            também. Se houver alguma informação que você não quer compartilhar,
            delete-a de seu perfil ou retire a opção de público em{" "}
            <Link href="/conta#sobre-voce" className="bio-link font-medium">
              Minha conta
            </Link>
            .
          </p>
        </div>
      )}
      <main className="container mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/safdex"
          className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-240 hover:text-foreground"
        >
          <ArrowLeft size={14} /> Safdex
        </Link>

        <h1 className="mb-8 font-serif text-display-md font-semibold tracking-tight">
          {cartao.nome}
        </h1>

        <div className="mb-12 overflow-hidden rounded-xl border border-bg-border bg-bg-surface1">
          <CartaoDoColaborador cartao={cartao} />
        </div>

        <Secao titulo="Dados públicos">
          <Campo rotulo="Desde" valor={formatarData(membroDesde)} />
          <Campo
            rotulo="Contribuições"
            valor={`${contribuicoes.length} em ${especies} ${
              especies === 1 ? "espécie" : "espécies"
            }`}
          />
          {dados.map(
            ([rotulo, valor]) =>
              valor && <Campo key={rotulo} rotulo={rotulo} valor={valor} />,
          )}
          {cartao.bio && <Campo rotulo="Sobre" valor={cartao.bio} />}
          {cartao.links.length > 0 && (
            <Campo
              rotulo="Links"
              valor={
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  {cartao.links.map(({ tipo, rotulo, url }) => (
                    <a
                      key={tipo}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="bio-link"
                    >
                      {rotulo}
                    </a>
                  ))}
                </span>
              }
            />
          )}
        </Secao>

        <Secao titulo="Histórico de contribuições">
          {contribuicoes.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              Nenhuma contribuição aprovada ainda.
            </p>
          ) : (
            <ol>
              {contribuicoes.map((c) => (
                <li key={c.id} className="border-b border-border/40 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <Link
                      href={`/safdex/${c.especie.slug}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {c.especie.nomeComum}{" "}
                      <span className="font-mono text-xs font-normal italic text-secondary">
                        {c.especie.nomeCientifico}
                      </span>
                    </Link>
                    <time
                      dateTime={c.criadoEm.toISOString()}
                      className="font-mono text-xs text-muted-foreground"
                    >
                      {formatarData(c.criadoEm)}
                    </time>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Alterou:{" "}
                    {c.campos
                      .filter((campo) => campo !== CHAVE_FONTES_AUTOMATICAS)
                      .map(rotuloDaChave)
                      .join(", ") || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fonte: {c.fonte}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Secao>
      </main>
    </>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/40 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-40 shrink-0 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </span>
      <span className="min-w-0 text-foreground">{valor}</span>
    </div>
  );
}
