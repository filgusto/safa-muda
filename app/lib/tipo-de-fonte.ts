/**
 * A fonte de uma sugestão como "tipo + detalhe" na interface, gravada como um
 * texto só ("Livro: Lorenzi, Árvores Brasileiras vol. 1, p. 142").
 *
 * Continua um texto porque é assim que a moderação, o histórico e o banco a
 * leem; o tipo é só um atalho para a pessoa não começar do zero. O que não
 * casa com nenhum tipo (fontes escritas antes disto, ou o "Outro") volta como
 * texto livre.
 */

/** Na ordem em que aparecem na lista; "outro" fica por último. */
export const TIPOS_DE_FONTE = [
  "observacao_de_campo",
  "relato",
  "site",
  "livro",
  "artigo",
  "instituicao",
  "outro",
] as const;

export type TipoDeFonte = (typeof TIPOS_DE_FONTE)[number];

export const TIPO_DE_FONTE_LABEL: Record<TipoDeFonte, string> = {
  observacao_de_campo: "Observação de campo",
  livro: "Livro",
  artigo: "Artigo científico",
  instituicao: "Publicação de instituição",
  relato: "Relato de agricultor ou técnico",
  site: "Site ou base de dados",
  outro: "Outro",
};

/** O que pedir no detalhe de cada tipo. */
export const DETALHE_DO_TIPO: Record<TipoDeFonte, string> = {
  observacao_de_campo:
    "Opcional: condições de plantio, manejo, há quanto tempo observa…",
  livro:
    "Autor, título e página. Ex.: Lorenzi, Árvores Brasileiras vol. 1, p. 142",
  artigo: "Autores, título, revista e ano — ou o DOI",
  instituicao: "Instituição e título. Ex.: Embrapa, Cultivo do abacateiro",
  relato: "Quem relatou (sem dado pessoal, se preferir) e o contexto",
  site: "Nome da base ou endereço",
  outro: "Descreva a fonte com pelo menos 10 caracteres",
};

/** O detalhe é opcional só na observação de campo, que já é uma fonte inteira. */
export function detalheObrigatorio(tipo: TipoDeFonte): boolean {
  return tipo !== "observacao_de_campo";
}

/** Tamanho mínimo do detalhe, para o texto gravado passar dos 10 caracteres. */
export function detalheMinimo(tipo: TipoDeFonte): number {
  if (tipo === "outro") return 10;
  return tipo === "observacao_de_campo" ? 0 : 5;
}

const TIPOS_COM_ROTULO = TIPOS_DE_FONTE.filter((tipo) => tipo !== "outro");

/** Junta tipo e detalhe no texto gravado; `""` enquanto a fonte está incompleta. */
export function montarFonte(tipo: TipoDeFonte | "", detalhe: string): string {
  const texto = detalhe.trim();
  if (!tipo) return "";
  if (tipo === "outro") return texto;
  const rotulo = TIPO_DE_FONTE_LABEL[tipo];
  if (texto) return `${rotulo}: ${texto}`;
  return tipo === "observacao_de_campo" ? rotulo : "";
}

/** O inverso de `montarFonte`; texto de outra origem vira "outro". */
export function lerFonte(texto: string): {
  tipo: TipoDeFonte | "";
  detalhe: string;
} {
  const limpo = texto.trim();
  if (!limpo) return { tipo: "", detalhe: "" };

  for (const tipo of TIPOS_COM_ROTULO) {
    const rotulo = TIPO_DE_FONTE_LABEL[tipo];
    if (limpo === rotulo) return { tipo, detalhe: "" };
    if (limpo.startsWith(`${rotulo}: `)) {
      return { tipo, detalhe: limpo.slice(rotulo.length + 2).trim() };
    }
  }
  return { tipo: "outro", detalhe: limpo };
}
