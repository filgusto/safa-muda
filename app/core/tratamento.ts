/**
 * Tratamento: como a pessoa quer ser flexionada em gênero nas palavras que o
 * site lhe dirige ("colaborador", "colaboradora", "colaboradore"…).
 *
 * Campo opcional. O padrão é o masculino ("colaborador", "citado"); só quando
 * a pessoa escolhe feminino ou neutro (terminação em -e) o texto flexiona.
 * Quem escolhe está dizendo como quer ser chamada, então a flexão vale em todo
 * lugar em que o site se refere a ela, inclusive o card e o perfil públicos.
 * Nunca se infere do nome.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

export const TRATAMENTOS = ["feminino", "masculino", "neutro"] as const;
export type Tratamento = (typeof TRATAMENTOS)[number];

export const TRATAMENTO_LABEL: Record<Tratamento, string> = {
  feminino: "Feminino (ela/dela)",
  masculino: "Masculino (ele/dele)",
  neutro: "Neutro (elu/delu, terminação -e)",
};

/** Aceita qualquer valor vindo de fora (sessão, banco) e descarta o inválido. */
export function comoTratamento(valor: unknown): Tratamento | null {
  return (TRATAMENTOS as readonly unknown[]).includes(valor)
    ? (valor as Tratamento)
    : null;
}

/** Escolhe a forma pelo tratamento; sem escolha, a masculina (o padrão). */
export function flexionar(
  tratamento: Tratamento | null | undefined,
  formas: { feminino: string; masculino: string; neutro: string },
): string {
  return formas[tratamento ?? "masculino"];
}

/**
 * Resolve as marcas "palavra(a)" de um texto: "citado(a)" vira "citado" (padrão
 * e masculino), "citada" (feminino) ou "citade" (neutro); "Agricultor(a)" vira
 * "Agricultor", "Agricultora" ou "Agricultore".
 */
export function flexionarMarcas(
  texto: string,
  tratamento: Tratamento | null | undefined,
): string {
  if (!tratamento || tratamento === "masculino") {
    return texto.replace(/\(a\)/g, "");
  }
  const terminacao = tratamento === "feminino" ? "a" : "e";
  return texto.replace(/(\p{L}+)\(a\)/gu, (_, palavra: string) =>
    palavra.endsWith("o")
      ? `${palavra.slice(0, -1)}${terminacao}`
      : `${palavra}${terminacao}`,
  );
}

const PAPEIS = {
  user: {
    feminino: "Colaboradora",
    masculino: "Colaborador",
    neutro: "Colaboradore",
  },
  moderator: {
    feminino: "Moderadora",
    masculino: "Moderador",
    neutro: "Moderadore",
  },
  admin: {
    feminino: "Administradora",
    masculino: "Administrador",
    neutro: "Administradore",
  },
};

/** O papel na equipe. Sem `tratamento`, o masculino — o padrão, e o que é público. */
export function rotuloDoPapel(
  papel: string | null | undefined,
  tratamento?: Tratamento | null,
): string {
  const formas = PAPEIS[papel as keyof typeof PAPEIS] ?? PAPEIS.user;
  return flexionar(tratamento, formas);
}
