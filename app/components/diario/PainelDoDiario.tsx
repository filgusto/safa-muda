"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, NotebookPen } from "lucide-react";
import {
  EVENTO_LABEL,
  agruparPorMes,
  totaisDeColheita,
  type TipoDeEvento,
} from "@/core/diario.ts";
import { removerEvento } from "@/app/actions/diario.ts";
import { FormularioDeEvento } from "./FormularioDeEvento.tsx";
import type { EventoComContexto } from "@/lib/diario.ts";
import type { PlantioLocal } from "@/components/planejador/tipos.ts";

/**
 * Diário de campo: o que aconteceu, em ordem cronológica inversa.
 *
 * É a vista que fecha o ciclo do produto — o planejamento diz o que deveria
 * acontecer, e aqui se registra o que aconteceu de fato.
 */
export function PainelDoDiario({
  projectId,
  eventos,
  plantios,
  areas,
  podeEditar,
}: {
  projectId: string;
  eventos: EventoComContexto[];
  plantios: PlantioLocal[];
  areas: { id: string; nome: string }[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [registrando, setRegistrando] = useState(false);
  const [filtro, setFiltro] = useState<TipoDeEvento | "">("");

  const atualizar = useCallback(() => router.refresh(), [router]);

  const filtrados = useMemo(
    () => (filtro ? eventos.filter((item) => item.tipo === filtro) : eventos),
    [eventos, filtro],
  );

  const grupos = useMemo(() => agruparPorMes(filtrados), [filtrados]);
  const colheitas = useMemo(() => totaisDeColheita(eventos), [eventos]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2 border-b border-bg-border px-4 py-2">
          <select
            value={filtro}
            onChange={(evento) =>
              setFiltro(evento.target.value as TipoDeEvento | "")
            }
            aria-label="Filtrar registros"
            className="rounded-md border border-border bg-bg-surface1 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos os registros</option>
            {Object.entries(EVENTO_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>

          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            <span className="metric">{filtrados.length}</span> registro(s)
          </span>

          {podeEditar && !registrando && (
            <button
              type="button"
              onClick={() => setRegistrando(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Plus size={12} />
              Registrar
            </button>
          )}
        </div>

        {eventos.length === 0 && !registrando ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-[48ch] text-center">
              <NotebookPen
                size={26}
                className="mx-auto mb-3 text-primary/60"
                aria-hidden="true"
              />
              <p className="text-sm leading-[1.7] text-muted-foreground">
                Nada registrado ainda. O diário é o que transforma o desenho em
                acompanhamento: anote o que plantou, podou e colheu, e o
                planejamento passa a conversar com o que está no chão.
              </p>
            </div>
          </div>
        ) : (
          <ol className="divide-y divide-border/40">
            {grupos.map((grupo) => (
              <li key={grupo.chave}>
                <h3 className="sticky top-0 z-10 bg-bg-surface1/90 px-4 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-primary backdrop-blur">
                  {formatarMes(grupo.chave)}
                </h3>
                <ul className="divide-y divide-border/30">
                  {grupo.eventos.map((evento) => (
                    <Registro
                      key={evento.id}
                      evento={evento}
                      projectId={projectId}
                      podeEditar={podeEditar}
                      onRemovido={atualizar}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>

      <aside className="min-h-0 w-full overflow-y-auto border-l border-bg-border bg-bg-surface1/40 p-4 lg:w-80">
        {registrando && podeEditar ? (
          <>
            <h3 className="mb-3 font-mono text-[0.65rem] uppercase tracking-widest text-primary">
              Novo registro
            </h3>
            <FormularioDeEvento
              projectId={projectId}
              plantios={plantios}
              areas={areas}
              onRegistrado={() => {
                setRegistrando(false);
                atualizar();
              }}
              onCancelar={() => setRegistrando(false)}
            />
          </>
        ) : (
          <>
            <h3 className="mb-3 font-mono text-[0.65rem] uppercase tracking-widest text-primary">
              Colheita acumulada
            </h3>
            {colheitas.length === 0 ? (
              <p className="text-[0.7rem] leading-[1.6] text-muted-foreground">
                Nenhuma colheita registrada.
              </p>
            ) : (
              <dl className="space-y-1.5">
                {colheitas.map((linha) => (
                  <div
                    key={linha.unidade}
                    className="flex justify-between gap-2"
                  >
                    <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                      {linha.unidade}
                    </dt>
                    <dd className="metric text-sm">
                      {linha.total.toLocaleString("pt-BR", {
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 text-[0.65rem] leading-[1.5] text-muted-foreground">
              Unidades não são convertidas entre si — somar quilos com maços
              daria um número sem significado.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

function Registro({
  evento,
  projectId,
  podeEditar,
  onRemovido,
}: {
  evento: EventoComContexto;
  projectId: string;
  podeEditar: boolean;
  onRemovido: () => void;
}) {
  const [removendo, setRemovendo] = useState(false);

  async function remover() {
    setRemovendo(true);
    const resultado = await removerEvento(evento.id, projectId);
    setRemovendo(false);
    if (resultado.ok) onRemovido();
  }

  return (
    <li className="flex gap-3 px-4 py-3">
      <span className="w-10 shrink-0 pt-0.5 font-mono text-[0.65rem] text-muted-foreground">
        {String(evento.ocorridoEm.getDate()).padStart(2, "0")}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-primary">
            {EVENTO_LABEL[evento.tipo]}
          </span>
          <span className="text-sm">{evento.sujeito}</span>
          {evento.quantidade !== null && (
            <span className="metric text-xs">
              {evento.quantidade.toLocaleString("pt-BR", {
                maximumFractionDigits: 2,
              })}
              {evento.unidade ? ` ${evento.unidade}` : ""}
            </span>
          )}
        </div>

        {evento.notas && (
          <p className="mt-1 text-xs leading-[1.6] text-muted-foreground">
            {evento.notas}
          </p>
        )}

        {evento.fotos.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {evento.fotos.map((foto) => (
              <li key={foto.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/media/${foto.key}`}
                  alt={foto.alt ?? ""}
                  loading="lazy"
                  className="h-16 w-16 rounded-md border border-bg-border object-cover"
                />
              </li>
            ))}
          </ul>
        )}

        {evento.autorNome && (
          <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground/70">
            {evento.autorNome}
          </p>
        )}
      </div>

      {podeEditar && (
        <button
          type="button"
          onClick={remover}
          disabled={removendo}
          aria-label="Remover registro"
          className="shrink-0 self-start rounded p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
        >
          <Trash2 size={13} />
        </button>
      )}
    </li>
  );
}

function formatarMes(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  return new Date(ano!, mes! - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}
