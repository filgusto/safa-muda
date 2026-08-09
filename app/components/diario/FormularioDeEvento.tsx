"use client";

import { useState } from "react";
import { Loader2, Camera, X } from "lucide-react";
import {
  TIPOS_DE_EVENTO,
  EVENTO_LABEL,
  EVENTO_COM_QUANTIDADE,
  UNIDADE_SUGERIDA,
  type TipoDeEvento,
} from "@/core/diario.ts";
import { registrarEvento } from "@/app/actions/diario.ts";
import type { PlantioLocal } from "@/components/planejador/tipos.ts";

/**
 * Registro de um acontecimento no campo.
 *
 * O sujeito é opcional: sem escolher nada, o evento é do projeto inteiro (uma
 * roçada geral). Escolhendo um plantio, é do consórcio; informando o número da
 * muda, é daquela planta — e só nesse caso o indivíduo passa a existir no banco.
 */
export function FormularioDeEvento({
  projectId,
  plantios,
  areas,
  plantioSugerido,
  onRegistrado,
  onCancelar,
}: {
  projectId: string;
  plantios: PlantioLocal[];
  areas: { id: string; nome: string }[];
  plantioSugerido?: string;
  onRegistrado: () => void;
  onCancelar?: () => void;
}) {
  const [tipo, setTipo] = useState<TipoDeEvento>("plantio");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [plantingId, setPlantingId] = useState(plantioSugerido ?? "");
  const [areaId, setAreaId] = useState("");
  const [indice, setIndice] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState(UNIDADE_SUGERIDA.plantio ?? "");
  const [notas, setNotas] = useState("");
  const [fotos, setFotos] = useState<{ id: string; url: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pedeQuantidade = EVENTO_COM_QUANTIDADE.has(tipo);

  function trocarTipo(novo: TipoDeEvento) {
    setTipo(novo);
    setUnidade(UNIDADE_SUGERIDA[novo] ?? "");
  }

  async function subirFoto(arquivo: File) {
    setSubindo(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: arquivo.name,
          contentType: arquivo.type,
          size: arquivo.size,
          alt: `Foto de ${EVENTO_LABEL[tipo].toLowerCase()}`,
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(corpo?.error ?? "Falha ao preparar o envio.");
      }

      const { mediaId, uploadUrl, publicUrl } = await resposta.json();

      const envio = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": arquivo.type },
        body: arquivo,
      });
      if (!envio.ok) throw new Error("Falha ao enviar a imagem.");

      setFotos((anterior) => [...anterior, { id: mediaId, url: publicUrl }]);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha no envio.");
    } finally {
      setSubindo(false);
    }
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const resultado = await registrarEvento({
      projectId,
      tipo,
      ocorridoEm: data,
      quantidade: quantidade === "" ? null : Number(quantidade),
      unidade: unidade || null,
      notas: notas || null,
      plantingId: plantingId || null,
      areaId: plantingId ? null : areaId || null,
      indiceDoIndividuo: indice === "" ? null : Number(indice) - 1,
      mediaIds: fotos.map((foto) => foto.id),
    });

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível registrar.");
      return;
    }

    setQuantidade("");
    setNotas("");
    setIndice("");
    setFotos([]);
    onRegistrado();
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Campo rotulo="Manejo">
          <select
            value={tipo}
            onChange={(evento) =>
              trocarTipo(evento.target.value as TipoDeEvento)
            }
            className={CLASSE}
          >
            {TIPOS_DE_EVENTO.map((valor) => (
              <option key={valor} value={valor}>
                {EVENTO_LABEL[valor]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Quando">
          <input
            type="date"
            value={data}
            required
            onChange={(evento) => setData(evento.target.value)}
            className={CLASSE}
          />
        </Campo>
      </div>

      <Campo rotulo="Onde">
        <select
          value={plantingId}
          onChange={(evento) => {
            setPlantingId(evento.target.value);
            setIndice("");
          }}
          className={CLASSE}
        >
          <option value="">— projeto inteiro —</option>
          {plantios.map((plantio) => (
            <option key={plantio.id} value={plantio.id}>
              {plantio.nomeComum} (mês {plantio.mesInicio}–{plantio.mesFim})
            </option>
          ))}
        </select>
      </Campo>

      {!plantingId && areas.length > 0 && (
        <Campo rotulo="Área (opcional)">
          <select
            value={areaId}
            onChange={(evento) => setAreaId(evento.target.value)}
            className={CLASSE}
          >
            <option value="">— todas —</option>
            {areas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}

      {plantingId && (
        <Campo
          rotulo="Muda específica (opcional)"
          ajuda="O número da planta na linha. Só preencha se o registro for de uma muda em particular."
        >
          <input
            type="number"
            min={1}
            value={indice}
            placeholder="ex.: 12"
            onChange={(evento) => setIndice(evento.target.value)}
            className={CLASSE}
          />
        </Campo>
      )}

      {pedeQuantidade && (
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Quanto">
            <input
              type="number"
              min={0}
              step="any"
              value={quantidade}
              onChange={(evento) => setQuantidade(evento.target.value)}
              className={CLASSE}
            />
          </Campo>
          <Campo rotulo="Unidade">
            <input
              type="text"
              value={unidade}
              onChange={(evento) => setUnidade(evento.target.value)}
              className={CLASSE}
            />
          </Campo>
        </div>
      )}

      <Campo rotulo="Observações">
        <textarea
          rows={2}
          value={notas}
          onChange={(evento) => setNotas(evento.target.value)}
          className={CLASSE}
        />
      </Campo>

      <div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
          {subindo ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Camera size={12} />
          )}
          Foto
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            disabled={subindo}
            onChange={(evento) => {
              const arquivo = evento.target.files?.[0];
              if (arquivo) subirFoto(arquivo);
              evento.target.value = "";
            }}
          />
        </label>

        {fotos.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {fotos.map((foto) => (
              <li key={foto.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt=""
                  className="h-14 w-14 rounded-md border border-bg-border object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFotos((anterior) =>
                      anterior.filter((item) => item.id !== foto.id),
                    )
                  }
                  aria-label="Remover foto"
                  className="absolute -right-1.5 -top-1.5 rounded-full border border-bg-border bg-background p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-2 text-xs text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando || subindo}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-primary px-4 py-1.5 text-xs font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-bg-base disabled:opacity-50"
        >
          {enviando && <Loader2 size={13} className="animate-spin" />}
          Registrar
        </button>
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

const CLASSE =
  "w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Campo({
  rotulo,
  ajuda,
  children,
}: {
  rotulo: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </span>
      {children}
      {ajuda && (
        <span className="mt-1 block text-[0.65rem] leading-[1.5] text-muted-foreground">
          {ajuda}
        </span>
      )}
    </label>
  );
}
