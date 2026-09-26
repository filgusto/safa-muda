/**
 * Só caminhos internos do próprio site servem de destino depois do login:
 * aceitar URL absoluta abriria redirecionamento aberto, com a nossa página de
 * login servindo de trampolim.
 *
 * "Começa com / e não com //" não basta: `/\evil.com` e `/\t/evil.com` (o tab
 * é removido pelo parser de URL) passam por essa checagem, mas o navegador os
 * trata como `//evil.com`. Por isso a barra invertida e os caracteres de
 * controle são recusados em qualquer posição.
 */
export function destinoSeguro(destino: string | null): string {
  if (destino === null) return "/";
  return /^\/(?![/\\])[^\\\x00-\x1f]*$/.test(destino) ? destino : "/";
}
