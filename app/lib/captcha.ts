/**
 * CAPTCHA do cadastro (Cloudflare Turnstile).
 *
 * Opcional em instância local (http): sem as duas chaves o cadastro funciona
 * sem o desafio — é como a CI e o desenvolvimento rodam. Numa instância
 * pública (https) é obrigatório: lib/ambiente.ts recusa a partida sem ele,
 * porque um script criaria contas em massa e cada uma dispararia um e-mail de
 * confirmação pelo SMTP do projeto.
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
