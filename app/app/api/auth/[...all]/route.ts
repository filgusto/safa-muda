import { auth } from "@/lib/auth.ts";

/**
 * Endpoints do Better Auth (login, cadastro, sessão, logout).
 *
 * `auth.handler` é acessado dentro das funções, e não no topo do módulo, para
 * que a inicialização preguiçosa de lib/auth.ts não seja disparada durante o
 * `next build` — quando AUTH_SECRET ainda não existe.
 */
export async function GET(request: Request): Promise<Response> {
  return auth.handler(request);
}

export async function POST(request: Request): Promise<Response> {
  return auth.handler(request);
}
