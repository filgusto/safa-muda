"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  aceitarTermos,
  atualizarPerfil,
  atualizarCitacao,
  atualizarPerfilDeUso,
  excluirConta,
} from "@/app/actions/conta.ts";
import {
  CREDITOS_DE_NOME,
  CREDITO_DE_NOME_LABEL,
  EXPERIENCIAS,
  EXPERIENCIA_LABEL,
  LIMITE_DA_BIO,
  LIMITE_DA_CITACAO_OUTRA,
  CHAVES_DE_PUBLICO,
  LIMITE_DO_PERFIL_OUTRO,
  PERFIS_DE_USO,
  PERFIL_DE_USO_LABEL,
  type CampoDePerfil,
  type PerfilDaConta,
} from "@/lib/perfil-de-usuario.ts";
import {
  TRATAMENTOS,
  TRATAMENTO_LABEL,
  flexionarMarcas,
} from "@/core/tratamento.ts";
import {
  acharMunicipio,
  formatarRegiao,
  parsearRegiao,
  semAcento,
  type Estado,
} from "@/lib/regiao.ts";
import { VERSAO_DOS_TERMOS } from "@/lib/termos.ts";
import { Campo } from "./AuthForm.tsx";
import {
  CLASSE_DO_CARTAO,
  CLASSE_DO_ERRO,
  CLASSE_DO_INPUT,
  LinhaDeDado,
  ModalDeConta,
  TituloDeSecao,
} from "./ElementosDaConta.tsx";

type Opcao = { valor: string; rotulo: string };

const OPCOES_DE_PERFIL: Opcao[] = PERFIS_DE_USO.map((valor) => ({
  valor,
  rotulo: PERFIL_DE_USO_LABEL[valor],
}));
const OPCOES_DE_TRATAMENTO: Opcao[] = TRATAMENTOS.map((valor) => ({
  valor,
  rotulo: TRATAMENTO_LABEL[valor],
}));
const OPCOES_DE_EXPERIENCIA: Opcao[] = EXPERIENCIAS.map((valor) => ({
  valor,
  rotulo: EXPERIENCIA_LABEL[valor],
}));
const OPCOES_DE_CREDITO: Opcao[] = CREDITOS_DE_NOME.map((valor) => ({
  valor,
  rotulo: CREDITO_DE_NOME_LABEL[valor],
}));

const CHAVES_DE_CITACAO = [
  { campo: "citarInstagram", rotulo: "Instagram", link: "linkInstagram" },
  { campo: "citarSite", rotulo: "Site", link: "linkSite" },
  { campo: "citarLattes", rotulo: "Lattes", link: "linkLattes" },
] as const;

