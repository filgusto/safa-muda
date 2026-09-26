/**
 * Procedência: quais contribuições ainda sustentam o que a ficha mostra.
 *
 * Uma sugestão aprovada cita uma fonte para os campos que alterou. Se outra
 * sugestão, mais recente, troca esses mesmos campos, a fonte antiga deixou de
 * respaldar qualquer valor da ficha — e a seção Fontes só deve listar as fontes
 * das informações que estão ali.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

/**
 * As revisões que ainda fornecem o valor atual de ao menos um campo, na mesma
 * ordem em que vieram.
 *
 * Recebe as revisões da mais antiga para a mais recente: para cada campo, vale
 * a última que o tocou. Revisão sem campos (patch vazio) nunca é vigente.
 */
export function revisoesVigentes<T extends { patch: Record<string, unknown> }>(
  revisoesDaMaisAntigaParaAMaisNova: readonly T[],
): T[] {
  const ultimaPorCampo = new Map<string, number>();
  revisoesDaMaisAntigaParaAMaisNova.forEach((revisao, indice) => {
    for (const campo of Object.keys(revisao.patch)) {
      ultimaPorCampo.set(campo, indice);
    }
  });

  const vigentes = new Set(ultimaPorCampo.values());
  return revisoesDaMaisAntigaParaAMaisNova.filter((_, indice) =>
    vigentes.has(indice),
  );
}

/**
 * O estado de uma revisão imediatamente antes de ela ser aplicada, só para os
 * campos que ela tocou: o valor (`valores`) e a proveniência (`fontes`, com
 * `null` para "não tinha fonte"). Ambos usam o nome do campo (camelCase).
 */
export interface EstadoAnterior {
  valores: Record<string, unknown>;
  fontes: Record<string, string | null>;
}

export interface RevisaoDesfazivel {
  id: string;
  patch: Record<string, unknown>;
  /** `null` quando o valor anterior nunca foi registrado (revisões antigas). */
  antes: EstadoAnterior | null;
}

export type DesfazerRevisao =
  | {
      ok: true;
      /** Campos que voltam ao que eram: nenhuma revisão posterior os tocou. */
      restaurar: EstadoAnterior;
      /**
       * Revisões posteriores que tocaram o mesmo campo: o valor atual continua
       * sendo o delas, mas o "antes" delas passa a ser o que vinha antes da
       * revisão removida — senão desfazê-las depois restauraria um valor que
       * já não existe.
       */
      reancorar: { id: string; antes: EstadoAnterior }[];
    }
  | { ok: false; erro: string };

/**
 * O que fazer no catálogo ao excluir uma revisão.
 *
 * Recebe as revisões da espécie da mais antiga para a mais nova. Um campo só
 * volta ao valor anterior se a revisão excluída for a última a tocá-lo; se uma
 * mais nova o alterou depois, o valor da ficha é o dela e continua valendo.
 */
export function desfazerRevisao(
  revisoesDaMaisAntigaParaAMaisNova: readonly RevisaoDesfazivel[],
  alvoId: string,
): DesfazerRevisao {
  const lista = revisoesDaMaisAntigaParaAMaisNova;
  const indice = lista.findIndex((revisao) => revisao.id === alvoId);
  if (indice === -1) return { ok: false, erro: "Contribuição não encontrada." };

  const alvo = lista[indice]!;
  const campos = Object.keys(alvo.patch);
  if (!alvo.antes || campos.some((campo) => !(campo in alvo.antes!.valores))) {
    return {
      ok: false,
      erro: "O valor anterior desta contribuição não foi registrado, então não dá para desfazê-la.",
    };
  }
  const { valores, fontes } = alvo.antes;

  const restaurar: EstadoAnterior = { valores: {}, fontes: {} };
  const reancorar = new Map<string, EstadoAnterior>();

  for (const campo of campos) {
    const seguinte = lista.slice(indice + 1).find((r) => campo in r.patch);
    if (!seguinte) {
      restaurar.valores[campo] = valores[campo];
      restaurar.fontes[campo] = fontes[campo] ?? null;
      continue;
    }
    if (!seguinte.antes) continue;

    const antes = reancorar.get(seguinte.id) ?? {
      valores: { ...seguinte.antes.valores },
      fontes: { ...seguinte.antes.fontes },
    };
    antes.valores[campo] = valores[campo];
    antes.fontes[campo] = fontes[campo] ?? null;
    reancorar.set(seguinte.id, antes);
  }

  return {
    ok: true,
    restaurar,
    reancorar: [...reancorar].map(([id, antes]) => ({ id, antes })),
  };
}
