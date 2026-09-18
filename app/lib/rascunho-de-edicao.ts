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
  justificativa: string;
  /** Valor proposto, legível, para mostrar no lugar do atual. */
  resumo: string;
};

/**
 * Uma proposta por fonte: a moderação confere cada proposta contra a fonte
 * que ela declara, então campos tirados do mesmo livro vão juntos. As
 * observações de cada campo seguem juntas, identificadas pelo rótulo.
 */
export function agruparPorFonte(alteracoes: AlteracaoDeCampo[]): {
  patch: Record<string, unknown>;
  fonte: string;
  justificativa?: string;
}[] {
  const grupos = new Map<
    string,
    { patch: Record<string, unknown>; observacoes: string[] }
  >();

  for (const alteracao of alteracoes) {
    const fonte = alteracao.fonte.trim();
    const grupo = grupos.get(fonte) ?? { patch: {}, observacoes: [] };
    Object.assign(grupo.patch, alteracao.propostos);
    const observacao = alteracao.justificativa.trim();
    if (observacao)
      grupo.observacoes.push(`${alteracao.rotulo}: ${observacao}`);
    grupos.set(fonte, grupo);
  }

  return [...grupos].map(([fonte, { patch, observacoes }]) => ({
    patch,
    fonte,
    justificativa: observacoes.length
      ? observacoes.join("\n").slice(0, 2000)
      : undefined,
  }));
}
