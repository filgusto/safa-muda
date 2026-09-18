/**
 * Traços de ciclo de vida vindos de bases públicas estruturadas:
 *
 * - hábito (forma de vida), da Flora e Funga do Brasil (JBRJ), lida pelo perfil
 *   que a própria lista publica no GBIF — o vocabulário é o do enum `habito`;
 * - ciclo de vida, do campo "Duration" da USDA PLANTS — o vocabulário é o do
 *   enum `ciclo_de_vida` (ver core/ciclo.ts).
 *
 * Só se grava o que a fonte afirma. Nada de dedução: árvore não vira perene,
 * hortaliça não vira anual. Valor que não tem correspondência no enum é
 * devolvido à parte, para curadoria, e não vira palpite. Usado por
 * db/scripts/enriquecer-ciclo-e-habito.ts e pelas propostas de espécie nova.
 */
import type { CicloDeVida, Habito } from "../core/ciclo.ts";
import { buscarComRetentativa } from "./links-externos.ts";

/** Forma de vida da Flora e Funga do Brasil → enum `habito`. */
const HABITO_DA_FFB: Record<string, Habito> = {
  erva: "erva",
  subarbusto: "subarbusto",
  arbusto: "arbusto",
  árvore: "arvore",
  "liana/volúvel/trepadeira": "liana",
  palmeira: "palmeira",
  bambu: "bambu",
  suculenta: "suculenta",
  dracenoide: "dracenoide",
};

/** "Duration" da USDA PLANTS → enum `ciclo_de_vida`. */
const CICLO_DA_USDA: Record<string, CicloDeVida> = {
  annual: "anual",
  biennial: "bienal",
  perennial: "perene",
};

function semRepeticao<T>(valores: T[]): T[] {
  return [...new Set(valores)];
}

/**
 * Converte as formas de vida da FFB. As que o enum não tem (talosa, folhosa,
 * aquática…) vão para `ignorados`.
 */
export function mapearFormaDeVidaFfb(valores: readonly string[]): {
  habito: Habito[];
  ignorados: string[];
} {
  const habito: Habito[] = [];
  const ignorados: string[] = [];
  for (const valor of valores) {
    const mapeado = HABITO_DA_FFB[valor.trim().toLowerCase()];
    if (mapeado) habito.push(mapeado);
    else ignorados.push(valor);
  }
  return { habito: semRepeticao(habito), ignorados };
}

/** Converte a "Duration" da USDA; qualquer outro valor é ignorado. */
export function mapearDuracaoUsda(valores: readonly string[]): CicloDeVida[] {
  return semRepeticao(
    valores
      .map((valor) => CICLO_DA_USDA[valor.trim().toLowerCase()])
      .filter((ciclo): ciclo is CicloDeVida => ciclo !== undefined),
  );
}

/**
 * Nome científico sem cultivar, marcador de categoria nem sinal de híbrido,
 * em minúsculas: a forma em que o catálogo e a USDA podem ser comparados.
 * O cultivar sai porque o ciclo biológico é da espécie, não da seleção.
 */
