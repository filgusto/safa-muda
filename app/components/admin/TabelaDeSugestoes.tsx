"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { Diff } from "@/components/wiki/Diff.tsx";
import { rotuloDaChave } from "@/lib/especie-schema.ts";
import { TAG_DE_FOTO_LABEL } from "@/core/fotos.ts";
import { aprovarProposta, rejeitarProposta } from "@/app/actions/wiki.ts";
import { aprovarFoto, removerFoto } from "@/app/actions/fotos.ts";
import type {
  Sugestao,
  SugestaoDeCampo,
  SugestaoDeFoto,
} from "@/lib/sugestoes.ts";

const TIPO_LABEL: Record<Sugestao["tipo"], string> = {
  edicao: "Edição",
  nova_especie: "Nova espécie",
  foto: "Foto",
};

/**
 * Fuso fixo: a data é formatada no servidor (SSR) e de novo no navegador, e
 * o container roda em UTC. Sem isto, um envio perto da meia-noite mudaria de
 * dia entre os dois e quebraria a hidratação.
 */
const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/**
 * Fila de sugestões em tabela. Cada linha abre ali mesmo, com o que é preciso
 * para decidir — fonte, diff ou foto — e os botões de aceitar e rejeitar.
 * Decidir recarrega a lista do servidor, e a linha sai da fila.
 */
