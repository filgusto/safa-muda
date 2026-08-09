import type { Estrato } from "@/core/estratos.ts";

/** Espécie como o painel do catálogo e a timeline a consomem. */
export interface EspecieDoPainel {
  id: string;
  slug: string;
  nomeComum: string;
  nomeCientifico: string;
  estrato: Estrato | null;
  sucessao: string | null;
  grupos: string[];
  diasParaColherMax: number | null;
}

/**
 * Ponto do clique, em coordenadas de viewport (`clientX`/`clientY`).
 *
 * O inspetor abre ancorado nele, e não numa coluna fixa — a barra clicada pode
 * estar em qualquer canto da timeline rolável.
 */
export interface PontoDeClique {
  x: number;
  y: number;
}

/** Plantio no estado local da timeline. */
export interface PlantioLocal {
  id: string;
  speciesId: string;
  estrato: Estrato;
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
  /** Derivado do diário — ver core/diario.ts. */
  realizado?: "planejado" | "plantado" | "encerrado";
  /** Meses de atraso (positivo) ou adiantamento (negativo) na implantação. */
  desvioMeses?: number | null;
}

/**
 * Carga transportada no arrastar do catálogo para a timeline.
 *
 * Viaja pelo contexto de arraste (ArrasteContext.tsx), não pelo `dataTransfer`
 * do HTML — o drag-and-drop nativo não existe em toque.
 */
export interface CargaDeArraste {
  speciesId: string;
  nomeComum: string;
  estratoDaEspecie: Estrato | null;
  diasParaColherMax: number | null;
}
