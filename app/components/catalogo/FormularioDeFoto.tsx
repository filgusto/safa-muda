"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ImagePlus } from "lucide-react";
import { adicionarFoto } from "@/app/actions/fotos.ts";
import {
  TAGS_DE_FOTO,
  TAG_DE_FOTO_LABEL,
  type TagDeFoto,
} from "@/core/fotos.ts";

/**
 * Envio de foto para uma espécie.
 *
 * O arquivo vai do navegador direto ao MinIO por URL pré-assinada (ver
 * lib/storage.ts) e só depois o vínculo é gravado — assim uma foto de celular
 * de 10 MB nunca passa pela memória do processo Next.
 *
 * Crédito e texto alternativo são obrigatórios: o primeiro porque foto sem
 * autoria declarada é dado sem proveniência, o segundo porque a ficha precisa
 * ser legível por leitor de tela.
 */
export function FormularioDeFoto({
  slug,
  moderador,
}: {
  slug: string;
  moderador: boolean;
}) {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [credito, setCredito] = useState("");
  const [tag, setTag] = useState<TagDeFoto>("adulta");
  const [legenda, setLegenda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function escolher(selecionado: File | null) {
    setArquivo(selecionado);
    setPrevia(selecionado ? URL.createObjectURL(selecionado) : null);
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!arquivo) return;

    setEnviando(true);
    setErro(null);
    setAviso(null);

    try {
      const preparo = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: arquivo.name,
          contentType: arquivo.type,
          size: arquivo.size,
          alt,
        }),
      });

      if (!preparo.ok) {
        const corpo = await preparo.json().catch(() => null);
        throw new Error(corpo?.error ?? "Falha ao preparar o envio.");
      }

      const { mediaId, uploadUrl } = await preparo.json();

      const envio = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": arquivo.type },
        body: arquivo,
      });
      if (!envio.ok) throw new Error("Falha ao enviar a imagem.");

      const resultado = await adicionarFoto({
        slug,
        mediaId,
        credito,
        tag,
        legenda: legenda || null,
      });
      if (!resultado.ok) throw new Error(resultado.erro ?? "Falha ao salvar.");

      escolher(null);
      setAlt("");
      setCredito("");
      setTag("adulta");
      setLegenda("");
      setAviso(
        moderador
          ? "Foto publicada."
          : "Foto enviada. Um moderador avalia antes de publicar.",
      );
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha no envio.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <label className="block">
        <span className={ROTULO}>
          Imagem <span className="text-destructive">*</span>
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          required
          onChange={(evento) => escolher(evento.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          JPEG, PNG, WebP ou AVIF, até 15 MB.
        </span>
      </label>

      {previa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previa}
          alt=""
          className="aspect-[4/3] w-full max-w-sm rounded-lg border border-bg-border object-cover"
        />
      )}

      <label className="block">
        <span className={ROTULO}>
          Descrição da imagem <span className="text-destructive">*</span>
        </span>
        <input
          value={alt}
          onChange={(evento) => setAlt(evento.target.value)}
          required
          maxLength={500}
          placeholder="Árvore adulta em pomar, vista de baixo"
          className={CAMPO}
        />
      </label>

      <label className="block">
        <span className={ROTULO}>
          Fase da planta <span className="text-destructive">*</span>
        </span>
        <select
          value={tag}
          onChange={(evento) => setTag(evento.target.value as TagDeFoto)}
          className={CAMPO}
        >
          {TAGS_DE_FOTO.map((valor) => (
            <option key={valor} value={valor}>
              {TAG_DE_FOTO_LABEL[valor]}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted-foreground">
          O que a foto retrata. &ldquo;Diversas&rdquo; para o que não se encaixa
          em nenhuma delas — tronco, casca, folha, o pé no consórcio.
        </span>
      </label>

      <label className="block">
        <span className={ROTULO}>
          Crédito <span className="text-destructive">*</span>
        </span>
        <input
          value={credito}
          onChange={(evento) => setCredito(evento.target.value)}
          required
          minLength={2}
          maxLength={200}
          placeholder="Foto de Maria Silva, CC BY-SA 4.0"
          className={CAMPO}
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          Quem fotografou, ou de onde veio e sob qual licença.
        </span>
      </label>

      <label className="block">
        <span className={ROTULO}>Legenda</span>
        <input
          value={legenda}
          onChange={(evento) => setLegenda(evento.target.value)}
          maxLength={300}
          placeholder="Opcional: o que a foto mostra da planta"
          className={CAMPO}
        />
      </label>

      {erro && (
        <p className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-900 dark:text-red-200">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="rounded-lg border-l-4 border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-900 dark:text-emerald-200">
          {aviso}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || !arquivo}
        className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-8 py-2.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-bg-base active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        {enviando ? (
          <Loader2 size={16} className="mr-2 animate-spin" />
        ) : (
          <ImagePlus size={16} className="mr-2" />
        )}
        Enviar foto
      </button>
    </form>
  );
}

const ROTULO =
  "mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground";

const CAMPO =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
