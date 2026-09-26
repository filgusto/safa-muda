/**
 * Monta o padrão de um ILIKE "contém" a partir do texto digitado.
 *
 * `%` e `_` viram curinga no ILIKE, e `\` é o escape: sem escapá-los, quem
 * digita `%_%_%` dispara uma varredura cara. O teto de 100 caracteres evita
 * padrões enormes.
 */
export function padraoDeBusca(termo: string): string {
  return `%${termo.slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`;
}
