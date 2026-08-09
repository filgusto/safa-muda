import { eq, or, desc, asc, inArray, sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  project,
  projectMember,
  planting,
  species,
  type Project,
} from "@/db/schema/index.ts";
import {
  canReadProject,
  type Viewer,
  type ProjectVisibility,
} from "./access.ts";

/**
 * Consultas de projeto. Mutações ficam em app/actions/projetos.ts.
 *
 * Toda leitura passa por `canReadProject`: projeto é privado por padrão, e a
 * checagem é por recurso, não por rota (docs/PLANO.md §0).
 */

/** Plantio com os dados da espécie que a timeline precisa exibir. */
export interface PlantioComEspecie {
  id: string;
  speciesId: string;
  estrato: "emergente" | "alto" | "medio" | "baixo" | "rasteiro";
  estratoForcado: boolean;
  mesInicio: number;
  mesFim: number;
  intencao: string | null;
  status: string;
  notas: string | null;
  nomeComum: string;
  nomeCientifico: string;
  slug: string;
  estratoDaEspecie: string | null;
  sucessao: string | null;
  grupos: string[];
}

export async function listarProjetosDoUsuario(
  userId: string,
): Promise<(Project & { totalDePlantios: number })[]> {
  const membroEm = db
    .select({ projectId: projectMember.projectId })
    .from(projectMember)
    .where(eq(projectMember.userId, userId));

  const projetos = await db
    .select()
    .from(project)
    .where(or(eq(project.ownerId, userId), inArray(project.id, membroEm)))
    .orderBy(desc(project.atualizadoEm));

  if (projetos.length === 0) return [];

  const contagens = await db
    .select({
      projectId: planting.projectId,
      total: sql<number>`count(*)::int`,
    })
    .from(planting)
    .where(
      inArray(
        planting.projectId,
        projetos.map((p) => p.id),
      ),
    )
    .groupBy(planting.projectId);

  const porProjeto = new Map(contagens.map((c) => [c.projectId, c.total]));

  return projetos.map((projeto) => ({
    ...projeto,
    totalDePlantios: porProjeto.get(projeto.id) ?? 0,
  }));
}

/** Devolve o projeto só se o viewer puder lê-lo. */
export async function buscarProjeto(
  id: string,
  viewer: Viewer,
): Promise<Project | null> {
  const projeto = await db.query.project.findFirst({
    where: eq(project.id, id),
  });
  if (!projeto) return null;

  const membros = await db
    .select({ userId: projectMember.userId })
    .from(projectMember)
    .where(eq(projectMember.projectId, id));

  const pode = canReadProject(viewer, {
    ownerId: projeto.ownerId,
    visibility: projeto.visibilidade as ProjectVisibility,
    memberIds: membros.map((m) => m.userId),
  });

  return pode ? projeto : null;
}

/** Verdadeiro se o viewer pode alterar o desenho. */
export async function podeEditarProjeto(
  projectId: string,
  viewer: Viewer,
): Promise<boolean> {
  if (!viewer) return false;

  const projeto = await db.query.project.findFirst({
    where: eq(project.id, projectId),
  });
  if (!projeto) return false;
  if (projeto.ownerId === viewer.id) return true;

  const membro = await db.query.projectMember.findFirst({
    where: eq(projectMember.projectId, projectId),
  });
  return membro?.userId === viewer.id && membro.papel !== "viewer";
}

export async function listarPlantios(
  projectId: string,
): Promise<PlantioComEspecie[]> {
  const linhas = await db
    .select({
      id: planting.id,
      speciesId: planting.speciesId,
      estrato: planting.estrato,
      estratoForcado: planting.estratoForcado,
      mesInicio: planting.mesInicio,
      mesFim: planting.mesFim,
      intencao: planting.intencao,
      status: planting.status,
      notas: planting.notas,
      nomeComum: species.nomeComum,
      nomeCientifico: species.nomeCientifico,
      slug: species.slug,
      estratoDaEspecie: species.estrato,
      sucessao: species.sucessao,
      grupos: species.grupos,
    })
    .from(planting)
    .innerJoin(species, eq(planting.speciesId, species.id))
    .where(eq(planting.projectId, projectId))
    .orderBy(asc(planting.mesInicio));

  return linhas as PlantioComEspecie[];
}