export function TabelaDeSugestoes({ sugestoes }: { sugestoes: Sugestao[] }) {
  const [aberta, setAberta] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-surface1">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="border-b border-bg-border font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            <th className="px-4 py-3 font-normal">Tipo</th>
            <th className="px-4 py-3 font-normal">Espécie</th>
            <th className="px-4 py-3 font-normal">O que muda</th>
            <th className="px-4 py-3 font-normal">Enviada por</th>
            <th className="px-4 py-3 font-normal">Data</th>
            <th className="w-10 px-4 py-3">
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sugestoes.map((sugestao) => {
            const expandida = aberta === sugestao.id;
            const alternar = () => setAberta(expandida ? null : sugestao.id);

            return (
              <Fragment key={sugestao.id}>
                <tr
                  onClick={alternar}
                  className={`cursor-pointer border-b border-bg-border/60 transition-colors duration-240 last:border-b-0 hover:bg-bg-surface2/60 ${
                    expandida ? "bg-bg-surface2/60" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <PastilhaDoTipo tipo={sugestao.tipo} />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {nomeDaEspecie(sugestao)}
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground">
                    {resumo(sugestao)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {sugestao.autorNome ?? "autor removido"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                    {DATA.format(sugestao.criadoEm)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-expanded={expandida}
                      aria-label={expandida ? "Recolher" : "Expandir"}
                      onClick={(evento) => {
                        // A linha inteira já alterna; sem isto, o clique no
                        // botão alternaria duas vezes.
                        evento.stopPropagation();
                        alternar();
                      }}
                      className="rounded-md p-1 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-240 ${expandida ? "rotate-180" : ""}`}
                      />
                    </button>
                  </td>
                </tr>

                {expandida && (
                  <tr className="border-b border-bg-border/60 bg-bg-surface2/30 last:border-b-0">
                    <td colSpan={6} className="px-4 pb-6 pt-4 sm:px-6">
                      {sugestao.tipo === "foto" ? (
                        <DetalheDeFoto
                          sugestao={sugestao}
                          concluir={() => setAberta(null)}
                        />
                      ) : (
                        <DetalheDeCampo
                          sugestao={sugestao}
                          concluir={() => setAberta(null)}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function nomeDaEspecie(sugestao: Sugestao): string {
  if (sugestao.especie) return sugestao.especie.nome;
  if (sugestao.tipo === "nova_especie") {
    return String(sugestao.patch.nomeComum ?? "Espécie nova");
  }
  return "Espécie removida";
}

function resumo(sugestao: Sugestao): string {
  if (sugestao.tipo === "foto") {
    return `Foto · ${TAG_DE_FOTO_LABEL[sugestao.tag]}`;
  }
  const chaves = Object.keys(sugestao.patch);
  if (sugestao.tipo === "nova_especie") {
    return `${chaves.length} ${chaves.length === 1 ? "campo preenchido" : "campos preenchidos"}`;
  }
  return chaves.map((chave) => rotuloDaChave(chave)).join(", ");
}

function PastilhaDoTipo({ tipo }: { tipo: Sugestao["tipo"] }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-primary">
      {TIPO_LABEL[tipo]}
    </span>
  );
}

function DetalheDeCampo({
  sugestao,
  concluir,
}: {
  sugestao: SugestaoDeCampo;
  concluir: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-5">
        <Bloco titulo="Fonte declarada">
          <p className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm leading-[1.7]">
            {sugestao.fonte}
          </p>
        </Bloco>

        {sugestao.justificativa && (
          <Bloco titulo="Observação de quem sugeriu">
            <p className="text-sm leading-[1.7] text-muted-foreground">
              {sugestao.justificativa}
            </p>
          </Bloco>
        )}

        <Bloco
          titulo={
            sugestao.tipo === "nova_especie"
              ? "Valores propostos"
              : "Alterações"
          }
        >
          <Diff patch={sugestao.patch} atual={sugestao.atual} />
        </Bloco>

        {sugestao.especie && <LinkDaFicha slug={sugestao.especie.slug} />}
      </div>

      <Avaliacao
        exigeNotaParaRejeitar
        aceitar={(nota) => aprovarProposta(sugestao.id, nota)}
        rejeitar={(nota) => rejeitarProposta(sugestao.id, nota ?? "")}
        concluir={concluir}
      />
    </div>
  );
}

function DetalheDeFoto({
  sugestao,
  concluir,
}: {
  sugestao: SugestaoDeFoto;
  concluir: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/media/${sugestao.key}`}
          alt={
            sugestao.legenda ?? `Foto enviada para ${sugestao.especie?.nome}`
          }
          className="max-h-80 w-full rounded-lg border border-bg-border object-contain"
        />
        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Fase
          </dt>
          <dd>{TAG_DE_FOTO_LABEL[sugestao.tag]}</dd>
          <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Crédito
          </dt>
          <dd>{sugestao.credito}</dd>
          <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Legenda
          </dt>
          <dd
            className={
              sugestao.legenda ? "" : "italic text-muted-foreground/60"
            }
          >
            {sugestao.legenda ?? "não informada"}
          </dd>
        </dl>
        {sugestao.especie && <LinkDaFicha slug={sugestao.especie.slug} />}
      </div>

      <Avaliacao
        exigeNotaParaRejeitar
        aceitar={(nota) => aprovarFoto(sugestao.id, nota)}
        rejeitar={(nota) => removerFoto(sugestao.id, nota ?? "")}
        avisoAoRejeitar="Rejeitar apaga a foto e o arquivo, sem volta. O motivo vai por e-mail a quem enviou."
        concluir={concluir}
      />
    </div>
  );
}

type Resultado = { ok: boolean; erro?: string };

/**
 * Decisão sobre uma sugestão. A nota vai para quem sugeriu: opcional ao
 * aceitar, obrigatória ao rejeitar proposta de campo — rejeitar sem explicar
 * desperdiça o trabalho de quem contribuiu.
 */
function Avaliacao({
  aceitar,
  rejeitar,
  concluir,
  exigeNotaParaRejeitar = false,
  avisoAoRejeitar,
}: {
  aceitar: (nota?: string) => Promise<Resultado>;
  rejeitar: (nota?: string) => Promise<Resultado>;
  concluir: () => void;
  exigeNotaParaRejeitar?: boolean;
  avisoAoRejeitar?: string;
}) {
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<"aceitar" | "rejeitar" | null>(
    null,
  );

  async function decidir(decisao: "aceitar" | "rejeitar") {
    setErro(null);
    setEmAndamento(decisao);

    const texto = nota.trim() || undefined;
    const resultado =
      decisao === "aceitar" ? await aceitar(texto) : await rejeitar(texto);

    if (!resultado.ok) {
      setEmAndamento(null);
      setErro(resultado.erro ?? "Não foi possível concluir.");
      return;
    }
    concluir();
    router.refresh();
  }

  return (
    <div className="space-y-3 lg:border-l lg:border-bg-border lg:pl-6">
      <h3 className="font-mono text-xs uppercase tracking-widest text-primary">
        Decisão
      </h3>

      {exigeNotaParaRejeitar && (
        <label className="block">
          <span className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Nota para quem sugeriu
          </span>
          <textarea
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
            rows={4}
            placeholder="Opcional ao aceitar. Obrigatória ao rejeitar."
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decidir("aceitar")}
          disabled={emAndamento !== null}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {emAndamento === "aceitar" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          Aceitar
        </button>
        <button
          type="button"
          onClick={() => decidir("rejeitar")}
          disabled={emAndamento !== null}
          className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-4 py-1.5 text-sm font-medium text-destructive transition-all duration-240 hover:bg-destructive/10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {emAndamento === "rejeitar" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
          Rejeitar
        </button>
      </div>

      {avisoAoRejeitar && (
        <p className="text-xs leading-[1.6] text-muted-foreground">
          {avisoAoRejeitar}
        </p>
      )}
    </div>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function LinkDaFicha({ slug }: { slug: string }) {
  return (
    <Link
      href={`/safdex/${slug}`}
      target="_blank"
      className="inline-block text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      Abrir a ficha atual em outra aba
    </Link>
  );
}
