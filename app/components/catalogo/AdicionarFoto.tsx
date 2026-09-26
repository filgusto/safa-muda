"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ImagePlus, Loader2, Plus, Upload, X } from "lucide-react";
import { TAG_DE_FOTO_LABEL, type TagDeFoto } from "@/core/fotos.ts";
import { SeletorDeFase } from "@/components/catalogo/SeletorDeFase.tsx";
import { comprimirParaEnvio } from "@/lib/comprimir-imagem.ts";
import { useModoDeEdicao } from "@/components/wiki/ModoDeEdicao.tsx";
import {
  useWikimediaPrevia,
  PainelDeLinkDoWikimedia,
} from "@/components/catalogo/LinkDoWikimedia.tsx";
import { cn } from "@/lib/utils.ts";

const TIPOS_ACEITOS = ["image/jpeg", "image/png"];

type Preparada = {
  arquivo: File;
  previa: string;
  tamanhoOriginal: number;
};

/**
 * Botão "+" ao lado de "Fotos", visível só no modo de edição. Abre um modal
 * por cima da ficha para arrastar uma imagem, que é reduzida no navegador até
 * 1 MB (ver lib/comprimir-imagem.ts).
 *
 * A foto não sobe na hora: entra no rascunho do modo de edição e só vai ao
 * MinIO em "Salvar e enviar", junto com as alterações dos campos — descartar a
 * edição descarta a foto também. No envio, a de quem não é da equipe entra
 * pendente (/admin/sugestoes); a da equipe entra publicada — ver
 * `adicionarFoto`.
 */
export function BotaoAdicionarFoto({
  nomeDaEspecie,
}: {
  nomeDaEspecie: string;
}) {
  const { ativo } = useModoDeEdicao();
  const [aberto, setAberto] = useState(false);

  if (!ativo) return null;

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <Dialog.Trigger
        aria-label="Adicionar foto"
        title="Adicionar foto"
        className="flex size-5 items-center justify-center rounded-md border border-primary/40 text-primary normal-case tracking-normal transition-colors duration-240 hover:bg-primary hover:text-primary-foreground"
      >
        <Plus size={13} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg-base/60 duration-240 animate-in fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88dvh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-bg-border bg-bg-surface1 shadow-2xl duration-240 animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <Dialog.Title className="font-serif text-xl font-semibold tracking-tight">
                Adicionar foto
              </Dialog.Title>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {nomeDaEspecie}
              </p>
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
            >
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-6 pb-6 pt-5">
            {/* Remontado a cada abertura: o formulário sempre começa vazio. */}
            {aberto && <FormularioDeEnvio fechar={() => setAberto(false)} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FormularioDeEnvio({ fechar }: { fechar: () => void }) {
  const { incluirFoto } = useModoDeEdicao();

  const [fonte, setFonte] = useState<"arquivo" | "wikimedia">("arquivo");
  const entrada = useRef<HTMLInputElement>(null);
  const [preparada, setPreparada] = useState<Preparada | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [etapa, setEtapa] = useState<"escolha" | "comprimindo">("escolha");
  const [tag, setTag] = useState<TagDeFoto | "">("");
  const [credito, setCredito] = useState("");
  const [legenda, setLegenda] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const wikimedia = useWikimediaPrevia((previa) => setCredito(previa.credito));
  const rotuloDaFase = useId();

  // A prévia é um object URL: sem revogar, cada troca de imagem vaza memória.
  // A que foi entregue ao rascunho passa a ser dele (ver ModoDeEdicao.tsx).
  const entregue = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (preparada && preparada.previa !== entregue.current) {
        URL.revokeObjectURL(preparada.previa);
      }
    };
  }, [preparada]);

  async function receber(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro("Envie uma imagem JPG ou PNG.");
      return;
    }

    setEtapa("comprimindo");
    try {
      const comprimido = await comprimirParaEnvio(arquivo);
      setPreparada({
        arquivo: comprimido,
        previa: URL.createObjectURL(comprimido),
        tamanhoOriginal: arquivo.size,
      });
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Falha ao processar a imagem.",
      );
    } finally {
      setEtapa("escolha");
    }
  }

  function incluir(evento: React.FormEvent) {
    evento.preventDefault();
    if (!tag) return;

    if (fonte === "arquivo") {
      if (!preparada) return;
      // Já comprimida na escolha; sobe só em "Salvar e enviar".
      entregue.current = preparada.previa;
      incluirFoto({
        fonte: "upload",
        arquivo: preparada.arquivo,
        previa: preparada.previa,
        tag,
        credito: credito.trim(),
        legenda: legenda.trim() || null,
      });
    } else {
      if (!wikimedia.previa) return;
      incluirFoto({
        fonte: "wikimedia",
        url: wikimedia.url.trim(),
        previa: wikimedia.previa.thumbUrl,
        tag,
        credito: credito.trim(),
        legenda: legenda.trim() || null,
      });
    }
    fechar();
  }

  const ocupado = etapa !== "escolha";
  const pronta =
    fonte === "arquivo" ? preparada !== null : wikimedia.previa !== null;

  return (
    <form onSubmit={incluir} className="space-y-5">
      <div className="flex gap-1.5 rounded-md border border-border p-1">
        {(["arquivo", "wikimedia"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setFonte(opcao)}
            className={cn(
              "flex-1 rounded-[5px] px-3 py-1.5 text-sm transition-colors duration-240",
              fonte === opcao
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-bg-surface2 hover:text-foreground",
            )}
          >
            {opcao === "arquivo" ? "Enviar arquivo" : "Link do Wikimedia"}
          </button>
        ))}
      </div>

      {fonte === "arquivo" ? (
        <>
          <input
            ref={entrada}
            type="file"
            accept={TIPOS_ACEITOS.join(",")}
            className="sr-only"
            tabIndex={-1}
            onChange={(evento) => {
              void receber(evento.target.files?.[0]);
              // Permite escolher de novo o mesmo arquivo depois de um erro.
              evento.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={ocupado}
            onClick={() => entrada.current?.click()}
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(evento) => {
              evento.preventDefault();
              setArrastando(false);
              void receber(evento.dataTransfer.files[0]);
            }}
            className={`relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors duration-240 disabled:pointer-events-none ${
              preparada ? "aspect-[4/3]" : "aspect-[16/9]"
            } ${
              arrastando
                ? "border-primary bg-primary/10"
                : "border-bg-border hover:border-primary/50 hover:bg-bg-surface2/50"
            }`}
          >
            {preparada ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preparada.previa}
                  alt="Prévia da foto escolhida"
                  className="absolute inset-0 size-full object-cover"
                />
                <span className="absolute bottom-2 right-2 rounded-md bg-bg-base/80 px-2 py-1 font-mono text-[0.65rem] text-foreground">
                  Trocar imagem
                </span>
              </>
            ) : etapa === "comprimindo" ? (
              <>
                <Loader2 size={22} className="animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Reduzindo a imagem…
                </span>
              </>
            ) : (
              <>
                <Upload size={22} className="text-primary" />
                <span className="text-sm">
                  Arraste uma imagem aqui ou{" "}
                  <span className="text-primary underline underline-offset-4">
                    escolha um arquivo
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  JPG ou PNG. Acima de 1 MB, a imagem é reduzida
                  automaticamente.
                </span>
              </>
            )}
          </button>

          {preparada && (
            <p className="-mt-3 font-mono text-[0.65rem] text-muted-foreground">
              {preparada.tamanhoOriginal > preparada.arquivo.size
                ? `Reduzida de ${formatarBytes(preparada.tamanhoOriginal)} para ${formatarBytes(preparada.arquivo.size)}.`
                : formatarBytes(preparada.arquivo.size)}
            </p>
          )}
        </>
      ) : (
        <PainelDeLinkDoWikimedia
          url={wikimedia.url}
          setUrl={wikimedia.setUrl}
          buscar={wikimedia.buscar}
          buscando={wikimedia.buscando}
          erro={wikimedia.erro}
          previa={wikimedia.previa}
        />
      )}

      <div>
        <span id={rotuloDaFase} className={ROTULO}>
          Fase da planta <span className="text-destructive">*</span>
        </span>
        <SeletorDeFase
          valor={tag}
          aoEscolher={setTag}
          rotuladoPor={rotuloDaFase}
          obrigatorio
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          O que a foto retrata. &ldquo;Diversas&rdquo; para o que não se encaixa
          em nenhuma delas — tronco, casca, folha, o pé no consórcio.
        </span>
      </div>

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
        <p
          role="alert"
          className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={fechar}
          className="rounded-md px-4 py-1.5 text-sm text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={ocupado || !pronta}
          className={BOTAO_PRINCIPAL}
        >
          <ImagePlus size={14} />
          Adicionar às alterações
        </button>
      </div>
    </form>
  );
}

