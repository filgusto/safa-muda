/**
 * CAPTCHA do cadastro (Cloudflare Turnstile).
 *
 * Opcional: sem as duas chaves a aplicação sobe e o cadastro funciona sem o
 * desafio — requisito de um projeto que qualquer pessoa deve conseguir rodar
 * (e é como a CI e o desenvolvimento local rodam). Numa instância pública,
 * configure: sem ele, um script cria contas em massa e cada uma dispara um
 * e-mail de confirmação pelo seu SMTP.
 *
 *   TURNSTILE_SITE_KEY    pública; vai ao navegador por /api/captcha
 *   TURNSTILE_SECRET_KEY  só no servidor; confere a resposta com a Cloudflare
 *
 * Lidas em runtime, nunca no topo do módulo (ADR 0002).
 */
export function chavesDoCaptcha(
  env: Record<string, string | undefined> = process.env,
): { siteKey: string; secretKey: string } | null {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim();
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

/** Endpoints do Better Auth que exigem o desafio. */
export const ROTAS_COM_CAPTCHA = ["/sign-up/email"];
