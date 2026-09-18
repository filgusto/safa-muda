"use client";

import { useState } from "react";
import { Sprout, Loader2, Unlink } from "lucide-react";
import { contarMudas } from "@/core/croqui.ts";
import {
  posicionarPlantio,
  desposicionarPlantio,
} from "@/app/actions/espaco.ts";
import type { AreaComLinhas, PlantioEspacial } from "@/lib/espaco.ts";

/**
 * Liga um plantio da timeline a um trecho de linha do mapa.
 *
 * É a costura entre as duas vistas: o mesmo registro tem extensão no tempo
 * (timeline) e no espaço (aqui). Grava a REGRA de posicionamento, não as
 * posições — 800 mudas viram uma linha no banco (docs/PLANO.md §3.3).
 */
export function PosicionarPlantios({
  projectId,
  area,
  plantios,
  podeEditar,
  onMudanca,
}: {
  projectId: string;
  area: AreaComLinhas;
  plantios: PlantioEspacial[];
  podeEditar: boolean;
  onMudanca: () => void;
}) {
  const linhasDePlantio = area.linhas.filter(
    (linha) => linha.tipo === "plantio",
  );

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-primary">
        <Sprout size={13} />
        Plantios no mapa
      </h3>

      {plantios.length === 0 ? (
        <p className="text-[0.7rem] leading-[1.6] text-muted-foreground">
          Nenhum plantio ainda. Adicione espécies na timeline primeiro — cada
          plantio tem um tempo antes de ter um lugar.
        </p>
      ) : linhasDePlantio.length === 0 ? (
        <p className="text-[0.7rem] leading-[1.6] text-muted-foreground">
          Nenhuma linha de plantio na área. Gere ou desenhe linhas para poder
          posicionar as espécies.
        </p>
      ) : (
        <ul className="space-y-2">
          {plantios.map((plantio) => (
            <ItemDePlantio
              key={plantio.id}
              plantio={plantio}
              projectId={projectId}
              linhas={linhasDePlantio}
              podeEditar={podeEditar}
              onMudanca={onMudanca}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemDePlantio({
  plantio,
  projectId,
  linhas,
  podeEditar,
  onMudanca,
}: {
  plantio: PlantioEspacial;
  projectId: string;
  linhas: AreaComLinhas["linhas"];
  podeEditar: boolean;
  onMudanca: () => void;
}) {
  const posicionado = plantio.placement !== null;

  const [aberto, setAberto] = useState(false);
  const [rowId, setRowId] = useState(plantio.placement?.rowId ?? linhas[0]!.id);
  const [de, setDe] = useState(plantio.placement?.deMetros ?? 0);
  // Cai no espaçamento do catálogo quando existe — evita o usuário digitar um
  // número que a própria ficha da espécie já informa.
  const [ate, setAte] = useState(
    plantio.placement?.ateMetros ??
      linhas.find(
        (linha) => linha.id === (plantio.placement?.rowId ?? linhas[0]!.id),
      )?.comprimentoM ??
      0,
  );
  const [espacamento, setEspacamento] = useState(
    plantio.placement?.espacamentoM ?? plantio.espacamentoNaLinhaMinM ?? 1,
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const previsao = contarMudas({
    tipo: "linha",
    rowId,
    deMetros: de,
    ateMetros: ate,
    espacamentoM: espacamento,
  });

  const linhaEscolhida = linhas.find((linha) => linha.id === rowId);

  async function salvar() {
    setSalvando(true);
    setErro(null);

    const resultado = await posicionarPlantio({
      plantingId: plantio.id,
      projectId,
      rowId,
      deMetros: de,
      ateMetros: ate,
      espacamentoM: espacamento,
    });

    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível posicionar.");
      return;
    }
    setAberto(false);
    onMudanca();
  }

  async function desfazer() {
    setSalvando(true);
    await desposicionarPlantio(plantio.id, projectId);
    setSalvando(false);
    onMudanca();
  }

  return (
    <li className="rounded-md border border-bg-border bg-bg-surface1 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{plantio.nomeComum}</p>
          <p className="font-mono text-[0.6rem] text-muted-foreground">
            {posicionado
              ? `${contarMudas(plantio.placement!).toLocaleString("pt-BR")} mudas · linha ${
                  linhas.find((l) => l.id === plantio.placement!.rowId)
                    ?.rotulo ?? "?"
                }`
              : "sem lugar no mapa"}
          </p>
        </div>

        {podeEditar && (
          <div className="flex shrink-0 gap-1">
            {posicionado && (
              <button
                type="button"
                onClick={desfazer}
                aria-label="Tirar do mapa"
                disabled={salvando}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                <Unlink size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setAberto((anterior) => !anterior)}
              className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase text-muted-foreground transition-colors hover:text-foreground"
            >
              {aberto ? "fechar" : posicionado ? "ajustar" : "posicionar"}
            </button>
          </div>
        )}
      </div>

      {aberto && podeEditar && (
        <div className="mt-2 space-y-2 border-t border-bg-border pt-2">
          <label className="block">
            <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
              Linha
            </span>
            <select
              value={rowId}
              onChange={(evento) => {
                setRowId(evento.target.value);
                const nova = linhas.find(
                  (linha) => linha.id === evento.target.value,
                );
                if (nova)
                  setAte(Math.min(ate, nova.comprimentoM) || nova.comprimentoM);
              }}
              className={CLASSE}
            >
              {linhas.map((linha) => (
                <option key={linha.id} value={linha.id}>
                  {linha.rotulo ?? linha.id.slice(0, 6)} —{" "}
                  {linha.comprimentoM.toFixed(1)} m
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            <Numero
              rotulo="De (m)"
              valor={de}
              onChange={setDe}
              min={0}
              passo={0.5}
            />
            <Numero
              rotulo="Até (m)"
              valor={ate}
              onChange={setAte}
              min={0}
              max={linhaEscolhida?.comprimentoM}
              passo={0.5}
            />
            <Numero
              rotulo="Espaç."
              valor={espacamento}
              onChange={setEspacamento}
              min={0.05}
              passo={0.05}
            />
          </div>

          <p className="font-mono text-[0.65rem] text-muted-foreground">
            <span className="metric">{previsao.toLocaleString("pt-BR")}</span>{" "}
            mudas neste trecho
          </p>

          {erro && (
            <p role="alert" className="text-[0.65rem] text-destructive">
              {erro}
            </p>
          )}

          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-primary px-3 py-1 text-[0.7rem] font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {salvando && <Loader2 size={11} className="animate-spin" />}
            Aplicar
          </button>
        </div>
      )}
    </li>
  );
}

const CLASSE =
  "w-full rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Numero({
  rotulo,
  valor,
  onChange,
  min,
  max,
  passo,
}: {
  rotulo: string;
  valor: number;
  onChange: (valor: number) => void;
  min: number;
  max?: number;
  passo: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </span>
      <input
        type="number"
        value={valor}
        min={min}
        max={max}
        step={passo}
        onChange={(evento) => onChange(Number(evento.target.value))}
        className={CLASSE}
      />
    </label>
  );
}
