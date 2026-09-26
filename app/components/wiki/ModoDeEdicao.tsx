"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Send, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Dica } from "@/components/ui/tooltip.tsx";
import { DialogoDeConfirmacao } from "@/components/wiki/DialogoDeConfirmacao.tsx";
import { avisar } from "@/components/layout/AvisoNoTopo.tsx";
import { proporEdicoesEmLote } from "@/app/actions/wiki.ts";
import {
  adicionarFoto,
  definirFaseDaFoto,
  definirFotoPrincipal,
  importarFotoDoWikimedia,
  removerFoto,
} from "@/app/actions/fotos.ts";
import { enviarMidia } from "@/lib/enviar-midia.ts";
import { useSessaoHidratada } from "@/lib/auth-client.ts";
import { cn } from "@/lib/utils.ts";
import { TAG_DE_FOTO_LABEL, type TagDeFoto } from "@/core/fotos.ts";
import {
  agruparPorFonte,
  type AlteracaoDeCampo,
} from "@/lib/rascunho-de-edicao.ts";

export type { AlteracaoDeCampo };

/** Campos comuns a uma foto pendente, seja qual for a fonte. */
type FotoPendenteBase = {
  id: string;
  /** Prévia para mostrar no rascunho — object URL (upload) ou miniatura do Commons. */
  previa: string;
  tag: TagDeFoto;
  credito: string;
  legenda: string | null;
};

/**
 * Foto escolhida no modo de edição; só sobe ao MinIO (ou é importada do
 * Commons) no envio. "upload" ainda guarda o `File` local a comprimir e
 * enviar; "wikimedia" guarda só o link da ficha — o download acontece no
 * servidor, dentro de `importarFotoDoWikimedia`.
 */
export type FotoPendente =
  | (FotoPendenteBase & { fonte: "upload"; arquivo: File })
  | (FotoPendenteBase & { fonte: "wikimedia"; url: string });

export type NovaFotoPendente =
  | (Omit<FotoPendenteBase, "id"> & { fonte: "upload"; arquivo: File })
  | (Omit<FotoPendenteBase, "id"> & { fonte: "wikimedia"; url: string });

type Resultado = { ok: true } | { ok: false; erro: string };

type ModoDeEdicao = {
  ativo: boolean;
  ligar: () => void;
  slug: string;
  nomeDaEspecie: string;
  /** Campo da ficha com o editor aberto. Um de cada vez. */
  campoAberto: string | null;
  abrirCampo: (campo: string | null) => void;
  /**
   * Última fonte declarada: quem corrige vários campos costuma tirar todos do
   * mesmo livro, e redigitar a referência a cada campo cansa.
   */
  ultimaFonte: string;
  lembrarFonte: (fonte: string) => void;
  /**
   * Último local de observação declarado nesta edição — mesma ideia da fonte.
   * `undefined` até alguém declarar; aí vale a região do perfil.
   */
  ultimoLocal: string | undefined;
  lembrarLocal: (local: string) => void;
  alteracoes: Record<string, AlteracaoDeCampo>;
  aplicarAlteracao: (campo: string, alteracao: AlteracaoDeCampo) => void;
  desfazerAlteracao: (campo: string) => void;
  fotos: FotoPendente[];
  incluirFoto: (foto: NovaFotoPendente) => void;
  tirarFoto: (id: string) => void;
  /**
   * Foto já publicada escolhida como principal neste rascunho — só a
   * administração escolhe. `null` mantém a atual.
   */
  fotoPrincipal: string | null;
  escolherFotoPrincipal: (id: string | null) => void;
  /**
   * Fotos já publicadas marcadas para sair no envio — também só a
   * administração. Marcar de novo desmarca.
   */
  fotosRemovidas: string[];
  alternarRemocaoDeFoto: (id: string) => void;
  /**
   * Fases trocadas neste rascunho, por foto já publicada — moderação e
   * administração. `null` em `definirFaseDeFoto` desfaz a troca.
   */
  fasesDeFoto: Record<string, TagDeFoto>;
  definirFaseDeFoto: (id: string, fase: TagDeFoto | null) => void;
  /** Alterações aplicadas + fotos + principal + fases + remoções. Um editor aberto não conta. */
  quantidade: number;
  /** Há algo a perder se o modo for encerrado agora? */
  temAlteracoes: boolean;
  /** Encerra o modo e joga fora o rascunho inteiro. */
  descartar: () => void;
  /** Envia o rascunho e, se tudo der certo, encerra o modo. */
  enviar: () => Promise<Resultado>;
};