/** Endereço sem protocolo nem barra final, para caber numa linha. */
function textoDoLink(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

const NAO_INFORMADO = (
  <span className="italic text-muted-foreground/60">não informado</span>
);

/**
 * Quadro dos dados opcionais. Cada linha se edita ali mesmo e grava sozinha;
 * campo vazio apaga o dado (volta a "não informado").
 */
export function SobreVoce({
  perfil,
  temFoto,
}: {
  perfil: PerfilDaConta;
  temFoto: boolean;
}) {
  return (
    <section
      id="sobre-voce"
      className={`scroll-mt-24 space-y-2 ${CLASSE_DO_CARTAO}`}
    >
      <TituloDeSecao>Sobre você (opcional)</TituloDeSecao>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Nada aqui é obrigatório. Estes dados ajudam a contextualizar
        contribuições e a entender quem usa o Safa Muda. Só são compartilhados
        com a comunidade os que você tornar públicos, e você apaga qualquer um
        deixando o campo vazio.{" "}
        <a href="/privacidade" className="text-primary hover:underline">
          Saiba mais
        </a>
        .
      </p>

      <div className="flex items-center justify-end gap-1 pr-0 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        <span className="w-[7.5rem] text-center">
          Tornar público
          <AjudaDoCampo rotulo="Tornar público">
            <p>
              Se você ligar a chave de um campo, essa informação será
              compartilhada com toda a comunidade Safa Muda, por exemplo no seu
              card público no site.
            </p>
            <p className="mt-2">
              Desligada, ela fica só para você (e para a equipe, quando
              necessário para a moderação). Você pode mudar isso quando quiser,
              campo a campo.
            </p>
          </AjudaDoCampo>
        </span>
      </div>

      <dl className="divide-y divide-bg-border">
        <LinhaPublicavel campo="foto" perfil={perfil} temValor={temFoto}>
          <LinhaDeDado rotulo="Foto">
            {temFoto ? "Foto de perfil" : NAO_INFORMADO}
          </LinhaDeDado>
        </LinhaPublicavel>
        <LinhaPublicavel campo="regiao" perfil={perfil}>
          <LinhaDaRegiao valor={perfil.regiao} />
        </LinhaPublicavel>
        <LinhaPublicavel campo="perfilDeUso" perfil={perfil}>
          <LinhaComOutro
            rotulo="Perfil de uso"
            valor={perfil.perfilDeUso}
            outro={perfil.perfilDeUsoOutro}
            opcoes={OPCOES_DE_PERFIL.map((opcao) => ({
              ...opcao,
              rotulo: flexionarMarcas(opcao.rotulo, perfil.tratamento),
            }))}
            limiteDoOutro={LIMITE_DO_PERFIL_OUTRO}
            placeholderDoOutro="Descreva com suas palavras"
            salvarNoServidor={atualizarPerfilDeUso}
          />
        </LinhaPublicavel>
        <LinhaPublicavel campo="experiencia" perfil={perfil}>
          <LinhaDePerfil
            rotulo="Experiência"
            campo="experiencia"
            valor={perfil.experiencia}
            tipo="escolha"
            opcoes={OPCOES_DE_EXPERIENCIA}
            dica="Tempo de prática com agrofloresta."
          />
        </LinhaPublicavel>
        <LinhaPublicavel campo="bio" perfil={perfil}>
          <LinhaDePerfil
            rotulo="Bio"
            campo="bio"
            valor={perfil.bio}
            tipo="area"
            placeholder="Conte em poucas palavras o que você faz ou quer plantar."
          />
        </LinhaPublicavel>
        <LinhaPublicavel campo="linkInstagram" perfil={perfil}>
          <LinhaDePerfil
            rotulo="Instagram"
            campo="linkInstagram"
            valor={perfil.linkInstagram}
            tipo="link"
            placeholder="@seuusuario"
          />
        </LinhaPublicavel>
        <LinhaPublicavel campo="linkSite" perfil={perfil}>
          <LinhaDePerfil
            rotulo="Site"
            campo="linkSite"
            valor={perfil.linkSite}
            tipo="link"
            placeholder="seusite.com.br"
          />
        </LinhaPublicavel>
        <LinhaPublicavel campo="linkLattes" perfil={perfil}>
          <LinhaDePerfil
            rotulo="Lattes"
            campo="linkLattes"
            valor={perfil.linkLattes}
            tipo="link"
            placeholder="Link do currículo ou os 16 dígitos do ID"
          />
        </LinhaPublicavel>
      </dl>
    </section>
  );
}

/**
 * Uma linha do quadro com a chave "Tornar público" na última coluna. Sem
 * valor no campo não há o que compartilhar, e a chave fica desabilitada.
 */
function LinhaPublicavel({
  campo,
  perfil,
  temValor: temValorInformado,
  children,
}: {
  campo: keyof typeof CHAVES_DE_PUBLICO;
  perfil: PerfilDaConta;
  /** Para campos que não vivem em `perfil` (a foto). */
  temValor?: boolean;
  children: React.ReactNode;
}) {
  const temValor =
    temValorInformado ??
    Boolean((perfil as unknown as Record<string, unknown>)[campo]);
  const chave = CHAVES_DE_PUBLICO[campo];

  return (
    <div className="grid grid-cols-[1fr_7.5rem] items-start">
      <div>{children}</div>
      <div className="flex h-11 items-center justify-center">
        <ChaveDePublico
          campo={chave}
          ligado={perfil[chave]}
          desabilitado={!temValor}
        />
      </div>
    </div>
  );
}

/** Chave que grava na hora, sem botão de salvar. */
function ChaveDePublico({
  campo,
  ligado,
  desabilitado,
}: {
  campo: (typeof CHAVES_DE_PUBLICO)[keyof typeof CHAVES_DE_PUBLICO];
  ligado: boolean;
  desabilitado: boolean;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(ligado);
  const [enviando, setEnviando] = useState(false);

  async function alternar() {
    const novo = !valor;
    setEnviando(true);
    setValor(novo);
    const resultado = await atualizarPerfil(campo, novo);
    setEnviando(false);

    if (!resultado.ok) {
      setValor(!novo);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      aria-label="Tornar público"
      title={
        desabilitado
          ? "Preencha o campo para poder torná-lo público"
          : "Tornar público"
      }
      disabled={enviando || desabilitado}
      onClick={alternar}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-240 disabled:cursor-not-allowed disabled:opacity-40 ${
        valor ? "border-primary bg-primary/30" : "border-border bg-bg-surface2"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 size-[18px] rounded-full bg-foreground transition-transform duration-240 ${
          valor ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

/** Listas do IBGE (via /api/ibge): uma consulta por URL enquanto a página vive. */
const cacheDoIbge = new Map<string, Promise<unknown>>();

export function carregarDoIbge<T>(caminho: string): Promise<T> {
  let promessa = cacheDoIbge.get(caminho);
  if (!promessa) {
    promessa = fetch(caminho)
      .then((resposta) => {
        if (!resposta.ok) throw new Error("IBGE indisponível");
        return resposta.json();
      })
      .catch((falha) => {
        // Não guarda a falha: a próxima tentativa consulta de novo.
        cacheDoIbge.delete(caminho);
        throw falha;
      });
    cacheDoIbge.set(caminho, promessa);
  }
  return promessa as Promise<T>;
}

/**
 * Região de atuação: estado e cidade escolhidos na lista do IBGE, guardados
 * como "Cidade, UF". Só cidade e estado — nunca localização exata.
 */
function LinhaDaRegiao({ valor }: { valor: string | null }) {
  const router = useRouter();
  const atual = parsearRegiao(valor);

  const [editando, setEditando] = useState(false);
  const [uf, setUf] = useState(atual?.uf ?? "");
  const [cidade, setCidade] = useState(atual?.cidade ?? "");
  const [estados, setEstados] = useState<Estado[] | null>(null);
  const [cidades, setCidades] = useState<string[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function comecar() {
    setUf(atual?.uf ?? "");
    setCidade(atual?.cidade ?? "");
    setErro(null);
    setEditando(true);
  }

  useEffect(() => {
    if (!editando) return;
    let ativo = true;
    carregarDoIbge<Estado[]>("/api/ibge/estados")
      .then((lista) => ativo && setEstados(lista))
      .catch(
        () =>
          ativo &&
          setErro("Não foi possível carregar a lista do IBGE. Tente de novo."),
      );
    return () => {
      ativo = false;
    };
  }, [editando]);

  useEffect(() => {
    if (!editando || !uf) {
      setCidades(null);
      return;
    }
    let ativo = true;
    setCidades(null);
    carregarDoIbge<string[]>(`/api/ibge/municipios/${uf}`)
      .then((lista) => ativo && setCidades(lista))
      .catch(
        () =>
          ativo &&
          setErro("Não foi possível carregar as cidades. Tente de novo."),
      );
    return () => {
      ativo = false;
    };
  }, [editando, uf]);

  async function gravar(novo: string | null) {
    setErro(null);
    setEnviando(true);
    const resultado = await atualizarPerfil("regiao", novo);
    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }
    setEditando(false);
    router.refresh();
  }

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!uf || !cidade) {
      setErro("Escolha o estado e a cidade.");
      return;
    }
    void gravar(formatarRegiao(cidade, uf));
  }

  if (!editando) {
    return (
      <LinhaDeDado
        rotulo="Região"
        rotuloDoLapis="Editar região"
        aoEditar={comecar}
      >
        {valor ?? NAO_INFORMADO}
      </LinhaDeDado>
    );
  }

  return (
    <form
      onSubmit={salvar}
      noValidate
      className="grid grid-cols-[7rem_1fr] items-start gap-3 py-2"
    >
      <label
        htmlFor="perfil-regiao-uf"
        className="pt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        Região
      </label>
      <div className="space-y-2">
        <select
          id="perfil-regiao-uf"
          value={uf}
          disabled={!estados}
          onChange={(evento) => {
            setUf(evento.target.value);
            setCidade("");
          }}
          className={CLASSE_DO_INPUT}
        >
          <option value="">
            {estados ? "Escolha o estado" : "Carregando estados…"}
          </option>
          {estados?.map((estado) => (
            <option key={estado.sigla} value={estado.sigla}>
              {estado.nome} ({estado.sigla})
            </option>
          ))}
        </select>

        <SeletorDeCidade
          // Remonta ao trocar de estado: o texto digitado não sobrevive a ele.
          key={uf}
          cidades={cidades}
          desabilitado={!uf}
          valor={cidade}
          aoEscolher={setCidade}
        />

        <p className="text-xs text-muted-foreground">
          Lista de municípios do IBGE. Só cidade e estado: não pedimos
          localização exata.
        </p>
        {erro && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {erro}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={enviando || !uf || !cidade}
            className="inline-flex items-center rounded-md border border-primary px-3 py-1 text-xs font-medium text-primary transition-colors duration-240 hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {enviando && <Loader2 size={12} className="mr-1.5 animate-spin" />}
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            disabled={enviando}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            Cancelar
          </button>
          {valor && (
            <button
              type="button"
              onClick={() => void gravar(null)}
              disabled={enviando}
              className="ml-auto text-xs text-red-600/80 underline-offset-4 hover:text-red-600 hover:underline disabled:pointer-events-none disabled:opacity-50 dark:text-red-400/80 dark:hover:text-red-400"
            >
              Remover região
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

/**
 * Campo de cidade com busca: digitar filtra os municípios (sem diferenciar
 * acento nem caixa). Só vale uma cidade da lista — o texto solto é descartado
 * ao sair do campo.
 */
export function SeletorDeCidade({
  cidades,
  desabilitado,
  valor,
  aoEscolher,
}: {
  cidades: string[] | null;
  desabilitado: boolean;
  valor: string;
  aoEscolher: (cidade: string) => void;
}) {
  const idDaLista = useId();
  const [texto, setTexto] = useState(valor);
  const [aberto, setAberto] = useState(false);

  const filtradas = useMemo(() => {
    if (!cidades) return [];
    const busca = semAcento(texto);
    const lista = busca
      ? cidades.filter((nome) => semAcento(nome).includes(busca))
      : cidades;
    return lista.slice(0, 50);
  }, [cidades, texto]);

  function escolher(cidade: string) {
    aoEscolher(cidade);
    setTexto(cidade);
    setAberto(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={idDaLista}
        aria-autocomplete="list"
        aria-label="Cidade"
        autoComplete="off"
        disabled={desabilitado || !cidades}
        placeholder={
          desabilitado
            ? "Escolha o estado primeiro"
            : cidades
              ? "Digite para buscar a cidade"
              : "Carregando cidades…"
        }
        value={texto}
        onFocus={() => setAberto(true)}
        onChange={(evento) => {
          setTexto(evento.target.value);
          setAberto(true);
        }}
        onBlur={() => {
          setAberto(false);
          const achada = cidades ? acharMunicipio(cidades, texto) : null;
          if (achada) {
            aoEscolher(achada);
            setTexto(achada);
          } else {
            aoEscolher("");
            setTexto("");
          }
        }}
        onKeyDown={(evento) => {
          if (evento.key === "Escape") setAberto(false);
          if (evento.key === "Enter" && aberto && filtradas[0]) {
            evento.preventDefault();
            escolher(filtradas[0]);
          }
        }}
        className={`${CLASSE_DO_INPUT} disabled:cursor-not-allowed disabled:opacity-60`}
      />

      {aberto && filtradas.length > 0 && (
        <ul
          id={idDaLista}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-bg-border bg-bg-surface1 py-1 text-sm shadow-lg"
        >
          {filtradas.map((cidade) => (
            <li
              key={cidade}
              role="option"
              aria-selected={cidade === valor}
              // mouseDown (e não click): roda antes do blur do campo.
              onMouseDown={(evento) => {
                evento.preventDefault();
                escolher(cidade);
              }}
              className="cursor-pointer px-3 py-1.5 text-foreground/90 hover:bg-primary/10 hover:text-foreground"
            >
              {cidade}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Linha com uma escolha na lista e a saída "Outro", que abre um campo para
 * escrever livremente. Os dois valores gravam juntos.
 */
function LinhaComOutro({
  rotulo,
  valor,
  outro,
  opcoes,
  obrigatorio,
  limiteDoOutro,
  placeholderDoOutro,
  info,
  salvarNoServidor,
}: {
  rotulo: string;
  valor: string | null;
  outro: string | null;
  opcoes: Opcao[];
  /** Sem a opção "Prefiro não informar". */
  obrigatorio?: boolean;
  limiteDoOutro: number;
  placeholderDoOutro: string;
  info?: React.ReactNode;
  salvarNoServidor: (
    escolha: string | null,
    outro: string | null,
  ) => Promise<{ ok: boolean; erro?: string }>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [escolha, setEscolha] = useState(valor ?? "");
  const [texto, setTexto] = useState(outro ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const idDoCampo = `perfil-${rotulo}`;
  const rotuloComAjuda = (
    <>
      {rotulo}
      {info && <AjudaDoCampo rotulo={rotulo}>{info}</AjudaDoCampo>}
    </>
  );

  function comecar() {
    setEscolha(valor ?? "");
    setTexto(outro ?? "");
    setErro(null);
    setEditando(true);
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const resultado = await salvarNoServidor(escolha || null, texto);
    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    const rotuloDaOpcao = opcoes.find((o) => o.valor === valor)?.rotulo;
    const exibido =
      valor === "outro" ? (outro ?? rotuloDaOpcao) : rotuloDaOpcao;
    return (
      <LinhaDeDado
        rotulo={rotuloComAjuda}
        rotuloDoLapis={`Editar ${rotulo.toLowerCase()}`}
        aoEditar={comecar}
      >
        {exibido ?? NAO_INFORMADO}
      </LinhaDeDado>
    );
  }

  return (
    <form
      onSubmit={salvar}
      noValidate
      className="grid grid-cols-[7rem_1fr] items-start gap-3 py-2"
    >
      <label
        htmlFor={idDoCampo}
        className="pt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        {rotuloComAjuda}
      </label>
      <div className="space-y-2">
        <select
          id={idDoCampo}
          autoFocus
          value={escolha}
          onChange={(evento) => setEscolha(evento.target.value)}
          className={CLASSE_DO_INPUT}
        >
          {!obrigatorio && <option value="">Prefiro não informar</option>}
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>

        {escolha === "outro" && (
          <input
            type="text"
            aria-label={`${rotulo}: descreva com suas palavras`}
            autoFocus
            maxLength={limiteDoOutro}
            placeholder={placeholderDoOutro}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            aria-invalid={erro ? true : undefined}
            className={CLASSE_DO_INPUT}
          />
        )}

        {erro && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {erro}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center rounded-md border border-primary px-3 py-1 text-xs font-medium text-primary transition-colors duration-240 hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {enviando && <Loader2 size={12} className="mr-1.5 animate-spin" />}
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            disabled={enviando}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

/** Bolinha "?" discreta ao lado do rótulo, no mesmo padrão das fichas do SAFdex. */
function AjudaDoCampo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={`Sobre ${rotulo}`}
        className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full align-middle normal-case tracking-normal text-muted-foreground/70 hover:text-foreground"
      >
        <HelpCircle size={14} />
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm normal-case leading-[1.7] tracking-normal text-muted-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function LinhaDePerfil({
  rotulo,
  campo,
  valor,
  tipo,
  opcoes,
  placeholder,
  dica,
  info,
  obrigatorio,
}: {
  rotulo: string;
  campo: CampoDePerfil;
  valor: string | null;
  tipo: "texto" | "area" | "link" | "escolha";
  opcoes?: Opcao[];
  placeholder?: string;
  dica?: string;
  /** Explicação do campo, num popover com a bolinha "?" ao lado do rótulo. */
  info?: React.ReactNode;
  /** Sem a opção "Não informar" (o campo sempre tem valor). */
  obrigatorio?: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(valor ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function comecar() {
    setRascunho(valor ?? "");
    setErro(null);
    setEditando(true);
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const resultado = await atualizarPerfil(campo, rascunho.trim() || null);
    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }
    setEditando(false);
    router.refresh();
  }

  const rotuloComAjuda = (
    <>
      {rotulo}
      {info && <AjudaDoCampo rotulo={rotulo}>{info}</AjudaDoCampo>}
    </>
  );

  const rotuloDaOpcao = opcoes?.find((o) => o.valor === valor)?.rotulo;

  if (!editando) {
    return (
      <LinhaDeDado
        rotulo={rotuloComAjuda}
        rotuloDoLapis={`Editar ${rotulo.toLowerCase()}`}
        aoEditar={comecar}
        quebrar={tipo === "area"}
      >
        {!valor ? (
          NAO_INFORMADO
        ) : tipo === "escolha" ? (
          (rotuloDaOpcao ?? valor)
        ) : tipo === "link" ? (
          <a
            href={valor}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary underline-offset-4 hover:underline"
          >
            {textoDoLink(valor)}
          </a>
        ) : (
          valor
        )}
      </LinhaDeDado>
    );
  }

  const idDoCampo = `perfil-${campo}`;

  return (
    <form
      onSubmit={salvar}
      noValidate
      className="grid grid-cols-[7rem_1fr] items-start gap-3 py-2"
    >
      <label
        htmlFor={idDoCampo}
        className="pt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        {rotuloComAjuda}
      </label>
      <div className="space-y-2">
        {tipo === "escolha" ? (
          <select
            id={idDoCampo}
            autoFocus
            value={rascunho}
            onChange={(evento) => setRascunho(evento.target.value)}
            className={CLASSE_DO_INPUT}
          >
            {!obrigatorio && <option value="">Prefiro não informar</option>}
            {opcoes?.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        ) : tipo === "area" ? (
          <>
            <textarea
              id={idDoCampo}
              autoFocus
              rows={3}
              maxLength={LIMITE_DA_BIO}
              placeholder={placeholder}
              value={rascunho}
              onChange={(evento) => setRascunho(evento.target.value)}
              className={`${CLASSE_DO_INPUT} resize-none`}
            />
            <p className="text-right font-mono text-[0.65rem] text-muted-foreground">
              {rascunho.length}/{LIMITE_DA_BIO}
            </p>
          </>
        ) : (
          <input
            id={idDoCampo}
            type="text"
            autoFocus
            placeholder={placeholder}
            value={rascunho}
            onChange={(evento) => setRascunho(evento.target.value)}
            onKeyDown={(evento) =>
              evento.key === "Escape" && setEditando(false)
            }
            aria-invalid={erro ? true : undefined}
            className={CLASSE_DO_INPUT}
          />
        )}
        {dica && !erro && (
          <p className="text-xs text-muted-foreground">{dica}</p>
        )}
        {erro && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {erro}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center rounded-md border border-primary px-3 py-1 text-xs font-medium text-primary transition-colors duration-240 hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {enviando && <Loader2 size={12} className="mr-1.5 animate-spin" />}
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            disabled={enviando}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * Consentimento e direitos: como o nome é creditado, avisos por e-mail, o
 * aceite dos termos, e as ferramentas da LGPD (baixar os dados e excluir a
 * conta).
 */
export function PrivacidadeEDados({ perfil }: { perfil: PerfilDaConta }) {
  const [excluindo, setExcluindo] = useState(false);

  return (
    <section className={`space-y-2 ${CLASSE_DO_CARTAO}`}>
      <TituloDeSecao>Privacidade e dados</TituloDeSecao>

      <dl className="divide-y divide-bg-border">
        <LinhaComOutro
          rotulo="Citação"
          valor={perfil.creditoNome}
          outro={perfil.creditoNomeOutro}
          opcoes={OPCOES_DE_CREDITO}
          obrigatorio
          limiteDoOutro={LIMITE_DA_CITACAO_OUTRA}
          placeholderDoOutro={flexionarMarcas(
            "Como você quer ser citado(a)?",
            perfil.tratamento,
          )}
          salvarNoServidor={atualizarCitacao}
          info={
            <>
              <p>
                É como seu nome aparece ao lado das contribuições que você faz
                ao catálogo, por exemplo no histórico de alterações das
                espécies.
              </p>
              <p className="mt-2">
                Você pode ser {flexionarMarcas("citado(a)", perfil.tratamento)}{" "}
                pelo nome completo, só pelo primeiro nome, só o primeiro nome,
                sem identificação (aparece como “Pessoa colaboradora”) ou como
                preferir, escrevendo em “Outro”. A equipe de moderação continua
                vendo quem enviou, para poder avaliar.
              </p>
            </>
          }
        />
        <LinhaDePerfil
          rotulo="Tratamento"
          campo="tratamento"
          valor={perfil.tratamento}
          tipo="escolha"
          opcoes={OPCOES_DE_TRATAMENTO}
          info={
            <>
              <p>
                Como você prefere ser{" "}
                {flexionarMarcas("tratado(a)", perfil.tratamento)} nas palavras
                que variam em gênero, como “colaborador” ou “colaboradora”. É
                opcional.
              </p>
              <p className="mt-2">
                Se você escolher, é assim que o Safa Muda vai se referir a você
                em todo o site, inclusive publicamente: no seu card e perfil
                (por exemplo, “colaboradora”), nas citações e para a moderação.
                Você pode mudar quando quiser.
              </p>
            </>
          }
        />
        {CHAVES_DE_CITACAO.map(({ campo, rotulo, link }) => {
          const endereco = perfil[link];
          // Sem link cadastrado não há o que incluir; quem pede para não ser
          // identificado nunca exibe links.
          if (!endereco || perfil.creditoNome === "anonimo") return null;
          return (
            <LinhaDeInterruptor
              key={campo}
              rotulo={rotulo}
              texto={
                <>
                  Incluir na minha citação{" "}
                  <span className="text-muted-foreground">
                    ({textoDoLink(endereco)})
                  </span>
                </>
              }
              campo={campo}
              ligado={perfil[campo]}
            />
          );
        })}
        <LinhaDeInterruptor
          rotulo="Avisos"
          texto="Receber por e-mail o resultado da avaliação das minhas contribuições"
          campo="avisoPorEmail"
          ligado={perfil.avisoPorEmail}
        />
        <LinhaDosTermos perfil={perfil} />
      </dl>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-bg-border pt-4">
        <a
          href="/api/conta/exportar"
          download
          className="rounded-md border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition-colors duration-240 hover:bg-primary hover:text-primary-foreground"
        >
          Baixar meus dados
        </a>
        <button
          type="button"
          onClick={() => setExcluindo(true)}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600/80 transition-colors duration-240 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400/80 dark:hover:bg-red-500/15 dark:hover:text-red-400"
        >
          Excluir minha conta
        </button>
      </div>

      <ModalDeConta
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo="Excluir a conta"
      >
        <FormularioDeExclusao />
      </ModalDeConta>
    </section>
  );
}

/** Interruptor que grava na hora — não há o que "salvar". */
function LinhaDeInterruptor({
  rotulo,
  texto,
  campo,
  ligado,
}: {
  rotulo: string;
  texto: React.ReactNode;
  campo: "avisoPorEmail" | "citarInstagram" | "citarSite" | "citarLattes";
  ligado: boolean;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(ligado);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const id = `perfil-${campo}`;

  async function alternar() {
    const novo = !valor;
    setErro(null);
    setEnviando(true);
    setValor(novo);
    const resultado = await atualizarPerfil(campo, novo);
    setEnviando(false);

    if (!resultado.ok) {
      setValor(!novo);
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="py-2">
      <div className="grid min-h-11 grid-cols-[7rem_1fr_auto] items-center gap-3">
        <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {rotulo}
        </dt>
        <dd className="text-sm text-foreground/90">
          <label htmlFor={id} className="cursor-pointer">
            {texto}
          </label>
        </dd>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={valor}
          disabled={enviando}
          onClick={alternar}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-240 disabled:opacity-60 ${
            valor
              ? "border-primary bg-primary/30"
              : "border-border bg-bg-surface2"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 size-[18px] rounded-full bg-foreground transition-transform duration-240 ${
              valor ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {erro && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}

function LinhaDosTermos({ perfil }: { perfil: PerfilDaConta }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const emDia = perfil.termosVersao === VERSAO_DOS_TERMOS;

  async function aceitar() {
    setErro(null);
    setEnviando(true);
    const resultado = await aceitarTermos();
    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível registrar o aceite.");
      return;
    }
    router.refresh();
  }

  const quando = perfil.termosAceitosEm
    ? new Date(perfil.termosAceitosEm).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="py-2">
      <div className="grid min-h-11 grid-cols-[7rem_1fr_auto] items-center gap-3">
        <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Termos
        </dt>
        <dd className="min-w-0 text-sm text-foreground/90">
          {emDia && quando ? (
            <>Aceitos em {quando}. </>
          ) : (
            <span className="text-amber-700 dark:text-amber-300">
              Falta o seu aceite da versão atual.{" "}
            </span>
          )}
          <a href="/termos" className="text-primary hover:underline">
            Termos
          </a>{" "}
          e{" "}
          <a href="/privacidade" className="text-primary hover:underline">
            Política de Privacidade
          </a>
          .
        </dd>
        {!emDia ? (
          <button
            type="button"
            onClick={aceitar}
            disabled={enviando}
            className="inline-flex items-center rounded-md border border-primary px-3 py-1 text-xs font-medium text-primary transition-colors duration-240 hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {enviando && <Loader2 size={12} className="mr-1.5 animate-spin" />}
            Aceitar
          </button>
        ) : (
          <span aria-hidden="true" className="size-7" />
        )}
      </div>
      {erro && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}

const DESTINOS: Array<{ valor: string; titulo: string; texto: string }> = [
  {
    valor: "manter",
    titulo: "Manter minha citação",
    texto:
      "Suas contribuições continuam com o seu nome, do jeito que você escolheu em Citação, mas sem links para o seu Instagram, site ou Lattes.",
  },
  {
    valor: "anonimizar",
    titulo: "Anonimizar minhas contribuições",
    texto: "Suas contribuições passam a aparecer como “Pessoa colaboradora”.",
  },
];

/**
 * Exclusão de conta: exige a senha atual e uma escolha sobre as contribuições
 * já publicadas. O servidor remove o cadastro, o perfil, a foto e o que era
 * privado; o que está no catálogo permanece com a citação escolhida aqui
 * (Política de Privacidade, item 5).
 */
function FormularioDeExclusao() {
  const [destino, setDestino] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<{ destino?: string; senha?: string }>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function excluir(evento: React.FormEvent) {
    evento.preventDefault();
    setErroGeral(null);

    const novos: typeof erros = {};
    if (!destino)
      novos.destino = "Escolha o que fazer com as suas contribuições.";
    if (!senha) novos.senha = "Digite sua senha para confirmar.";
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    const resultado = await excluirConta(senha, destino);

    if (!resultado.ok) {
      setEnviando(false);
      if (resultado.erro === "A senha está incorreta.") {
        setErros({ senha: resultado.erro });
      } else {
        setErroGeral(resultado.erro ?? "Não foi possível excluir a conta.");
      }
      return;
    }

    // Recarga completa: some qualquer estado da sessão que ficou em memória.
    window.location.assign("/");
  }

  return (
    <form onSubmit={excluir} noValidate className="space-y-5">
      <p className="text-sm leading-[1.7] text-muted-foreground">
        Isto é <strong className="text-foreground">definitivo</strong>.
        Removeremos seu cadastro, seu perfil, sua foto, seus projetos e suas
        propostas ainda não avaliadas.
      </p>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          O que fazer com as citações das suas contribuições
        </legend>
        {DESTINOS.map((opcao) => (
          <label
            key={opcao.valor}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors duration-240 ${
              destino === opcao.valor
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <input
              type="radio"
              name="destino"
              value={opcao.valor}
              checked={destino === opcao.valor}
              onChange={() => setDestino(opcao.valor)}
              className="mt-1 size-4 shrink-0 accent-[hsl(var(--primary))]"
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-foreground">
                {opcao.titulo}
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                {opcao.texto}
              </span>
            </span>
          </label>
        ))}
        {erros.destino && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {erros.destino}
          </p>
        )}
      </fieldset>

      <Campo
        id="conta-exclusao-senha"
        name="password"
        label="Sua senha"
        type="password"
        autoComplete="current-password"
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
        erro={erros.senha}
      />

      {erroGeral && (
        <p role="alert" className={CLASSE_DO_ERRO}>
          {erroGeral}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex w-full items-center justify-center rounded-md border border-red-600/50 px-6 py-2 text-sm font-medium text-red-600 transition-colors duration-240 hover:bg-red-500/10 disabled:pointer-events-none disabled:opacity-50 dark:border-red-400/50 dark:text-red-400 dark:hover:bg-red-500/15"
      >
        {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
        Excluir minha conta para sempre
      </button>
    </form>
  );
}
