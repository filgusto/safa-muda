import { headers } from "next/headers";
import { auth, type Session } from "./auth.ts";

/**
 * Política de acesso do Safa Muda.
 *
 * A decisão fechada (docs/PLANO.md §0) é que o acesso NÃO é binário
 * "logado ou não":
 *
 *   - o catálogo de espécies é público (leitura anônima permitida);
 *   - propor edição exige conta;
 *   - moderar exige papel moderator/admin;
 *   - projetos são privados por padrão, com link não-listado opcional.
 *
 * Por isso as checagens ficam aqui, por recurso, e não num middleware que
 * bloqueia rotas inteiras. Adiar isso para a fase 3 significaria reescrever
 * todas as rotas do catálogo.
 */

export type Role = "user" | "moderator" | "admin";
export type Viewer = Session["user"] | null;

/** Sessão atual, ou null se anônimo. Nunca lança. */
export async function getViewer(): Promise<Viewer> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Sessão atual, lançando se anônimo. Use em ações que exigem conta. */
export async function requireViewer(): Promise<NonNullable<Viewer>> {
  const viewer = await getViewer();
  if (!viewer) throw new AccessError("É preciso estar autenticado.");
  return viewer;
}

export function roleOf(viewer: Viewer): Role | null {
  return (viewer?.role as Role | undefined) ?? null;
}

export function isModerator(viewer: Viewer): boolean {
  const role = roleOf(viewer);
  return role === "moderator" || role === "admin";
}

export function isAdmin(viewer: Viewer): boolean {
  return roleOf(viewer) === "admin";
}

export async function requireModerator(): Promise<NonNullable<Viewer>> {
  const viewer = await requireViewer();
  if (!isModerator(viewer)) {
    throw new AccessError("Ação restrita a moderadores.");
  }
  return viewer;
}

export async function requireAdmin(): Promise<NonNullable<Viewer>> {
  const viewer = await requireViewer();
  if (!isAdmin(viewer)) {
    throw new AccessError("Ação restrita a administradores.");
  }
  return viewer;
}

/**
 * Visibilidade de projeto. `unlisted` é acessível a quem tem o link — a
 * checagem do token do link fica na rota, não aqui.
 */
export type ProjectVisibility = "private" | "unlisted" | "public";

export function canReadProject(
  viewer: Viewer,
  project: {
    ownerId: string;
    visibility: ProjectVisibility;
    memberIds?: string[];
  },
  hasLinkToken = false,
): boolean {
  if (project.visibility === "public") return true;
  if (project.visibility === "unlisted" && hasLinkToken) return true;
  if (!viewer) return false;
  if (isAdmin(viewer)) return true;
  if (project.ownerId === viewer.id) return true;
  return project.memberIds?.includes(viewer.id) ?? false;
}

export class AccessError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AccessError";
    this.status = status;
  }
}
