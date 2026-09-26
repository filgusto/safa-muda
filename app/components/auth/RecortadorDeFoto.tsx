"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { comprimirParaEnvio } from "@/lib/comprimir-imagem.ts";
import { sortearMensagemDeFoto } from "@/lib/mensagens-de-foto.ts";
import { cn } from "@/lib/utils.ts";
import {
  LIMITE_DA_FOTO_DE_PERFIL_BYTES,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  codificarFotoDePerfil,
  escalaBase,
  limitarEnquadramento,
  regiaoDeOrigem,
  type Enquadramento,
} from "@/lib/recorte-de-foto.ts";

/** Lado da área de recorte na tela e diâmetro do círculo dentro dela. */
const AREA_PX = 320;
const CIRCULO_PX = 256;

const ENQUADRAMENTO_INICIAL: Enquadramento = { zoom: 1, x: 0, y: 0 };

type Carregada = { bitmap: ImageBitmap; url: string };

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Modal da foto de perfil, em duas etapas. Primeiro a pessoa escolhe (ou
 * arrasta) a imagem; se passar de 500 KB, ela é reduzida ali mesmo. Só com a
 * imagem já dentro do limite aparece o enquadramento: arrastar move a imagem,
 * o controle de zoom aproxima, e o círculo mostra como a foto fica no site.
 * O resultado é um JPEG quadrado de até 500 KB (ver lib/recorte-de-foto.ts).
 *
 * `aoConfirmar` recebe o arquivo pronto e é quem envia; se lançar, a
 * mensagem aparece aqui e o modal continua aberto.
 */
