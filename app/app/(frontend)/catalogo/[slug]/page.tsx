import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PencilLine } from "lucide-react";
import { buscarEspeciePorSlug } from "@/lib/catalogo.ts";
import { listarRevisoesDaEspecie } from "@/lib/wiki.ts";
import { Diff } from "@/components/wiki/Diff.tsx";
import {
  PastilhaEstrato,
  rotuloSucessao,
  rotuloSistema,
} from "@/components/catalogo/CardEspecie.tsx";
import {
  GRUPO_LABEL,
  FONTE_LABEL,
  FONTE_LABEL_CURTO,
  type Grupo,
} from "@/core/grupos.ts";
import {
  luzQueChegaAo,
  ESTRATO_LABEL,
  OCUPACAO_IDEAL,
} from "@/core/estratos.ts";
import type { Species } from "@/db/schema/species.ts";

/**
 * ISR em vez de `generateStaticParams`.
 *
 * Pré-renderizar as 442 páginas no build exigiria banco disponível em tempo de
 * build, o que quebraria a invariante de que `npm run build` roda sem nenhuma
 * variável de ambiente (ver .github/workflows/ci.yml e ADR 0002).
 *
 * Com ISR cada página é gerada na primeira visita e servida do cache depois —
 * igualmente indexável, e com o bônus de que uma correção aprovada na wiki
 * aparece sem precisar de novo deploy.
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const especie = await buscarEspeciePorSlug((await params).slug);
  if (!especie) return { title: "Espécie não encontrada · Safa Muda" };

  return {
    title: `${especie.nomeComum} · Safa Muda`,
    description: `${especie.nomeComum} (${especie.nomeCientifico}): estrato, sucessão e sistema para planejamento agroflorestal.`,
  };
}

export default async function EspeciePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const especie = await buscarEspeciePorSlug((await params).slug);
  if (!especie) notFound();

  const revisoes = await listarRevisoesDaEspecie(especie.id);

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/catalogo"
        className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-240 hover:text-foreground"
      >
        <ArrowLeft size={13} />
        Catálogo
      </Link>

      <header className="mb-10 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-display-md font-semibold tracking-tight">
            {especie.nomeComum}
          </h1>
          {especie.estrato && <PastilhaEstrato estrato={especie.estrato} />}
        </div>
        <p className="font-mono italic text-secondary">
          {especie.nomeCientifico}
        </p>
        {especie.sinonimos.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Também chamada de {especie.sinonimos.join(", ")}.
          </p>
        )}
      </header>

      <Secao titulo="Classificação agroflorestal">
        <Campo
          rotulo="Estrato"
          valor={especie.estrato ? ESTRATO_LABEL[especie.estrato] : null}
          fonte={especie.fontes.estrato}
        />
        <Campo
          rotulo="Sucessão"
          valor={rotuloSucessao(especie.sucessao)}
          fonte={especie.fontes.sucessao}
        />
        <Campo
          rotulo="Sistema"
          valor={rotuloSistema(especie.sistema)}
          fonte={especie.fontes.sistema}
        />
        <Campo
          rotulo="Família"
          valor={especie.familia}
          fonte={especie.fontes.familia}
        />
        <Campo
          rotulo="Grupos"
          valor={
            especie.grupos.length
              ? especie.grupos
                  .map((grupo) => GRUPO_LABEL[grupo as Grupo] ?? grupo)
                  .join(", ")
              : null
          }
          fonte={especie.fontes.grupos}
        />
      </Secao>

      {especie.estrato && especie.estrato !== "rasteiro" && (
        <Secao titulo="Luz e ocupação">
          <p className="mb-4 max-w-[60ch] text-sm leading-[1.7] text-muted-foreground">
            Valores do estrato, não da espécie. Vêm das estimativas de Ernst
            Götsch registradas em <em>Agroflorestando o Mundo</em> (cap. 7.3) e
            das tabelas de consórcio do cap. 10.
          </p>
          <Campo
            rotulo="Luz que chega"
            valor={`${Math.round(luzQueChegaAo(especie.estrato) * 100)}% da luz plena, com os andares acima ocupados`}
          />
          <Campo
            rotulo="Ocupação ideal"
            valor={
              OCUPACAO_IDEAL[especie.estrato] !== null
                ? `${Math.round(OCUPACAO_IDEAL[especie.estrato]! * 100)}% do andar`
                : null
            }
          />
        </Secao>
      )}

      {temDadosDeCultivo(especie) && (
        <Secao titulo="Ciclo e espaçamento">
          <p className="mb-4 max-w-[60ch] text-sm leading-[1.7] text-muted-foreground">
            Referência de partida em monocultura. O próprio livro adverte que
            espaçamentos e ciclos mudam com solo, clima e estação.
          </p>
          <Campo
            rotulo="Dias para colher"
            valor={faixa(
              especie.diasParaColherMin,
              especie.diasParaColherMax,
              "dias",
            )}
            fonte={especie.fontes.dias_para_colher_min}
          />
          <Campo
            rotulo="Entre linhas"
            valor={faixa(
              especie.espacamentoEntreLinhasMinM,
              especie.espacamentoEntreLinhasMaxM,
              "m",
            )}
            fonte={especie.fontes.espacamento_entre_linhas_min_m}
          />
          <Campo
            rotulo="Na linha"
            valor={faixa(
              especie.espacamentoNaLinhaMinM,
              especie.espacamentoNaLinhaMaxM,
              "m",
            )}
            fonte={especie.fontes.espacamento_na_linha_min_m}
          />
        </Secao>
      )}

      {especie.notas.length > 0 && (
        <Secao titulo="Observações">
          <ul className="space-y-3">
            {especie.notas.map((nota, indice) => (
              <li
                key={indice}
                className="rounded-lg border-l-4 border-blue-500/30 bg-blue-500/5 p-4 text-sm leading-[1.7] text-blue-900 dark:text-blue-200"
              >
                {nota}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Fontes">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {[...new Set(Object.values(especie.fontes))].map((fonte) => (
            <li key={fonte}>{FONTE_LABEL[fonte] ?? fonte}</li>
          ))}
        </ul>
      </Secao>

      {revisoes.length > 0 && (
        <Secao titulo="Histórico">
          <ul className="space-y-3">
            {revisoes.map((revisao) => (
              <li
                key={revisao.id}
                className="rounded-xl border border-bg-border bg-bg-surface1 p-4"
              >
                <p className="mb-2 font-mono text-xs text-muted-foreground">
                  {revisao.criadoEm.toLocaleDateString("pt-BR")} ·{" "}
                  {revisao.autorNome ?? "autor removido"}
                </p>
                <Diff patch={revisao.patch} />
                <p className="mt-2 text-xs leading-[1.6] text-muted-foreground/80">
                  Fonte: {revisao.fonte}
                </p>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Encontrou um erro?">
        <p className="mb-4 max-w-[60ch] text-sm leading-[1.7] text-muted-foreground">
          O catálogo é colaborativo. Sugira uma correção com a fonte, e um
          moderador avalia antes de publicar.
        </p>
        <Link
          href={`/catalogo/${especie.slug}/sugerir`}
          className="inline-flex items-center gap-2 rounded-md border border-primary bg-transparent px-5 py-2 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-bg-base active:scale-[0.98]"
        >
          <PencilLine size={15} />
          Sugerir correção
        </Link>
      </Secao>
    </main>
  );
}

function temDadosDeCultivo(especie: Species): boolean {
  return (
    especie.diasParaColherMin !== null ||
    especie.espacamentoEntreLinhasMinM !== null ||
    especie.espacamentoNaLinhaMinM !== null
  );
}

function faixa(
  min: number | null,
  max: number | null,
  unidade: string,
): string | null {
  if (min === null) return null;
  if (max === null || min === max) return `${formatar(min)} ${unidade}`;
  return `${formatar(min)} a ${formatar(max)} ${unidade}`;
}

function formatar(valor: number): string {
  return Number.isInteger(valor)
    ? String(valor)
    : valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Campo({
  rotulo,
  valor,
  fonte,
}: {
  rotulo: string;
  valor: string | null;
  fonte?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/40 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-40 shrink-0 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </span>
      <span
        className={
          valor ? "text-foreground" : "text-sm italic text-muted-foreground/60"
        }
      >
        {valor ?? "não informado"}
      </span>
      {valor && fonte && (
        <span className="font-mono text-[0.65rem] text-muted-foreground/70 sm:ml-auto">
          {FONTE_LABEL_CURTO[fonte] ?? fonte}
        </span>
      )}
    </div>
  );
}
