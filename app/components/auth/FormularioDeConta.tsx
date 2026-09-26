"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Globe, Instagram, Loader2 } from "lucide-react";
import {
  $store,
  changePassword,
  emailOtp,
  mensagemDeErro,
  updateUser,
} from "@/lib/auth-client.ts";
import { enviarMidia } from "@/lib/enviar-midia.ts";
import {
  atualizarPerfil,
  definirFotoDePerfil,
  removerFotoDePerfil,
} from "@/app/actions/conta.ts";
import { SobreVoce, PrivacidadeEDados } from "./PerfilOpcional.tsx";
import {
  EXPERIENCIA_LABEL,
  nomeParaCredito,
  rotuloDoPerfilDeUso,
  type PerfilDaConta,
} from "@/lib/perfil-de-usuario.ts";
import { Campo } from "./AuthForm.tsx";
import { DialogoDeConfirmacao } from "@/components/wiki/DialogoDeConfirmacao.tsx";
import { RecortadorDeFoto } from "./RecortadorDeFoto.tsx";
import {
  CLASSE_DO_AVISO,
  CLASSE_DO_BOTAO,
  CLASSE_DO_CARTAO,
  CLASSE_DO_ERRO,
  CLASSE_DO_INPUT,
  LinhaDeDado,
  ModalDeConta,
  TituloDeSecao,
} from "./ElementosDaConta.tsx";

type Props = {
  nome: string;
  email: string;
  imagem: string | null;
  /** Já flexionado pelo tratamento da pessoa. */
  papel: string;
  membroDesde: string;
  perfil: PerfilDaConta;
};

/**
 * Área do usuário, no visual do card de espécie do SAFdex: uma ficha com a
 * foto, seguida do quadro de dados cadastrais.
 */
export function FormularioDeConta(props: Props) {
  return (
    <div className="space-y-4">
      <FichaDoUsuario {...props} />
      <DadosCadastrais {...props} />
      <SobreVoce perfil={props.perfil} temFoto={Boolean(props.imagem)} />
      <PrivacidadeEDados perfil={props.perfil} />
    </div>
  );
}

/**
 * Ficha e foto de perfil: "+ Foto" abre o modal (escolha do arquivo e depois
 * enquadramento) e o recorte é enviado (já com até 500 KB) pelo mesmo caminho das demais imagens do site.
 * A foto anterior fica no armazenamento: ainda pode estar em uso por uma
 * sessão aberta, e a limpeza de mídia órfã é uma varredura à parte.
 */
