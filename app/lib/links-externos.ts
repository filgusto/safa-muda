/**
 * Busca de identificadores externos (GBIF, iNaturalist) a partir do nome
 * científico.
 *
 * Só devolve um ID quando o match é único e inequívoco — a regra de ouro do
 * catálogo (nenhum campo por estimativa própria) vale também para links: sem
 * certeza, fica de fora para curadoria manual. Usado pelo backfill em massa
 * (db/scripts/enriquecer-links-externos.ts) e pelo enriquecimento assíncrono
 * de propostas de espécie nova (app/actions/wiki.ts).
 */

const ESPERA_ENTRE_TENTATIVAS_MS = 300;

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * As duas APIs às vezes derrubam a conexão sem relação com o dado buscado
 * (SocketError esporádico). Uma tentativa extra resolve a maioria; falhando
 * de novo, trata como "sem match" — não é hipótese descartada por engano, é
 * falha de rede. Também usado por lib/tracos-externos.ts.
 */
export async function buscarComRetentativa<T>(
  buscar: () => Promise<T | null>,
): Promise<T | null> {
  try {
    return await buscar();
  } catch {
    await esperar(ESPERA_ENTRE_TENTATIVAS_MS);
    try {
      return await buscar();
    } catch {
      return null;
    }
  }
}

interface RespostaGbif {
  usageKey?: number;
  matchType?: string;
  rank?: string;
}

async function buscarGbifIdDireto(
  nomeCientifico: string,
): Promise<number | null> {
  const url = new URL("https://api.gbif.org/v1/species/match");
  url.searchParams.set("name", nomeCientifico);
  url.searchParams.set("kingdom", "Plantae");

  const resposta = await fetch(url);
  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as RespostaGbif;
  if (
    dados.matchType === "EXACT" &&
    dados.rank === "SPECIES" &&
    typeof dados.usageKey === "number"
  ) {
    return dados.usageKey;
  }
  return null;
}

interface TaxonINaturalist {
  id: number;
  name: string;
  rank: string;
}

interface RespostaINaturalist {
  results: TaxonINaturalist[];
}

async function buscarINaturalistIdDireto(
  nomeCientifico: string,
): Promise<number | null> {
  const url = new URL("https://api.inaturalist.org/v1/taxa");
  url.searchParams.set("q", nomeCientifico);
  url.searchParams.set("rank", "species");
  url.searchParams.set("iconic_taxa", "Plantae");

  const resposta = await fetch(url);
  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as RespostaINaturalist;
  const alvo = nomeCientifico.trim().toLowerCase();
  const correspondencias = dados.results.filter(
    (taxon) => taxon.name.trim().toLowerCase() === alvo,
  );

  return correspondencias.length === 1 ? correspondencias[0].id : null;
}

/** usageKey do táxon no GBIF, ou `null` sem match exato e inequívoco. */
export function buscarGbifId(nomeCientifico: string): Promise<number | null> {
  return buscarComRetentativa(() => buscarGbifIdDireto(nomeCientifico));
}

/** ID do táxon no iNaturalist, ou `null` sem match exato e inequívoco. */
export function buscarINaturalistId(
  nomeCientifico: string,
): Promise<number | null> {
  return buscarComRetentativa(() => buscarINaturalistIdDireto(nomeCientifico));
}
