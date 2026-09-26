import type { Metadata } from "next";
import Link from "next/link";
import {
  ContatoDoProjeto,
  ListaLegal,
  PaginaLegal,
  SecaoLegal,
} from "@/components/legal/PaginaLegal.tsx";

export const metadata: Metadata = { title: "Privacidade · Safa Muda" };

// O contato vem do ambiente em tempo de execução (CONTATO_EMAIL).
export const dynamic = "force-dynamic";

export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de Privacidade">
      <p>
        O Safa Muda é um projeto de código aberto (AGPL-3.0) de planejamento e
        gestão agroflorestal. Esta política explica, em linguagem direta, quais
        dados pessoais tratamos, para quê, e como você controla cada um — nos
        termos da Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <SecaoLegal titulo="1. O que o catálogo público não pede">
        <p>
          Navegar pelo catálogo de espécies (SAFdex) não exige conta nem entrega
          dado pessoal. A conta serve para propor edições e criar projetos de
          plantio.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="2. Dados que tratamos">
        <p>
          <strong>No cadastro (obrigatórios para ter conta):</strong>
        </p>
        <ListaLegal
          itens={[
            "nome, e-mail e senha (a senha é guardada apenas em forma criptografada, com hash — nem a equipe consegue lê-la);",
            "a versão dos Termos e da Política que você aceitou e o momento do aceite.",
          ]}
        />
        <p>
          <strong>Depois, se você quiser (todos opcionais):</strong>
        </p>
        <ListaLegal
          itens={[
            "foto de perfil;",
            "região de atuação (cidade e estado, escolhidos na lista de municípios do IBGE — nunca coordenadas), perfil de uso, tempo de experiência com agrofloresta e uma bio curta;",
            "links para Instagram, site pessoal e Currículo Lattes;",
            "como você prefere ser tratado nas palavras que flexionam em gênero (feminino, masculino ou neutro) — se você escolher, isso é público: define a flexão das palavras ligadas ao seu nome no site, como “colaboradora” no seu card;",
            "suas preferências: como você quer ser citado e se quer avisos por e-mail.",
          ]}
        />
        <p>
          <strong>Gerados pelo uso:</strong> as propostas de edição, fotos e
          projetos que você cria; dados técnicos de sessão (data, endereço IP e
          navegador do login) para manter você conectado e proteger a conta.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="3. Para que usamos, e em que base legal">
        <ListaLegal
          itens={[
            "Cadastro, login, e-mails de código (confirmação, recuperação de senha, troca de e-mail) e o funcionamento da sua conta — execução do serviço que você pediu (art. 7º, V).",
            "Avisar sobre a avaliação das suas contribuições — execução do serviço; você pode desligar em /conta.",
            "Dados de perfil opcionais — seu consentimento (art. 7º, I). Servem para contextualizar contribuições (por exemplo, a região em que uma observação foi feita) e para entender quem usa o Safa Muda. Você pode preencher, alterar ou apagar quando quiser.",
            "Segurança e prevenção de abuso — legítimo interesse (art. 7º, IX).",
          ]}
        />
        <p>
          <strong>O que é público:</strong> nenhum dado do perfil opcional, nem
          a foto, é exibido a outras pessoas por padrão. Cada campo, e a foto,
          tem a chave <em>Tornar público</em> e só é compartilhado com a
          comunidade se você a ligar. Seu nome só aparece na equipe de moderação
          e no histórico de alterações das espécies, do jeito que você escolher
          em <em>Citação</em> (nome completo, só o primeiro nome ou sem
          identificação). Seus links de Instagram, site e Lattes só aparecem ao
          lado do seu nome se você ligar a chave correspondente em{" "}
          <em>Citação</em>; por padrão, todas ficam desligadas.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="4. Com quem compartilhamos">
        <p>
          Não vendemos nem cedemos seus dados. Eles ficam na infraestrutura que
          hospeda o Safa Muda (servidor, banco de dados, armazenamento de
          imagens e envio de e-mail), que os trata apenas para operar o serviço.
          Podemos divulgar dados se a lei ou uma ordem judicial exigir.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="5. O que fica depois de você sair">
        <p>
          Ao excluir a conta, removemos seu cadastro, o perfil opcional, a foto
          de perfil, as sessões e o que era privado (projetos, propostas
          pendentes e notificações). O que você já contribuiu e foi{" "}
          <strong>publicado no catálogo</strong> — o histórico de alterações das
          fichas e as fotos aprovadas — permanece, porque faz parte do
          conhecimento coletivo e da rastreabilidade dos dados. Ao excluir,{" "}
          <strong>você escolhe</strong>: manter a sua citação (o nome do jeito
          que você definiu, sem links para perfis externos) ou anonimizá-la
          (“Pessoa colaboradora”). Em nenhum dos casos o conteúdo continua
          ligado à sua conta.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="6. Por quanto tempo guardamos">
        <p>
          Enquanto sua conta existir. Sessões expiram sozinhas após 30 dias sem
          uso. Códigos por e-mail valem 10 minutos.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="7. Seus direitos (art. 18 da LGPD)">
        <p>
          Você pode, a qualquer momento, na sua{" "}
          <Link href="/conta" className="bio-link">
            área da conta
          </Link>
          :
        </p>
        <ListaLegal
          itens={[
            "ver e corrigir seus dados (nome, e-mail, perfil);",
            "baixar uma cópia de tudo o que temos sobre você, em JSON (acesso e portabilidade);",
            "apagar dados opcionais, um a um, ou retirar o consentimento;",
            "excluir a conta e os dados associados (com a ressalva do item 5).",
          ]}
        />
        <p>
          Também pode pedir informações sobre o tratamento e reclamar à
          Autoridade Nacional de Proteção de Dados (ANPD).
          <ContatoDoProjeto />
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="8. Cookies">
        <p>
          Usamos apenas o cookie de sessão, essencial para manter você
          conectado. Não usamos cookies de publicidade nem rastreamento de
          terceiros.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="9. Crianças e adolescentes">
        <p>
          O Safa Muda não é voltado a menores de 18 anos. Se identificarmos uma
          conta de menor sem o consentimento de responsável, ela poderá ser
          removida.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="10. Mudanças nesta política">
        <p>
          Se o texto mudar de modo que afete seus dados ou direitos, atualizamos
          a versão e pedimos um novo aceite em /conta.
        </p>
      </SecaoLegal>
    </PaginaLegal>
  );
}
