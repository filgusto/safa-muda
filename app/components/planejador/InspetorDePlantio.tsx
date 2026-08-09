"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { ESTRATOS, ESTRATO_LABEL, type Estrato } from "@/core/estratos.ts";
import { SUCESSAO_LABEL, type Sucessao } from "@/core/sucessao.ts";
import { editarPlantio, removerPlantio } from "@/app/actions/projetos.ts";
import type { PlantioLocal } from "./tipos.ts";

const INTENCOES = [
  { valor: "producao", rotulo: "Produção" },
  { valor: "materia_organica", rotulo: "Matéria orgânica" },
  { valor: "adubacao", rotulo: "Adubação" },
  { valor: "quebra_vento", rotulo: "Quebra-vento" },
  { valor: "servico", rotulo: "Serviço" },
];

export function InspetorDePlantio({
  plantio,
  projectId,
  podeEditar,
  mesParaData,
  onFechar,
}: {
  plantio: PlantioLocal;
  projectId: string;
  podeEditar: boolean;
  mesParaData: (mes: number) => string;
  onFechar: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aplicar(mudancas: Record<string, unknown>) {
    setSalvando(true);
    setErro(null);
    const resultado = await editarPlantio({
      id: plantio.id,
      projectId,
      ...mudancas,
    });
    setSalvando(false);
    if (!resultado.ok) setErro(resultado.erro ?? "Não foi possível salvar.");
  }

  async function remover() {
    setSalvando(true);
    const resultado = await removerPlantio(plantio.id, projectId);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível remover.");
      return;
    }
    onFechar();
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-bg-border bg-bg-surface1/40 lg:w-72">
      <div className="border-b border-bg-border p-4">
        <h2 className="font-semibold leading-snug">{plantio.nomeComum}</h2>
        <p className="font-mono text-xs italic text-secondary">
          {plantio.nomeCientifico}
        </p>
        <Link
          href={`/catalogo/${plantio.slug}`}
          target="_blank"
          className="mt-2 inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver no catálogo
          <ExternalLink size={11} />
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <Campo rotulo="Período">
          <p className="text-sm">
            mês {plantio.mesInicio} a {plantio.mesFim}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mesParaData(plantio.mesInicio)} → {mesParaData(plantio.mesFim)}
          </p>
        </Campo>

        <Campo rotulo="Sucessão">
          <p className="text-sm">
            {plantio.sucessao
              ? (SUCESSAO_LABEL[plantio.sucessao as Sucessao] ??
                plantio.sucessao)
              : "não informada"}
          </p>
        </Campo>

        <Campo rotulo="Estrato">
          <select
            value={plantio.estrato}
            disabled={!podeEditar || salvando}
            onChange={(evento) =>
              aplicar({ estrato: evento.target.value as Estrato })
            }
            className="w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
          >
            {ESTRATOS.map((valor) => (
              <option key={valor} value={valor}>
                {ESTRATO_LABEL[valor]}
              </option>
            ))}
          </select>

          {plantio.estratoForcado && plantio.estratoDaEspecie && (
            <p className="mt-2 flex gap-1.5 rounded-lg border-l-4 border-amber-500/30 bg-amber-500/5 p-2.5 text-xs leading-[1.6] text-amber-900 dark:text-amber-200">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                O catálogo indica{" "}
                {ESTRATO_LABEL[plantio.estratoDaEspecie as Estrato]}. Conduzir
                noutro andar é possível, mas exige manejo.
              </span>
            </p>
          )}

          {plantio.estratoDaEspecie === null && (
            <p className="mt-2 text-xs leading-[1.6] text-muted-foreground">
              Esta espécie não tem estrato informado no catálogo.{" "}
              <Link
                href={`/catalogo/${plantio.slug}/sugerir`}
                className="bio-link"
              >
                Sugerir correção
              </Link>
            </p>
          )}
        </Campo>

        <Campo rotulo="Intenção">
          <select
            value={plantio.intencao ?? ""}
            disabled={!podeEditar || salvando}
            onChange={(evento) =>
              aplicar({ intencao: evento.target.value || null })
            }
            className="w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
          >
            <option value="">não definida</option>
            {INTENCOES.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Notas">
          <textarea
            defaultValue={plantio.notas ?? ""}
            disabled={!podeEditar || salvando}
            rows={3}
            onBlur={(evento) => {
              const valor = evento.target.value.trim();
              if (valor !== (plantio.notas ?? ""))
                aplicar({ notas: valor || null });
            }}
            className="w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
          />
        </Campo>

        {erro && (
          <p
            role="alert"
            className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-2.5 text-xs text-red-900 dark:text-red-200"
          >
            {erro}
          </p>
        )}
      </div>

      {podeEditar && (
        <div className="border-t border-bg-border p-4">
          <button
            type="button"
            onClick={remover}
            disabled={salvando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive transition-colors duration-240 hover:bg-destructive/10 disabled:opacity-50"
          >
            {salvando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Remover do planejamento
          </button>
        </div>
      )}
    </aside>
  );
}

function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </span>
      {children}
    </div>
  );
}
