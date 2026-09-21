"use client";

import { useRef, useState } from "react";
import { ModalDoCatalogo } from "@/components/catalogo/ModalDoCatalogo.tsx";
import {
  BotaoDeEdicao,
  ProvedorDoModoDeEdicao,
  useModoDeEdicao,
} from "@/components/wiki/ModoDeEdicao.tsx";
import {
  AcoesDeDescarte,
  DialogoDeConfirmacao,
} from "@/components/wiki/DialogoDeConfirmacao.tsx";

/**
 * Ficha da espécie sobreposta ao catálogo, com o botão de modo de edição na
 * moldura (ver ModalDoCatalogo.tsx para a animação e o fechamento). Os links
 * externos (GBIF, iNaturalist) vão no `cabecalho`, ao lado do nome
 * científico — ver IdentidadeDaEspecie em DetalheEspecie.tsx.
 */
export function ModalDaEspecie({
  titulo,
  destino,
  slug,
  cabecalho,
  fotoDeFundo,
  children,
}: {
  titulo: string;
  destino: string;
  slug: string;
  cabecalho?: React.ReactNode;
  fotoDeFundo?: { key: string; alt: string | null } | null;
  children: React.ReactNode;
}) {
  return (
    <ProvedorDoModoDeEdicao slug={slug} nomeDaEspecie={titulo}>
      <Moldura
        titulo={titulo}
        destino={destino}
        cabecalho={cabecalho}
        fotoDeFundo={fotoDeFundo}
      >
        {children}
      </Moldura>
    </ProvedorDoModoDeEdicao>
  );
}

/**
 * Separada de `ModalDaEspecie` só para ficar dentro do provedor: é daqui que
 * se sabe se há alterações a perder.
 *
 * Com o rascunho do modo de edição pendente, fechar a ficha — clique fora, Esc
 * ou X — não fecha: pergunta antes, porque fechar desmonta o provedor e o
 * rascunho vai junto. Sem nada a perder, fecha direto, mesmo com o modo ligado.
 */
function Moldura({
  titulo,
  destino,
  cabecalho,
  fotoDeFundo,
  children,
}: {
  titulo: string;
  destino: string;
  cabecalho?: React.ReactNode;
  fotoDeFundo?: { key: string; alt: string | null } | null;
  children: React.ReactNode;
}) {
  const { temAlteracoes, descartar } = useModoDeEdicao();
  const [perguntando, setPerguntando] = useState(false);
  const fecharDeVez = useRef<() => void>(() => {});

  return (
    <ModalDoCatalogo
      titulo={titulo}
      destino={destino}
      cabecalho={cabecalho}
      fotoDeFundo={fotoDeFundo}
      aoTentarFechar={(fechar) => {
        if (!temAlteracoes) {
          fechar();
          return;
        }
        fecharDeVez.current = fechar;
        setPerguntando(true);
      }}
      acoes={<BotaoDeEdicao />}
    >
      {children}

      <DialogoDeConfirmacao
        aberto={perguntando}
        aoMudar={setPerguntando}
        titulo="Fechar sem enviar?"
        descricao="Você está no modo de edição. Se fechar esta janela sem salvar e enviar, as modificações que você fez serão perdidas."
        acoes={
          <AcoesDeDescarte
            rotuloDescartar="Descartar alterações e fechar janela"
            aoDescartar={() => {
              setPerguntando(false);
              descartar();
              fecharDeVez.current();
            }}
            aoContinuar={() => setPerguntando(false)}
          />
        }
      />
    </ModalDoCatalogo>
  );
}