function FichaDoUsuario({
  nome,
  email,
  imagem,
  papel,
  membroDesde,
  perfil,
}: Props) {
  // "Versão pública" mostra o card como a comunidade o verá: só o que foi
  // tornado público, com o nome como a pessoa pediu para ser citada. Quem
  // escolheu "sem identificação" não tem foto nem links na versão pública.
  const [publica, setPublica] = useState(false);
  const anonima = perfil.creditoNome === "anonimo";

  // Só os links que a pessoa cadastrou: cada um leva ao destino do ícone.
  const links = [
    {
      url: perfil.linkInstagram,
      publico: perfil.publicoInstagram,
      rotulo: "Instagram",
      Icone: Instagram,
    },
    {
      url: perfil.linkSite,
      publico: perfil.publicoSite,
      rotulo: "Site",
      Icone: Globe,
    },
    {
      url: perfil.linkLattes,
      publico: perfil.publicoLattes,
      rotulo: "Currículo Lattes",
      Icone: GraduationCap,
    },
  ].flatMap(({ url, publico, rotulo, Icone }) =>
    url && (!publica || (publico && !anonima)) ? [{ url, rotulo, Icone }] : [],
  );

  const nomeExibido = publica
    ? nomeParaCredito(nome, perfil.creditoNome, perfil.creditoNomeOutro)
    : nome;
  // A foto só aparece na versão pública se a pessoa a tornou pública.
  const imagemExibida =
    publica && (anonima || !perfil.publicoFoto) ? null : imagem;
  const regiao = !publica || perfil.publicoRegiao ? perfil.regiao : null;
  const experiencia =
    !publica || perfil.publicoExperiencia ? perfil.experiencia : null;
  const perfilDeUso =
    !publica || perfil.publicoPerfilDeUso
      ? rotuloDoPerfilDeUso(
          perfil.perfilDeUso,
          perfil.perfilDeUsoOutro,
          perfil.tratamento,
        )
      : null;
  // Na versão pública, campo não publicado some (não vira "não informado").

  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  async function salvar(foto: File, publica: boolean) {
    const { publicUrl } = await enviarMidia(foto, `Foto de ${nome}`);
    // A ação confere que a imagem é da própria pessoa e apaga a foto anterior
    // do armazenamento.
    const resultado = await definirFotoDePerfil(publicUrl, publica);
    if (!resultado.ok) throw new Error(resultado.erro);

    setModalAberto(false);
    // A barra superior lê a sessão no cliente.
    $store.notify("$sessionSignal");
    router.refresh();
  }

  async function alterarVisibilidade(publica: boolean) {
    const resultado = await atualizarPerfil("publicoFoto", publica);
    if (!resultado.ok) throw new Error(resultado.erro);

    setModalAberto(false);
    router.refresh();
  }

  async function remover() {
    setErro(null);
    setRemovendo(true);
    const resultado = await removerFotoDePerfil();
    setRemovendo(false);
    setConfirmandoRemocao(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível remover a foto.");
      return;
    }
    $store.notify("$sessionSignal");
    router.refresh();
  }

  const CLASSE_DO_ATALHO =
    "rounded-md border border-primary/40 bg-bg-surface1/70 px-2 py-0.5 font-mono backdrop-blur-sm text-[0.65rem] text-primary transition-colors duration-240 hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="space-y-3">
      <article className="relative flex min-h-[15rem] flex-col overflow-hidden rounded-xl border border-bg-border bg-bg-surface1 p-5">
        <FotoDeFundo nome={nomeExibido} imagem={imagemExibida} />

        <div className="relative mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-semibold leading-snug text-foreground">
              {nomeExibido}
            </h2>
            <p className="truncate font-mono text-xs text-secondary">
              <span className="italic">Homo sapiens</span>
              <span> — Hominidae</span>
            </p>
          </div>

          {!publica && (
            <>
              {/* Canto superior direito, por cima da foto: o fundo translúcido
              mantém o texto legível sobre qualquer imagem. */}
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setModalAberto(true)}
                  disabled={removendo}
                  className={CLASSE_DO_ATALHO}
                >
                  {imagem ? "Alterar foto" : "+ Foto"}
                </button>
                {imagem && (
                  <button
                    type="button"
                    onClick={() => setConfirmandoRemocao(true)}
                    disabled={removendo}
                    className="inline-flex items-center rounded-md bg-bg-surface1/70 px-2 py-0.5 font-mono text-[0.65rem] text-red-600/80 backdrop-blur-sm transition-colors duration-240 hover:bg-red-500/10 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:text-red-400/80 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                  >
                    {removendo && (
                      <Loader2 size={12} className="mr-1 animate-spin" />
                    )}
                    Remover foto
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <dl className="relative mb-4 space-y-1 text-xs">
          {!publica && (
            <>
              <Linha rotulo="Desde" valor={membroDesde} />
              <Linha rotulo="E-mail" valor={email} />
            </>
          )}
          {(!publica || regiao) && <Linha rotulo="Região" valor={regiao} />}
          {(!publica || experiencia) && (
            <Linha
              rotulo="Experiência"
              valor={experiencia ? EXPERIENCIA_LABEL[experiencia] : null}
            />
          )}
          {links.length > 0 && (
            <Linha rotulo="Links">
              <span className="flex items-center gap-1.5">
                {links.map(({ url, rotulo, Icone }) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={rotulo}
                    title={rotulo}
                    className="flex size-6 items-center justify-center rounded-md border border-border/60 bg-bg-surface1/70 text-muted-foreground backdrop-blur-sm transition-colors duration-240 hover:border-primary/50 hover:text-primary"
                  >
                    <Icone size={13} />
                  </a>
                ))}
              </span>
            </Linha>
          )}
        </dl>

        <div className="relative mt-auto flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-secondary/30 bg-secondary/5 px-2 py-0.5 font-mono text-[0.65rem] text-secondary">
            {papel}
          </span>
          {perfilDeUso && (
            <span className="rounded-md border border-secondary/30 bg-secondary/5 px-2 py-0.5 font-mono text-[0.65rem] text-secondary">
              {perfilDeUso}
            </span>
          )}
        </div>
      </article>

      {/* Dois botões colados: o ativo fica preenchido, o outro discreto. */}
      <div
        role="radiogroup"
        aria-label="Versão do card"
        className="mx-auto flex w-fit overflow-hidden rounded-md border border-border text-xs"
      >
        {[
          { valor: false, rotulo: "Card completo" },
          { valor: true, rotulo: "Versão pública" },
        ].map(({ valor, rotulo }) => (
          <button
            key={rotulo}
            type="button"
            role="radio"
            aria-checked={publica === valor}
            onClick={() => setPublica(valor)}
            className={`px-4 py-1.5 font-mono transition-colors duration-240 ${
              publica === valor
                ? "bg-primary/20 text-primary"
                : "bg-transparent text-muted-foreground hover:bg-bg-surface2 hover:text-foreground"
            } ${valor ? "border-l border-border" : ""}`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {publica && (
        <p className="text-center text-xs text-muted-foreground">
          Assim a comunidade Safa Muda verá o seu card: só o que você tornou
          público, com o nome do jeito que você escolheu em Citação.
        </p>
      )}

      {erro && (
        <p role="alert" className={CLASSE_DO_ERRO}>
          {erro}
        </p>
      )}

      <DialogoDeConfirmacao
        aberto={confirmandoRemocao}
        aoMudar={(aberto) => {
          if (!aberto && !removendo) setConfirmandoRemocao(false);
        }}
        titulo="Remover a foto?"
        descricao="Você deseja mesmo remover sua foto de perfil? O site volta a mostrar a inicial do seu nome no lugar dela."
        acoes={
          <>
            <button
              type="button"
              disabled={removendo}
              onClick={() => setConfirmandoRemocao(false)}
              className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors duration-240 hover:border-primary/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={removendo}
              onClick={remover}
              className="inline-flex items-center rounded-md border border-red-600/50 px-4 py-1.5 text-sm font-medium text-red-600 transition-colors duration-240 hover:bg-red-500/10 disabled:pointer-events-none disabled:opacity-50 dark:border-red-400/50 dark:text-red-400 dark:hover:bg-red-500/15"
            >
              {removendo && <Loader2 size={14} className="mr-2 animate-spin" />}
              Remover foto
            </button>
          </>
        }
      />

      <RecortadorDeFoto
        aberto={modalAberto}
        imagemAtual={imagem}
        publicaInicial={perfil.publicoFoto}
        aoAlterarVisibilidade={alterarVisibilidade}
        aoFechar={() => setModalAberto(false)}
        aoConfirmar={salvar}
      />
    </div>
  );
}

/**
 * Quadro de dados cadastrais: um campo por linha, todos somente leitura. Os
 * que podem mudar têm um lápis ao lado. O nome se edita ali mesmo; e-mail e
 * senha pedem confirmação extra e abrem um modal.
 */
function DadosCadastrais({ nome, email, papel, membroDesde }: Props) {
  const [modal, setModal] = useState<"email" | "senha" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <section className={`space-y-2 ${CLASSE_DO_CARTAO}`}>
      <TituloDeSecao>Dados cadastrais</TituloDeSecao>

      <dl className="divide-y divide-bg-border">
        <LinhaDoNome
          nome={nome}
          aoSalvar={() => setAviso("Nome atualizado.")}
        />
        <LinhaDeDado
          rotulo="E-mail"
          rotuloDoLapis="Alterar e-mail"
          aoEditar={() => {
            setAviso(null);
            setModal("email");
          }}
        >
          {email}
        </LinhaDeDado>
        <LinhaDeDado
          rotulo="Senha"
          rotuloDoLapis="Alterar senha"
          aoEditar={() => {
            setAviso(null);
            setModal("senha");
          }}
        >
          <span aria-label="Senha oculta" className="tracking-widest">
            ••••••••
          </span>
        </LinhaDeDado>
        <LinhaDeDado rotulo="Perfil">{papel}</LinhaDeDado>
        <LinhaDeDado rotulo="Desde">{membroDesde}</LinhaDeDado>
      </dl>

      {aviso && (
        <p role="status" className={`mt-3 ${CLASSE_DO_AVISO}`}>
          {aviso}
        </p>
      )}

      <ModalDeConta
        aberto={modal === "email"}
        aoFechar={() => setModal(null)}
        titulo="Alterar e-mail"
      >
        <FormularioDeTrocaDeEmail
          email={email}
          aoConcluir={(mensagem) => {
            setModal(null);
            setAviso(mensagem);
          }}
        />
      </ModalDeConta>

      <ModalDeConta
        aberto={modal === "senha"}
        aoFechar={() => setModal(null)}
        titulo="Alterar senha"
      >
        <FormularioDeTrocaDeSenha
          aoConcluir={(mensagem) => {
            setModal(null);
            setAviso(mensagem);
          }}
        />
      </ModalDeConta>
    </section>
  );
}

/** O nome é a única edição simples: acontece na própria linha. */
function LinhaDoNome({
  nome,
  aoSalvar,
}: {
  nome: string;
  aoSalvar: () => void;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(nome);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function comecar() {
    setRascunho(nome);
    setErro(null);
    setEditando(true);
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    const limpo = rascunho.trim();
    if (!limpo) {
      setErro("Informe seu nome.");
      return;
    }
    if (limpo.length > 100) {
      setErro("O nome pode ter no máximo 100 caracteres.");
      return;
    }
    if (limpo === nome) {
      setEditando(false);
      return;
    }

    setEnviando(true);
    const { error } = await updateUser({ name: limpo });
    setEnviando(false);

    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }

    setEditando(false);
    aoSalvar();
    // A página lê o usuário no servidor; a barra superior, no cliente.
    router.refresh();
  }

  if (!editando) {
    return (
      <LinhaDeDado
        rotulo="Nome"
        rotuloDoLapis="Alterar nome"
        aoEditar={comecar}
      >
        {nome}
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
        htmlFor="conta-nome"
        className="pt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        Nome
      </label>
      <div className="space-y-2">
        <input
          id="conta-nome"
          name="name"
          type="text"
          autoComplete="name"
          autoFocus
          value={rascunho}
          onChange={(evento) => setRascunho(evento.target.value)}
          onKeyDown={(evento) => evento.key === "Escape" && setEditando(false)}
          aria-invalid={erro ? true : undefined}
          className={CLASSE_DO_INPUT}
        />
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
 * Troca de e-mail em duas etapas: o código vai para o endereço NOVO e só
 * quando ele bate a conta muda. Se o endereço já pertence a outra conta, o
 * servidor responde como se tivesse enviado (para não revelar quem tem
 * conta); o código simplesmente nunca chega.
 */
function FormularioDeTrocaDeEmail({
  email,
  aoConcluir,
}: {
  email: string;
  aoConcluir: (mensagem: string) => void;
}) {
  const router = useRouter();
  const [novoEmail, setNovoEmail] = useState("");
  const [aguardandoPara, setAguardandoPara] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<"enviar" | "confirmar" | null>(
    null,
  );

  async function pedirCodigo(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);

    const alvo = novoEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(alvo)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    if (alvo === email.toLowerCase()) {
      setErro("Este já é o e-mail da sua conta.");
      return;
    }

    setEmAndamento("enviar");
    const { error } = await emailOtp.requestEmailChange({ newEmail: alvo });
    setEmAndamento(null);

    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }
    setCodigo("");
    setAguardandoPara(alvo);
  }

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!aguardandoPara) return;
    setErro(null);
    setAviso(null);

    if (codigo.trim().length < 6) {
      setErro("Digite o código de 6 dígitos.");
      return;
    }

    setEmAndamento("confirmar");
    const { error } = await emailOtp.changeEmail({
      newEmail: aguardandoPara,
      otp: codigo.trim(),
    });
    setEmAndamento(null);

    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }

    // O plugin não avisa o cliente desta rota: sem isto, a barra superior
    // continuaria mostrando o e-mail antigo.
    $store.notify("$sessionSignal");
    router.refresh();
    aoConcluir(`E-mail alterado para ${aguardandoPara}.`);
  }

  async function reenviar() {
    if (!aguardandoPara) return;
    setErro(null);
    setAviso(null);
    setEmAndamento("enviar");
    const { error } = await emailOtp.requestEmailChange({
      newEmail: aguardandoPara,
    });
    setEmAndamento(null);

    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }
    setAviso("Enviamos um novo código.");
  }

  function voltar() {
    setAguardandoPara(null);
    setCodigo("");
    setErro(null);
    setAviso(null);
  }

  const mensagens = (
    <>
      {erro && (
        <p role="alert" className={CLASSE_DO_ERRO}>
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className={CLASSE_DO_AVISO}>
          {aviso}
        </p>
      )}
    </>
  );

  if (aguardandoPara) {
    return (
      <form onSubmit={confirmar} noValidate className="space-y-5">
        <p className="text-sm leading-[1.7] text-muted-foreground">
          Enviamos um código para{" "}
          <strong className="text-foreground">{aguardandoPara}</strong>. Olhe a
          caixa de entrada (e o spam) e digite o código abaixo.
        </p>

        <Campo
          id="conta-email-codigo"
          name="otp"
          label="Código de confirmação"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={codigo}
          onChange={(evento) =>
            setCodigo(evento.target.value.replace(/\D/g, ""))
          }
          className="text-center font-mono text-lg tracking-[0.5em]"
        />

        {mensagens}

        <button
          type="submit"
          disabled={emAndamento !== null || codigo.length < 6}
          className={`w-full ${CLASSE_DO_BOTAO}`}
        >
          {emAndamento === "confirmar" && (
            <Loader2 size={16} className="mr-2 animate-spin" />
          )}
          Confirmar novo e-mail
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={voltar}
            disabled={emAndamento !== null}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            Usar outro e-mail
          </button>
          <button
            type="button"
            onClick={reenviar}
            disabled={emAndamento !== null}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            Reenviar código
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={pedirCodigo} noValidate className="space-y-5">
      <Campo
        id="conta-novo-email"
        name="new-email"
        label="Novo e-mail"
        type="email"
        autoComplete="email"
        autoFocus
        hint="Vamos enviar um código de confirmação para este endereço."
        value={novoEmail}
        onChange={(evento) => setNovoEmail(evento.target.value)}
      />

      {mensagens}

      <button
        type="submit"
        disabled={emAndamento !== null || !novoEmail.trim()}
        className={`w-full ${CLASSE_DO_BOTAO}`}
      >
        {emAndamento === "enviar" && (
          <Loader2 size={16} className="mr-2 animate-spin" />
        )}
        Enviar código
      </button>
    </form>
  );
}

type ErrosDaSenha = {
  atual?: string;
  nova?: string;
  confirmacao?: string;
  geral?: string;
};

function FormularioDeTrocaDeSenha({
  aoConcluir,
}: {
  aoConcluir: (mensagem: string) => void;
}) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<ErrosDaSenha>({});
  const [enviando, setEnviando] = useState(false);

  async function trocar(evento: React.FormEvent) {
    evento.preventDefault();

    // Cada aviso fica junto do campo a que se refere, e todos aparecem de uma
    // vez — a pessoa não corrige um para descobrir o próximo.
    const novos: ErrosDaSenha = {};
    if (!atual) novos.atual = "Digite sua senha atual.";
    if (!nova) {
      novos.nova = "Digite a nova senha.";
    } else if (nova.length < 8) {
      novos.nova = `A nova senha precisa ter pelo menos 8 caracteres (faltam ${8 - nova.length}).`;
    }
    if (!confirmacao) {
      novos.confirmacao = "Repita a nova senha.";
    } else if (!novos.nova && nova !== confirmacao) {
      novos.confirmacao = "As senhas não coincidem.";
    }

    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    const { error } = await changePassword({
      currentPassword: atual,
      newPassword: nova,
      // Quem tinha a senha antiga perde o acesso nos outros dispositivos —
      // mesmo critério da recuperação de senha (lib/auth.ts).
      revokeOtherSessions: true,
    });
    setEnviando(false);

    if (error) {
      setErros(
        error.code === "INVALID_PASSWORD"
          ? { atual: "A senha atual está incorreta." }
          : { geral: mensagemDeErro(error) },
      );
      return;
    }

    aoConcluir("Senha alterada. Os outros dispositivos foram desconectados.");
  }

  return (
    <form onSubmit={trocar} noValidate className="space-y-5">
      <Campo
        id="conta-senha-atual"
        name="current-password"
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={atual}
        onChange={(evento) => setAtual(evento.target.value)}
        erro={erros.atual}
      />
      <Campo
        id="conta-senha-nova"
        name="new-password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        hint="Mínimo de 8 caracteres."
        value={nova}
        onChange={(evento) => setNova(evento.target.value)}
        erro={erros.nova}
      />
      <Campo
        id="conta-senha-confirmacao"
        name="new-password-confirmation"
        label="Confirme a nova senha"
        type="password"
        autoComplete="new-password"
        value={confirmacao}
        onChange={(evento) => setConfirmacao(evento.target.value)}
        erro={erros.confirmacao}
      />

      {erros.geral && (
        <p role="alert" className={CLASSE_DO_ERRO}>
          {erros.geral}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className={`w-full ${CLASSE_DO_BOTAO}`}
      >
        {enviando && <Loader2 size={16} className="mr-2 animate-spin" />}
        Alterar senha
      </button>
    </form>
  );
}

/**
 * Parecido com o do card de espécie: a foto ocupa a metade direita e some
 * para a esquerda. Aqui o esmaecimento é uma máscara de transparência na
 * própria foto (e não um degradê da cor da superfície por cima): a opacidade
 * nasce em zero na borda esquerda e sobe em curva suave, então não há ponto
 * onde a imagem "comece". Sem foto, a inicial do nome faz o papel da imagem.
 */
const MASCARA_DA_FOTO =
  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 12%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.65) 55%, black 85%)";

function FotoDeFundo({
  nome,
  imagem,
}: {
  nome: string;
  imagem: string | null;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 w-1/2 select-none"
      style={{ maskImage: MASCARA_DA_FOTO, WebkitMaskImage: MASCARA_DA_FOTO }}
    >
      {imagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagem} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full items-center justify-center bg-primary/5 font-serif text-8xl font-semibold text-primary/20"
        >
          {nome.trim().charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

/**
 * Linha do card. Sem valor, mostra "não informado" (a regra de ouro dos dados,
 * como no card de espécie); com `children`, mostra o conteúdo no lugar do texto.
 */
function Linha({
  rotulo,
  valor,
  children,
}: {
  rotulo: string;
  valor?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-20 shrink-0 font-mono uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </dt>
      <dd
        className={
          children || valor
            ? "min-w-0 truncate text-foreground/90"
            : "italic text-muted-foreground/60"
        }
      >
        {children ?? valor ?? "não informado"}
      </dd>
    </div>
  );
}
