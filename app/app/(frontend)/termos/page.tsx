import type { Metadata } from "next";
import Link from "next/link";
import {
  ContatoDoProjeto,
  ListaLegal,
  PaginaLegal,
  SecaoLegal,
} from "@/components/legal/PaginaLegal.tsx";

export const metadata: Metadata = { title: "Termos de Uso · Safa Muda" };

// O contato vem do ambiente em tempo de execução (CONTATO_EMAIL).
export const dynamic = "force-dynamic";

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de Uso">
      <p>
        Ao criar uma conta no Safa Muda você concorda com estes termos e com a{" "}
        <Link href="/privacidade" className="bio-link">
          Política de Privacidade
        </Link>
        . São poucas regras, todas para manter o catálogo confiável e a
        comunidade acolhedora.
      </p>

      <SecaoLegal titulo="1. O que é o Safa Muda">
        <p>
          Um sistema colaborativo de planejamento e gestão agroflorestal:
          catálogo de espécies, planejamento de plantios e diário de campo. O
          código é aberto (AGPL-3.0-or-later). O serviço é oferecido como está,
          sem garantia de disponibilidade contínua, e o conteúdo é de apoio ao
          planejamento — não substitui orientação técnica local.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="2. Sua conta">
        <ListaLegal
          itens={[
            "Use dados verdadeiros e mantenha sua senha em segurança; você responde pelo que é feito com a conta.",
            "Uma pessoa, uma conta. Não é permitido se passar por outra pessoa.",
            "Você pode excluir a conta a qualquer momento em /conta.",
          ]}
        />
      </SecaoLegal>

      <SecaoLegal titulo="3. Contribuições ao catálogo">
        <ListaLegal
          itens={[
            "Toda informação proposta precisa citar a fonte (livro, tabela, observação de campo). Não preencha valores por estimativa: se a fonte não diz, o campo fica em branco.",
            "Fotos e textos que você enviar devem ser seus ou ter autorização de uso; não envie conteúdo de terceiros sem permissão nem imagens de pessoas sem o consentimento delas.",
            "Ao enviar, você autoriza a publicação do conteúdo aprovado no catálogo, com o crédito conforme a sua preferência. A equipe pode aprovar, recusar, editar ou remover contribuições.",
            "O que foi publicado e aprovado permanece no histórico mesmo após a exclusão da sua conta; ao excluir, você escolhe se a sua citação é mantida (sem links externos) ou anonimizada (ver Política de Privacidade).",
          ]}
        />
      </SecaoLegal>

      <SecaoLegal titulo="4. Condutas proibidas">
        <ListaLegal
          itens={[
            "Enviar conteúdo ilegal, ofensivo, enganoso ou que viole direitos de terceiros;",
            "tentar acessar dados de outras pessoas, sobrecarregar ou burlar a segurança do serviço;",
            "usar o serviço para spam ou propaganda.",
          ]}
        />
        <p>
          Contas que violarem estas regras podem ser suspensas ou removidas.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="5. Mudanças">
        <p>
          Podemos atualizar estes termos. Quando a mudança for relevante,
          pediremos um novo aceite em /conta.
          <ContatoDoProjeto />
        </p>
      </SecaoLegal>
    </PaginaLegal>
  );
}
