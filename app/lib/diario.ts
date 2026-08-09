import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/db/index.ts";
import {
  event,
  eventMedia,
  media,
  plantIndividual,
  planting,
  species,
  area,
  user,
} from "@/db/schema/index.ts";
import type { TipoDeEvento } from "@/core/diario.ts";

/** Consultas do diário. Mutações em app/actions/diario.ts. */

export interface EventoComContexto {
  id: string;
  tipo: TipoDeEvento;
  ocorridoEm: Date;
  quantidade: number | null;
  unidade: string | null;
  notas: string | null;
  criadoEm: Date;
  autorNome: string | null;
  plantingId: string | null;
  areaId: string | null;
  individualId: string | null;
  /** Rótulo do sujeito, já resolvido para exibição. */
  sujeito: string;
  fotos: { id: string; key: string; alt: string | null }[];
}

export async function listarEventos(
  projectId: string,
): Promise<EventoComContexto[]> {
  const linhas = await db
    .select({
      id: event.id,
      tipo: event.tipo,
      ocorridoEm: event.ocorridoEm,
      quantidade: event.quantidade,
      unidade: event.unidade,
      notas: event.notas,
      criadoEm: event.criadoEm,
      autorNome: user.name,
      plantingId: event.plantingId,
      areaId: event.areaId,
      individualId: event.individualId,
      nomeDaEspecie: species.nomeComum,
      nomeDaArea: area.nome,
      indiceDoIndividuo: plantIndividual.indice,
    })
    .from(event)
    .leftJoin(user, eq(event.criadoPor, user.id))
    .leftJoin(planting, eq(event.plantingId, planting.id))
    .leftJoin(species, eq(planting.speciesId, species.id))
    .leftJoin(area, eq(event.areaId, area.id))
    .leftJoin(plantIndividual, eq(event.individualId, plantIndividual.id))
    .where(eq(event.projectId, projectId))
    .orderBy(desc(event.ocorridoEm), desc(event.criadoEm));

  if (linhas.length === 0) return [];

  const fotos = await db
    .select({
      eventId: eventMedia.eventId,
      id: media.id,
      key: media.key,
      alt: media.alt,
    })
    .from(eventMedia)
    .innerJoin(media, eq(eventMedia.mediaId, media.id));

  const porEvento = new Map<string, EventoComContexto["fotos"]>();
  for (const foto of fotos) {
    if (!porEvento.has(foto.eventId)) porEvento.set(foto.eventId, []);
    porEvento.get(foto.eventId)!.push({
      id: foto.id,
      key: foto.key,
      alt: foto.alt,
    });
  }

  return linhas.map((linha) => ({
    id: linha.id,
    tipo: linha.tipo,
    ocorridoEm: linha.ocorridoEm,
    quantidade: linha.quantidade,
    unidade: linha.unidade,
    notas: linha.notas,
    criadoEm: linha.criadoEm,
    autorNome: linha.autorNome,
    plantingId: linha.plantingId,
    areaId: linha.areaId,
    individualId: linha.individualId,
    sujeito: descreverSujeito(linha),
    fotos: porEvento.get(linha.id) ?? [],
  }));
}

function descreverSujeito(linha: {
  nomeDaEspecie: string | null;
  nomeDaArea: string | null;
  indiceDoIndividuo: number | null;
}): string {
  if (linha.indiceDoIndividuo !== null && linha.nomeDaEspecie) {
    // Índice é 0-based no banco; para o usuário, plantas se contam a partir de 1.
    return `${linha.nomeDaEspecie} nº ${linha.indiceDoIndividuo + 1}`;
  }
  if (linha.nomeDaEspecie) return linha.nomeDaEspecie;
  if (linha.nomeDaArea) return linha.nomeDaArea;
  return "Projeto";
}

/** Eventos de cada plantio, para derivar planejado × realizado na timeline. */
export async function eventosPorPlantio(projectId: string): Promise<
  Map<
    string,
    {
      tipo: TipoDeEvento;
      ocorridoEm: Date;
      quantidade: number | null;
      unidade: string | null;
    }[]
  >
> {
  const linhas = await db
    .select({
      plantingId: event.plantingId,
      tipo: event.tipo,
      ocorridoEm: event.ocorridoEm,
      quantidade: event.quantidade,
      unidade: event.unidade,
    })
    .from(event)
    .where(eq(event.projectId, projectId))
    .orderBy(asc(event.ocorridoEm));

  const mapa = new Map<
    string,
    {
      tipo: TipoDeEvento;
      ocorridoEm: Date;
      quantidade: number | null;
      unidade: string | null;
    }[]
  >();

  for (const linha of linhas) {
    if (!linha.plantingId) continue;
    if (!mapa.has(linha.plantingId)) mapa.set(linha.plantingId, []);
    mapa.get(linha.plantingId)!.push({
      tipo: linha.tipo,
      ocorridoEm: linha.ocorridoEm,
      quantidade: linha.quantidade,
      unidade: linha.unidade,
    });
  }
  return mapa;
}

export async function listarIndividuos(plantingId: string) {
  return db
    .select()
    .from(plantIndividual)
    .where(eq(plantIndividual.plantingId, plantingId))
    .orderBy(asc(plantIndividual.indice));
}
