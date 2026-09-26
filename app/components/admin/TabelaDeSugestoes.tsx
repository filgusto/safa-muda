"use client";

import { rotuloDoPapel } from "@/core/tratamento.ts";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { Diff } from "@/components/wiki/Diff.tsx";
import { rotuloDaChave } from "@/lib/especie-schema.ts";
import { TAG_DE_FOTO_LABEL } from "@/core/fotos.ts";
import { aprovarProposta, rejeitarProposta } from "@/app/actions/wiki.ts";
import { aprovarFoto, removerFoto } from "@/app/actions/fotos.ts";
import { AvatarDoUsuario } from "@/components/auth/AvatarDoUsuario.tsx";
import {
  CREDITO_DE_NOME_LABEL,
  EXPERIENCIA_LABEL,
  rotuloDoPerfilDeUso,
} from "@/lib/perfil-de-usuario.ts";
import type {
  AutorDaSugestao,
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

type ColunaOrdenavel = "tipo" | "especie" | "resumo" | "autor" | "data";

const COLUNAS: { chave: ColunaOrdenavel; rotulo: string }[] = [
  { chave: "tipo", rotulo: "Tipo" },
  { chave: "especie", rotulo: "Espécie" },
  { chave: "resumo", rotulo: "O que muda" },
  { chave: "autor", rotulo: "Enviada por" },
  { chave: "data", rotulo: "Data" },
];

function valorDaColuna(sugestao: Sugestao, coluna: ColunaOrdenavel) {
  switch (coluna) {
    case "tipo":
      return TIPO_LABEL[sugestao.tipo];
    case "especie":
      return nomeDaEspecie(sugestao);
    case "resumo":
      return resumo(sugestao);
    case "autor":
      return sugestao.autorNome ?? "autor removido";
    case "data":
      return sugestao.criadoEm.getTime();
  }
}

/**
 * Fila de sugestões em tabela. Cada linha abre ali mesmo, com o que é preciso
 * para decidir — fonte, diff ou foto — e os botões de aceitar e rejeitar.
 * Decidir recarrega a lista do servidor, e a linha sai da fila.
 */
export function TabelaDeSugestoes({ sugestoes }: { sugestoes: Sugestao[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<{
    coluna: ColunaOrdenavel;
    direcao: "asc" | "desc";
  } | null>(null);

  const linhas = useMemo(() => {
    if (!ordem) return sugestoes;
    const fator = ordem.direcao === "asc" ? 1 : -1;
    return [...sugestoes].sort((a, b) => {
      const va = valorDaColuna(a, ordem.coluna);
      const vb = valorDaColuna(b, ordem.coluna);
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * fator;
      }
      return String(va).localeCompare(String(vb), "pt-BR") * fator;
    });
  }, [sugestoes, ordem]);

  function ordenarPor(coluna: ColunaOrdenavel) {
    setOrdem((atual) =>
      atual?.coluna === coluna
        ? { coluna, direcao: atual.direcao === "asc" ? "desc" : "asc" }
        : { coluna, direcao: "asc" },
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-surface1">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="border-b border-bg-border font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            {COLUNAS.map(({ chave, rotulo }) => {
              const ativa = ordem?.coluna === chave;
              return (
                <th
                  key={chave}
                  className="px-4 py-3 font-normal"
                  aria-sort={
                    ativa
                      ? ordem.direcao === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => ordenarPor(chave)}
                    aria-label={`Ordenar por ${rotulo}`}
                    className={`inline-flex items-center gap-1 uppercase tracking-widest transition-colors duration-240 hover:text-foreground ${
                      ativa ? "text-foreground" : ""
                    }`}
                  >
                    {rotulo}
                    <SetasDeOrdem direcao={ativa ? ordem.direcao : null} />
                  </button>
                </th>
              );
            })}
            <th className="w-10 px-4 py-3">
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((sugestao) => {
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

/** Par de triângulos; o da direção em uso fica verde, o outro apagado. */
function SetasDeOrdem({ direcao }: { direcao: "asc" | "desc" | null }) {
  const cor = (ativo: boolean) =>
    ativo ? "text-primary" : "text-muted-foreground/40";
  return (
    <span aria-hidden className="flex flex-col gap-[2px]">
      <svg
        viewBox="0 0 8 5"
        className={`h-[5px] w-2 fill-current transition-colors duration-240 ${cor(direcao === "asc")}`}
      >
        <path d="M4 0 8 5H0z" />
      </svg>
      <svg
        viewBox="0 0 8 5"
        className={`h-[5px] w-2 fill-current transition-colors duration-240 ${cor(direcao === "desc")}`}
      >
        <path d="M0 0h8L4 5z" />
      </svg>
    </span>
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

      <div className="space-y-6">
        <CardDoAutor autor={sugestao.autor} />
        <Avaliacao
          exigeNotaParaRejeitar
          aceitar={(nota) => aprovarProposta(sugestao.id, nota)}
          rejeitar={(nota) => rejeitarProposta(sugestao.id, nota ?? "")}
          concluir={concluir}
        />
      </div>
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

      <div className="space-y-6">
        <CardDoAutor autor={sugestao.autor} />
        <Avaliacao
          exigeNotaParaRejeitar
          aceitar={(nota) => aprovarFoto(sugestao.id, nota)}
          rejeitar={(nota) => removerFoto(sugestao.id, nota ?? "")}
          avisoAoRejeitar="Rejeitar apaga a foto e o arquivo, sem volta. O motivo vai por e-mail a quem enviou."
          concluir={concluir}
        />
      </div>
    </div>
  );
}

/**
 * Quem enviou a sugestão, com tudo o que a pessoa cadastrou — inclusive o que
 * ela não marcou como público.
 */
function CardDoAutor({ autor }: { autor: AutorDaSugestao | null }) {
  if (!autor) {
    return (
      <section className="rounded-lg border border-bg-border p-4 text-sm italic text-muted-foreground/70">
        Quem enviou removeu a conta.
      </section>
    );
  }

  const citacao =
    autor.creditoNome === "outro"
      ? (autor.creditoNomeOutro ?? CREDITO_DE_NOME_LABEL.outro)
      : CREDITO_DE_NOME_LABEL[autor.creditoNome];

  const linhas: { rotulo: string; valor: React.ReactNode }[] = [
    { rotulo: "Citação", valor: citacao },
    {
      rotulo: "Região",
      valor: autor.regiao,
    },
    {
      rotulo: "Perfil",
      valor: rotuloDoPerfilDeUso(
        autor.perfilDeUso,
        autor.perfilDeUsoOutro,
        autor.tratamento,
      ),
    },
    {
      rotulo: "Experiência",
      valor: autor.experiencia ? EXPERIENCIA_LABEL[autor.experiencia] : null,
    },
    { rotulo: "Instagram", valor: linkDoPerfil(autor.linkInstagram) },
    { rotulo: "Site", valor: linkDoPerfil(autor.linkSite) },
    { rotulo: "Lattes", valor: linkDoPerfil(autor.linkLattes) },
  ];

  return (
    <section className="space-y-3 rounded-lg border border-bg-border bg-bg-surface1 p-4">
      <div className="flex items-center gap-3">
        <AvatarDoUsuario
          nome={autor.nome}
          imagem={autor.imagem}
          className="size-11 text-base"
        />
        <div className="min-w-0">
          <p className="truncate font-medium">{autor.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {autor.email}
          </p>
        </div>
      </div>

      <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {rotuloDoPapel(autor.papel, autor.tratamento)} · na comunidade desde{" "}
        {DATA.format(autor.criadoEm)}
      </p>

      {autor.bio && (
        <p className="text-sm leading-[1.6] text-muted-foreground">
          {autor.bio}
        </p>
      )}

      <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        {linhas.map(({ rotulo, valor }) => (
          <Fragment key={rotulo}>
            <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              {rotulo}
            </dt>
            <dd
              className={`min-w-0 break-words ${valor ? "" : "italic text-muted-foreground/60"}`}
            >
              {valor ?? "não informado"}
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}

function linkDoPerfil(url: string | null) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {url.replace(/^https?:\/\/(www\.)?/, "")}
    </a>
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
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
