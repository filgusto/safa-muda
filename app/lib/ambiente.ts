/**
 * Confere as variáveis de ambiente de uma instância em produção.
 *
 * Roda na partida do servidor (instrumentation.ts), não no import de módulo:
 * `next build` roda com NODE_ENV=production antes de qualquer segredo existir
 * (ver ADR 0002). Devolve a lista de problemas; vazia quer dizer "ok".
 *
 * O rigor total só vale para um deploy de verdade — endereço https. Uma
 * instância local em produção (a CI dos testes E2E, por exemplo) só precisa do
 * essencial.
 */
export function problemasDoAmbiente(
  env: Record<string, string | undefined>,
): string[] {
  const problemas: string[] = [];
  const falta = (nome: string) => !env[nome]?.trim();

  if (falta("DATABASE_URL")) problemas.push("DATABASE_URL não definida.");

  const segredo = env.AUTH_SECRET ?? "";
  if (segredo.length < 32) {
    problemas.push("AUTH_SECRET precisa ter pelo menos 32 caracteres.");
  }

  const url = env.NEXT_PUBLIC_SERVER_URL ?? "";
  if (!url) {
    problemas.push("NEXT_PUBLIC_SERVER_URL não definida.");
    return problemas;
  }
  if (!url.startsWith("https://")) return problemas;

  for (const nome of [
    "S3_ENDPOINT",
    "S3_PUBLIC_ENDPOINT",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "SMTP_HOST",
    "CONTATO_EMAIL",
  ]) {
    if (falta(nome)) problemas.push(`${nome} não definida.`);
  }

  if (
    env.S3_PUBLIC_ENDPOINT &&
    !env.S3_PUBLIC_ENDPOINT.startsWith("https://")
  ) {
    problemas.push(
      "S3_PUBLIC_ENDPOINT precisa ser https: o navegador envia as fotos direto a ele.",
    );
  }
  if (/CHANGE_ME/.test(Object.values(env).join(" "))) {
    problemas.push("Há variável com valor de exemplo (CHANGE_ME).");
  }

  return problemas;
}
