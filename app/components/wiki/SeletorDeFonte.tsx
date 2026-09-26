"use client";

import { useEffect, useState } from "react";
import { comoTratamento, flexionarMarcas } from "@/core/tratamento.ts";
import { useSessaoHidratada } from "@/lib/auth-client.ts";
import {
  DETALHE_DO_TIPO,
  TIPOS_DE_FONTE,
  TIPO_DE_FONTE_LABEL,
  detalheMinimo,
  detalheObrigatorio,
  lerFonte,
  montarFonte,
  type TipoDeFonte,
} from "@/lib/tipo-de-fonte.ts";

/**
 * A fonte da sugestão: o tipo numa lista e, ao lado, o detalhe que o identifica
 * (autor e página, DOI…). "Outro" abre um campo livre.
 *
 * Quem usa guarda só o texto (`valor`), e `aoMudar` recebe `""` enquanto a
 * fonte está incompleta — o mesmo que o campo de texto de antes devolvia vazio.
 * O par tipo/detalhe é estado daqui, e só se refaz a partir de `valor` quando
 * o pai o troca por fora (a fonte lembrada da edição, por exemplo).
 */
export function SeletorDeFonte({
  valor,
  aoMudar,
}: {
  valor: string;
  aoMudar: (fonte: string) => void;
}) {
  const { data: sessao } = useSessaoHidratada();
  const tratamento = comoTratamento(sessao?.user.tratamento);
  const [tipo, setTipo] = useState<TipoDeFonte | "">(
    () => lerFonte(valor).tipo,
  );
  const [detalhe, setDetalhe] = useState(() => lerFonte(valor).detalhe);

  useEffect(() => {
    if (valor === montarFonte(tipo, detalhe)) return;
    const lida = lerFonte(valor);
    setTipo(lida.tipo);
    setDetalhe(lida.detalhe);
    // Só reage à troca externa; o par local muda por aqui mesmo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  function mudar(novoTipo: TipoDeFonte | "", novoDetalhe: string) {
    setTipo(novoTipo);
    setDetalhe(novoDetalhe);
    aoMudar(montarFonte(novoTipo, novoDetalhe));
  }

  return (
    <fieldset className="space-y-2">
      <legend className={ROTULO}>
        Fonte <span className="text-destructive">*</span>
      </legend>
      <select
        aria-label="Tipo de fonte"
        value={tipo}
        required
        onChange={(evento) =>
          mudar(evento.target.value as TipoDeFonte | "", detalhe)
        }
        className={CAMPO}
      >
        <option value="">Escolha o tipo de fonte</option>
        {TIPOS_DE_FONTE.map((opcao) => (
          <option key={opcao} value={opcao}>
            {TIPO_DE_FONTE_LABEL[opcao]}
          </option>
        ))}
      </select>

      {tipo && (
        <input
          aria-label={
            tipo === "outro"
              ? "Descrição da fonte"
              : `Detalhe da fonte: ${TIPO_DE_FONTE_LABEL[tipo]}`
          }
          value={detalhe}
          onChange={(evento) => mudar(tipo, evento.target.value)}
          required={detalheObrigatorio(tipo)}
          minLength={detalheMinimo(tipo) || undefined}
          maxLength={450}
          placeholder={DETALHE_DO_TIPO[tipo]}
          className={CAMPO}
        />
      )}
      <p className="text-xs leading-[1.6] text-muted-foreground">
        A fonte aparece na ficha, ao lado do nome com que você escolheu ser
        {flexionarMarcas("citado(a)", tratamento)}, depois que a equipe aprovar.
        Não coloque dados pessoais que você não queira tornar públicos.
      </p>
    </fieldset>
  );
}

const ROTULO =
  "mb-1 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground";

const CAMPO =
  "w-full rounded-md border border-border bg-input px-3 py-1.5 text-base sm:text-sm text-foreground transition-colors duration-240 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
