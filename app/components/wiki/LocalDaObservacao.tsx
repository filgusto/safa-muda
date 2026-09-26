"use client";

import { useEffect, useId, useState } from "react";
import {
  SeletorDeCidade,
  carregarDoIbge,
} from "@/components/auth/PerfilOpcional.tsx";
import { minhaRegiao } from "@/app/actions/wiki.ts";
import { formatarLocal, parsearLocal, type Estado } from "@/lib/regiao.ts";
import { cn } from "@/lib/utils.ts";

/**
 * A região do perfil, lida uma vez por carregamento da página. Um resultado
 * vazio não fica guardado: a pessoa pode entrar ou preencher o perfil sem
 * recarregar, e o "nada" antigo esconderia a região nova.
 */
let regiaoDoPerfil: Promise<string | null> | null = null;

/**
 * Onde a observação foi feita: começa na região do cadastro e pode ser trocada
 * (a pessoa observou em outra cidade, ou o dado veio de um livro sobre outro
 * lugar). `local` é `""` quando nada foi escolhido — o campo é opcional.
 *
 * A ordem de precedência é: o que a pessoa escolheu neste campo (inclusive
 * esvaziar), o `anterior` (o local já declarado nesta edição) e, por fim, a
 * região do perfil. `carregar` só liga a busca do perfil quando o formulário
 * está de fato aberto — a ficha é vista por muita gente que nunca edita.
 */
export function useLocalDaObservacao(carregar: boolean, anterior?: string) {
  const [escolhido, definirLocal] = useState<string | undefined>(undefined);
  const [doPerfil, setDoPerfil] = useState<string | null>(null);
  const preciso = carregar && escolhido === undefined && anterior === undefined;

  useEffect(() => {
    if (!preciso) return;
    regiaoDoPerfil ??= minhaRegiao().then((regiao) => {
      if (regiao === null) regiaoDoPerfil = null;
      return regiao;
    });
    let ativo = true;
    void regiaoDoPerfil.then((regiao) => ativo && setDoPerfil(regiao));
    return () => {
      ativo = false;
    };
  }, [preciso]);

  return { local: escolhido ?? anterior ?? doPerfil ?? "", definirLocal };
}

export function LocalDaObservacao({
  valor,
  aoMudar,
  className,
}: {
  valor: string;
  aoMudar: (local: string) => void;
  className?: string;
}) {
  const id = useId();
  const atual = parsearLocal(valor);
  const uf = atual?.uf ?? "";
  const cidade = atual?.cidade ?? "";
  const [estados, setEstados] = useState<Estado[] | null>(null);
  const [cidades, setCidades] = useState<string[] | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    carregarDoIbge<Estado[]>("/api/ibge/estados")
      .then((lista) => ativo && setEstados(lista))
      .catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    setCidades(null);
    if (!uf) return;
    let ativo = true;
    carregarDoIbge<string[]>(`/api/ibge/municipios/${uf}`)
      .then((lista) => ativo && setCidades(lista))
      .catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
    };
  }, [uf]);

  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="mb-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        Onde foi observado (opcional)
      </legend>
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
        <select
          id={id}
          aria-label="Estado da observação"
          value={uf}
          disabled={!estados}
          onChange={(evento) => aoMudar(formatarLocal(evento.target.value, ""))}
          className={CAMPO}
        >
          <option value="">
            {estados ? "Sem estado" : "Carregando estados…"}
          </option>
          {estados?.map((estado) => (
            <option key={estado.sigla} value={estado.sigla}>
              {estado.nome} ({estado.sigla})
            </option>
          ))}
        </select>
        <SeletorDeCidade
          // Remonta ao trocar de estado, para o texto digitado não sobreviver.
          key={uf}
          cidades={cidades}
          desabilitado={!uf}
          valor={cidade}
          aoEscolher={(escolhida) => aoMudar(formatarLocal(uf, escolhida))}
        />
      </div>
      <p className="text-xs leading-[1.6] text-muted-foreground">
        {falhou
          ? "Não foi possível carregar a lista do IBGE; o local pode ficar em branco."
          : "Já vem com a região do seu cadastro; troque se a observação foi em outro lugar, ou deixe em branco se a fonte não diz. Fica guardado para análise e não aparece na ficha."}
      </p>
    </fieldset>
  );
}

const CAMPO =
  "w-full rounded-md border border-border bg-input px-3 py-1.5 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
