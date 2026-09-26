/**
 * O rascunho do modo de edição da ficha, sem React: o que é uma alteração
 * acumulada e como o lote vira propostas no envio (ver
 * components/wiki/ModoDeEdicao.tsx).
 */

/**
 * Uma alteração de campo aplicada ao rascunho, ainda não enviada.
 *
 * Guarda o `rascunho` do editor além do patch: reabrir o campo mostra o que a
 * pessoa digitou, e não o valor gravado.
 */
export type AlteracaoDeCampo = {
  rotulo: string;
  /** Só as chaves que mudam — já no formato que o servidor valida. */
  propostos: Record<string, unknown>;
  rascunho: Record<string, string | string[]>;
  gruposNovos: string[];
  fonte: string;
  /** Onde a observação foi feita ("Cidade, UF", "UF" ou ""). */
  local: string;
  justificativa: string;
  /** Valor proposto, legível, para mostrar no lugar do atual. */
  resumo: string;
};

/**
 * Uma proposta por fonte e local: a moderação confere cada proposta contra a
 * fonte que ela declara, então campos tirados do mesmo livro vão juntos — mas
 * só se foram observados no mesmo lugar, porque o local é uma propriedade da
 * observação e a proposta guarda um só. As observações de cada campo seguem
 * juntas, identificadas pelo rótulo.
 */
export function agruparPorFonte(alteracoes: AlteracaoDeCampo[]): {
  patch: Record<string, unknown>;
  fonte: string;
  localDaObservacao?: string;
  justificativa?: string;
}[] {
  const grupos = new Map<
    string,
    {
      fonte: string;
      local: string;
      patch: Record<string, unknown>;
      observacoes: string[];
    }
  >();

  for (const alteracao of alteracoes) {
    const fonte = alteracao.fonte.trim();
    const local = alteracao.local.trim();
    const chave = `${fonte}\u0000${local}`;
    const grupo = grupos.get(chave) ?? {
      fonte,
      local,
      patch: {},
      observacoes: [],
    };
    Object.assign(grupo.patch, alteracao.propostos);
    const observacao = alteracao.justificativa.trim();
    if (observacao)
      grupo.observacoes.push(`${alteracao.rotulo}: ${observacao}`);
    grupos.set(chave, grupo);
  }

  return [...grupos.values()].map(({ fonte, local, patch, observacoes }) => ({
    patch,
    fonte,
    localDaObservacao: local || undefined,
    justificativa: observacoes.length
      ? observacoes.join("\n").slice(0, 2000)
      : undefined,
  }));
}