export function normalizarNome(nome: string): string {
  return nome
    .replace(/'[^']*'/g, " ")
    .replace(/\b(var|subsp|ssp|f)\./g, " ")
    .replace(/×/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * A USDA publica o nome em HTML com autoria intercalada
 * ("<i>Persea americana</i> Mill. var. <i>drymifolia</i> …"). Só as partes em
 * itálico são o nome.
 */
export function nomeDaUsda(nomeHtml: string): string {
  const partes = [...nomeHtml.matchAll(/<i>(.*?)<\/i>/g)].map((m) => m[1]);
  return normalizarNome(partes.join(" "));
}

/** Proveniência gravada em `fontes` para cada campo vindo daqui. */
export const FONTE_DO_HABITO = "flora-e-funga-do-brasil";
export const FONTE_DO_CICLO = "usda-plants";

export interface HabitoECiclo {
  /** Vazio quando não se buscou ou a fonte não informa. */
  habito: Habito[];
  cicloDeVida: CicloDeVida[];
  /** Formas de vida da FFB sem correspondência no enum, para curadoria. */
  ignorados: string[];
}

/**
 * Busca, em paralelo, o hábito (FFB, pelo `gbifId`) e o ciclo de vida (USDA,
 * pelo nome) de uma espécie. Só consulta o que for pedido; sem `gbifId`, o
 * hábito fica vazio. Usado pelo backfill em massa e pelo enriquecimento de
 * propostas de espécie nova (app/actions/wiki.ts).
 */
export async function buscarHabitoECiclo(opcoes: {
  nomeCientifico: string;
  gbifId: number | null;
  querHabito: boolean;
  querCiclo: boolean;
}): Promise<HabitoECiclo> {
  const { nomeCientifico, gbifId, querHabito, querCiclo } = opcoes;
  const [formas, duracoes] = await Promise.all([
    querHabito && gbifId !== null
      ? buscarFormaDeVidaFfb(gbifId)
      : Promise.resolve(null),
    querCiclo ? buscarDuracaoUsda(nomeCientifico) : Promise.resolve(null),
  ]);

  const { habito, ignorados } = formas
    ? mapearFormaDeVidaFfb(formas)
    : { habito: [], ignorados: [] };
  const cicloDeVida = duracoes ? mapearDuracaoUsda(duracoes) : [];
  return { habito, cicloDeVida, ignorados };
}

// ── Flora e Funga do Brasil (via GBIF) ──────────────────────────────────────

interface PerfilGbif {
  source?: string;
  lifeForm?: string;
}

interface RespostaPerfisGbif {
  results: PerfilGbif[];
}

/** O `lifeForm` da FFB chega como JSON serializado: {"lifeForm":["Erva"],…}. */
export function formasDeVidaDoPerfil(lifeForm: string): string[] {
  try {
    const dados = JSON.parse(lifeForm) as { lifeForm?: unknown };
    return Array.isArray(dados.lifeForm)
      ? dados.lifeForm.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

async function buscarFormaDeVidaFfbDireto(
  gbifId: number,
): Promise<string[] | null> {
  const url = new URL(
    `https://api.gbif.org/v1/species/${gbifId}/speciesProfiles`,
  );
  url.searchParams.set("limit", "300");

  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`GBIF ${resposta.status}`);

  const dados = (await resposta.json()) as RespostaPerfisGbif;
  const formas = dados.results
    .filter((perfil) => perfil.source?.includes("Flora e Funga do Brasil"))
    .flatMap((perfil) =>
      perfil.lifeForm ? formasDeVidaDoPerfil(perfil.lifeForm) : [],
    );
  return formas.length ? semRepeticao(formas) : null;
}

/** Formas de vida segundo a FFB, como a fonte escreve, ou `null`. */
export function buscarFormaDeVidaFfb(gbifId: number): Promise<string[] | null> {
  return buscarComRetentativa(() => buscarFormaDeVidaFfbDireto(gbifId));
}

// ── USDA PLANTS ─────────────────────────────────────────────────────────────

const USDA = "https://plantsservices.sc.egov.usda.gov/api";

interface PlantaUsda {
  Symbol: string;
  ScientificName: string;
  /** 0 quando o nome é o aceito; senão, aponta para o aceito. */
  AcceptedId: number;
  Durations?: string[] | null;
}

async function buscarDuracaoUsdaDireto(
  nomeCientifico: string,
): Promise<string[] | null> {
  const alvo = normalizarNome(nomeCientifico);

  const busca = new URL(`${USDA}/PlantSearch`);
  busca.searchParams.set("searchText", alvo);
  const respostaBusca = await fetch(busca);
  if (!respostaBusca.ok) throw new Error(`USDA ${respostaBusca.status}`);

  const resultados = (await respostaBusca.json()) as { Plant: PlantaUsda }[];
  // Só o nome aceito, com casamento exato e único. Sinônimo ou homônimo fica
  // de fora para curadoria. Nome mal aplicado ("sensu Standl., non L.") não é
  // o táxon, e sim o uso errado dele: é descartado antes de contar.
  const correspondencias = resultados
    .map((r) => r.Plant)
    .filter(
      (planta) =>
        planta.AcceptedId === 0 &&
        !/\bsensu\b/.test(planta.ScientificName) &&
        nomeDaUsda(planta.ScientificName) === alvo,
    );
  if (correspondencias.length !== 1) return null;

  const perfil = new URL(`${USDA}/PlantProfile`);
  perfil.searchParams.set("symbol", correspondencias[0].Symbol);
  const respostaPerfil = await fetch(perfil);
  if (!respostaPerfil.ok) throw new Error(`USDA ${respostaPerfil.status}`);

  const planta = (await respostaPerfil.json()) as PlantaUsda;
  return planta.Durations?.length ? planta.Durations : null;
}

/** "Duration" segundo a USDA PLANTS, como a fonte escreve, ou `null`. */
export function buscarDuracaoUsda(
  nomeCientifico: string,
): Promise<string[] | null> {
  return buscarComRetentativa(() => buscarDuracaoUsdaDireto(nomeCientifico));
}