/**
 * As fotos no rascunho do modo de edição, abaixo do carrossel: ainda não
 * subiram, e dá para tirar qualquer uma antes do envio.
 */
export function FotosPendentes() {
  const { ativo, fotos, tirarFoto } = useModoDeEdicao();
  if (!ativo || fotos.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap gap-3">
      {fotos.map((foto) => (
        <li
          key={foto.id}
          className="relative w-36 overflow-hidden rounded-xl border border-dashed border-primary/60 duration-240 animate-in fade-in-0 zoom-in-95"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto.previa}
            alt={foto.legenda ?? "Foto a enviar"}
            className="aspect-[4/3] w-full object-cover"
          />
          <span className="absolute left-1.5 top-1.5 rounded-md bg-primary px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-primary-foreground">
            nova
          </span>
          <button
            type="button"
            onClick={() => tirarFoto(foto.id)}
            aria-label="Tirar esta foto das alterações"
            title="Tirar esta foto das alterações"
            className="absolute right-1.5 top-1.5 rounded-md bg-bg-base/80 p-1 text-foreground transition-colors duration-240 hover:bg-red-500 hover:text-white"
          >
            <X size={12} />
          </button>
          <p className="truncate px-2 py-1.5 font-mono text-[0.65rem] text-muted-foreground">
            {TAG_DE_FOTO_LABEL[foto.tag]}
          </p>
        </li>
      ))}
    </ul>
  );
}

function formatarBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

const ROTULO =
  "mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground";

const CAMPO =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const BOTAO_PRINCIPAL =
  "inline-flex items-center gap-1.5 rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
