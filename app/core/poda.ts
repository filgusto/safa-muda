/**
 * Poda: até onde a planta aguenta o corte e de onde para baixo ele a elimina.
 *
 * A pergunta não é respondida pela forma de vida de Raunkiær, que olha a gema
 * que sobrevive à estação ruim, e não a que rebrota depois do corte: pinus,
 * juçara, eucalipto e gliricídia são todos fanerófitos, e cada um responde ao
 * corte de um jeito. O traço certo vem da ecologia da rebrota:
 *
 * - capacidade de rebrota — rebrota ou não rebrota (Bond & Midgley 2001);
 * - onde fica o banco de gemas que rebrota (Clarke et al. 2013, esquema
 *   "buds–protection–resources"; órgãos subterrâneos em Pausas et al. 2018).
 *
 * As funções aqui só derivam orientação do que foi informado com fonte. Sem
 * dado, devolvem `null` — nunca um palpite.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

/** Se a planta rebrota depois de um corte drástico. */
export const REBROTAS = ["rebrota", "nao_rebrota"] as const;

export type Rebrota = (typeof REBROTAS)[number];

export const REBROTA_LABEL: Record<Rebrota, string> = {
  rebrota: "Rebrota",
  nao_rebrota: "Não rebrota",
};

/** De onde a planta rebrota, do nível mais alto ao mais baixo. */
export const GEMAS_DE_REBROTA = [
  "tronco",
  "colo",
  "raiz",
  "subterraneo",
] as const;

export type GemaDeRebrota = (typeof GEMAS_DE_REBROTA)[number];

export const GEMA_DE_REBROTA_LABEL: Record<GemaDeRebrota, string> = {
  tronco: "Tronco (gemas epicórmicas)",
  colo: "Colo ou cepa",
  raiz: "Raiz gemífera",
  subterraneo: "Rizoma, bulbo, tubérculo ou xilopódio",
};

/**
 * A resposta ao corte muda com a planta e o momento, e a interface repete isto
 * sempre que mostra uma orientação de poda.
 */
export const RESSALVA_DA_PODA =
  "Referência, não garantia: a rebrota depende da idade da planta, da época do ano (as reservas), da altura do corte e de quantas vezes ela já foi cortada.";

/** A poda mais drástica que a planta aguenta e ainda rebrota. */
export type PodaDrastica = "decote" | "talhadia" | "nenhuma";

export const PODA_DRASTICA_LABEL: Record<PodaDrastica, string> = {
  decote: "Aguenta decote: corte alto do tronco, rebrota das gemas dele.",
  talhadia:
    "Aguenta talhadia: corte rente ao solo, rebrota do que fica na base ou enterrado.",
  nenhuma:
    "Não aguenta poda drástica: pode-se podar ramos, mas o corte do tronco a elimina.",
};

/** Onde cortar para eliminar a planta. */
export type ComoEliminar = "corte_do_tronco" | "abaixo_do_colo" | "arrancar";

export const COMO_ELIMINAR_LABEL: Record<ComoEliminar, string> = {
  corte_do_tronco:
    "Cortar o tronco rente ao solo já elimina. A raiz fica e se decompõe no solo.",
  abaixo_do_colo:
    "Cortar abaixo do colo, onde fica a cepa; acima dele a planta rebrota. A raiz fica e se decompõe no solo.",
  arrancar:
    "Cortar não elimina: a planta rebrota do que fica enterrado. Eliminar exige arrancar a raiz ou o órgão subterrâneo.",
};

export interface CamposDaPoda {
  rebrota: Rebrota | null;
  gemasDeRebrota: readonly GemaDeRebrota[];
}

/**
 * "Não rebrota" com gemas de rebrota informadas é contradição. Nesse caso as
 * orientações ficam em `null`: escolher um dos lados seria decidir no lugar da
 * fonte.
 */
function contraditorio({ rebrota, gemasDeRebrota }: CamposDaPoda): boolean {
  return rebrota === "nao_rebrota" && gemasDeRebrota.length > 0;
}

export function inconsistenciasDaPoda(campos: CamposDaPoda): string[] {
  return contraditorio(campos)
    ? ["Marcada como não rebrota, mas com gemas de rebrota informadas."]
    : [];
}

/** Até onde dá para podar e a planta ainda rebrotar. */
export function podaDrasticaTolerada(
  campos: CamposDaPoda,
): PodaDrastica | null {
  if (contraditorio(campos)) return null;
  if (campos.rebrota === "nao_rebrota") return "nenhuma";

  const gemas = campos.gemasDeRebrota;
  if (gemas.includes("tronco")) return "decote";
  if (gemas.length > 0) return "talhadia";
  // Rebrota, mas não se sabe de onde: não dá para dizer até onde cortar.
  return null;
}

/**
 * De onde para baixo cortar para eliminar a planta.
 *
 * Vale a gema mais baixa: é dela que a planta volta. Por isso raiz gemífera ou
 * órgão subterrâneo decidem, mesmo quando também há gemas no tronco.
 */
export function comoEliminar(campos: CamposDaPoda): ComoEliminar | null {
  if (contraditorio(campos)) return null;
  if (campos.rebrota === "nao_rebrota") return "corte_do_tronco";

  const gemas = campos.gemasDeRebrota;
  if (gemas.includes("raiz") || gemas.includes("subterraneo"))
    return "arrancar";
  if (gemas.includes("colo")) return "abaixo_do_colo";
  if (gemas.includes("tronco")) return "corte_do_tronco";
  return null;
}