export function RecortadorDeFoto({
  aberto,
  imagemAtual,
  publicaInicial,
  aoFechar,
  aoConfirmar,
  aoAlterarVisibilidade,
}: {
  aberto: boolean;
  /** Foto já enviada: o modal abre nela, para mudar só se é pública ou privada. */
  imagemAtual: string | null;
  /** Estado atual de "Tornar pública", que a chave do modal já mostra. */
  publicaInicial: boolean;
  aoFechar: () => void;
  aoConfirmar: (foto: File, publica: boolean) => Promise<void>;
  aoAlterarVisibilidade: (publica: boolean) => Promise<void>;
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={(novo) => !novo && aoFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg-base/60 duration-240 animate-in fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-bg-border bg-bg-surface1 p-6 shadow-2xl duration-240 animate-in fade-in-0 zoom-in-95"
        >
          {/* Remontado a cada abertura: sempre começa na escolha do arquivo. */}
          {aberto && (
            <Etapas
              imagemAtual={imagemAtual}
              publicaInicial={publicaInicial}
              aoFechar={aoFechar}
              aoConfirmar={aoConfirmar}
              aoAlterarVisibilidade={aoAlterarVisibilidade}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Chave "Tornar minha foto pública", igual no modal de foto nova e no da foto atual. */
function CaixaDeFotoPublica({
  publica,
  aoAlternar,
  desabilitado,
}: {
  publica: boolean;
  aoAlternar: () => void;
  desabilitado: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <label htmlFor="foto-publica" className="cursor-pointer text-sm">
        <span className="block font-medium text-foreground">
          Tornar minha foto pública
        </span>
        <span className="block text-xs text-muted-foreground">
          Se ligada, a comunidade Safa Muda vê a sua foto no seu card público.
        </span>
      </label>
      <button
        id="foto-publica"
        type="button"
        role="switch"
        aria-checked={publica}
        disabled={desabilitado}
        onClick={aoAlternar}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-240 disabled:opacity-60 ${
          publica
            ? "border-primary bg-primary/30"
            : "border-border bg-bg-surface2"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-[18px] rounded-full bg-foreground transition-transform duration-240 ${
            publica ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function Cabecalho({ titulo }: { titulo: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <Dialog.Title className="font-serif text-xl font-semibold tracking-tight">
        {titulo}
      </Dialog.Title>
      <Dialog.Close
        aria-label="Fechar"
        className="rounded-md p-1.5 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
      >
        <X size={16} />
      </Dialog.Close>
    </div>
  );
}

function Etapas({
  imagemAtual,
  publicaInicial,
  aoFechar,
  aoConfirmar,
  aoAlterarVisibilidade,
}: {
  imagemAtual: string | null;
  publicaInicial: boolean;
  aoFechar: () => void;
  aoConfirmar: (foto: File, publica: boolean) => Promise<void>;
  aoAlterarVisibilidade: (publica: boolean) => Promise<void>;
}) {
  const [pronta, setPronta] = useState<File | null>(null);
  // Com foto já enviada o modal abre nela; "Escolher outra foto" vai ao envio.
  const [escolhendoOutra, setEscolhendoOutra] = useState(false);
  const [publica, setPublica] = useState(publicaInicial);

  if (pronta) {
    return (
      <>
        <Cabecalho titulo="Enquadre sua foto" />
        <Editor
          key={`${pronta.name}-${pronta.size}-${pronta.lastModified}`}
          arquivo={pronta}
          publicaInicial={publica}
          aoFechar={aoFechar}
          aoConfirmar={aoConfirmar}
        />
      </>
    );
  }

  if (imagemAtual && !escolhendoOutra) {
    return (
      <>
        <Cabecalho titulo="Alterar foto" />
        <FotoAtual
          imagem={imagemAtual}
          publica={publica}
          aoAlternar={() => setPublica((atual) => !atual)}
          aoEscolherOutra={() => setEscolhendoOutra(true)}
          aoFechar={aoFechar}
          aoSalvar={() => aoAlterarVisibilidade(publica)}
          mudou={publica !== publicaInicial}
        />
      </>
    );
  }

  return (
    <>
      <Cabecalho titulo="Subir foto de perfil" />
      <EscolhaDoArquivo
        aoPreparar={setPronta}
        aoVoltar={imagemAtual ? () => setEscolhendoOutra(false) : undefined}
      />
    </>
  );
}

/**
 * A foto que já está no perfil, para mudar só a visibilidade dela ou partir
 * para outra imagem.
 */
function FotoAtual({
  imagem,
  publica,
  aoAlternar,
  aoEscolherOutra,
  aoFechar,
  aoSalvar,
  mudou,
}: {
  imagem: string;
  publica: boolean;
  aoAlternar: () => void;
  aoEscolherOutra: () => void;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
  mudou: boolean;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      await aoSalvar();
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Não foi possível salvar.",
      );
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imagem}
        alt="Sua foto de perfil"
        className="mx-auto size-40 rounded-full border border-border object-cover"
      />

      <CaixaDeFotoPublica
        publica={publica}
        aoAlternar={aoAlternar}
        desabilitado={salvando}
      />

      {erro && (
        <p
          role="alert"
          className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={aoEscolherOutra}
          disabled={salvando}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          Escolher outra foto
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={aoFechar}
            disabled={salvando}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || !mudou}
            className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-6 py-2 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {salvando && <Loader2 size={16} className="mr-2 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function EscolhaDoArquivo({
  aoPreparar,
  aoVoltar,
}: {
  aoPreparar: (arquivo: File) => void;
  /** Só existe quando já há uma foto para a qual voltar. */
  aoVoltar?: () => void;
}) {
  const seletor = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [reduzindo, setReduzindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function receber(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro("Use uma imagem JPG, PNG ou WebP.");
      return;
    }

    // Só avança para o enquadramento com a imagem já dentro do limite.
    setReduzindo(true);
    try {
      aoPreparar(
        await comprimirParaEnvio(arquivo, LIMITE_DA_FOTO_DE_PERFIL_BYTES),
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível preparar esta imagem.",
      );
      setReduzindo(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Suba uma fotinha sua. JPG, PNG ou WebP de até 500 KB. Imagens maiores
        serão reduzidas automaticamente.
      </p>

      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setArrastando(false);
          if (!reduzindo) void receber(evento.dataTransfer.files[0]);
        }}
        className={cn(
          "flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center transition-colors duration-240",
          arrastando
            ? "border-primary bg-primary/5"
            : "border-bg-border bg-bg-base/40",
        )}
      >
        {reduzindo ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Preparando a imagem…
            </p>
          </>
        ) : (
          <>
            <ImagePlus size={26} className="text-primary/60" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Arraste a imagem para cá
            </p>
            <button
              type="button"
              onClick={() => seletor.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-primary bg-transparent px-4 py-1.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground active:scale-[0.98]"
            >
              <Upload size={14} />
              Escolher arquivo
            </button>
          </>
        )}
      </div>

      <input
        ref={seletor}
        type="file"
        accept={TIPOS_ACEITOS.join(",")}
        aria-label="Escolher foto de perfil"
        className="hidden"
        onChange={(evento) => {
          const arquivo = evento.target.files?.[0];
          // Permite escolher o mesmo arquivo de novo depois de um erro.
          evento.target.value = "";
          void receber(arquivo);
        }}
      />

      {erro && (
        <p
          role="alert"
          className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}
      {aoVoltar && (
        <button
          type="button"
          onClick={aoVoltar}
          disabled={reduzindo}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          Voltar à foto atual
        </button>
      )}
    </div>
  );
}

function Editor({
  arquivo,
  publicaInicial,
  aoFechar,
  aoConfirmar,
}: {
  arquivo: File;
  publicaInicial: boolean;
  aoFechar: () => void;
  aoConfirmar: (foto: File, publica: boolean) => Promise<void>;
}) {
  // O Editor é remontado a cada foto, então cada foto ganha uma mensagem.
  const [mensagem] = useState(() => sortearMensagemDeFoto());
  const [imagem, setImagem] = useState<Carregada | null>(null);
  const [enquadramento, setEnquadramento] = useState(ENQUADRAMENTO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [publica, setPublica] = useState(publicaInicial);
  const arraste = useRef<{
    ponteiroX: number;
    ponteiroY: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let cancelado = false;
    let carregada: Carregada | null = null;

    // `from-image` aplica a rotação do EXIF, igual ao <img>: o que a pessoa
    // vê ao enquadrar é o que vai para o recorte.
    createImageBitmap(arquivo, { imageOrientation: "from-image" })
      .then((bitmap) => {
        const url = URL.createObjectURL(arquivo);
        carregada = { bitmap, url };
        if (cancelado) {
          bitmap.close();
          URL.revokeObjectURL(url);
          return;
        }
        setImagem(carregada);
      })
      .catch(() => {
        if (!cancelado) {
          setErro("Este navegador não conseguiu abrir esta imagem.");
        }
      });

    return () => {
      cancelado = true;
      if (carregada) {
        carregada.bitmap.close();
        URL.revokeObjectURL(carregada.url);
      }
    };
  }, [arquivo]);

  function atualizar(novo: Enquadramento) {
    if (!imagem) return;
    setEnquadramento(
      limitarEnquadramento(
        imagem.bitmap.width,
        imagem.bitmap.height,
        CIRCULO_PX,
        novo,
      ),
    );
  }

  function iniciarArraste(evento: React.PointerEvent<HTMLDivElement>) {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arraste.current = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      x: enquadramento.x,
      y: enquadramento.y,
    };
  }

  function arrastar(evento: React.PointerEvent<HTMLDivElement>) {
    const inicio = arraste.current;
    if (!inicio) return;
    atualizar({
      zoom: enquadramento.zoom,
      x: inicio.x + evento.clientX - inicio.ponteiroX,
      y: inicio.y + evento.clientY - inicio.ponteiroY,
    });
  }

  async function confirmar() {
    if (!imagem) return;
    setErro(null);
    setEnviando(true);

    try {
      const { bitmap } = imagem;
      const origem = regiaoDeOrigem(
        bitmap.width,
        bitmap.height,
        CIRCULO_PX,
        enquadramento,
      );

      const blob = await codificarFotoDePerfil((lado, qualidade) => {
        const canvas = document.createElement("canvas");
        canvas.width = lado;
        canvas.height = lado;
        const contexto = canvas.getContext("2d");
        if (!contexto) {
          throw new Error("O navegador não permitiu processar a imagem.");
        }
        // JPEG não tem transparência: sem fundo, PNG recortado sairia preto.
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, lado, lado);
        contexto.imageSmoothingQuality = "high";
        contexto.drawImage(
          bitmap,
          origem.x,
          origem.y,
          origem.lado,
          origem.lado,
          0,
          0,
          lado,
          lado,
        );
        return new Promise<Blob>((resolver, rejeitar) =>
          canvas.toBlob(
            (resultado) =>
              resultado
                ? resolver(resultado)
                : rejeitar(new Error("Falha ao processar a imagem.")),
            "image/jpeg",
            qualidade,
          ),
        );
      });

      await aoConfirmar(
        new File([blob], "foto-de-perfil.jpg", { type: "image/jpeg" }),
        publica,
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar a foto.",
      );
      setEnviando(false);
    }
  }

  const escala = imagem
    ? escalaBase(imagem.bitmap.width, imagem.bitmap.height, CIRCULO_PX) *
      enquadramento.zoom
    : 1;

  return (
    <div className="space-y-5">
      <p className="-mt-2 font-medium text-primary">{mensagem}</p>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Arraste a imagem para posicionar seu rosto dentro do círculo. A foto
        aparece assim no site.
      </p>

      <div
        onPointerDown={iniciarArraste}
        onPointerMove={arrastar}
        onPointerUp={() => (arraste.current = null)}
        onPointerCancel={() => (arraste.current = null)}
        style={{ width: AREA_PX, height: AREA_PX, touchAction: "none" }}
        className="relative mx-auto cursor-grab select-none overflow-hidden rounded-lg bg-bg-base active:cursor-grabbing"
      >
        {imagem ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagem.url}
              alt=""
              draggable={false}
              style={{
                width: imagem.bitmap.width * escala,
                height: imagem.bitmap.height * escala,
                left:
                  AREA_PX / 2 +
                  enquadramento.x -
                  (imagem.bitmap.width * escala) / 2,
                top:
                  AREA_PX / 2 +
                  enquadramento.y -
                  (imagem.bitmap.height * escala) / 2,
              }}
              className="pointer-events-none absolute max-w-none"
            />
            {/* Escurece fora do círculo e desenha o contorno. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle at center, transparent ${
                  CIRCULO_PX / 2 - 1
                }px, rgba(8, 15, 12, 0.72) ${CIRCULO_PX / 2}px)`,
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full border-2 border-primary/70"
              style={{
                width: CIRCULO_PX,
                height: CIRCULO_PX,
                left: (AREA_PX - CIRCULO_PX) / 2,
                top: (AREA_PX - CIRCULO_PX) / 2,
              }}
            />
          </>
        ) : (
          !erro && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )
        )}
      </div>

      <div className="flex items-center gap-3">
        <label
          htmlFor="recorte-zoom"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
        >
          Zoom
        </label>
        <input
          id="recorte-zoom"
          type="range"
          min={ZOOM_MINIMO}
          max={ZOOM_MAXIMO}
          step={0.01}
          value={enquadramento.zoom}
          disabled={!imagem || enviando}
          onChange={(evento) =>
            atualizar({
              ...enquadramento,
              zoom: Number(evento.target.value),
            })
          }
          className="h-1 flex-1 cursor-pointer accent-primary"
        />
      </div>

      <CaixaDeFotoPublica
        publica={publica}
        aoAlternar={() => setPublica((atual) => !atual)}
        desabilitado={enviando}
      />

      {erro && (
        <p
          role="alert"
          className="rounded-lg border-l-4 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={aoFechar}
          disabled={enviando}
          className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={!imagem || enviando}
          className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-6 py-2 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
          Usar esta foto
        </button>
      </div>
    </div>
  );
}
