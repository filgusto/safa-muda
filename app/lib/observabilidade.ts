/**
 * Log estruturado para os poucos pontos do servidor que hoje só têm
 * `console.error` solto — pensado para ser lido por um coletor (Docker
 * `json-file`, ou mais adiante um agregador externo), não por gente lendo o
 * terminal.
 *
 * Não é uma integração de rastreamento de erros (Sentry/OTel): isso exige uma
 * conta e um DSN que o projeto ainda não tem — ver a seção "Observabilidade"
 * do README para como ligar um depois, sem mexer nos pontos que já chamam
 * `registrarErro`.
 */
export function registrarErro(
  evento: string,
  detalhes: Record<string, unknown>,
  erro?: unknown,
): void {
  console.error(
    JSON.stringify({
      nivel: "error",
      evento,
      timestamp: new Date().toISOString(),
      ...detalhes,
      erro:
        erro instanceof Error ? erro.message : erro ? String(erro) : undefined,
    }),
  );
}

/**
 * E-mail mascarado para log: mantém o suficiente para reconhecer a conta numa
 * investigação, sem gravar o endereço completo em texto claro num arquivo que
 * pode circular mais que o banco (agregador de log, print de tela de suporte).
 */
export function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return "***";
  const visivel = usuario.slice(0, 2);
  return `${visivel}${"*".repeat(Math.max(usuario.length - 2, 1))}@${dominio}`;
}
