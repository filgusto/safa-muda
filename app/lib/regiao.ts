/**
 * Região de atuação como "Cidade, UF", escolhida entre os municípios do IBGE.
 * Parte pura (sem rede): interpretar e conferir o texto guardado.
 */

export type Estado = { sigla: string; nome: string };

/** Sem acento e em minúsculas, para comparar e filtrar "Sao Paulo" = "São Paulo". */
export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** "Piracicaba, SP" → { cidade: "Piracicaba", uf: "SP" }; outro formato → null. */
export function parsearRegiao(
  texto: string | null | undefined,
): { cidade: string; uf: string } | null {
  const partes = texto?.match(/^(.+),\s*([A-Za-z]{2})$/);
  if (!partes) return null;
  return { cidade: partes[1]!.trim(), uf: partes[2]!.toUpperCase() };
}

/**
 * Local de uma observação: "Cidade, UF" ou só "UF", para quem sabe o estado
 * mas não a cidade (um livro que fala do Paraná, por exemplo).
 */
export function parsearLocal(
  texto: string | null | undefined,
): { cidade: string | null; uf: string } | null {
  const solto = texto?.trim().match(/^([A-Za-z]{2})$/);
  if (solto) return { cidade: null, uf: solto[1]!.toUpperCase() };
  return parsearRegiao(texto);
}

/** O inverso de `parsearLocal`: "" sem estado, "UF" sem cidade, "Cidade, UF". */
export function formatarLocal(uf: string, cidade: string): string {
  if (!uf) return "";
  return cidade ? formatarRegiao(cidade, uf) : uf;
}

export function formatarRegiao(cidade: string, uf: string): string {
  return `${cidade}, ${uf}`;
}

/** O nome canônico do município na lista do IBGE, ou null se não existe. */
export function acharMunicipio(
  municipios: readonly string[],
  cidade: string,
): string | null {
  const alvo = semAcento(cidade);
  return municipios.find((nome) => semAcento(nome) === alvo) ?? null;
}
