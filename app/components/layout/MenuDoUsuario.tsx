"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  IdCard,
  Loader2,
  LogOut,
  ShieldCheck,
  User,
  UserRound,
} from "lucide-react";
import { AceiteDosTermos } from "@/components/auth/AceiteDosTermos.tsx";
import { AvatarDoUsuario } from "@/components/auth/AvatarDoUsuario.tsx";
import { VERSAO_DOS_TERMOS } from "@/lib/termos.ts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  signIn,
  signUp,
  signOut,
  useSessaoHidratada,
  emailOtp,
  mensagemDeErro,
} from "@/lib/auth-client.ts";

/** Páginas que exigem sessão (ver `redirect("/entrar…")` nas páginas). */
const PAGINAS_RESTRITAS = [
  /^\/conta(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/projetos(\/|$)/,
  /^\/safdex\/nova$/,
  /^\/safdex\/[^/]+\/(fotos|sugerir)$/,
];

function ehPaginaRestrita(pathname: string) {
  return PAGINAS_RESTRITAS.some((re) => re.test(pathname));
}

/**
 * Botão-ícone do usuário na barra superior, com o menu suspenso.
 *
 * É client de propósito. Buscar a sessão no servidor dentro do layout tornaria
 * TODA página dinâmica — inclusive as 442 fichas de espécie, que dependem de
 * ISR para serem indexáveis. Aqui o layout continua estático e só este pedaço
 * consulta a sessão (useSessaoHidratada), depois da hidratação.
 */
export function MenuDoUsuario() {
  const [aberto, setAberto] = useState(false);
  const { data: sessao, isPending } = useSessaoHidratada();
  // O Better Auth refaz a checagem de sessão depois de várias chamadas (ver
  // atomListeners do client) — inclusive /sign-up/email, que não loga
  // ninguém sozinho (a conta só entra depois do código, ver lib/auth.ts).
  // Sem isto, `isPending` piscaria true a cada uma dessas chamadas e
  // desmontaria o PainelDeEntrada no meio do cadastro, perdendo a etapa do
  // código. O spinner deve aparecer só na checagem inicial.
  const [carregouUmaVez, setCarregouUmaVez] = useState(false);
  // O conteúdo do Popover é desmontado ao fechar. Se esse estado morasse no
  // PainelDeEntrada, um clique fora do menu no meio do cadastro (ou da
  // recuperação de senha) devolveria o usuário ao formulário de login em vez
  // da etapa do código. Aqui, no menu que continua montado, ele sobrevive.
  const [etapaDeEntrada, setEtapaDeEntrada] =
    useState<EtapaDeEntrada>(ETAPA_INICIAL);
  useEffect(() => {
    if (!isPending) setCarregouUmaVez(true);
  }, [isPending]);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        aria-label={sessao ? `Conta de ${sessao.user.name}` : "Entrar"}
        className={`flex h-10 w-10 items-center justify-center rounded-full sm:h-6 sm:w-6 transition-colors ${
          sessao
            ? "bg-primary/15 text-xs font-semibold text-primary hover:bg-primary/25"
            : "rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {sessao ? (
          <AvatarDoUsuario
            nome={sessao.user.name}
            imagem={sessao.user.image}
            className="size-6 text-xs"
          />
        ) : (
          <User className="h-4 w-4" />
        )}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-72">
        {!carregouUmaVez ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : sessao ? (
          <PainelLogado
            id={sessao.user.id}
            nome={sessao.user.name}
            email={sessao.user.email}
            imagem={sessao.user.image}
            equipe={
              sessao.user.role === "moderator" || sessao.user.role === "admin"
            }
            fechar={() => setAberto(false)}
          />
        ) : (
          <PainelDeEntrada
            etapa={etapaDeEntrada}
            mudarEtapa={setEtapaDeEntrada}
            fechar={() => setAberto(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Primeira mensagem de validação do formulário, em português. Os formulários
 * do menu usam `noValidate`: o balão nativo do navegador sai no idioma dele
 * (inglês, por exemplo) e foge do visual do site. Em vez dele, a mensagem vai
 * para a caixa de erro do próprio painel.
 */
function mensagemDeValidacao(form: HTMLFormElement): string | null {
  for (const elemento of Array.from(form.elements)) {
    if (!(elemento instanceof HTMLInputElement)) continue;
    const validade = elemento.validity;
    if (validade.valid) continue;

    if (validade.valueMissing && elemento.type === "checkbox") {
      return "Aceite os Termos e a Política para criar a conta.";
    }
    if (validade.valueMissing) return "Preencha todos os campos.";
    if (validade.typeMismatch && elemento.type === "email") {
      return "Informe um e-mail válido.";
    }
    if (validade.tooShort) {
      return `A senha precisa ter pelo menos ${elemento.minLength} caracteres (faltam ${
        elemento.minLength - elemento.value.length
      }).`;
    }
    return "Verifique os valores informados.";
  }
  return null;
}

const CLASSE_DO_CAMPO =
  "w-full rounded-md border border-border bg-input px-3 py-1.5 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const CLASSE_DO_ROTULO =
  "mb-1 block font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground";

const CLASSE_SECUNDARIA =
  "text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50";

const CLASSE_DO_BOTAO_PRINCIPAL =
  "inline-flex w-full items-center justify-center rounded-md border border-primary bg-transparent px-4 py-1.5 text-sm font-medium text-primary transition-all duration-240 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

type EtapaDeEntrada = {
  modo: "entrar" | "cadastrar";
  // Com um e-mail, mostra o campo de código de confirmação — é o e-mail para
  // o qual o código foi enviado. Null mostra o formulário de cadastro.
  aguardandoCodigoPara: string | null;
  // Igual: com um e-mail, mostra a recuperação de senha (código, depois senha
  // nova) — ver EtapaDeRecuperacaoDeSenha.
  recuperandoEmail: string | null;
  // Código de 6 dígitos que o usuário já digitou na etapa em andamento
  // (confirmação de cadastro ou recuperação de senha). Só uma etapa de código
  // existe por vez, então um campo serve às duas.
  codigo: string;
  // Recuperação de senha: primeiro valida o código, depois pede a senha nova.
  // A senha nova não sobe para cá de propósito: não deve sobreviver ao menu
  // fechado.
  etapaDaRecuperacao: "codigo" | "senha";
};

const ETAPA_INICIAL: EtapaDeEntrada = {
  modo: "entrar",
  aguardandoCodigoPara: null,
  recuperandoEmail: null,
  codigo: "",
  etapaDaRecuperacao: "codigo",
};

/**
 * Painel de quem não está logado. Alterna entre entrar e cadastrar dentro do
 * próprio menu, sem sair da página; o e-mail digitado passa de um modo para
 * o outro. O cadastro tem uma segunda etapa, de código de confirmação — ver
 * EtapaDeCodigo.
 */
function PainelDeEntrada({
  etapa,
  mudarEtapa,
  fechar,
}: {
  etapa: EtapaDeEntrada;
  mudarEtapa: Dispatch<SetStateAction<EtapaDeEntrada>>;
  fechar: () => void;
}) {
  const router = useRouter();
  const { modo, aguardandoCodigoPara, recuperandoEmail } = etapa;
  // Entrar ou sair de uma etapa de código começa (ou descarta) o que foi
  // digitado nela.
  const setAguardandoCodigoPara = (email: string | null) =>
    mudarEtapa((atual) => ({
      ...atual,
      aguardandoCodigoPara: email,
      codigo: "",
    }));
  const setRecuperandoEmail = (email: string | null) =>
    mudarEtapa((atual) => ({
      ...atual,
      recuperandoEmail: email,
      codigo: "",
      etapaDaRecuperacao: "codigo",
    }));
  const setCodigo = (codigo: string) =>
    mudarEtapa((atual) => ({ ...atual, codigo }));
  const setEtapaDaRecuperacao = (etapaDaRecuperacao: "codigo" | "senha") =>
    mudarEtapa((atual) => ({ ...atual, etapaDaRecuperacao }));
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacaoDeSenha, setConfirmacaoDeSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<"enviar" | "recuperar" | null>(
    null,
  );

  function trocarModo(novo: "entrar" | "cadastrar") {
    mudarEtapa({ ...ETAPA_INICIAL, modo: novo });
    setErro(null);
    setAviso(null);
    setSenha("");
    setConfirmacaoDeSenha("");
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);

    const invalido = mensagemDeValidacao(evento.currentTarget);
    if (invalido) {
      setErro(invalido);
      return;
    }

    if (modo === "cadastrar" && senha !== confirmacaoDeSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEmAndamento("enviar");

    const { error } =
      modo === "cadastrar"
        ? await signUp.email({
            name: nome.trim(),
            email,
            password: senha,
            termosVersao: VERSAO_DOS_TERMOS,
          })
        : await signIn.email({ email, password: senha });

    setEmAndamento(null);
    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }

    if (modo === "cadastrar") {
      // A sessão só abre depois do código (ver lib/auth.ts) — o cadastro em
      // si só cria a conta e dispara o e-mail.
      setAguardandoCodigoPara(email);
      return;
    }

    mudarEtapa(ETAPA_INICIAL);
    fechar();
    // Páginas que leem a sessão no servidor (home, projetos) precisam
    // renderizar de novo.
    router.refresh();
  }

  async function iniciarRecuperacao() {
    setErro(null);
    setAviso(null);

    const alvo = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(alvo)) {
      setErro("Digite seu e-mail no campo acima para receber o código.");
      return;
    }

    setEmAndamento("recuperar");
    const { error } = await emailOtp.requestPasswordReset({ email: alvo });
    setEmAndamento(null);

    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }
    setRecuperandoEmail(alvo);
  }

  if (aguardandoCodigoPara) {
    return (
      <EtapaDeCodigo
        email={aguardandoCodigoPara}
        codigo={etapa.codigo}
        setCodigo={setCodigo}
        voltar={() => setAguardandoCodigoPara(null)}
        concluir={() => {
          // O estado da etapa vive fora do painel (ver MenuDoUsuario): sem
          // reiniciar, depois de um logout o menu reabriria no código.
          mudarEtapa(ETAPA_INICIAL);
          fechar();
          router.refresh();
        }}
      />
    );
  }

  if (recuperandoEmail) {
    return (
      <EtapaDeRecuperacaoDeSenha
        email={recuperandoEmail}
        codigo={etapa.codigo}
        setCodigo={setCodigo}
        etapa={etapa.etapaDaRecuperacao}
        setEtapa={setEtapaDaRecuperacao}
        voltar={() => setRecuperandoEmail(null)}
        concluir={() => {
          // O estado da etapa vive fora do painel (ver MenuDoUsuario): sem
          // reiniciar, depois de um logout o menu reabriria no código.
          mudarEtapa(ETAPA_INICIAL);
          fechar();
          router.refresh();
        }}
      />
    );
  }

  const cadastrando = modo === "cadastrar";

  return (
    <form onSubmit={enviar} noValidate className="space-y-3">
      {cadastrando ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Criar conta</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            O catálogo é público. A conta serve para propor edições e criar seus
            projetos de plantio.
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium text-foreground">
          Você não está logado
        </p>
      )}

      {cadastrando && (
        <div>
          <label htmlFor="menu-nome" className={CLASSE_DO_ROTULO}>
            Nome
          </label>
          <input
            id="menu-nome"
            name="name"
            type="text"
            autoComplete="name"
            required
            autoFocus
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            className={CLASSE_DO_CAMPO}
          />
        </div>
      )}

      <div>
        <label htmlFor="menu-email" className={CLASSE_DO_ROTULO}>
          E-mail
        </label>
        <input
          id="menu-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          className={CLASSE_DO_CAMPO}
        />
      </div>

      <div>
        <label htmlFor="menu-senha" className={CLASSE_DO_ROTULO}>
          Senha
        </label>
        <input
          id="menu-senha"
          name="password"
          type="password"
          autoComplete={cadastrando ? "new-password" : "current-password"}
          required
          minLength={cadastrando ? 8 : undefined}
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          className={CLASSE_DO_CAMPO}
        />
        {cadastrando && (
          <p className="mt-1 text-xs text-muted-foreground">
            Mínimo de 8 caracteres.
          </p>
        )}
        {!cadastrando && (
          <div className="mt-1 text-right">
            <button
              type="button"
              onClick={iniciarRecuperacao}
              disabled={emAndamento !== null}
              className="inline-flex items-center text-[11px] text-muted-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              {emAndamento === "recuperar" && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}
              Esqueceu a senha?
            </button>
          </div>
        )}
      </div>

      {cadastrando && (
        <div>
          <label htmlFor="menu-confirmacao-senha" className={CLASSE_DO_ROTULO}>
            Confirme sua senha
          </label>
          <input
            id="menu-confirmacao-senha"
            name="password-confirmation"
            type="password"
            autoComplete="new-password"
            required
            value={confirmacaoDeSenha}
            onChange={(evento) => setConfirmacaoDeSenha(evento.target.value)}
            className={CLASSE_DO_CAMPO}
          />
        </div>
      )}

      {cadastrando && <AceiteDosTermos id="menu-termos" compacto />}

      {erro && (
        <p
          role="alert"
          className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}
      {aviso && (
        <p
          role="status"
          className="rounded-md border-l-4 border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200"
        >
          {aviso}
        </p>
      )}

      <button
        type="submit"
        disabled={emAndamento !== null}
        className={CLASSE_DO_BOTAO_PRINCIPAL}
      >
        {emAndamento === "enviar" && (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        )}
        {cadastrando ? "Criar conta" : "Entrar"}
      </button>

      {cadastrando ? (
        <p className="pt-1 text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => trocarModo("entrar")}
            className="text-primary underline-offset-4 hover:underline"
          >
            Entrar
          </button>
        </p>
      ) : (
        <p className="pt-1 text-center text-xs text-muted-foreground">
          Ainda não tem conta?{" "}
          <button
            type="button"
            onClick={() => trocarModo("cadastrar")}
            className="text-primary underline-offset-4 hover:underline"
          >
            Cadastrar
          </button>
        </p>
      )}
    </form>
  );
}

/**
 * Segunda etapa do cadastro: o código de 6 dígitos que chegou por e-mail.
 * Confirmar aqui já abre a sessão (autoSignInAfterVerification, em
 * lib/auth.ts) — não tem um passo de login separado depois.
 */
function EtapaDeCodigo({
  email,
  codigo,
  setCodigo,
  voltar,
  concluir,
}: {
  email: string;
  codigo: string;
  setCodigo: (codigo: string) => void;
  voltar: () => void;
  concluir: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<
    "confirmar" | "reenviar" | null
  >(null);

  async function confirmar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const invalido = mensagemDeValidacao(evento.currentTarget);
    if (invalido) {
      setErro(invalido);
      return;
    }
    setAviso(null);
    setEmAndamento("confirmar");

    const { error } = await emailOtp.verifyEmail({ email, otp: codigo.trim() });

    setEmAndamento(null);
    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }

    concluir();
  }

  async function reenviar() {
    setErro(null);
    setAviso(null);
    setEmAndamento("reenviar");

    const { error } = await emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });

    setEmAndamento(null);
    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }
    setAviso("Enviamos um novo código.");
  }

  return (
    <form onSubmit={confirmar} noValidate className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Confirme seu e-mail
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Enviamos um código para{" "}
          <strong className="text-foreground">{email}</strong>. Olhe sua caixa
          de entrada (e o spam) e cole o código aqui.
        </p>
      </div>

      <div>
        <label htmlFor="menu-codigo" className={CLASSE_DO_ROTULO}>
          Código de confirmação
        </label>
        <input
          id="menu-codigo"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          autoFocus
          maxLength={6}
          value={codigo}
          onChange={(evento) =>
            setCodigo(evento.target.value.replace(/\D/g, ""))
          }
          className={`${CLASSE_DO_CAMPO} text-center font-mono text-lg tracking-[0.5em]`}
        />
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}
      {aviso && (
        <p
          role="status"
          className="rounded-md border-l-4 border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200"
        >
          {aviso}
        </p>
      )}

      <button
        type="submit"
        disabled={emAndamento !== null || codigo.length < 6}
        className={CLASSE_DO_BOTAO_PRINCIPAL}
      >
        {emAndamento === "confirmar" && (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        )}
        Confirmar código
      </button>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={voltar}
          disabled={emAndamento !== null}
          className={CLASSE_SECUNDARIA}
        >
          Usar outro e-mail
        </button>
        <button
          type="button"
          onClick={reenviar}
          disabled={emAndamento !== null}
          className={`inline-flex items-center ${CLASSE_SECUNDARIA}`}
        >
          {emAndamento === "reenviar" && (
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
          )}
          Reenviar código
        </button>
      </div>
    </form>
  );
}

/**
 * Recuperação de senha: primeiro o código de 6 dígitos que chegou por
 * e-mail (checkVerificationOtp, que não consome o código), depois a senha
 * nova (resetPassword, que já consome). O Better Auth não abre sessão
 * sozinho nesse fluxo — por isso o signIn.email no final, com a senha que
 * acabou de ser salva.
 */
function EtapaDeRecuperacaoDeSenha({
  email,
  codigo,
  setCodigo,
  etapa,
  setEtapa,
  voltar,
  concluir,
}: {
  email: string;
  codigo: string;
  setCodigo: (codigo: string) => void;
  etapa: "codigo" | "senha";
  setEtapa: (etapa: "codigo" | "senha") => void;
  voltar: () => void;
  concluir: () => void;
}) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoDeSenha, setConfirmacaoDeSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<
    "validar" | "salvar" | "reenviar" | null
  >(null);

  async function validarCodigo(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const invalido = mensagemDeValidacao(evento.currentTarget);
    if (invalido) {
      setErro(invalido);
      return;
    }
    setEmAndamento("validar");

    const { error } = await emailOtp.checkVerificationOtp({
      email,
      otp: codigo.trim(),
      type: "forget-password",
    });

    setEmAndamento(null);
    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }
    setEtapa("senha");
  }

  async function salvarNovaSenha(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const invalido = mensagemDeValidacao(evento.currentTarget);
    if (invalido) {
      setErro(invalido);
      return;
    }

    if (novaSenha !== confirmacaoDeSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEmAndamento("salvar");
    const { error } = await emailOtp.resetPassword({
      email,
      otp: codigo.trim(),
      password: novaSenha,
    });

    if (error) {
      setEmAndamento(null);
      setErro(mensagemDeErro(error));
      return;
    }

    const { error: erroDeEntrada } = await signIn.email({
      email,
      password: novaSenha,
    });
    setEmAndamento(null);
    if (erroDeEntrada) {
      setErro(mensagemDeErro(erroDeEntrada));
      return;
    }

    concluir();
  }

  async function reenviar() {
    setErro(null);
    setAviso(null);
    setEmAndamento("reenviar");

    const { error } = await emailOtp.requestPasswordReset({ email });

    setEmAndamento(null);
    if (error) {
      setErro(mensagemDeErro(error));
      return;
    }
    setAviso("Enviamos um novo código.");
  }

  if (etapa === "senha") {
    return (
      <form onSubmit={salvarNovaSenha} noValidate className="space-y-3">
        <p className="text-sm font-medium text-foreground">Nova senha</p>

        <div>
          <label htmlFor="menu-nova-senha" className={CLASSE_DO_ROTULO}>
            Nova senha
          </label>
          <input
            id="menu-nova-senha"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            autoFocus
            minLength={8}
            value={novaSenha}
            onChange={(evento) => setNovaSenha(evento.target.value)}
            className={CLASSE_DO_CAMPO}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Mínimo de 8 caracteres.
          </p>
        </div>

        <div>
          <label
            htmlFor="menu-confirma-nova-senha"
            className={CLASSE_DO_ROTULO}
          >
            Confirme a nova senha
          </label>
          <input
            id="menu-confirma-nova-senha"
            name="password-confirmation"
            type="password"
            autoComplete="new-password"
            required
            value={confirmacaoDeSenha}
            onChange={(evento) => setConfirmacaoDeSenha(evento.target.value)}
            className={CLASSE_DO_CAMPO}
          />
        </div>

        {erro && (
          <p
            role="alert"
            className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-900 dark:text-red-200"
          >
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={emAndamento !== null}
          className={CLASSE_DO_BOTAO_PRINCIPAL}
        >
          {emAndamento === "salvar" && (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          )}
          Salvar nova senha
        </button>

        <p className="pt-1 text-center">
          <button
            type="button"
            onClick={voltar}
            disabled={emAndamento !== null}
            className={CLASSE_SECUNDARIA}
          >
            Cancelar
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={validarCodigo} noValidate className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Recuperar senha</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Um código de recuperação foi enviado para o seu e-mail, digite-o
          abaixo.
        </p>
      </div>

      <div>
        <label htmlFor="menu-codigo-recuperacao" className={CLASSE_DO_ROTULO}>
          Código de recuperação
        </label>
        <input
          id="menu-codigo-recuperacao"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          autoFocus
          maxLength={6}
          value={codigo}
          onChange={(evento) =>
            setCodigo(evento.target.value.replace(/\D/g, ""))
          }
          className={`${CLASSE_DO_CAMPO} text-center font-mono text-lg tracking-[0.5em]`}
        />
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-md border-l-4 border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-900 dark:text-red-200"
        >
          {erro}
        </p>
      )}
      {aviso && (
        <p
          role="status"
          className="rounded-md border-l-4 border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200"
        >
          {aviso}
        </p>
      )}

      <button
        type="submit"
        disabled={emAndamento !== null || codigo.length < 6}
        className={CLASSE_DO_BOTAO_PRINCIPAL}
      >
        {emAndamento === "validar" && (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        )}
        Validar código
      </button>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={voltar}
          disabled={emAndamento !== null}
          className={CLASSE_SECUNDARIA}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={reenviar}
          disabled={emAndamento !== null}
          className={`inline-flex items-center ${CLASSE_SECUNDARIA}`}
        >
          {emAndamento === "reenviar" && (
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
          )}
          Reenviar código
        </button>
      </div>
    </form>
  );
}

function PainelLogado({
  id,
  nome,
  email,
  imagem,
  equipe,
  fechar,
}: {
  id: string;
  nome: string;
  email: string;
  imagem?: string | null;
  /** Moderador ou admin: ganha o atalho para a área da equipe. */
  equipe: boolean;
  fechar: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await signOut();
    setSaindo(false);
    fechar();
    // Numa página restrita, sair leva à home em vez de ao login.
    if (ehPaginaRestrita(pathname)) router.replace("/");
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <AvatarDoUsuario
          nome={nome}
          imagem={imagem}
          className="size-9 text-sm"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{nome}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="-mx-4 border-t border-border" />

      <nav className="-mx-2 flex flex-col">
        {/* "Meus projetos" (/projetos) volta aqui quando a funcionalidade estiver pronta. */}
        <Link
          href="/conta"
          onClick={fechar}
          className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <UserRound className="h-4 w-4" />
          Minha conta
        </Link>
        <Link
          href={`/colaboradores/${id}`}
          onClick={fechar}
          className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <IdCard className="h-4 w-4" />
          Meu perfil
        </Link>
        {equipe && (
          <Link
            href="/admin"
            onClick={fechar}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShieldCheck className="h-4 w-4" />
            Administração
          </Link>
        )}
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          {saindo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Sair
        </button>
      </nav>
    </div>
  );
}
