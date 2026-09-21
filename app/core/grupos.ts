/**
 * Grupos funcionais / de uso das espécies.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

export const GRUPOS = [
  "fruta",
  "materia_organica",
  "hortalica",
  "madeira",
  "medicinal",
  "ornamental",
  "panc",
  "palmeira",
  "grao",
  "castanha",
  "tempero",
  "aromatica",
  "palmito",
  "artesanato",
  "tuberculo",
  "casca",
  "bebida",
  "forrageira",
] as const;

export type Grupo = (typeof GRUPOS)[number];

export const GRUPO_LABEL: Record<Grupo, string> = {
  fruta: "Fruta",
  materia_organica: "Matéria orgânica",
  hortalica: "Hortaliça",
  madeira: "Madeira",
  medicinal: "Medicinal",
  ornamental: "Ornamental",
  panc: "PANC",
  palmeira: "Palmeira",
  grao: "Grão",
  castanha: "Castanha",
  tempero: "Tempero",
  aromatica: "Aromática",
  palmito: "Palmito",
  artesanato: "Artesanato",
  tuberculo: "Tubérculo",
  casca: "Casca",
  bebida: "Bebida",
  forrageira: "Forrageira",
};

/**
 * Origem de cada valor do catálogo. Exibida no card para que o usuário saiba
 * se está lendo a tabela publicada, uma correção editorial ou o livro.
 */
export const FONTE_LABEL: Record<string, string> = {
  messerschmidt:
    "Tabela Guia de Estratos Agroflorestais (Namastê Messerschmidt)",
  "correcao-editorial": "Correção editorial do Safa Muda",
  "neto-cap10": "Agroflorestando o Mundo, cap. 10 (Corrêa Neto et al., 2016)",
  comunidade: "Contribuição da comunidade",
  "flora-e-funga-do-brasil":
    "Flora e Funga do Brasil (Jardim Botânico do Rio de Janeiro)",
  "usda-plants": "USDA PLANTS Database",
  gbif: "GBIF",
  inaturalist: "iNaturalist",
  "embrapa-ct11-jambu-nazare":
    "Recomendações para a produção de jambu: cultivar Nazaré (Poltronieri, Muller & Poltronieri — Embrapa Amazônia Oriental, Circular Técnica 11, 2000)",
  "embrapa-hortalicas-jambu":
    "Hortaliças não convencionais: jambu (Embrapa Hortaliças, 2017)",
};

export const FONTE_LABEL_CURTO: Record<string, string> = {
  messerschmidt: "Messerschmidt",
  "correcao-editorial": "correção editorial",
  "neto-cap10": "Agroflorestando o Mundo",
  comunidade: "comunidade",
  "flora-e-funga-do-brasil": "Flora e Funga do Brasil",
  "usda-plants": "USDA PLANTS",
  gbif: "GBIF",
  inaturalist: "iNaturalist",
  "embrapa-ct11-jambu-nazare": "Embrapa, Circular Técnica 11",
  "embrapa-hortalicas-jambu": "Embrapa Hortaliças",
};
