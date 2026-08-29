import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Vocabulários do domínio agroflorestal.
 *
 * Os termos ficam em português porque são conceitos da literatura de referência
 * (Götsch, Corrêa Neto, Messerschmidt). Traduzir "estrato emergente" para código
 * romperia o vínculo com as fontes — ver docs/PLANO.md §8.
 */

/** Andar que a copa ocupa no organismo florestal. */
export const estratoEnum = pgEnum("estrato", [
  "emergente",
  "alto",
  "medio",
  "baixo",
  "rasteiro",
]);

/** Posição no tempo ecológico: quem prepara o ambiente para quem. */
export const sucessaoEnum = pgEnum("sucessao", [
  "placenta_1",
  "placenta_2",
  "pioneira",
  "secundaria_inicial",
  "secundaria_media",
  "secundaria_tardia",
  "climax",
]);

/** Degrau de fertilidade do sistema ecológico (Agroflorestando o Mundo, cap. 7). */
export const sistemaEnum = pgEnum("sistema", [
  "retomada",
  "acumulacao",
  "abundancia",
]);

/** Grupo funcional / de uso. */
export const grupoEnum = pgEnum("grupo", [
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
]);

/** Bioma brasileiro. Ainda não populado — ver docs/PLANO.md §7.3. */
export const biomaEnum = pgEnum("bioma", [
  "amazonia",
  "cerrado",
  "mata_atlantica",
  "caatinga",
  "pampa",
  "pantanal",
]);

/** Fase da planta que a foto retrata — ver core/fotos.ts. */
export const tagDeFotoEnum = pgEnum("tag_de_foto", [
  "semente",
  "jovem",
  "adulta",
  "flor",
  "fruta",
  "raiz",
  "misc",
]);