/** O registro sem uma chave. */
function semAChave<T>(registro: Record<string, T>, chave: string) {
  return Object.fromEntries(
    Object.entries(registro).filter(([outra]) => outra !== chave),
  );
}

/** Só a prévia de upload é object URL — a do Commons não precisa (nem pode) ser revogada. */
function revogarPreviaSeLocal(foto: FotoPendente) {
  if (foto.fonte === "upload") URL.revokeObjectURL(foto.previa);
}

const Contexto = createContext<ModoDeEdicao | null>(null);

/**
 * Estado do modo de edição da ficha. Vive no cliente porque a ficha é ISR e
 * não lê a sessão no servidor (ver safdex/[slug]/page.tsx) — quem precisa
 * saber se a pessoa está editando consulta `useModoDeEdicao`.
 *
 * As alterações não saem uma a uma: acumulam num rascunho e vão juntas em
 * "Salvar e enviar", ou somem juntas em "Descartar edição". Fechar a ficha
 * desmonta o provedor, então o rascunho nunca sobrevive a uma troca de
 * espécie — por isso o modal pergunta antes de fechar (ver ModalDaEspecie).
 */
export function ProvedorDoModoDeEdicao({
  slug,
  nomeDaEspecie,
  children,
}: {
  slug: string;
  nomeDaEspecie: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ativo, setAtivo] = useState(false);
  const [campoAberto, abrirCampo] = useState<string | null>(null);
  const [ultimaFonte, lembrarFonte] = useState("");
  const [ultimoLocal, lembrarLocal] = useState<string | undefined>(undefined);
  const [alteracoes, setAlteracoes] = useState<
    Record<string, AlteracaoDeCampo>
  >({});
  const [fotos, setFotos] = useState<FotoPendente[]>([]);
  const [fotoPrincipal, escolherFotoPrincipal] = useState<string | null>(null);
  const [fotosRemovidas, setFotosRemovidas] = useState<string[]>([]);
  const [fasesDeFoto, setFasesDeFoto] = useState<Record<string, TagDeFoto>>({});

  const definirFaseDeFoto = useCallback(
    (id: string, fase: TagDeFoto | null) =>
      setFasesDeFoto((anteriores) => {
        const resto = semAChave(anteriores, id);
        return fase === null ? resto : { ...resto, [id]: fase };
      }),
    [],
  );

  /**
   * Marcar uma foto para sair desfaz a escolha dela como principal: as duas
   * juntas seriam uma contradição, e o envio deixaria a espécie sem capa.
   */
  const alternarRemocaoDeFoto = useCallback((id: string) => {
    setFotosRemovidas((anteriores) =>
      anteriores.includes(id)
        ? anteriores.filter((outro) => outro !== id)
        : [...anteriores, id],
    );
    escolherFotoPrincipal((atual) => (atual === id ? null : atual));
    // Foto que vai sair não tem fase a trocar.
    setFasesDeFoto((anteriores) => semAChave(anteriores, id));
  }, []);

  // A prévia de upload é um object URL: sem revogar, cada foto descartada
  // vaza memória. A do Commons é a miniatura do próprio Wikimedia — nada a
  // revogar.
  const fotosAtuais = useRef(fotos);
  fotosAtuais.current = fotos;
  useEffect(() => () => fotosAtuais.current.forEach(revogarPreviaSeLocal), []);

  const quantidade =
    Object.keys(alteracoes).length +
    fotos.length +
    (fotoPrincipal ? 1 : 0) +
    Object.keys(fasesDeFoto).length +
    fotosRemovidas.length;
  const temAlteracoes = quantidade > 0 || campoAberto !== null;

  // Recarregar ou sair do site com rascunho pendente pede confirmação ao
  // navegador — a navegação interna é o modal que intercepta.
  useEffect(() => {
    if (!ativo || quantidade === 0) return;
    const segurar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", segurar);
    return () => window.removeEventListener("beforeunload", segurar);
  }, [ativo, quantidade]);

  const descartar = useCallback(() => {
    fotosAtuais.current.forEach(revogarPreviaSeLocal);
    setFotos([]);
    setAlteracoes({});
    escolherFotoPrincipal(null);
    setFotosRemovidas([]);
    setFasesDeFoto({});
    abrirCampo(null);
    setAtivo(false);
  }, []);

  const tirarFoto = useCallback((id: string) => {
    setFotos((anteriores) => {
      const saindo = anteriores.find((f) => f.id === id);
      if (saindo) revogarPreviaSeLocal(saindo);
      return anteriores.filter((f) => f.id !== id);
    });
  }, []);

  /**
   * Campos primeiro, numa proposta por fonte e numa transação só; depois o que
   * muda em foto já publicada — a troca da principal e as trocas de fase —;
   * então as fotos novas, uma a uma, porque cada uma sobe ao MinIO; e por
   * último as remoções, que apagam arquivo e não têm volta. Se algo falhar, o
   * que já foi enviado sai do rascunho e o resto fica para tentar de novo.
   */
  async function enviar(): Promise<Resultado> {
    const entradas = Object.entries(alteracoes);
    if (entradas.length > 0) {
      const resultado = await proporEdicoesEmLote({
        slug,
        propostas: agruparPorFonte(entradas.map(([, alteracao]) => alteracao)),
      });
      if (!resultado.ok) {
        return { ok: false, erro: resultado.erro ?? "Falha no envio." };
      }
      setAlteracoes({});
    }

    if (fotoPrincipal) {
      const resultado = await definirFotoPrincipal(fotoPrincipal);
      if (!resultado.ok) {
        return {
          ok: false,
          erro: resultado.erro ?? "Falha ao trocar a foto principal.",
        };
      }
      escolherFotoPrincipal(null);
    }

    for (const [id, fase] of Object.entries(fasesDeFoto)) {
      const resultado = await definirFaseDaFoto({ id, tag: fase });
      if (!resultado.ok) {
        return {
          ok: false,
          erro: resultado.erro ?? "Falha ao trocar a fase de uma foto.",
        };
      }
      definirFaseDeFoto(id, null);
    }

    for (const foto of fotos) {
      try {
        const resultado =
          foto.fonte === "upload"
            ? await (async () => {
                const { mediaId } = await enviarMidia(
                  foto.arquivo,
                  foto.legenda ?? undefined,
                );
                return adicionarFoto({
                  slug,
                  mediaId,
                  credito: foto.credito,
                  tag: foto.tag,
                  legenda: foto.legenda,
                });
              })()
            : await importarFotoDoWikimedia({
                slug,
                url: foto.url,
                credito: foto.credito,
                tag: foto.tag,
                legenda: foto.legenda,
              });
        if (!resultado.ok)
          throw new Error(resultado.erro ?? "Falha ao salvar.");
        tirarFoto(foto.id);
      } catch (falha) {
        const motivo = falha instanceof Error ? falha.message : "Falha.";
        return {
          ok: false,
          erro:
            entradas.length > 0
              ? `As alterações dos campos foram enviadas, mas uma foto falhou: ${motivo}`
              : `Uma foto falhou: ${motivo}`,
        };
      }
    }

    for (const id of fotosRemovidas) {
      const resultado = await removerFoto(id);
      if (!resultado.ok) {
        return {
          ok: false,
          erro: resultado.erro ?? "Falha ao remover uma foto.",
        };
      }
      setFotosRemovidas((anteriores) =>
        anteriores.filter((outro) => outro !== id),
      );
    }

    // Só mudanças da equipe, que entram direto: não há nada indo para a fila
    // de avaliação.
    const soDaAdministracao = entradas.length === 0 && fotos.length === 0;
    descartar();
    avisar(
      soDaAdministracao
        ? `As fotos de ${nomeDaEspecie} foram atualizadas.`
        : `Suas propostas de modificação para a espécie ${nomeDaEspecie} foram enviadas à equipe do Safa Muda. Você receberá uma confirmação de incorporação ou rejeição das modificações em seu e-mail cadastrado.`,
    );
    // Fotos da equipe entram publicadas; as demais ficam na fila.
    router.refresh();
    return { ok: true };
  }

  return (
    <Contexto.Provider
      value={{
        ativo,
        ligar: () => setAtivo(true),
        slug,
        nomeDaEspecie,
        campoAberto,
        abrirCampo,
        ultimaFonte,
        lembrarFonte,
        ultimoLocal,
        lembrarLocal,
        alteracoes,
        aplicarAlteracao: (campo, alteracao) =>
          setAlteracoes((anteriores) => ({
            ...anteriores,
            [campo]: alteracao,
          })),
        desfazerAlteracao: (campo) =>
          setAlteracoes((anteriores) =>
            Object.fromEntries(
              Object.entries(anteriores).filter(([chave]) => chave !== campo),
            ),
          ),
        fotos,
        incluirFoto: (foto) =>
          setFotos((anteriores) => [
            ...anteriores,
            { ...foto, id: crypto.randomUUID() },
          ]),
        tirarFoto,
        fotoPrincipal,
        escolherFotoPrincipal,
        fotosRemovidas,
        alternarRemocaoDeFoto,
        fasesDeFoto,
        definirFaseDeFoto,
        quantidade,
        temAlteracoes,
        descartar,
        enviar,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useModoDeEdicao(): ModoDeEdicao {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error(
      "useModoDeEdicao precisa estar dentro de ProvedorDoModoDeEdicao.",
    );
  }
  return contexto;
}

/**
 * Mostra o conteúdo só com o modo de edição ligado. Para seções que só fazem
 * sentido para quem vai sugerir algo, como os campos dos links externos —
 * fora do modo, os links já aparecem como ícones na moldura.
 */
export function SoNoModoDeEdicao({ children }: { children: React.ReactNode }) {
  const { ativo } = useModoDeEdicao();
  return ativo ? children : null;
}

/**
 * O inverso: some com o modo ligado. Os ícones do GBIF e do iNaturalist saem
 * da moldura para dar lugar à barra de edição — e, editando, os links estão
 * na seção própria.
 */
export function ForaDoModoDeEdicao({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ativo } = useModoDeEdicao();
  return ativo ? null : children;
}

/**
 * O controle do modo de edição, só para quem está logado.
 *
 * Desligado, é um lápis; ligar passa por uma confirmação que explica o modo.
 * Ligado, o lápis vira uma pastilha verde que desliza para mostrar "Modo de
 * edição ativo", seguida de "Salvar e enviar" e "Descartar edição" — os dois
 * únicos jeitos de sair do modo, cada um com sua confirmação.
 */
export function BotaoDeEdicao() {
  const { data: sessao } = useSessaoHidratada();
  const { ativo } = useModoDeEdicao();

  if (!sessao) return null;
  return ativo ? <BarraDeEdicao /> : <LigarModoDeEdicao />;
}

function LigarModoDeEdicao() {
  const { ligar } = useModoDeEdicao();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <Popover open={confirmando} onOpenChange={setConfirmando}>
      <Dica texto="Modo de edição">
        <PopoverTrigger
          aria-pressed={false}
          aria-label="Modo de edição"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground"
        >
          <Pencil size={16} />
        </PopoverTrigger>
      </Dica>
      <PopoverContent align="end" sideOffset={8} className="w-80 space-y-3">
        <h2 className="font-serif text-lg font-semibold tracking-tight">
          Modo de edição.
        </h2>
        <p className="text-sm leading-[1.7] text-muted-foreground">
          Este modo permite que você sugira modificações para as fotos e
          informações desta planta. As sugestões realizadas serão enviadas para
          a avaliação da equipe do Safa Muda. Você deseja habilitar este modo?
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className={BOTAO_SECUNDARIO}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              ligar();
              setConfirmando(false);
            }}
            className={BOTAO_PRINCIPAL}
          >
            Habilitar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BarraDeEdicao() {
  const {
    quantidade,
    temAlteracoes,
    campoAberto,
    alteracoes,
    fotos,
    fotoPrincipal,
    fotosRemovidas,
    fasesDeFoto,
    descartar,
    enviar,
  } = useModoDeEdicao();
  const [confirmacao, setConfirmacao] = useState<"enviar" | "descartar" | null>(
    null,
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // A pastilha nasce recolhida e abre no quadro seguinte: é a transição de
  // 0fr para 1fr na coluna do texto que faz o deslize.
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    const quadro = requestAnimationFrame(() => setAberta(true));
    return () => cancelAnimationFrame(quadro);
  }, []);

  async function confirmarEnvio() {
    setErro(null);
    setEnviando(true);
    const resultado = await enviar();
    setEnviando(false);
    if (resultado.ok) setConfirmacao(null);
    else setErro(resultado.erro);
  }

  const itens = [
    ...Object.values(alteracoes).map(
      (alteracao) => `${alteracao.rotulo}: ${alteracao.resumo}`,
    ),
    ...fotos.map((foto) => `Foto nova: ${foto.credito}`),
    ...(fotoPrincipal ? ["Nova foto principal da espécie"] : []),
    ...Object.values(fasesDeFoto).map(
      (fase) => `Fase de uma foto passa a ser: ${TAG_DE_FOTO_LABEL[fase]}`,
    ),
    ...fotosRemovidas.map(() => "Foto removida da espécie (apaga o arquivo)"),
  ];

  return (
    <div className="flex items-center gap-1.5">
      <div
        role="status"
        className="flex items-center rounded-md bg-primary text-primary-foreground"
      >
        <span className="p-1.5">
          <Pencil size={16} />
        </span>
        <span
          className={`hidden transition-[grid-template-columns] duration-320 ease-out sm:grid ${
            aberta ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
          }`}
        >
          <span className="min-w-0 overflow-hidden whitespace-nowrap pr-2.5 text-xs font-medium">
            Modo de edição ativo
            {quantidade > 0 && (
              <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-px font-mono text-[0.65rem]">
                {quantidade}
              </span>
            )}
          </span>
        </span>
      </div>

      <button
        type="button"
        disabled={quantidade === 0}
        onClick={() => {
          setErro(null);
          setConfirmacao("enviar");
        }}
        title={
          quantidade === 0 ? "Nenhuma alteração para enviar ainda" : undefined
        }
        aria-label="Salvar e enviar"
        style={{ animationDelay: "80ms" }}
        className={cn(
          BOTAO_PRINCIPAL,
          ENTRADA,
          "inline-flex items-center gap-1.5 whitespace-nowrap py-1 text-xs disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <Send size={13} />
        <span className="hidden sm:inline">Salvar e enviar</span>
      </button>

      <button
        type="button"
        onClick={() =>
          // Sem nada a perder, descartar é só sair: perguntar seria ruído.
          temAlteracoes ? setConfirmacao("descartar") : descartar()
        }
        aria-label="Descartar edição"
        style={{ animationDelay: "140ms" }}
        // Vermelho apagado em repouso, vivo no hover: é saída destrutiva, mas
        // não deve competir com "Salvar e enviar" enquanto ninguém mira nele.
        className={cn(
          ENTRADA,
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs text-red-600/60 transition-colors duration-240 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400/60 dark:hover:bg-red-500/15 dark:hover:text-red-400",
        )}
      >
        <Trash2 size={13} />
        <span className="hidden sm:inline">Descartar edição</span>
      </button>

      <DialogoDeConfirmacao
        aberto={confirmacao === "enviar"}
        aoMudar={(aberto) => {
          if (!aberto && !enviando) setConfirmacao(null);
        }}
        titulo="Enviar as modificações?"
        descricao="Você deseja mesmo enviar as modificações propostas à equipe do Safa Muda? Elas passam por avaliação antes de aparecer na ficha."
        acoes={
          <>
            <button
              type="button"
              disabled={enviando}
              onClick={() => setConfirmacao(null)}
              className={BOTAO_SECUNDARIO}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={confirmarEnvio}
              className={cn(
                BOTAO_PRINCIPAL,
                "inline-flex items-center gap-1.5 disabled:opacity-50",
              )}
            >
              {enviando ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Enviar
            </button>
          </>
        }
      >
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/60 bg-bg-surface2/40 p-3 text-xs leading-[1.6] text-muted-foreground">
          {itens.map((item, indice) => (
            <li key={`${indice}-${item}`}>{item}</li>
          ))}
        </ul>
        {campoAberto && (
          <p className="text-xs leading-[1.6] text-amber-700 dark:text-amber-300">
            Há um campo aberto que não foi aplicado; ele fica de fora do envio.
          </p>
        )}
        {erro && (
          <p
            role="alert"
            className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-900 dark:text-red-200"
          >
            {erro}
          </p>
        )}
      </DialogoDeConfirmacao>

      <DialogoDeConfirmacao
        aberto={confirmacao === "descartar"}
        aoMudar={(aberto) => !aberto && setConfirmacao(null)}
        titulo="Descartar a edição?"
        descricao="As modificações feitas neste modo de edição serão perdidas, e a ficha volta a mostrar os valores atuais."
        acoes={
          <>
            <button
              type="button"
              onClick={() => setConfirmacao(null)}
              className={BOTAO_SECUNDARIO}
            >
              Continuar editando
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmacao(null);
                descartar();
              }}
              className={BOTAO_DESTRUTIVO}
            >
              Descartar
            </button>
          </>
        }
      />
    </div>
  );
}

const ENTRADA =
  "duration-320 animate-in fade-in-0 slide-in-from-left-3 fill-mode-backwards";

const BOTAO_PRINCIPAL =
  "rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground active:scale-[0.98]";

const BOTAO_SECUNDARIO =
  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-240 hover:bg-bg-surface2 hover:text-foreground disabled:opacity-50";

const BOTAO_DESTRUTIVO =
  "rounded-md border border-red-500/60 px-3 py-1.5 text-sm font-medium text-red-600 transition-all duration-240 hover:bg-red-500 hover:text-white active:scale-[0.98] dark:text-red-300";
